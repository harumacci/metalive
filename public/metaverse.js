import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// よく使うクラスを個別にインポート
const { 
    Scene, Color, Fog, PerspectiveCamera, WebGLRenderer, PCFSoftShadowMap,
    AmbientLight, DirectionalLight, HemisphereLight, AnimationMixer,
    PlaneGeometry, MeshStandardMaterial, Mesh, Vector3, Clock, Quaternion, Euler,
    EdgesGeometry, LineBasicMaterial, LineSegments
} = THREE;

// グローバル変数
let scene, camera, renderer;
let socket;
let players = new Map(); // 他プレイヤーの情報を保持 { id, nameID, peerId, isMuted, isSpeakerMuted, mesh, ... }
let localPlayer; // 自分の情報 { id, nameID, peerId, position, rotation }
let localPlayerMesh; // 自分のアバター
let clock = new Clock();
let mixer;
let localMixer; // 自分のアバター用のミキサー


// 多言語対応テキスト辞書
const translations = {
    ja: {
        // 一般
        general: '一般',
        language: '言語',
        playerName: 'プレイヤー名',
        avatarUrl: 'アバターURL',
        
        // 音声
        audio: '音声',
        micDevice: '使用するマイク',
        speakerDevice: '使用するスピーカー',
        micVolume: 'マイク音量',
        speakerVolume: 'スピーカー音量',
        voiceChat: '音声チャット',
        default: 'デフォルト',
        micDeviceDesc: '使用するマイクデバイスを選択してください',
        speakerDeviceDesc: '使用するスピーカーデバイスを選択してください',
        micVolumeDesc: 'マイクの入力音量を調整します',
        speakerVolumeDesc: 'スピーカーの出力音量を調整します',
        voiceChatDesc: '音声チャット機能の有効/無効を切り替えます',
        on: 'オン',
        off: 'オフ',
        
        // 動画
        video: '動画',
        videoQuality: '動画品質',
        fpsLimit: 'FPS制限',
        low: '低',
        medium: '中',
        high: '高',
        
        // ネットワーク
        network: 'ネットワーク',
        peerJsServer: 'PeerJSサーバーURL',
        iceServers: 'ICEサーバー',
        
        // UI要素
        settings: '設定',
        loading: '読み込み中...',
        playerNameLabel: 'プレイヤー名',
        onlineCount: '接続中',
        people: '人',
        position: '位置',
        controls: '操作方法',
        movement: '移動',
        viewRotation: '視点回転',
        posterView: 'ポスターを見る',
        jump: 'ジャンプ',
        clickNote: '※ 画面クリック後に視点回転有効',
        muted: 'ミュート中',
        inputLevel: '入力レベル',
        chat: 'チャット',
        messageInput: 'メッセージを入力... @でメンション',
        participants: '参加者一覧',
        minimize: '最小化/最大化',
        you: '(あなた)',
        mutedStatus: 'ミュート中',
        micOn: 'マイクオン',
        speaker: 'スピーカー',
        speakerMute: 'スピーカーミュート解除',
        speakerMuteTitle: 'スピーカーをミュート',
        unmute: 'アンミュート',
        mute: 'ミュート',
        logout: 'ログアウト',
        logoutConfirm: 'ログアウト確認',
        logoutMessage: '本当にログアウトしますか？\nメタバースから退出します。',
        cancel: 'キャンセル',
        confirm: 'ログアウト',
        posterHotspot: '📄 ポスターを見る (Eキー)',
        pdfHelp: 'マウスホイール：ズーム | ドラッグ：移動 | Esc：閉じる',
        kickMessage: '管理者により追放されました',
        micAccessError: 'マイクの取得に失敗しました。ページを再読み込みして、マイクへのアクセスを許可してください。',
        deviceInitError: '選択された音声デバイスの初期化に失敗しました。デフォルトデバイスを使用します。',
        loginError: 'ログインエラー',
        nameRequired: 'ユーザー名が必要です',
        nameAlreadyUsed: 'そのユーザー名は既に使用されています',
        selectPlayer: 'プレイヤーを選択:',
        mentionNotification: 'メンション音声の再生に失敗しました:',
        
        // キー
        keyW: 'W',
        keyA: 'A',
        keyS: 'S',
        keyD: 'D',
        keyE: 'E',
        keySpace: 'スペース',
        keyClick: 'クリック + マウス',
        
        // 音声デバイスラベル
        micDeviceLabel: 'マイク',
        speakerDeviceLabel: 'スピーカー'
    },
    en: {
        // General
        general: 'General',
        language: 'Language',
        playerName: 'Player Name',
        avatarUrl: 'Avatar URL',
        
        // Audio
        audio: 'Audio',
        micDevice: 'Microphone Device',
        speakerDevice: 'Speaker Device',
        micVolume: 'Microphone Volume',
        speakerVolume: 'Speaker Volume',
        voiceChat: 'Voice Chat',
        default: 'Default',
        micDeviceDesc: 'Select the microphone device to use',
        speakerDeviceDesc: 'Select the speaker device to use',
        micVolumeDesc: 'Adjust microphone input volume',
        speakerVolumeDesc: 'Adjust speaker output volume',
        voiceChatDesc: 'Enable/disable voice chat functionality',
        on: 'On',
        off: 'Off',
        
        // Video
        video: 'Video',
        videoQuality: 'Video Quality',
        fpsLimit: 'FPS Limit',
        low: 'Low',
        medium: 'Medium',
        high: 'High',
        
        // Network
        network: 'Network',
        peerJsServer: 'PeerJS Server URL',
        iceServers: 'ICE Servers',
        
        // UI Elements
        settings: 'Settings',
        loading: 'Loading...',
        playerNameLabel: 'Player Name',
        onlineCount: 'Online',
        people: 'people',
        position: 'Position',
        controls: 'Controls',
        movement: 'Movement',
        viewRotation: 'View Rotation',
        posterView: 'View Poster',
        jump: 'Jump',
        clickNote: '※ Click screen to enable view rotation',
        muted: 'Muted',
        inputLevel: 'Input Level',
        chat: 'Chat',
        messageInput: 'Type message... @ to mention',
        participants: 'Participants',
        minimize: 'Minimize/Maximize',
        you: '(You)',
        mutedStatus: 'Muted',
        micOn: 'Mic On',
        speaker: 'Speaker',
        speakerMute: 'Unmute Speaker',
        speakerMuteTitle: 'Mute Speaker',
        unmute: 'Unmute',
        mute: 'Mute',
        logout: 'Logout',
        logoutConfirm: 'Logout Confirmation',
        logoutMessage: 'Are you sure you want to logout?\nYou will exit the metaverse.',
        cancel: 'Cancel',
        confirm: 'Logout',
        posterHotspot: '📄 View Poster (E key)',
        pdfHelp: 'Mouse wheel: Zoom | Drag: Move | Esc: Close',
        kickMessage: 'You have been kicked by an administrator',
        micAccessError: 'Failed to access microphone. Please reload the page and allow microphone access.',
        deviceInitError: 'Failed to initialize selected audio device. Using default device.',
        loginError: 'Login Error',
        nameRequired: 'Username is required',
        nameAlreadyUsed: 'That username is already in use',
        selectPlayer: 'Select Player:',
        mentionNotification: 'Failed to play mention sound:',
        
        // Keys
        keyW: 'W',
        keyA: 'A',
        keyS: 'S',
        keyD: 'D',
        keyE: 'E',
        keySpace: 'Space',
        keyClick: 'Click + Mouse',
        
        // Audio device labels
        micDeviceLabel: 'Microphone',
        speakerDeviceLabel: 'Speaker'
    }
};

// 現在の言語
let currentLanguage = 'ja';

// 初期化フラグ
let isInitialized = false;

// VC（音声通話）用グローバル変数
let peer = null;
let localStream = null;
let mediaConnections = {}; // key: peerId, value: call object
let audioElements = {}; // key: peerId, value: audio element
let isMuted = true; // 自分のマイクのミュート状態
let isMasterSpeakerMuted = false; // 全体のスピーカーミュート状態をデフォルトでオフに
let audioContext; // 音声分析用
let analyser;
let dataArray;
let micLevel = 0;
let globalSpeakerVolume = 1.0; // グローバルスピーカー音量

// プレイヤー頭上スタンプ管理
const playerEmojis = new Map(); // playerId -> {emoji, timeoutId}
const emojiDivs = new Map(); // ←ここで1回だけ宣言

// ログイン情報
let nameID = null;
let playerID = null;

// モデルとマテリアル
let avatarModel;
let gymModel;

// 移動関連
const moveSpeed = 10;
const jumpSpeed = 15;
let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = true;
let velocity = new Vector3();

// カメラ関連
let cameraDistance = 4; // アバターからの距離
let cameraHeight = 1.5; // アバターからの高さオフセット
let cameraAngle = 0; // カメラの水平角度

// マウス制御
let mouseX = 0;
let mouseY = 0.2; // 初期値を少し上向きに
let targetRotationY = 0;
let isMouseLocked = false;

// 更新レート制御
const UPDATE_RATE = 10; // 毎秒10回の更新
let lastUpdateTime = 0;
const UPDATE_INTERVAL = 1000 / UPDATE_RATE;

// パフォーマンス監視
let stats = {
    fps: 0,
    frameCount: 0,
    lastTime: performance.now(),
    ping: 0,
    lastPingTime: 0
};

// UI要素
let chatInput, chatSendBtn, chatMessages, chatContainer, chatMinimizeBtn, chatUnreadBadge;
let logoutBtn, logoutModal, logoutCancelBtn, logoutConfirmBtn, micBtn, speakerBtn;
let playerListContainer, playerListElement, playerListMinimizeBtn;
let settingsBtn, settingsModal, settingsCloseBtn;

// チャット関連
let isChatMinimized = false;
let unreadCount = 0;

// メンション機能関連
let mentionList, mentionPlayers;
let isMentionMode = false;
let selectedMentionIndex = -1;
let mentionTargetPlayer = null;
let mentionNotifications; // メンション通知コンテナ
let mentionSound; // メンション音声

// PDF関連
let pdfPoster;
let pdfTexture;
let pdfCanvas;
let isPosterNearby = false;
const POSTER_INTERACTION_DISTANCE = 2.5;
let posterHotspot;
let pdfFullscreenModal;
let pdfFullscreenCanvas;
let pdfCloseBtn;
let pdfZoomLevel = 1;
let pdfOffsetX = 0;
let pdfOffsetY = 0;
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let originalPdfWidth = 0;
let originalPdfHeight = 0;

// --- PDFペン描画 ---
let isPenMode = false;
let isDrawing = false;
let penLines = [];
let currentLine = null;
let penBtn, pdfCanvasRect;

// --- スタンプ（絵文字）メニュー ---
const EMOJI_LIST = [
    '😀','😂','😍','😎','😭','😡','👍','👏','🙌','🙏','🎉','💯','🔥','😳','🤔','😴','🥺','😱','🤩','😇','😅'
];
let emojiMenu, stampBtn;

// 初期化
init();
animate();

function init() {
    if (isInitialized) return;
    
    nameID = localStorage.getItem('nameID');
    playerID = localStorage.getItem('playerID');
    
    if (!nameID) {
        window.location.href = '/login.html';
        return;
    }

    // 言語設定を読み込み
    const settings = JSON.parse(localStorage.getItem('metaverseSettings') || '{}');
    if (settings.language) {
        currentLanguage = settings.language;
    }

    isInitialized = true;

    scene = new Scene();
    scene.background = new Color(0x87CEEB);
    scene.fog = new Fog(0x87CEEB, 10, 500);

    camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const initialHorizontalDistance = Math.cos(mouseY) * cameraDistance;
    const initialVerticalOffset = Math.sin(mouseY) * cameraDistance + cameraHeight;
    camera.position.set(0, initialVerticalOffset, initialHorizontalDistance);

    renderer = new WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    playerListContainer = document.getElementById('player-list-container');
    playerListElement = document.getElementById('player-list');
    playerListMinimizeBtn = document.getElementById('player-list-minimize-btn');
    const playerListHeader = playerListContainer ? playerListContainer.querySelector('h4') : null;

    if (playerListHeader) {
        playerListHeader.addEventListener('click', (e) => {
            // Ensure the click is on the header itself or the button, not other elements.
            if (e.target === playerListHeader || e.target.closest('#player-list-minimize-btn')) {
                 playerListContainer.classList.toggle('minimized');
            }
        });
    }

    setupLighting();
    setupMouseControls();
    setupKeyboardControls();
    loadModels();
    loadPDF();
    connectToServer();
    initChat();
    initPDF();
    initMenu();
    initVoiceChat();

    window.addEventListener('resize', onWindowResize);
    
    // UI言語を初期化
    updateUILanguage();
    
    setTimeout(() => {
        document.getElementById('loading').style.display = 'none';
    }, 2000);

    // UI要素取得
    emojiMenu = document.getElementById('emoji-menu');
    stampBtn = document.getElementById('stamp-btn');
    if (emojiMenu) emojiMenu.style.display = 'none'; // ←必ず最初に非表示
    if (stampBtn && emojiMenu) {
        stampBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (emojiMenu.style.display === 'none' || emojiMenu.style.display === '') {
                showEmojiMenu();
            } else {
                hideEmojiMenu();
            }
        });
        document.body.addEventListener('click', (e) => {
            if (emojiMenu.style.display !== 'none' && !emojiMenu.contains(e.target) && e.target !== stampBtn) {
                hideEmojiMenu();
            }
        });
        renderEmojiMenu();
    }
}

function setupLighting() {
    // 環境光
    const ambientLight = new AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // ディレクショナルライト（太陽光）
    const directionalLight = new DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    directionalLight.shadow.camera.near = 0.1;
    directionalLight.shadow.camera.far = 200;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // ヘミスフィアライト（空の光）
    const hemisphereLight = new HemisphereLight(0x87CEEB, 0x545454, 0.4);
    scene.add(hemisphereLight);
}

function setupMouseControls() {
    // マウスロック
    document.addEventListener('click', (event) => {
        // PDF表示中の場合はマウスロックを無効
        if (pdfFullscreenModal && pdfFullscreenModal.classList.contains('show')) {
            return;
        }
        
        // チャット関連要素をクリックした場合はマウスロックを無効
        const clickedElement = event.target;
        if (isClickOnUIElement(clickedElement)) {
            return;
        }
        
        document.body.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
        isMouseLocked = document.pointerLockElement === document.body;
        if (isMouseLocked) {
            document.getElementById('controls').style.display = 'none';
        } else {
            document.getElementById('controls').style.display = 'block';
        }
    });

    // マウス移動
    document.addEventListener('mousemove', (event) => {
        if (!isMouseLocked) return;

        mouseX -= event.movementX * 0.002; // 左右の回転を逆に
        mouseY -= event.movementY * 0.002;

        // 垂直方向の制限（上下の向きを制限）
        mouseY = Math.max(-Math.PI / 7, Math.min(Math.PI / 5, mouseY)); // -30度から+45度に制限
        
        // アバターの回転
        targetRotationY = mouseX;
    });
}

function setupKeyboardControls() {
    const onKeyDown = (event) => {
        // イベントがフォーム要素から来ていない場合のみ処理
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
        
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                moveForward = true;
                event.preventDefault();
                break;
            case 'KeyS':
            case 'ArrowDown':
                moveBackward = true;
                event.preventDefault();
                break;
            case 'KeyA':
            case 'ArrowLeft':
                moveLeft = true;
                event.preventDefault();
                break;
            case 'KeyD':
            case 'ArrowRight':
                moveRight = true;
                event.preventDefault();
                break;
            case 'Space':
                if (canJump) {
                    velocity.y = jumpSpeed;
                    canJump = false;
                }
                event.preventDefault();
                break;
            case 'KeyE':
                if (isPosterNearby) {
                    openPosterFullscreen();
                }
                event.preventDefault();
                break;

        }
    };

    const onKeyUp = (event) => {
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
        
        switch (event.code) {
            case 'KeyW':
            case 'ArrowUp':
                moveForward = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                moveBackward = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                moveLeft = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                moveRight = false;
                break;
        }
    };

    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);
}

function updatePerformanceStats() {
    stats.frameCount++;
    const now = performance.now();

    if (now >= stats.lastTime + 1000) {
        stats.fps = stats.frameCount;
        stats.frameCount = 0;
        stats.lastTime = now;
        document.getElementById('fps').textContent = stats.fps;
    }

    if (now >= stats.lastPingTime + 5000) {
        if (socket && socket.connected) {
            const pingStart = Date.now();
            socket.emit('ping_from_client');
            socket.once('pong_from_server', () => {
                stats.ping = Date.now() - pingStart;
                document.getElementById('ping').textContent = stats.ping;
            });
        }
        stats.lastPingTime = now;
    }
}

async function loadModels() {
    const loader = new GLTFLoader();

    loader.load('/objects/gym.glb', (gltf) => {
        gymModel = gltf.scene;
        gymModel.scale.set(1, 1, 1);
        gymModel.position.set(0, -0.5, 0);
        gymModel.traverse((child) => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });
        scene.add(gymModel);
    });

    loader.load('/objects/avator.glb', (gltf) => {
        avatarModel = gltf.scene;
        avatarModel.userData.animations = gltf.animations;
        createLocalPlayer();
    });

    
}

function createLocalPlayer() {
    if (!avatarModel || localPlayerMesh) return;

    const originalUserData = avatarModel.userData;
    avatarModel.userData = {};
    localPlayerMesh = avatarModel.clone();
    avatarModel.userData = originalUserData;
    localPlayerMesh.scale.set(0.5, 0.5, 0.5);
    localPlayerMesh.position.set(0, 0, 0);
    localPlayerMesh.traverse((child) => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });

    const animations = originalUserData.animations;
    if (animations && animations.length > 0) {
        localMixer = new AnimationMixer(localPlayerMesh);
        localMixer.clipAction(animations[0]).play();
    }
    scene.add(localPlayerMesh);
}

function connectToServer() {
    if (socket) socket.disconnect();
    
    socket = io();

    socket.on('connect', () => {
        socket.emit('login', { nameID: nameID, isFromMetaverse: true });
    });

    socket.on('loginSuccess', (data) => {
        playerID = data.playerID; // サーバーから受け取ったIDを保存
        localPlayer = {
            id: data.playerID,
            nameID: data.nameID,
            position: localPlayerMesh ? localPlayerMesh.position.clone() : new Vector3(0, 0, 0),
            rotation: { y: localPlayerMesh ? localPlayerMesh.rotation.y : 0 }
        };
        const playerNameElement = document.getElementById('playerName');
        if (playerNameElement) {
            playerNameElement.textContent = data.nameID;
        }
    });

    socket.on('loginError', (data) => {
        alert('ログインエラー: ' + data.message);
        localStorage.removeItem('nameID');
        localStorage.removeItem('playerID');
        window.location.href = '/login.html';
    });

    // プレイヤーリスト全体の更新
    socket.on('playerListUpdate', (updatedPlayers) => {
        const remotePlayers = new Map();
        updatedPlayers.forEach(p => {
            if (p.id !== playerID) {
                remotePlayers.set(p.id, p);
            } else {
                // 自分の情報を更新
                isMuted = p.isMuted;
                if(localPlayer) localPlayer.peerId = p.peerId;
            }
        });
        
        // 差分を検出して更新
        updatePlayers(remotePlayers);
        renderPlayerList(updatedPlayers);
        updateAllConnections(); // VC接続を更新
    });

    socket.on('playerMoved', (data) => {
        const player = players.get(data.id);
        if (player && player.mesh) {
            player.mesh.targetPosition = new Vector3(data.position.x, data.position.y, data.position.z);
            player.mesh.targetRotation = data.rotation.y;
        }
    });

    socket.on('aliveCheck', () => socket.emit('alive'));
    socket.on('chatMessage', (messageData) => addChatMessage(messageData));
    // サーバーからの絵文字ブロードキャスト受信
    if (typeof socket !== 'undefined') {
        socket.on('broadcastEmoji', ({ playerId, emoji }) => {
            showPlayerEmoji(playerId, emoji);
        });
    }

    socket.on('kick', () => {
        alert('管理者により追放されました');
        window.location.href = '/login.html';
    });
}

function updatePlayers(remotePlayers) {
    // 新規プレイヤーを追加
    remotePlayers.forEach((playerData, id) => {
        if (!players.has(id)) {
            addPlayer(playerData);
        } else {
            // 既存プレイヤーの情報を更新 (isMutedなど)
            const existingPlayer = players.get(id);
            existingPlayer.isMuted = playerData.isMuted;
            existingPlayer.peerId = playerData.peerId;
        }
    });

    // 退出したプレイヤーを削除
    players.forEach((player, id) => {
        if (!remotePlayers.has(id)) {
            removePlayer(id);
        }
    });
}


function addPlayer(playerData) {
    if (!avatarModel) {
        setTimeout(() => addPlayer(playerData), 100);
        return;
    }

    const originalUserData = avatarModel.userData;
    avatarModel.userData = {};
    const playerMesh = avatarModel.clone();
    avatarModel.userData = originalUserData;
    playerMesh.scale.set(0.5, 0.5, 0.5);
    playerMesh.position.set(playerData.position.x, playerData.position.y, playerData.position.z);
    playerMesh.rotation.y = playerData.rotation.y;
    playerMesh.traverse((child) => { if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; } });

    playerMesh.targetPosition = playerMesh.position.clone();
    playerMesh.targetRotation = playerMesh.rotation.y;

    players.set(playerData.id, {
        ...playerData,
        mesh: playerMesh,
        // isSpeakerMuted: false, <-- This local-only state is removed.
    });
    scene.add(playerMesh);
}

function removePlayer(playerId) {
    const player = players.get(playerId);
    if (player) {
        if (player.mesh) scene.remove(player.mesh);
        
        // VC接続と音声要素のクリーンアップ
        if (player.peerId) {
            if (mediaConnections[player.peerId]) {
                mediaConnections[player.peerId].close();
                delete mediaConnections[player.peerId];
            }
            cleanupAudioElement(player.peerId);
        }
        
        players.delete(playerId);
    }
}

function updatePlayerCount() {
    const count = players.size + 1;
    const onlineCountElement = document.getElementById('onlineCount');
    if (onlineCountElement) {
        onlineCountElement.textContent = count;
    }
}

function updatePlayerMovement(delta) {
    if (!localPlayerMesh) return;

    velocity.y -= 50 * delta;

    if (isMouseLocked) {
        localPlayerMesh.rotation.y += (targetRotationY - localPlayerMesh.rotation.y) * 0.2;
    }

    const direction = new Vector3();
    const rotation = localPlayerMesh.rotation.y;
    
    if (moveForward) { direction.x -= Math.sin(rotation); direction.z -= Math.cos(rotation); }
    if (moveBackward) { direction.x += Math.sin(rotation); direction.z += Math.cos(rotation); }
    if (moveLeft) { direction.x -= Math.cos(rotation); direction.z += Math.sin(rotation); }
    if (moveRight) { direction.x += Math.cos(rotation); direction.z -= Math.sin(rotation); }
    
    if (direction.length() > 0) {
    direction.normalize();
        velocity.x = direction.x * moveSpeed;
        velocity.z = direction.z * moveSpeed;
    } else {
        velocity.x *= 0.9;
        velocity.z *= 0.9;
    }

    const prevPosition = localPlayerMesh.position.clone();
    localPlayerMesh.position.x += velocity.x * delta;
    localPlayerMesh.position.y += velocity.y * delta;
    localPlayerMesh.position.z += velocity.z * delta;

    

    if (localPlayerMesh.position.y < 0) {
        velocity.y = 0;
        localPlayerMesh.position.y = 0;
        canJump = true;
    }

    const horizontalDistance = Math.cos(mouseY) * cameraDistance;
    const verticalOffset = Math.sin(mouseY) * cameraDistance + cameraHeight;
    const cameraOffset = new Vector3(Math.sin(rotation) * horizontalDistance, verticalOffset, Math.cos(rotation) * horizontalDistance);
    camera.position.lerp(localPlayerMesh.position.clone().add(cameraOffset), 0.3);
    camera.lookAt(localPlayerMesh.position.clone().add(new Vector3(0, 1, 0)));

    const currentTime = Date.now();
    if (currentTime - lastUpdateTime > UPDATE_INTERVAL && localPlayer) {
        socket.emit('playerMove', {
            position: { x: localPlayerMesh.position.x, y: localPlayerMesh.position.y, z: localPlayerMesh.position.z },
            rotation: { y: localPlayerMesh.rotation.y }
        });
        lastUpdateTime = currentTime;
        const positionElement = document.getElementById('position');
        if (positionElement) {
            positionElement.textContent = `${localPlayerMesh.position.x.toFixed(1)}, ${localPlayerMesh.position.y.toFixed(1)}, ${localPlayerMesh.position.z.toFixed(1)}`;
        }
    }
}

function updateOtherPlayers(delta) {
    players.forEach(player => {
        if (player.mesh && player.mesh.targetPosition) {
            player.mesh.position.lerp(player.mesh.targetPosition, 0.1);
            const diff = player.mesh.targetRotation - player.mesh.rotation.y;
            player.mesh.rotation.y += (diff > Math.PI ? diff - 2 * Math.PI : diff < -Math.PI ? diff + 2 * Math.PI : diff) * 0.1;
        }
    });
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    updatePlayerMovement(delta);
    updateOtherPlayers(delta);
    checkPosterDistance();
    if (mixer) mixer.update(delta);
    if (localMixer) localMixer.update(delta);
    updatePerformanceStats();
    if (analyser && !isMuted) {
        analyser.getByteFrequencyData(dataArray);
        micLevel = dataArray.reduce((sum, v) => sum + v, 0) / dataArray.length;
        micLevel = Math.min(100, (micLevel / 128) * 100 * 1.5);
    } else {
        micLevel = 0;
    }
    updateMicAnalyzerUI();
    renderer.render(scene, camera);
    renderPlayerEmojis(); // ←追加
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function initChat() {
    chatInput = document.getElementById('chat-input');
    chatSendBtn = document.getElementById('chat-send-btn');
    chatMessages = document.getElementById('chat-messages');
    chatContainer = document.getElementById('chat-container');
    chatMinimizeBtn = document.getElementById('chat-minimize-btn');
    chatUnreadBadge = document.getElementById('chat-unread-badge');

    // メンション機能用要素
    mentionList = document.getElementById('mention-list');
    mentionPlayers = document.getElementById('mention-players');
    mentionNotifications = document.getElementById('mention-notifications');
    
    // メンション音声を初期化
    mentionSound = new Audio('/sounds/mention.mp3');
    mentionSound.volume = 0.5; // 音量を50%に設定
    
    chatSendBtn.addEventListener('click', sendChatMessage);
    chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') sendChatMessage(); });
    chatInput.addEventListener('keydown', (e) => e.stopPropagation());
    chatInput.addEventListener('keyup', (e) => e.stopPropagation());
    chatMinimizeBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleChatMinimize(); });
    chatContainer.addEventListener('click', (e) => { if (isChatMinimized) toggleChatMinimize(); });
    
    // メンション機能のキーボード操作
    chatInput.addEventListener('input', handleChatInput);
    chatInput.addEventListener('keydown', handleMentionKeydown);
    
    updateUnreadBadge();
}
function toggleChatMinimize() {
    isChatMinimized = !isChatMinimized;
    chatContainer.classList.toggle('minimized', isChatMinimized);
    if (!isChatMinimized) {
        chatContainer.classList.remove('new-message');
        unreadCount = 0;
        updateUnreadBadge();
        setTimeout(() => chatInput.focus(), 300);
    }
}
function updateUnreadBadge() {
    if (unreadCount > 0) {
        chatUnreadBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        chatUnreadBadge.classList.add('show');
    } else {
        chatUnreadBadge.classList.remove('show');
    }
}
function sendChatMessage() {
    const message = chatInput.value.trim();
    if (!message || !socket || !localPlayer) return;
    
    // メンション情報を抽出
    const mentions = extractMentions(message);

    addChatMessage({
        nameID: localPlayer.nameID,
        playerID: localPlayer.id,
        message: message,
        mentions: mentions
    }, true);

    socket.emit('chatMessage', {
        message: message,
        mentions: mentions
    });
    chatInput.value = '';
    hideMentionList();
}

function extractMentions(message) {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;
    
    while ((match = mentionRegex.exec(message)) !== null) {
        const playerName = match[1];
        // プレイヤーリストから該当するプレイヤーを検索
        const allPlayers = Array.from(players.values()).concat([localPlayer]).filter(Boolean);
        const player = allPlayers.find(p => p.nameID === playerName);
        if (player) {
            mentions.push(player.nameID);
        }
    }
    
    return mentions;
}

function addChatMessage(messageData, isOwnMessage = false) {
    const messageElement = document.createElement('div');
    messageElement.className = `chat-message ${isOwnMessage ? 'own-message' : ''}`;
    
    // メンションが含まれているかチェック
    const mentions = messageData.mentions || [];
    const isMentioned = mentions.includes(localPlayer?.nameID);
    if (isMentioned) {
        messageElement.classList.add('mention');
        // 自分へのメンション時に波紋アニメーションを表示
        if (!isOwnMessage) {
            showMentionNotification();
        }
    }
    
    const time = new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
    
    // メッセージテキストにメンションをハイライト
    let messageText = escapeHtml(messageData.message);
    if (mentions.length > 0) {
        mentions.forEach(mention => {
            const regex = new RegExp(`@${mention}`, 'g');
            messageText = messageText.replace(regex, `<span class="mention-text">@${mention}</span>`);
        });
    }
    
    messageElement.innerHTML = `
        <div class="message-header">&lt;${escapeHtml(messageData.nameID)}&gt;<span class="message-time"> - ${time}</span></div>
        <div class="message-text">${messageText}</div>
    `;
    
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    if (chatMessages.children.length > 50) chatMessages.removeChild(chatMessages.firstChild);
    
    if (isChatMinimized && !isOwnMessage) {
        unreadCount++;
        updateUnreadBadge();
        chatContainer.classList.add('new-message');
        setTimeout(() => chatContainer.classList.remove('new-message'), 3000);
    }
}
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}


async function loadPDF() {
    try {
        const pdfjsLib = window['pdfjs-dist/build/pdf'];
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;
        const pdf = await pdfjsLib.getDocument('pdf/test.pdf').promise;
        const page = await pdf.getPage(1);
        pdfCanvas = document.createElement('canvas');
        const context = pdfCanvas.getContext('2d');
        const viewport = page.getViewport({ scale: 1 });
        pdfCanvas.width = viewport.width;
        pdfCanvas.height = viewport.height;
        await page.render({ canvasContext: context, viewport: viewport }).promise;
        createPDFTexture();
    } catch (error) {
        console.error('PDF読み込みエラー:', error);
    }
}

function createPDFTexture() {
    if (!pdfCanvas) return;
    pdfTexture = new THREE.CanvasTexture(pdfCanvas);
    pdfTexture.needsUpdate = true;
    const aspectRatio = pdfCanvas.width / pdfCanvas.height;
    const posterGeometry = new PlaneGeometry(2, 2 / aspectRatio);
    const posterMaterial = new MeshStandardMaterial({ map: pdfTexture, side: THREE.DoubleSide });
    pdfPoster = new Mesh(posterGeometry, posterMaterial);
    pdfPoster.position.set(10, 1, 0);
    pdfPoster.castShadow = true;
    pdfPoster.receiveShadow = true;
    scene.add(pdfPoster);
}

function checkPosterDistance() {
    if (!pdfPoster || !localPlayerMesh) return;
    const distance = localPlayerMesh.position.distanceTo(pdfPoster.position);
    const currentlyNearby = distance <= POSTER_INTERACTION_DISTANCE;
    if (currentlyNearby && !isPosterNearby) {
        isPosterNearby = true;
        showPosterHotspot();
    } else if (!currentlyNearby && isPosterNearby) {
        isPosterNearby = false;
        hidePosterHotspot();
    }
}

function initPDF() {
    posterHotspot = document.getElementById('poster-hotspot');
    pdfFullscreenModal = document.getElementById('pdf-fullscreen-modal');
    pdfFullscreenCanvas = document.getElementById('pdf-fullscreen-canvas');
    pdfCloseBtn = document.getElementById('pdf-close-btn');
    penBtn = document.getElementById('pdf-pen-btn');
    pdfCanvasRect = pdfFullscreenCanvas ? pdfFullscreenCanvas.getBoundingClientRect() : null;
    posterHotspot.addEventListener('click', openPosterFullscreen);
    pdfCloseBtn.addEventListener('click', closePosterFullscreen);
    pdfFullscreenModal.addEventListener('click', (e) => { if (e.target === pdfFullscreenModal) closePosterFullscreen(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && pdfFullscreenModal.classList.contains('show')) closePosterFullscreen(); });
    setupPDFInteraction();
    setupPDFPen();
}
function showPosterHotspot() { if (posterHotspot) posterHotspot.classList.add('show'); }
function hidePosterHotspot() { if (posterHotspot) posterHotspot.classList.remove('show'); }
function openPosterFullscreen() {
    if (!pdfCanvas) return;
    hidePosterHotspot();
    
    originalPdfWidth = pdfCanvas.width;
    originalPdfHeight = pdfCanvas.height;
    
    // Set fixed canvas size
    pdfFullscreenCanvas.width = 1400;
    pdfFullscreenCanvas.height = 800;

    // Reset zoom and pan states
    pdfZoomLevel = 1;
    pdfOffsetX = 0;
    pdfOffsetY = 0;
    
    renderPDFFullscreen();
    pdfFullscreenModal.classList.add('show');
    
    const helpText = document.getElementById('pdf-help-text');
    if (helpText) {
        helpText.textContent = 'マウスホイール：ズーム | ドラッグ：移動 | Esc：閉じる';
        helpText.classList.remove('fade-out');
        setTimeout(() => helpText.classList.add('fade-out'), 3000);
    }
}
function closePosterFullscreen() { if (pdfFullscreenModal) pdfFullscreenModal.classList.remove('show'); }

function renderPDFFullscreen() {
    if (!pdfCanvas || !pdfFullscreenCanvas) return;
    const ctx = pdfFullscreenCanvas.getContext('2d');
    const canvas = pdfFullscreenCanvas; // The 1000x800 target canvas

    // Clear the entire canvas with a neutral background
    ctx.fillStyle = '#555';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Calculate the size and position to render the PDF page
    // while maintaining aspect ratio (letterboxing)
    const pageAspectRatio = originalPdfWidth / originalPdfHeight;
    const canvasAspectRatio = canvas.width / canvas.height;
    
    let renderWidth, renderHeight, renderX, renderY;

    if (pageAspectRatio > canvasAspectRatio) {
        // PDF is wider than canvas area
        renderWidth = canvas.width;
        renderHeight = canvas.width / pageAspectRatio;
        renderX = 0;
        renderY = (canvas.height - renderHeight) / 2;
    } else {
        // PDF is taller than canvas area
        renderHeight = canvas.height;
        renderWidth = canvas.height * pageAspectRatio;
        renderY = 0;
        renderX = (canvas.width - renderWidth) / 2;
    }

    ctx.save();
    
    // Apply pan and zoom transformations
    // The transformations are centered on the canvas itself
    ctx.translate(canvas.width / 2 + pdfOffsetX, canvas.height / 2 + pdfOffsetY);
    ctx.scale(pdfZoomLevel, pdfZoomLevel);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
    
    // Draw the pre-rendered PDF page onto the canvas
    ctx.fillStyle = 'white';
    ctx.fillRect(renderX, renderY, renderWidth, renderHeight);
    ctx.drawImage(pdfCanvas, renderX, renderY, renderWidth, renderHeight);
    
    ctx.restore();
}

function setupPDFInteraction() {
    if (!pdfFullscreenCanvas) return;
    
    pdfFullscreenCanvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
        pdfZoomLevel = Math.max(0.2, Math.min(10, pdfZoomLevel * zoomFactor));
            renderPDFFullscreen();
    });
    
    pdfFullscreenCanvas.addEventListener('mousedown', (e) => {
        // ペンモード時はドラッグを無効化
        if (isPenMode) return;
        
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        pdfFullscreenCanvas.style.cursor = 'grabbing';
    });
    
    pdfFullscreenCanvas.addEventListener('mousemove', (e) => {
        // ペンモード時はドラッグを無効化
        if (isPenMode) {
            pdfFullscreenCanvas.style.cursor = 'crosshair';
            return;
        }
        
        if (!isDragging) {
            pdfFullscreenCanvas.style.cursor = 'grab';
            return;
        }
        pdfOffsetX += e.clientX - lastMouseX;
        pdfOffsetY += e.clientY - lastMouseY;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        renderPDFFullscreen();
    });
    
    const stopDragging = () => {
        // ペンモード時はドラッグを無効化
        if (isPenMode) return;
        
        isDragging = false;
        pdfFullscreenCanvas.style.cursor = 'grab';
    };
    
    pdfFullscreenCanvas.addEventListener('mouseup', stopDragging);
    pdfFullscreenCanvas.addEventListener('mouseleave', stopDragging);
    pdfFullscreenCanvas.style.cursor = 'grab';
}


function isClickOnUIElement(element) {
    const uiElementIds = ['chat-container', 'poster-hotspot', 'pdf-fullscreen-modal', 'info', 'controls', 'menu-bar', 'logout-modal', 'player-list-container', 'mic-analyzer', 'settings-modal'];
    let current = element;
    while (current && current !== document.body) {
        if (current.id && uiElementIds.includes(current.id)) return true;
        current = current.parentElement;
    }
    return false;
}

function initMenu() {
    logoutBtn = document.getElementById('logout-btn');
    logoutModal = document.getElementById('logout-modal');
    logoutCancelBtn = document.getElementById('logout-cancel-btn');
    logoutConfirmBtn = document.getElementById('logout-confirm-btn');
    micBtn = document.getElementById('mic-btn');
    speakerBtn = document.getElementById('speaker-btn');
    settingsBtn = document.getElementById('settings-btn');
    settingsModal = document.getElementById('settings-modal');
    settingsCloseBtn = document.getElementById('settings-close-btn');

    logoutBtn.addEventListener('click', showLogoutModal);
    logoutCancelBtn.addEventListener('click', hideLogoutModal);
    logoutConfirmBtn.addEventListener('click', performLogout);
    micBtn.addEventListener('click', toggleMute);
    speakerBtn.addEventListener('click', toggleMasterSpeakerMute);
    settingsBtn.addEventListener('click', showSettingsModal);
    settingsCloseBtn.addEventListener('click', hideSettingsModal);
    
    logoutModal.addEventListener('click', (e) => { if (e.target === logoutModal) hideLogoutModal(); });
    settingsModal.addEventListener('click', (e) => { if (e.target === settingsModal) hideSettingsModal(); });
    
    document.addEventListener('keydown', (e) => { 
        if (e.key === 'Escape') {
            if (logoutModal.classList.contains('show')) hideLogoutModal();
            if (settingsModal.classList.contains('show')) hideSettingsModal();
        }
    });
    
    updateSpeakerButton();
    initSettingsTabs();
}

function showLogoutModal() { logoutModal.classList.add('show'); }
function hideLogoutModal() { logoutModal.classList.remove('show'); }

function showSettingsModal() { 
    settingsModal.classList.add('show'); 
    loadSettings();
    loadAudioDevices();
    setupVolumeControls();
    setupLanguageControl();
}
function hideSettingsModal() { 
    settingsModal.classList.remove('show'); 
    saveSettings();
}

function performLogout() {
    if (peer) peer.destroy();
    if(localStream) localStream.getTracks().forEach(track => track.stop());
    socket.emit('logout');
    localStorage.removeItem('nameID');
    localStorage.removeItem('playerID');
    window.location.href = '/login.html';
}

// Global speaker mute function for the main button, renamed for clarity.
function toggleMasterSpeakerMute() {
    isMasterSpeakerMuted = !isMasterSpeakerMuted;

    // Notify the server of the new state.
    socket.emit('speakerStateChanged', { isMuted: isMasterSpeakerMuted });

    // Update all local audio elements immediately.
    Object.values(audioElements).forEach(audio => {
        audio.muted = isMasterSpeakerMuted;
    });
    
    // The server broadcast will eventually re-render the player list,
    // but we update the main button icon instantly for better UX.
    updateSpeakerButton(isMasterSpeakerMuted);
}

function updateSpeakerButton(isMuted) {
    if (!speakerBtn) return;
    const img = speakerBtn.querySelector('img');
    if (!img) return;
    if (isMuted) {
        img.src = 'icons/speaker_mute.png';
        img.alt = 'スピーカーミュート解除';
        speakerBtn.title = 'スピーカーミュート解除';
    } else {
        img.src = 'icons/speaker.png';
        img.alt = 'スピーカー';
        speakerBtn.title = 'スピーカーをミュート';
    }
}

// --- Player List Rendering ---
function renderPlayerList(allPlayers = []) {
    if (!playerListElement) return;
    playerListElement.innerHTML = '';

    const sortedPlayers = allPlayers.sort((a, b) => {
        if (a.id === playerID) return -1;
        if (b.id === playerID) return 1;
        return a.nameID.localeCompare(b.nameID);
    });
    
    sortedPlayers.forEach(playerData => {
        const isLocal = playerData.id === playerID;
        // const playerState = players.get(playerData.id) || {}; // No longer needed
        const li = document.createElement('li');
        li.className = `player-item ${isLocal ? 'is-local' : ''}`;

        const micIcon = getMicIcon(isLocal ? isMuted : playerData.isMuted);
        
        // Speaker icon now reflects the shared server state and is not clickable.
        const isSpeakerEffectivelyMuted = isLocal ? isMasterSpeakerMuted : playerData.speakerMuted;
        const speakerIcon = getSpeakerIcon(isSpeakerEffectivelyMuted);
        const speakerButtonHtml = `<button class="speaker-icon" disabled title="スピーカー: ${isSpeakerEffectivelyMuted ? 'ミュート' : 'オン'}">${speakerIcon}</button>`;

        const t = translations[currentLanguage];
        li.innerHTML = `
            <span class="player-name">${playerData.nameID}${isLocal ? ' ' + t.you : ''}</span>
            <div class="player-controls">
                <button class="mic-icon" disabled title="${(isLocal ? isMuted : playerData.isMuted) ? 'ミュート中' : 'マイクオン'}">${micIcon}</button>
                ${speakerButtonHtml}
            </div>
        `;
        playerListElement.appendChild(li);
    });

    // Event listeners for individual speaker mutes are removed.
}

/* This function is no longer needed as per-player muting is removed.
function togglePlayerSpeakerMute(targetPlayerId) {
    ...
}
*/

function getMicIcon(isMuted) {
    return isMuted 
        ? `<svg viewBox="0 0 24 24" fill="none"><path d="M16 12V8a4 4 0 0 0-8 0v4" stroke="#c0392b" stroke-width="2"/><path d="M19 12v1a7 7 0 0 1-14 0v-1" stroke="#c0392b" stroke-width="2"/><path d="M9 16v2a3 3 0 0 0 6 0v-2" stroke="#c0392b" stroke-width="2"/><line x1="4" y1="4" x2="20" y2="20" stroke="#c0392b" stroke-width="2"/></svg>`
        : `<svg viewBox="0 0 24 24" fill="none"><path d="M16 12V8a4 4 0 0 0-8 0v4" stroke="#2ecc71" stroke-width="2"/><path d="M19 12v1a7 7 0 0 1-14 0v-1" stroke="#2ecc71" stroke-width="2"/><path d="M9 16v2a3 3 0 0 0 6 0v-2" stroke="#2ecc71" stroke-width="2"/></svg>`;
}

function getSpeakerIcon(isMuted) {
    return isMuted
        ? `<svg viewBox="0 0 24 24" fill="none"><path d="M3 9v6h4l5 5V4L7 9H3z" stroke="#c0392b" stroke-width="2"/><line x1="1" y1="1" x2="23" y2="23" stroke="#c0392b" stroke-width="2"/></svg>`
        : `<svg viewBox="0 0 24 24" fill="none"><path d="M3 9v6h4l5 5V4L7 9H3z" stroke="#fff" stroke-width="2"/><path d="M16 8a4 4 0 0 1 0 8" stroke="#fff" stroke-width="2"/></svg>`;
}

// --- Audio ---
function setupMicAnalyzer(stream) {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(stream);
    source.connect(analyser);
    analyser.fftSize = 256;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
}

function updateMicAnalyzerUI() {
    const levelText = document.getElementById('mic-level-text');
    const statusIndicator = document.getElementById('mic-status-indicator');
    const levelBlocks = document.querySelectorAll('.level-block');
    if (!levelText || !statusIndicator || !levelBlocks) return;

    statusIndicator.classList.toggle('active', !isMuted);
    if (isMuted) {
        const t = translations[currentLanguage];
        levelText.textContent = t.muted;
        levelBlocks.forEach(block => block.classList.remove('active'));
        return;
    }
    const t = translations[currentLanguage];
    levelText.textContent = `${t.inputLevel}: ${Math.round(micLevel)}%`;
    levelBlocks.forEach(block => {
        block.classList.toggle('active', micLevel >= parseInt(block.dataset.level));
    });
}

function initVoiceChat() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            localStream = stream;
            localStream.getAudioTracks().forEach(track => { track.enabled = !isMuted; });
            updateMicButton();
            updateMicAnalyzerUI();
            setupMicAnalyzer(stream);
            
            peer = new Peer(undefined, {
                host: window.location.hostname,
                port: window.location.port || (window.location.protocol === 'https:' ? '443' : '80'),
                path: '/peerjs',
                secure: window.location.protocol === 'https:',
                debug: 3,
                config: {
                    'iceServers': [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' }
                    ]
                }
            });

            peer.on('open', id => {
                socket.emit('peerIdReady', { peerId: id });
            });

            peer.on('error', err => {
                console.error('PeerJSエラー: ', err);
                // 接続エラーの場合は再試行
                if (err.type === 'peer-unavailable' || err.type === 'network') {
                    setTimeout(() => {
                        if (peer && !peer.destroyed) {
                            console.log('PeerJS接続を再試行中...');
                        }
                    }, 5000);
                }
            });

            peer.on('call', call => {
                call.answer(localStream);
                setupCallEvents(call);
            });
        })
        .catch(err => {
            alert('マイクの取得に失敗しました。ページを再読み込みして、マイクへのアクセスを許可してください。');
        });
}

function setupCallEvents(call) {
                call.on('stream', remoteStream => {
                    playRemoteStream(call.peer, remoteStream);
                });
                call.on('close', () => {
                    cleanupAudioElement(call.peer);
        delete mediaConnections[call.peer];
                });
     call.on('error', (err) => {
        cleanupAudioElement(call.peer);
        delete mediaConnections[call.peer];
            });
    mediaConnections[call.peer] = call;
} 

function playRemoteStream(peerId, stream) {
    cleanupAudioElement(peerId);
    
    const audio = document.createElement('audio');
    audio.srcObject = stream;
    audio.autoplay = true;
    
    // Mute state is now determined only by the master switch.
    audio.muted = isMasterSpeakerMuted;
    
    // グローバル音量を適用
    audio.volume = globalSpeakerVolume;

    audio.style.display = 'none';
    document.body.appendChild(audio);
    audioElements[peerId] = audio;
}

function cleanupAudioElement(peerId) {
    if (audioElements[peerId]) {
        audioElements[peerId].remove();
        delete audioElements[peerId];
    }
}

function updateAllConnections() {
    if (!peer || !localStream) return;
    
    const allPeerIds = Array.from(players.values()).map(p => p.peerId).filter(Boolean);

    // Call new peers
    allPeerIds.forEach(peerId => {
        if (peerId !== (localPlayer ? localPlayer.peerId : null) && !mediaConnections[peerId]) {
            const call = peer.call(peerId, localStream);
            if(call) setupCallEvents(call);
        }
    });

    // Clean up old connections
    Object.keys(mediaConnections).forEach(peerId => {
        if (!allPeerIds.includes(peerId)) {
            mediaConnections[peerId].close();
        }
    });
}

function toggleMute() {
    if (!localStream) return;
    isMuted = !isMuted;
    localStream.getAudioTracks().forEach(track => { track.enabled = !isMuted; });
    updateMicButton();
    socket.emit('micStateChanged', { isMuted: isMuted });
}

function updateMicButton() {
    const img = micBtn.querySelector('img');
    if (!img) return;
    if (isMuted) {
        img.src = 'icons/mute.png';
        img.alt = 'アンミュート';
        micBtn.title = 'アンミュート';
    } else {
        img.src = 'icons/mic.png';
        img.alt = 'ミュート';
        micBtn.title = 'ミュート';
    }
} 

function showEmojiMenu() {
    emojiMenu.style.display = 'flex';
}
function hideEmojiMenu() {
    emojiMenu.style.display = 'none';
}
function renderEmojiMenu() {
    emojiMenu.innerHTML = '';
    EMOJI_LIST.forEach(emoji => {
        const btn = document.createElement('button');
        btn.textContent = emoji;
        btn.style.fontSize = '2rem';
        btn.style.background = 'none';
        btn.style.border = 'none';
        btn.style.cursor = 'pointer';
        btn.style.padding = '8px';
        btn.style.borderRadius = '8px';
        btn.style.transition = 'background 0.2s';
        btn.addEventListener('mouseenter', () => btn.style.background = 'rgba(0,0,0,0.08)');
        btn.addEventListener('mouseleave', () => btn.style.background = 'none');
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            hideEmojiMenu();
            if (socket && localPlayer && emoji) {
                socket.emit('sendEmoji', { emoji });
            }
        });
        emojiMenu.appendChild(btn);
    });
} 

function showPlayerEmoji(playerId, emoji) {
    // 既存タイマーがあればクリア
    if (playerEmojis.has(playerId)) {
        clearTimeout(playerEmojis.get(playerId).timeoutId);
    }
    playerEmojis.set(playerId, {
        emoji,
        timeoutId: setTimeout(() => {
            playerEmojis.delete(playerId);
        }, 3000)
    });
}

// Three.js描画ループ内で、各プレイヤーの頭上に絵文字を描画するdiv管理
function renderPlayerEmojis() {
    // 既存のdivを一旦非表示
    emojiDivs.forEach(div => div.style.display = 'none');
    playerEmojis.forEach((data, playerId) => {
        let mesh;
        if (playerId === playerID && localPlayerMesh) {
            mesh = localPlayerMesh;
        } else if (players.has(playerId)) {
            mesh = players.get(playerId).mesh;
        }
        if (!mesh) return;
        let div = emojiDivs.get(playerId);
        if (!div) {
            div = document.createElement('div');
            div.style.position = 'absolute';
            div.style.fontSize = '2.2rem';
            div.style.pointerEvents = 'none';
            div.style.transition = 'opacity 0.2s';
            div.style.opacity = '1';
            div.style.zIndex = '3000';
            document.body.appendChild(div);
            emojiDivs.set(playerId, div);
        }
        div.textContent = data.emoji;
        // 3D座標→2D座標変換
        const pos = mesh.position.clone();
        pos.y += 1.7; // 頭上（少し下げる）
        const vector = pos.project(camera);
        const x = (vector.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-vector.y * 0.5 + 0.5) * window.innerHeight;
        div.style.left = `${x - 20}px`;
        div.style.top = `${y - 40}px`;
        div.style.display = 'block';
    });
} 

// --- PDFペン描画 ---
// 座標変換関数: 表示座標 → PDFキャンバス内座標
function screenToPdfCoords(screenX, screenY) {
    if (!pdfFullscreenCanvas || !pdfCanvas) return { x: 0, y: 0 };
    
    const canvas = pdfFullscreenCanvas;
    const pageAspectRatio = originalPdfWidth / originalPdfHeight;
    const canvasAspectRatio = canvas.width / canvas.height;
    
    let renderWidth, renderHeight, renderX, renderY;
    
    if (pageAspectRatio > canvasAspectRatio) {
        renderWidth = canvas.width;
        renderHeight = canvas.width / pageAspectRatio;
        renderX = 0;
        renderY = (canvas.height - renderHeight) / 2;
    } else {
        renderHeight = canvas.height;
        renderWidth = canvas.height * pageAspectRatio;
        renderY = 0;
        renderX = (canvas.width - renderWidth) / 2;
    }
    
    // 表示座標を正規化（0-1）
    const normalizedX = screenX / canvas.width;
    const normalizedY = screenY / canvas.height;
    
    // 逆変換: 表示座標 → PDF座標
    // 1. キャンバス中心からのオフセットを計算
    const centerOffsetX = (normalizedX - 0.5) * canvas.width;
    const centerOffsetY = (normalizedY - 0.5) * canvas.height;
    
    // 2. ズーム・パンの逆変換
    const unzoomedX = (centerOffsetX - pdfOffsetX) / pdfZoomLevel;
    const unzoomedY = (centerOffsetY - pdfOffsetY) / pdfZoomLevel;
    
    // 3. キャンバス座標に戻す
    const canvasX = unzoomedX + canvas.width / 2;
    const canvasY = unzoomedY + canvas.height / 2;
    
    // 4. PDF描画領域内の座標に変換
    const pdfX = (canvasX - renderX) / renderWidth * originalPdfWidth;
    const pdfY = (canvasY - renderY) / renderHeight * originalPdfHeight;
    
    return { x: pdfX, y: pdfY };
}

// 座標変換関数: PDFキャンバス内座標 → 表示座標
function pdfToScreenCoords(pdfX, pdfY) {
    if (!pdfFullscreenCanvas || !pdfCanvas) return { x: 0, y: 0 };
    
    const canvas = pdfFullscreenCanvas;
    const pageAspectRatio = originalPdfWidth / originalPdfHeight;
    const canvasAspectRatio = canvas.width / canvas.height;
    
    let renderWidth, renderHeight, renderX, renderY;
    
    if (pageAspectRatio > canvasAspectRatio) {
        renderWidth = canvas.width;
        renderHeight = canvas.width / pageAspectRatio;
        renderX = 0;
        renderY = (canvas.height - renderHeight) / 2;
    } else {
        renderHeight = canvas.height;
        renderWidth = canvas.height * pageAspectRatio;
        renderY = 0;
        renderX = (canvas.width - renderWidth) / 2;
    }
    
    // PDF座標を描画領域座標に変換
    const renderX_coord = (pdfX / originalPdfWidth) * renderWidth + renderX;
    const renderY_coord = (pdfY / originalPdfHeight) * renderHeight + renderY;
    
    // キャンバス中心からのオフセットに変換
    const centerOffsetX = renderX_coord - canvas.width / 2;
    const centerOffsetY = renderY_coord - canvas.height / 2;
    
    // ズーム・パンを適用
    const zoomedX = centerOffsetX * pdfZoomLevel + pdfOffsetX;
    const zoomedY = centerOffsetY * pdfZoomLevel + pdfOffsetY;
    
    // 表示座標に変換
    const screenX = (zoomedX + canvas.width / 2) / canvas.width;
    const screenY = (zoomedY + canvas.height / 2) / canvas.height;
    
    return { x: screenX, y: screenY };
}

function setupPDFPen() {
    penBtn = document.getElementById('pdf-pen-btn');
    if (!penBtn || !pdfFullscreenCanvas) return;
    penBtn.addEventListener('click', () => {
        isPenMode = !isPenMode;
        penBtn.style.background = isPenMode ? '#ff4e00' : '#00000099';
        // ペンモード切り替え時にカーソルを更新
        if (isPenMode) {
            pdfFullscreenCanvas.style.cursor = 'crosshair';
        } else {
            pdfFullscreenCanvas.style.cursor = 'grab';
        }
    });
    pdfFullscreenCanvas.addEventListener('mousedown', (e) => {
        if (!isPenMode) return;
        isDrawing = true;
        pdfCanvasRect = pdfFullscreenCanvas.getBoundingClientRect();
        
        // マウス座標をPDFキャンバス内座標に変換
        const mouseX = e.clientX - pdfCanvasRect.left;
        const mouseY = e.clientY - pdfCanvasRect.top;
        const pdfCoords = screenToPdfCoords(mouseX, mouseY);
        
        currentLine = [pdfCoords];
    });
    pdfFullscreenCanvas.addEventListener('mousemove', (e) => {
        if (!isPenMode || !isDrawing || !currentLine) return;
        
        // マウス座標をPDFキャンバス内座標に変換
        const mouseX = e.clientX - pdfCanvasRect.left;
        const mouseY = e.clientY - pdfCanvasRect.top;
        const pdfCoords = screenToPdfCoords(mouseX, mouseY);
        
        currentLine.push(pdfCoords);
        renderPDFFullscreen();
        drawLineOnCanvas(currentLine, 'red');
    });
    pdfFullscreenCanvas.addEventListener('mouseup', () => {
        if (!isPenMode || !isDrawing || !currentLine || currentLine.length < 2) {
            isDrawing = false; currentLine = null; return;
        }
        isDrawing = false;
        
        // 線オブジェクトにタイムスタンプを付与（PDF座標で保存）
        const lineData = { points: currentLine, color: 'red', ts: Date.now() };
        penLines.push(lineData);
        
        // サーバー送信（PDF座標で送信）
        if (socket) socket.emit('drawLine', { points: currentLine, color: 'red', ts: lineData.ts });
        
        // 5秒後に消去（タイムスタンプで特定）
        setTimeout(() => {
            penLines = penLines.filter(l => l.ts !== lineData.ts);
            renderPDFFullscreen();
            drawAllPenLines();
        }, 5000);
        
        currentLine = null;
        renderPDFFullscreen();
        drawAllPenLines();
    });
}
function drawLineOnCanvas(line, color) {
    if (!pdfFullscreenCanvas) return;
    const ctx = pdfFullscreenCanvas.getContext('2d');
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    line.forEach((pt, i) => {
        // PDFキャンバス内座標を表示座標に変換
        const screenCoords = pdfToScreenCoords(pt.x, pt.y);
        const x = screenCoords.x * pdfFullscreenCanvas.width;
        const y = screenCoords.y * pdfFullscreenCanvas.height;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    });
    ctx.stroke();
    ctx.restore();
}
function drawAllPenLines() {
    penLines.forEach(l => drawLineOnCanvas(l.points, l.color));
}
// PDF描画時に線も描画
const origRenderPDFFullscreen = renderPDFFullscreen;
renderPDFFullscreen = function() {
    origRenderPDFFullscreen();
    drawAllPenLines();
    if (isDrawing && currentLine) drawLineOnCanvas(currentLine, 'red');
};
// サーバーから線を受信
if (typeof socket !== 'undefined') {
    socket.on('drawLine', (data) => {
        if (!data || !Array.isArray(data.points)) return;
        
        // タイムスタンプが存在しない場合は新しく生成
        const ts = data.ts || Date.now();
        penLines.push({ points: data.points, color: data.color || 'red', ts: ts });
        renderPDFFullscreen();
        
        setTimeout(() => {
            penLines = penLines.filter(l => l.ts !== ts);
            renderPDFFullscreen();
            drawAllPenLines();
        }, 5000);
    });
}
// PDF初期化時にペンセットアップ
const origInitPDF = initPDF;
initPDF = function() { origInitPDF(); setupPDFPen(); }; 

// メンション機能の処理
function handleChatInput(e) {
    const input = e.target.value;
    const cursorPos = e.target.selectionStart;
    
    // @が入力されたかチェック
    const beforeCursor = input.substring(0, cursorPos);
    const atMatch = beforeCursor.match(/@([^@\s]*)$/);
    
    if (atMatch) {
        // メンションモード開始
        isMentionMode = true;
        selectedMentionIndex = -1;
        const searchTerm = atMatch[1].toLowerCase();
        showMentionList(searchTerm);
    } else {
        // メンションモード終了
        hideMentionList();
    }
}

function handleMentionKeydown(e) {
    if (!isMentionMode) return;
    
    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            selectNextMention();
            break;
        case 'ArrowUp':
            e.preventDefault();
            selectPrevMention();
            break;
        case 'Enter':
            if (selectedMentionIndex >= 0) {
                e.preventDefault();
                selectMentionPlayer();
            }
            break;
        case 'Escape':
            e.preventDefault();
            hideMentionList();
            break;
    }
}

function showMentionList(searchTerm) {
    if (!mentionList || !mentionPlayers) return;
    
    // プレイヤーリストを取得（自分以外）
    const allPlayers = Array.from(players.values()).concat([localPlayer]).filter(Boolean);
    const filteredPlayers = allPlayers.filter(player => 
        player.nameID.toLowerCase().includes(searchTerm) && 
        player.nameID !== localPlayer?.nameID
    );
    
    if (filteredPlayers.length === 0) {
        hideMentionList();
        return;
    }
    
    // プレイヤー一覧を表示
    mentionPlayers.innerHTML = '';
    filteredPlayers.forEach((player, index) => {
        const item = document.createElement('div');
        item.className = 'mention-player-item';
        item.textContent = player.nameID;
        item.addEventListener('click', () => {
            mentionTargetPlayer = player;
            insertMention(player.nameID);
            hideMentionList();
        });
        mentionPlayers.appendChild(item);
    });
    
    mentionList.style.display = 'block';
    selectedMentionIndex = -1;
    updateMentionSelection();
}

function hideMentionList() {
    if (mentionList) {
        mentionList.style.display = 'none';
    }
    isMentionMode = false;
    selectedMentionIndex = -1;
    mentionTargetPlayer = null;
}

function selectNextMention() {
    const items = mentionPlayers.querySelectorAll('.mention-player-item');
    if (items.length === 0) return;
    
    selectedMentionIndex = (selectedMentionIndex + 1) % items.length;
    updateMentionSelection();
}

function selectPrevMention() {
    const items = mentionPlayers.querySelectorAll('.mention-player-item');
    if (items.length === 0) return;
    
    selectedMentionIndex = selectedMentionIndex <= 0 ? items.length - 1 : selectedMentionIndex - 1;
    updateMentionSelection();
}

function updateMentionSelection() {
    const items = mentionPlayers.querySelectorAll('.mention-player-item');
    items.forEach((item, index) => {
        item.classList.toggle('selected', index === selectedMentionIndex);
    });
}

function selectMentionPlayer() {
    const items = mentionPlayers.querySelectorAll('.mention-player-item');
    if (selectedMentionIndex >= 0 && selectedMentionIndex < items.length) {
        const playerName = items[selectedMentionIndex].textContent;
        const player = Array.from(players.values()).concat([localPlayer]).find(p => p.nameID === playerName);
        if (player) {
            mentionTargetPlayer = player;
            insertMention(playerName);
            hideMentionList();
        }
    }
}

function insertMention(playerName) {
    const input = chatInput;
    const cursorPos = input.selectionStart;
    const value = input.value;
    
    // @以降を@playerNameに置換
    const beforeCursor = value.substring(0, cursorPos);
    const afterCursor = value.substring(cursorPos);
    const atMatch = beforeCursor.match(/@([^@\s]*)$/);
    
    if (atMatch) {
        const newValue = beforeCursor.replace(/@([^@\s]*)$/, `@${playerName} `) + afterCursor;
        input.value = newValue;
        input.focus();
        input.setSelectionRange(cursorPos + playerName.length + 2, cursorPos + playerName.length + 2);
    }
} 

// メンション通知の波紋アニメーションを表示
function showMentionNotification() {
    if (!mentionNotifications) return;
    
    // 波紋アニメーションを表示
    const ripple = document.createElement('div');
    ripple.className = 'mention-notification';
    
    mentionNotifications.appendChild(ripple);
    
    // メンション音声を再生
    if (mentionSound) {
        mentionSound.currentTime = 0; // 音声を最初から再生
        mentionSound.play().catch(err => {
            console.log('メンション音声の再生に失敗しました:', err);
        });
    }
    
    // アニメーション終了後に要素を削除
    setTimeout(() => {
        if (ripple.parentNode) {
            ripple.parentNode.removeChild(ripple);
        }
    }, 2000);
}

// 音声デバイス一覧を取得して設定画面に表示
async function loadAudioDevices() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        
        const micDevices = devices.filter(device => device.kind === 'audioinput');
        const speakerDevices = devices.filter(device => device.kind === 'audiooutput');
        
        // マイクデバイス一覧を設定
        const micDeviceSelect = document.getElementById('micDevice');
        if (micDeviceSelect) {
            const t = translations[currentLanguage];
            micDeviceSelect.innerHTML = '<option value="">' + t.default + '</option>';
            micDevices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label || `${t.micDeviceLabel} ${device.deviceId.slice(0, 8)}`;
                micDeviceSelect.appendChild(option);
            });
        }
        
        // スピーカーデバイス一覧を設定
        const speakerDeviceSelect = document.getElementById('speakerDevice');
        if (speakerDeviceSelect) {
            const t = translations[currentLanguage];
            speakerDeviceSelect.innerHTML = '<option value="">' + t.default + '</option>';
            speakerDevices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label || `${t.speakerDeviceLabel} ${device.deviceId.slice(0, 8)}`;
                speakerDeviceSelect.appendChild(option);
            });
        }
        
        // デバイス変更イベントを監視
        navigator.mediaDevices.addEventListener('devicechange', () => {
            loadAudioDevices();
        });
        
    } catch (error) {
        console.error('音声デバイスの取得に失敗しました:', error);
    }
}

// 指定されたデバイスで音声チャットを初期化
async function initVoiceChatWithDevices(micDeviceId = '', speakerDeviceId = '') {
    try {
        const constraints = {
            audio: {
                deviceId: micDeviceId ? { exact: micDeviceId } : undefined,
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        localStream = stream;
        localStream.getAudioTracks().forEach(track => { track.enabled = !isMuted; });
    updateMicButton();
        updateMicAnalyzerUI();
        setupMicAnalyzer(stream);
        
        // PeerJSの再初期化
        if (peer) {
            peer.destroy();
        }
        
        peer = new Peer(undefined, {
            host: window.location.hostname,
            port: window.location.port || (window.location.protocol === 'https:' ? '443' : '80'),
            path: '/peerjs',
            secure: window.location.protocol === 'https:',
            debug: 3,
            config: {
                'iceServers': [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' }
                ]
            }
        });

        peer.on('open', id => {
            socket.emit('peerIdReady', { peerId: id });
        });

        peer.on('error', err => {
            console.error('PeerJSエラー: ', err);
            // 接続エラーの場合は再試行
            if (err.type === 'peer-unavailable' || err.type === 'network') {
                setTimeout(() => {
                    if (peer && !peer.destroyed) {
                        console.log('PeerJS接続を再試行中...');
                    }
                }, 5000);
            }
        });

        peer.on('call', call => {
            call.answer(localStream);
            setupCallEvents(call);
        });
        
        // 既存の接続を更新
        updateAllConnections();
        
    } catch (error) {
        console.error('音声デバイスの初期化に失敗しました:', error);
        alert('選択された音声デバイスの初期化に失敗しました。デフォルトデバイスを使用します。');
        // デフォルトデバイスで再試行
        initVoiceChat();
    }
}

// マイク音量を適用
function applyMicVolume(volume) {
    if (!localStream) return;
    
    const volumeLevel = volume / 100;
    
    // AudioContextを使用した音量制御（より確実）
    if (audioContext) {
        // 既存のGainNodeがあれば削除
        if (window.micGainNode) {
            window.micGainNode.disconnect();
        }
        
        // 新しいGainNodeを作成
        window.micGainNode = audioContext.createGain();
        window.micGainNode.gain.value = volumeLevel;
        
        // 音声ソースを再作成
        const source = audioContext.createMediaStreamSource(localStream);
        source.disconnect();
        source.connect(window.micGainNode);
        window.micGainNode.connect(analyser);
    }
    
    // MediaStreamTrackの音量制御（サポートされている場合）
    const audioTracks = localStream.getAudioTracks();
    audioTracks.forEach(track => {
        if (track.getSettings && track.applyConstraints) {
            track.applyConstraints({
                volume: volumeLevel
            }).catch(err => {
                // エラーは無視（サポートされていない場合がある）
            });
        }
    });
    
    console.log('マイク音量を設定:', volume);
}

// スピーカー音量を適用
function applySpeakerVolume(volume) {
    const volumeLevel = volume / 100;
    
    // 既存の音声要素の音量を設定
    Object.values(audioElements).forEach(audio => {
        audio.volume = volumeLevel;
    });
    
    // 新しい音声要素が作成された時にも音量を適用するためのフラグ
    globalSpeakerVolume = volumeLevel;
    
    console.log('スピーカー音量を設定:', volume);
}

// 言語制御のイベントリスナーを設定
function setupLanguageControl() {
    const languageSelect = document.getElementById('language');
    if (languageSelect) {
        languageSelect.addEventListener('change', (e) => {
            const newLanguage = e.target.value;
            if (newLanguage !== currentLanguage) {
                currentLanguage = newLanguage;
                updateUILanguage();
            }
        });
    }
}

// UI言語を更新
function updateUILanguage() {
    const t = translations[currentLanguage];
    
    // 設定モーダルのタイトル
    const settingsTitle = document.querySelector('#settings-header h3');
    if (settingsTitle) settingsTitle.textContent = t.settings;
    
    // 設定カテゴリー
    const categories = document.querySelectorAll('.settings-category');
    categories.forEach(cat => {
        const section = cat.getAttribute('data-section');
        switch(section) {
            case 'general':
                cat.textContent = t.general;
                break;
            case 'audio':
                cat.textContent = t.audio;
                break;
            case 'video':
                cat.textContent = t.video;
                break;
            case 'network':
                cat.textContent = t.network;
                break;
        }
    });
    
    // 設定セクションのタイトル
    const sectionTitles = document.querySelectorAll('.settings-section h4');
    sectionTitles.forEach(title => {
        const section = title.closest('.settings-section');
        if (section.id === 'general-section') title.textContent = t.general;
        else if (section.id === 'audio-section') title.textContent = t.audio;
        else if (section.id === 'video-section') title.textContent = t.video;
        else if (section.id === 'network-section') title.textContent = t.network;
    });
    
    // 設定項目のラベル
    updateSettingLabels(t);
    
    // メインUI要素
    updateMainUI(t);
    
    // プレイヤーリスト
    updatePlayerListUI(t);
    
    // チャットUI
    updateChatUI(t);
    
    // その他のUI要素
    updateOtherUI(t);
}

// 設定項目のラベルを更新
function updateSettingLabels(t) {
    // 言語設定
    const languageLabel = document.querySelector('label[for="language"]');
    if (languageLabel) languageLabel.textContent = t.language + ':';
    
    // 音声設定
    const micDeviceLabel = document.querySelector('label[for="micDevice"]');
    if (micDeviceLabel) micDeviceLabel.textContent = t.micDevice + ':';
    
    const speakerDeviceLabel = document.querySelector('label[for="speakerDevice"]');
    if (speakerDeviceLabel) speakerDeviceLabel.textContent = t.speakerDevice + ':';
    
    const micVolumeLabel = document.querySelector('label[for="micVolume"]');
    if (micVolumeLabel) micVolumeLabel.textContent = t.micVolume + ':';
    
    const speakerVolumeLabel = document.querySelector('label[for="speakerVolume"]');
    if (speakerVolumeLabel) speakerVolumeLabel.textContent = t.speakerVolume + ':';
    
    const voiceChatLabel = document.querySelector('label[for="voiceChat"]');
    if (voiceChatLabel) voiceChatLabel.textContent = t.voiceChat + ':';
    
    // 動画設定
    const videoQualityLabel = document.querySelector('label[for="videoQuality"]');
    if (videoQualityLabel) videoQualityLabel.textContent = t.videoQuality + ':';
    
    const fpsLimitLabel = document.querySelector('label[for="fpsLimit"]');
    if (fpsLimitLabel) fpsLimitLabel.textContent = t.fpsLimit + ':';
    
    // ネットワーク設定
    const peerJsServerLabel = document.querySelector('label[for="peerJsServer"]');
    if (peerJsServerLabel) peerJsServerLabel.textContent = t.peerJsServer + ':';
    
    const iceServersLabel = document.querySelector('label[for="iceServers"]');
    if (iceServersLabel) iceServersLabel.textContent = t.iceServers + ':';
    
    // 説明文
    updateSettingDescriptions(t);
}

// 設定項目の説明文を更新
function updateSettingDescriptions(t) {
    const descriptions = document.querySelectorAll('.setting-description');
    descriptions.forEach(desc => {
        const settingItem = desc.closest('.setting-item');
        const label = settingItem.querySelector('label');
        if (label) {
            const forAttr = label.getAttribute('for');
            switch(forAttr) {
                case 'micDevice':
                    desc.textContent = t.micDeviceDesc;
                    break;
                case 'speakerDevice':
                    desc.textContent = t.speakerDeviceDesc;
                    break;
                case 'micVolume':
                    desc.textContent = t.micVolumeDesc;
                    break;
                case 'speakerVolume':
                    desc.textContent = t.speakerVolumeDesc;
                    break;
                case 'voiceChat':
                    desc.textContent = t.voiceChatDesc;
                    break;
            }
        }
    });
}

// メインUI要素を更新
function updateMainUI(t) {
    // ローディング
    const loading = document.getElementById('loading');
    if (loading) loading.textContent = t.loading;
    
    // 情報パネル
    const playerNameLabel = document.querySelector('#info div:first-child');
    if (playerNameLabel) playerNameLabel.textContent = t.playerNameLabel + ': ';
    
    const onlineCountLabel = document.querySelector('#info div:nth-child(2)');
    if (onlineCountLabel) onlineCountLabel.textContent = t.onlineCount + ': ';
    
    const positionLabel = document.querySelector('#info div:last-child');
    if (positionLabel) {
        // span要素を保持して、ラベルのみを更新
        const positionSpan = positionLabel.querySelector('#position');
        if (positionSpan) {
            positionLabel.innerHTML = t.position + ': <span id="position">' + positionSpan.textContent + '</span>';
        } else {
            positionLabel.textContent = t.position + ': ';
        }
    }
    
    // 操作説明（完全多言語化）
    updateControlsUI(t);
    
    const clickNote = document.querySelector('#controls div[data-controls-note]');
    if (clickNote) clickNote.textContent = t.clickNote;
    
    // ポスターホットスポット
    const posterHotspot = document.getElementById('poster-hotspot');
    if (posterHotspot) posterHotspot.textContent = t.posterHotspot;
    
    // PDFヘルプテキスト
    const pdfHelpText = document.getElementById('pdf-help-text');
    if (pdfHelpText) pdfHelpText.textContent = t.pdfHelp;
}

// #controlsの内容を完全に再生成する
function updateControlsUI(t) {
    const controls = document.getElementById('controls');
    if (!controls) return;
    controls.innerHTML = '';
    // タイトル
    const h3 = document.createElement('h3');
    h3.style.margin = '0 0 5px 0';
    h3.style.fontWeight = '600';
    h3.textContent = t.controls;
    controls.appendChild(h3);
    // 1行目: 移動/視点回転
    const row1 = document.createElement('div');
    row1.className = 'controls-row';
    row1.innerHTML =
        `<span>${t.movement}: <span class="key">${t.keyW}</span><span class="key">${t.keyA}</span><span class="key">${t.keyS}</span><span class="key">${t.keyD}</span></span>` +
        `<span style="margin-left: 20px;">${t.viewRotation}: <span class="key">${t.keyClick}</span></span>`;
    controls.appendChild(row1);
    // 2行目: ポスター/ジャンプ
    const row2 = document.createElement('div');
    row2.className = 'controls-row';
    row2.innerHTML =
        `<span>${t.posterView}: <span class="key">${t.keyE}</span></span>` +
        `<span style="margin-left: 20px;">${t.jump}: <span class="key">${t.keySpace}</span></span>`;
    controls.appendChild(row2);
    // 注意書き
    const note = document.createElement('div');
    note.setAttribute('data-controls-note', '1');
    note.style.fontSize = '12px';
    note.style.opacity = '0.8';
    note.style.marginTop = '5px';
    note.textContent = t.clickNote;
    controls.appendChild(note);
}

// プレイヤーリストUIを更新
function updatePlayerListUI(t) {
    const playerListHeader = document.querySelector('#player-list-container h4 span');
    if (playerListHeader) playerListHeader.textContent = t.participants;
    
    const minimizeBtn = document.getElementById('player-list-minimize-btn');
    if (minimizeBtn) minimizeBtn.title = t.minimize;
    
    // プレイヤーリストの項目を更新
    const playerItems = document.querySelectorAll('.player-item');
    playerItems.forEach(item => {
        const playerName = item.querySelector('.player-name');
        if (playerName) {
            // 日本語から英語、または英語から日本語に置換
            if (playerName.textContent.includes('(あなた)')) {
                playerName.textContent = playerName.textContent.replace('(あなた)', t.you);
            } else if (playerName.textContent.includes('(You)')) {
                playerName.textContent = playerName.textContent.replace('(You)', t.you);
            }
        }
    });
}

// チャットUIを更新
function updateChatUI(t) {
    const chatHeader = document.querySelector('#chat-header span');
    if (chatHeader) chatHeader.textContent = '💬 ' + t.chat;
    
    const chatInput = document.getElementById('chat-input');
    if (chatInput) chatInput.placeholder = t.messageInput;
    
    const mentionListHeader = document.querySelector('#mention-list div:first-child');
    if (mentionListHeader) mentionListHeader.textContent = t.selectPlayer;
}

// その他のUI要素を更新
function updateOtherUI(t) {
    // マイクアナライザー
    const micLevelText = document.getElementById('mic-level-text');
    if (micLevelText) {
    if (isMuted) {
            micLevelText.textContent = t.muted;
    } else {
            micLevelText.textContent = t.inputLevel + ': ' + Math.round(micLevel) + '%';
        }
    }
    
    // ログアウトモーダル
    const logoutTitle = document.querySelector('#logout-modal h3');
    if (logoutTitle) logoutTitle.textContent = t.logoutConfirm;
    
    const logoutMessage = document.querySelector('#logout-modal p');
    if (logoutMessage) logoutMessage.innerHTML = t.logoutMessage.replace('\n', '<br>');
    
    const cancelBtn = document.getElementById('logout-cancel-btn');
    if (cancelBtn) cancelBtn.textContent = t.cancel;
    
    const confirmBtn = document.getElementById('logout-confirm-btn');
    if (confirmBtn) confirmBtn.textContent = t.confirm;
    
    // ボタンのタイトル
    updateButtonTitles(t);
}

// ボタンのタイトルを更新
function updateButtonTitles(t) {
    const micBtn = document.getElementById('mic-btn');
    if (micBtn) {
        micBtn.title = isMuted ? t.unmute : t.mute;
    }
    
    const speakerBtn = document.getElementById('speaker-btn');
    if (speakerBtn) {
        speakerBtn.title = isMasterSpeakerMuted ? t.speakerMute : t.speakerMuteTitle;
    }
    
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.title = t.logout;
}

// 音量制御のイベントリスナーを設定
function setupVolumeControls() {
    const micVolumeSlider = document.getElementById('micVolume');
    const speakerVolumeSlider = document.getElementById('speakerVolume');
    
    if (micVolumeSlider) {
        micVolumeSlider.addEventListener('input', (e) => {
            const volume = parseInt(e.target.value);
            applyMicVolume(volume);
        });
    }
    
    if (speakerVolumeSlider) {
        speakerVolumeSlider.addEventListener('input', (e) => {
            const volume = parseInt(e.target.value);
            applySpeakerVolume(volume);
        });
    }
}

// 設定タブの初期化
function initSettingsTabs() {
    const categories = document.querySelectorAll('.settings-category');
    const sections = document.querySelectorAll('.settings-section');
    
    categories.forEach(category => {
        category.addEventListener('click', () => {
            const targetSection = category.getAttribute('data-section');
            
            // アクティブクラスを切り替え
            categories.forEach(c => c.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            
            category.classList.add('active');
            document.getElementById(`${targetSection}-section`).classList.add('active');
        });
    });
}

// 設定の読み込み
function loadSettings() {
    const settings = JSON.parse(localStorage.getItem('metaverseSettings') || '{}');
    
    // 各設定項目を読み込み
    const playerNameInput = document.getElementById('playerName');
    if (playerNameInput && settings.playerName) {
        playerNameInput.value = settings.playerName;
    }
    
    const avatarUrlInput = document.getElementById('avatarUrl');
    if (avatarUrlInput && settings.avatarUrl) {
        avatarUrlInput.value = settings.avatarUrl;
    }
    
    const languageSelect = document.getElementById('language');
    if (languageSelect && settings.language) {
        languageSelect.value = settings.language;
    }
    
    const micDeviceSelect = document.getElementById('micDevice');
    if (micDeviceSelect && settings.micDevice) {
        micDeviceSelect.value = settings.micDevice;
    }
    
    const speakerDeviceSelect = document.getElementById('speakerDevice');
    if (speakerDeviceSelect && settings.speakerDevice) {
        speakerDeviceSelect.value = settings.speakerDevice;
    }
    
    const micVolumeInput = document.getElementById('micVolume');
    if (micVolumeInput && settings.micVolume !== undefined) {
        micVolumeInput.value = settings.micVolume;
    }
    
    const speakerVolumeInput = document.getElementById('speakerVolume');
    if (speakerVolumeInput && settings.speakerVolume !== undefined) {
        speakerVolumeInput.value = settings.speakerVolume;
    }
    
    const voiceChatSelect = document.getElementById('voiceChat');
    if (voiceChatSelect && settings.voiceChat) {
        voiceChatSelect.value = settings.voiceChat;
    }
    
    const videoQualitySelect = document.getElementById('videoQuality');
    if (videoQualitySelect && settings.videoQuality) {
        videoQualitySelect.value = settings.videoQuality;
    }
    
    const fpsLimitSelect = document.getElementById('fpsLimit');
    if (fpsLimitSelect && settings.fpsLimit) {
        fpsLimitSelect.value = settings.fpsLimit;
    }
    
    const peerJsServerInput = document.getElementById('peerJsServer');
    if (peerJsServerInput && settings.peerJsServer) {
        peerJsServerInput.value = settings.peerJsServer;
    }
    
    const iceServersTextarea = document.getElementById('iceServers');
    if (iceServersTextarea && settings.iceServers) {
        iceServersTextarea.value = settings.iceServers;
    }
}

// 設定の保存
function saveSettings() {
    const settings = {
        playerName: document.getElementById('playerName')?.value || '',
        avatarUrl: document.getElementById('avatarUrl')?.value || '',
        language: document.getElementById('language')?.value || 'ja',
        micDevice: document.getElementById('micDevice')?.value || '',
        speakerDevice: document.getElementById('speakerDevice')?.value || '',
        micVolume: document.getElementById('micVolume')?.value || 50,
        speakerVolume: document.getElementById('speakerVolume')?.value || 50,
        voiceChat: document.getElementById('voiceChat')?.value || 'on',
        videoQuality: document.getElementById('videoQuality')?.value || 'medium',
        fpsLimit: document.getElementById('fpsLimit')?.value || 60,
        peerJsServer: document.getElementById('peerJsServer')?.value || 'wss://peerjs.com',
        iceServers: document.getElementById('iceServers')?.value || ''
    };
    
    localStorage.setItem('metaverseSettings', JSON.stringify(settings));
    
    // 設定変更を適用
    applySettings(settings);
}

// 設定の適用
function applySettings(settings) {
    // 言語設定の変更
    if (settings.language && settings.language !== currentLanguage) {
        currentLanguage = settings.language;
        updateUILanguage();
    }
    
    // プレイヤー名の変更
    if (settings.playerName && localPlayer) {
        localPlayer.nameID = settings.playerName;
        document.getElementById('playerName').textContent = settings.playerName;
        // サーバーに名前変更を通知
        if (socket) {
            socket.emit('updatePlayerName', { nameID: settings.playerName });
        }
    }
    
    // 音声デバイスの変更
    if (settings.micDevice || settings.speakerDevice) {
        // デバイス変更が必要な場合は再初期化
        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        initVoiceChatWithDevices(settings.micDevice, settings.speakerDevice);
    }
    
    // 音量設定の適用
    if (settings.micVolume !== undefined) {
        applyMicVolume(settings.micVolume);
    }
    
    if (settings.speakerVolume !== undefined) {
        applySpeakerVolume(settings.speakerVolume);
    }
    
    // 音声チャットの設定
    if (settings.voiceChat === 'off' && localStream) {
        localStream.getAudioTracks().forEach(track => track.enabled = false);
    } else if (settings.voiceChat === 'on' && localStream) {
        localStream.getAudioTracks().forEach(track => track.enabled = !isMuted);
    }
} 


