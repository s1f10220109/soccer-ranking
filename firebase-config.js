// Firebase設定ファイル
// 注意: このファイルは後でFirebaseコンソールから取得した実際の設定に置き換える必要があります

// Firebaseの設定
// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDXuwBdfvWtpNTflZB8kuFemlL6owBP1f0",
  authDomain: "soccer-ranking-faca6.firebaseapp.com",
  projectId: "soccer-ranking-faca6",
  storageBucket: "soccer-ranking-faca6.firebasestorage.app",
  messagingSenderId: "1043829599730",
  appId: "1:1043829599730:web:21bba3624a313878938f6b",
  measurementId: "G-PP4XQPS95T"
};
// Firebase初期化
firebase.initializeApp(firebaseConfig);

// Firebase サービスの参照
const auth = firebase.auth();
const db = firebase.firestore();

// Google認証プロバイダー
const googleProvider = new firebase.auth.GoogleAuthProvider();

// 現在のユーザーID
let currentUserId = null;
let currentUserEmail = null;
let currentRankingId = null; // 現在表示しているランキングID（共有対応）

// 認証状態の監視
auth.onAuthStateChanged((user) => {
    if (user) {
        // ログイン済み
        currentUserId = user.uid;
        currentUserEmail = user.email;
        updateUIForLoggedIn(user);
        // Firestoreからデータを読み込む
        loadDataFromFirestore();
    } else {
        // ログアウト状態
        currentUserId = null;
        currentUserEmail = null;
        updateUIForLoggedOut();
    }
});

// Googleログイン
async function loginWithGoogle() {
    try {
        const result = await auth.signInWithPopup(googleProvider);
        console.log('ログイン成功:', result.user.email);
        alert(`ようこそ、${result.user.displayName}さん！`);
    } catch (error) {
        console.error('ログインエラー:', error);
        alert('ログインに失敗しました: ' + error.message);
    }
}

// ログアウト
async function logout() {
    try {
        await auth.signOut();
        console.log('ログアウト成功');
        alert('ログアウトしました');
        // ローカルデータをクリア
        teams = [];
        matches = [];
        displayRanking();
        displayMatchHistory();
    } catch (error) {
        console.error('ログアウトエラー:', error);
        alert('ログアウトに失敗しました');
    }
}

// ログイン時のUI更新
function updateUIForLoggedIn(user) {
    const loginSection = document.getElementById('loginSection');
    const userInfo = document.getElementById('userInfo');
    const shareSection = document.getElementById('shareSection');
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    
    if (loginSection) loginSection.style.display = 'none';
    if (userInfo) userInfo.style.display = 'block';
    if (shareSection) shareSection.style.display = 'block'; // 共有セクションを表示
    if (userName) userName.textContent = user.displayName || 'ユーザー';
    if (userEmail) userEmail.textContent = user.email;
    
    // URL に共有IDがあればロード
    checkForSharedRanking();
}

// ログアウト時のUI更新
function updateUIForLoggedOut() {
    const loginSection = document.getElementById('loginSection');
    const userInfo = document.getElementById('userInfo');
    const shareSection = document.getElementById('shareSection');
    
    if (loginSection) loginSection.style.display = 'block';
    if (userInfo) userInfo.style.display = 'none';
    if (shareSection) shareSection.style.display = 'none'; // 共有セクションを非表示
}

// Firestoreにデータを保存
async function saveDataToFirestore() {
    if (!currentUserId) {
        console.log('ログインしていないため、ローカルストレージに保存します');
        saveData(); // 元のローカルストレージ保存
        return;
    }
    
    try {
        // 共有ランキングか自分のランキングか判定
        const rankingId = currentRankingId || currentUserId;
        
        // ドキュメントを取得して既存データを確認
        const docRef = db.collection('rankings').doc(rankingId);
        const doc = await docRef.get();
        
        const dataToSave = {
            teams: teams,
            matches: matches,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            lastUpdatedBy: currentUserEmail
        };
        
        // 新規作成の場合のみownerとsharedWithを設定
        if (!doc.exists) {
            dataToSave.owner = currentUserId;
            dataToSave.ownerEmail = currentUserEmail;
            dataToSave.sharedWith = []; // 共有ユーザーのUIDリスト（セキュリティルール用）
            dataToSave.sharedUsersInfo = []; // 共有ユーザーの詳細情報（表示用）
        }
        
        await docRef.set(dataToSave, { merge: true });
        console.log('Firestoreへの保存成功');
    } catch (error) {
        console.error('Firestore保存エラー:', error);
        // エラー時はローカルストレージにフォールバック
        saveData();
    }
}

// Firestoreからデータを読み込み
async function loadDataFromFirestore() {
    if (!currentUserId) {
        loadData(); // 元のローカルストレージ読み込み
        return;
    }
    
    try {
        const rankingId = currentRankingId || currentUserId;
        const doc = await db.collection('rankings').doc(rankingId).get();
        
        if (doc.exists) {
            const data = doc.data();
            teams = data.teams || [];
            matches = data.matches || [];
            console.log('Firestoreからデータを読み込みました');
            
            // 共有ユーザーリストを表示
            displaySharedUsers(data);
        } else {
            // 初回ログイン時: ローカルストレージから移行
            loadData();
            if (teams.length > 0 || matches.length > 0) {
                console.log('ローカルデータをFirestoreに移行します');
                await saveDataToFirestore();
            }
        }
        
        updateTeamSelects();
        displayRanking();
        displayMatchHistory();
        enableRealtimeSync(); // リアルタイム同期を有効化
    } catch (error) {
        console.error('Firestore読み込みエラー:', error);
        // エラー時はローカルストレージから読み込み
        loadData();
    }
}

// リアルタイム同期を有効化
function enableRealtimeSync() {
    if (!currentUserId) return;
    
    const rankingId = currentRankingId || currentUserId;
    db.collection('rankings').doc(rankingId).onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            teams = data.teams || [];
            matches = data.matches || [];
            updateTeamSelects();
            displayRanking();
            displayMatchHistory();
            displaySharedUsers(data);
            console.log('データが同期されました');
        }
    });
}

// URLから共有ランキングIDをチェック
function checkForSharedRanking() {
    const urlParams = new URLSearchParams(window.location.search);
    const sharedId = urlParams.get('ranking');
    
    if (sharedId && sharedId !== currentUserId) {
        currentRankingId = sharedId;
        console.log('共有ランキングを読み込みます:', sharedId);
        loadDataFromFirestore();
        addUserToSharedList(sharedId);
    }
}

// 共有リンクを生成
async function generateShareLink() {
    if (!currentUserId) {
        alert('ログインが必要です');
        return;
    }
    
    const rankingId = currentRankingId || currentUserId;
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}?ranking=${rankingId}`;
    
    document.getElementById('shareLinkInput').value = shareUrl;
    document.getElementById('shareLinkDisplay').style.display = 'block';
}

// 共有リンクをコピー
function copyShareLink() {
    const input = document.getElementById('shareLinkInput');
    input.select();
    document.execCommand('copy');
    alert('共有リンクをコピーしました！\nこのリンクを友達に送ってください。');
}

// 共有ユーザーリストに追加
async function addUserToSharedList(rankingId) {
    if (!currentUserId || !currentUserEmail) return;
    
    try {
        const docRef = db.collection('rankings').doc(rankingId);
        const doc = await docRef.get();
        
        if (doc.exists) {
            const data = doc.data();
            const sharedWith = data.sharedWith || [];
            const sharedUsersInfo = data.sharedUsersInfo || [];
            
            // 既に追加されているかチェック
            const alreadyShared = sharedWith.includes(currentUserId);
            
            if (!alreadyShared && data.owner !== currentUserId) {
                // UIDのリストに追加（セキュリティルール用）
                sharedWith.push(currentUserId);
                
                // ユーザー情報を追加（表示用）
                sharedUsersInfo.push({
                    userId: currentUserId,
                    email: currentUserEmail,
                    addedAt: new Date().toISOString()
                });
                
                await docRef.update({
                    sharedWith: sharedWith,
                    sharedUsersInfo: sharedUsersInfo
                });
                
                console.log('共有ユーザーリストに追加されました');
            }
        }
    } catch (error) {
        console.error('共有リスト追加エラー:', error);
    }
}

// 共有ユーザーを表示
function displaySharedUsers(data) {
    const sharedUsersList = document.getElementById('sharedUsersList');
    const sharedUsersContent = document.getElementById('sharedUsersContent');
    
    const sharedUsersInfo = data ? data.sharedUsersInfo || [] : [];
    
    if (!data || sharedUsersInfo.length === 0) {
        if (sharedUsersList) sharedUsersList.style.display = 'none';
        return;
    }
    
    if (sharedUsersList) sharedUsersList.style.display = 'block';
    
    let html = '<ul style="list-style: none; padding: 0;">';
    html += `<li style="padding: 10px; background: #f0f0f0; border-radius: 5px; margin-bottom: 5px;">
                👑 ${data.ownerEmail} (オーナー)
             </li>`;
    
    sharedUsersInfo.forEach(user => {
        html += `<li style="padding: 10px; background: #f9f9f9; border-radius: 5px; margin-bottom: 5px;">
                    👤 ${user.email}
                 </li>`;
    });
    html += '</ul>';
    
    if (sharedUsersContent) sharedUsersContent.innerHTML = html;
}
