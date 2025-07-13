const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { PeerServer } = require('peer');
const path = require('path');
const os = require('os');
const bodyParser = require('body-parser');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// プレイヤー情報を管理するMap
// { id, nameID, peerId, isMuted, position, rotation }
const players = new Map();

// ログ保存用の配列
const loginLogs = [];
const chatLogs = [];
const serverLogs = [];
function pushLog(arr, msg) {
    arr.push(msg);
    if (arr.length > 100) arr.shift();
}
// console.logをラップ
const origConsoleLog = console.log;
console.log = function(...args) {
    const msg = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
    pushLog(serverLogs, msg);
    origConsoleLog.apply(console, args);
};

// --- サーバーステータス監視用 ---
let requestCount = 0;
let eventCount = 0;
setInterval(() => {
    requestCount = 0;
    eventCount = 0;
}, 1000);

app.use((req, res, next) => {
    requestCount++;
    next();
});

// 静的ファイルの提供
app.use(express.static(path.join(__dirname, 'public')));
app.use('/objects', express.static(path.join(__dirname, 'objects')));
app.use('/pdf', express.static(path.join(__dirname, 'pdf')));
app.use('/icons', express.static(path.join(__dirname, 'icons')));
app.use('/sounds', express.static(path.join(__dirname, 'sounds')));
app.use(bodyParser.json());


// PeerJSサーバーの設定
const peerServer = PeerServer({ port: 9000, path: '/peerjs' });

peerServer.on('connection', (client) => {
    console.log('PeerJS client connected:', client.getId());
});

peerServer.on('disconnect', (client) => {
    console.log('PeerJS client disconnected:', client.getId());
});

// Socket.IOの接続処理
io.on('connection', (socket) => {
    eventCount++;
    console.log('クライアントが接続しました:', socket.id);

    // 生存確認
    const aliveInterval = setInterval(() => {
        socket.emit('aliveCheck');
    }, 10000);

    let alive = true;
    socket.on('alive', () => {
        alive = true;
    });

    const checkAlive = setInterval(() => {
        if (!alive) {
            console.log(`クライアント ${socket.id} が応答なしのため切断します`);
            handleDisconnect();
        }
        alive = false;
    }, 20000);

    // ログイン処理
    socket.on('login', (data) => {
        if (!data.nameID) {
            socket.emit('loginError', { message: 'ユーザー名が必要です' });
            return;
        }

        const existingPlayer = Array.from(players.values()).find(p => p.nameID === data.nameID);
        if (existingPlayer) {
            socket.emit('loginError', { message: 'そのユーザー名は既に使用されています' });
            return;
        }

        const player = {
            id: socket.id,
            nameID: data.nameID,
            peerId: null,
            isMuted: true, // 初期状態はミュート
            speakerMuted: false, // スピーカーの初期状態をミュート解除に変更
            position: { x: 0, y: 0, z: 0 },
            rotation: { y: 0 },
        };
        players.set(socket.id, player);

        socket.emit('loginSuccess', { nameID: data.nameID, playerID: socket.id });
        
        // 全員に更新されたプレイヤーリストを送信
        io.emit('playerListUpdate', Array.from(players.values()));

        const log = `ログイン: ${data.nameID} (ID: ${socket.id}) at ${new Date().toISOString()}`;
        pushLog(loginLogs, log);
        console.log(log);
    });

    // PeerJSのPeerIDを登録
    socket.on('peerIdReady', (data) => {
        const player = players.get(socket.id);
        if (player) {
            player.peerId = data.peerId;
            // 全員に更新されたプレイヤーリストを送信
            io.emit('playerListUpdate', Array.from(players.values()));
            console.log(`PeerID登録: ${player.nameID} -> ${data.peerId}`);
        }
    });

    // プレイヤーの移動情報を受信
    socket.on('playerMove', (moveData) => {
        const player = players.get(socket.id);
        if (player) {
            player.position = moveData.position;
            player.rotation = moveData.rotation;
            socket.broadcast.emit('playerMoved', { id: socket.id, ...moveData });
        }
    });
    
    // マイクの状態変更を受信
    socket.on('micStateChanged', (data) => {
        const player = players.get(socket.id);
        if (player) {
            player.isMuted = data.isMuted;
            // 全員に更新されたプレイヤーリストを送信
            io.emit('playerListUpdate', Array.from(players.values()));
            console.log(`マイク状態変更: ${player.nameID} -> ${data.isMuted ? 'ミュート' : 'オン'}`);
        }
    });

    // スピーカーの状態変更を受信
    socket.on('speakerStateChanged', (data) => {
        const player = players.get(socket.id);
        if (player) {
            player.speakerMuted = data.isMuted;
            io.emit('playerListUpdate', Array.from(players.values()));
            console.log(`スピーカー状態変更: ${player.nameID} -> ${data.isMuted ? 'ミュート' : 'オン'}`);
        }
    });

    // チャットメッセージを受信
    socket.on('chatMessage', (msg) => {
        const player = players.get(socket.id);
        if (player) {
            const chatData = {
                nameID: player.nameID,
                playerID: socket.id,
                message: msg.message,
                mentions: msg.mentions || [], // メンション情報を追加
                timestamp: new Date().toISOString()
            };
            // BUGFIX: Broadcast to all clients *except* the sender.
            socket.broadcast.emit('chatMessage', chatData);
            pushLog(chatLogs, chatData);
        }
    });
    
    // Ping/Pong
    socket.on('ping_from_client', () => {
        socket.emit('pong_from_server');
    });

    // 絵文字スタンプ受信
    socket.on('sendEmoji', (data) => {
        const player = players.get(socket.id);
        if (player && data.emoji) {
            io.emit('broadcastEmoji', {
                playerId: socket.id,
                nameID: player.nameID,
                emoji: data.emoji
            });
            console.log(`スタンプ: ${player.nameID} -> ${data.emoji}`);
        }
    });

    // 線を描画するイベントを受信
    socket.on('drawLine', (data) => {
        // 受信した線データを全クライアントにブロードキャスト
        socket.broadcast.emit('drawLine', data);
    });

    // ログアウト処理
    socket.on('logout', () => {
        handleDisconnect();
    });

    // 切断処理
    socket.on('disconnect', () => {
        handleDisconnect();
    });

    function handleDisconnect() {
        clearInterval(aliveInterval);
        clearInterval(checkAlive);

        const player = players.get(socket.id);
        if (player) {
            const log = `ログアウト: ${player.nameID} (ID: ${socket.id}) at ${new Date().toISOString()}`;
            pushLog(loginLogs, log);
            console.log(log);
        }

        players.delete(socket.id);
        // 全員に更新されたプレイヤーリストを送信
        io.emit('playerListUpdate', Array.from(players.values()));
        socket.removeAllListeners();
    }
});

const STATS_PASS = process.env.STATS_PASS || 'naginagi2048';
function statsAuth(req, res, next) {
    const auth = req.headers['authorization'];
    if (!auth || !auth.startsWith('Basic ')) {
        res.set('WWW-Authenticate', 'Basic realm="Stats"');
        return res.status(401).send('Authentication required');
    }
    const b64 = auth.split(' ')[1];
    const [user, pass] = Buffer.from(b64, 'base64').toString().split(':');
    if (pass !== STATS_PASS) {
        res.set('WWW-Authenticate', 'Basic realm="Stats"');
        return res.status(401).send('Invalid password');
    }
    next();
}

app.post('/kick', statsAuth, (req, res) => {
    const { playerId } = req.body;
    if (!playerId) return res.status(400).json({ error: 'playerId required' });
    const targetSocket = io.sockets.sockets.get(playerId);
    if (targetSocket) {
        targetSocket.emit('kick');
        setTimeout(() => targetSocket.disconnect(true), 100); // 少し待ってから切断
        res.json({ ok: true });
        const player = players.get(playerId);
        if (player) {
            const log = `管理者による追放: ${player.nameID} (ID: ${playerId}) at ${new Date().toISOString()}`;
            pushLog(loginLogs, log);
            pushLog(serverLogs, log);
            console.log(log);
        }
    } else {
        res.status(404).json({ error: 'player not found' });
    }
});

app.get('/stats', statsAuth, (req, res) => {
    const mem = process.memoryUsage();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const ramUsagePercent = totalMem ? (usedMem / totalMem * 100) : 0;
    res.json({
        time: new Date().toISOString(),
        requestCount,
        eventCount,
        memory: {
            rss: mem.rss,
            heapTotal: mem.heapTotal,
            heapUsed: mem.heapUsed,
            external: mem.external
        },
        ram: {
            total: totalMem,
            free: freeMem,
            used: usedMem,
            percent: ramUsagePercent
        },
        players: Array.from(players.values()).map(p => ({
            id: p.id,
            nameID: p.nameID,
            isMuted: p.isMuted,
            speakerMuted: p.speakerMuted
        })),
        loginLogs,
        chatLogs,
        serverLogs
    });
});

app.get('/stats.html', statsAuth, (req, res, next) => {
    express.static(path.join(__dirname, 'public'))(req, res, next);
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`サーバーがポート${PORT}で起動しました`);
}); 