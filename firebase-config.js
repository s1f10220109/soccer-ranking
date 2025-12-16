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
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    
    if (loginSection) loginSection.style.display = 'none';
    if (userInfo) userInfo.style.display = 'block';
    if (userName) userName.textContent = user.displayName || 'ユーザー';
    if (userEmail) userEmail.textContent = user.email;
}

// ログアウト時のUI更新
function updateUIForLoggedOut() {
    const loginSection = document.getElementById('loginSection');
    const userInfo = document.getElementById('userInfo');
    
    if (loginSection) loginSection.style.display = 'block';
    if (userInfo) userInfo.style.display = 'none';
}

// Firestoreにデータを保存
async function saveDataToFirestore() {
    if (!currentUserId) {
        console.log('ログインしていないため、ローカルストレージに保存します');
        saveData(); // 元のローカルストレージ保存
        return;
    }
    
    try {
        // ユーザー専用のドキュメントに保存
        await db.collection('rankings').doc(currentUserId).set({
            teams: teams,
            matches: matches,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            userEmail: currentUserEmail
        });
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
        const doc = await db.collection('rankings').doc(currentUserId).get();
        
        if (doc.exists) {
            const data = doc.data();
            teams = data.teams || [];
            matches = data.matches || [];
            console.log('Firestoreからデータを読み込みました');
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
    } catch (error) {
        console.error('Firestore読み込みエラー:', error);
        // エラー時はローカルストレージから読み込み
        loadData();
    }
}

// リアルタイム同期を有効化（オプション）
function enableRealtimeSync() {
    if (!currentUserId) return;
    
    db.collection('rankings').doc(currentUserId).onSnapshot((doc) => {
        if (doc.exists) {
            const data = doc.data();
            teams = data.teams || [];
            matches = data.matches || [];
            updateTeamSelects();
            displayRanking();
            displayMatchHistory();
            console.log('データが同期されました');
        }
    });
}
