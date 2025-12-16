# Firebase セットアップ手順

Googleアカウントログイン機能を有効化するには、Firebaseプロジェクトの設定が必要です。

## 🔧 セットアップ手順

### **ステップ1: Firebaseプロジェクトを作成**

1. **Firebase Console にアクセス**: https://console.firebase.google.com/

2. **「プロジェクトを追加」をクリック**

3. **プロジェクト名を入力**: 例) `soccer-ranking`

4. **Google アナリティクスを有効化**（オプション）

5. **「プロジェクトを作成」をクリック**

---

### **ステップ2: Authenticationを有効化**

1. 左メニューから **「Authentication」** をクリック

2. **「始める」ボタンをクリック**

3. **「Sign-in method」タブを選択**

4. **「Google」を選択して有効化**:
   - 「有効にする」トグルをON
   - プロジェクトの公開名を入力
   - サポートメールを選択
   - 「保存」をクリック

---

### **ステップ3: Firestoreを有効化**

1. 左メニューから **「Firestore Database」** をクリック

2. **「データベースの作成」をクリック**

3. **セキュリティルールを選択**:
   - 「**テストモードで開始**」を選択（開発中は推奨）
   - 「次へ」をクリック

4. **ロケーションを選択**:
   - `asia-northeast1 (Tokyo)` を選択
   - 「有効にする」をクリック

5. **セキュリティルールを設定**（「ルール」タブ）:

データベース作成後、30日以内に以下のルールに変更してください：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 共有ユーザーかどうかチェックする関数
    function isSharedUser(rankingId) {
      let ranking = get(/databases/$(database)/documents/rankings/$(rankingId));
      let sharedUsers = ranking.data.sharedWith;
      return sharedUsers != null && request.auth.uid in sharedUsers;
    }
    
    match /rankings/{rankingId} {
      // 読み取り・書き込み権限
      allow read, write: if request.auth != null && (
        // 自分のランキング
        request.auth.uid == rankingId ||
        // オーナーのランキング
        request.auth.uid == resource.data.owner ||
        // 共有されているランキング
        isSharedUser(rankingId)
      );
      // 新規作成（最初のログイン時）
      allow create: if request.auth != null && request.auth.uid == rankingId;
    }
  }
}
```

「公開」をクリックして保存

---

### **ステップ4: Webアプリを追加してAPIキーを取得**

1. プロジェクトのホームページに戻る

2. **「</> (Web)」アイコンをクリック**

3. **アプリのニックネームを入力**: 例) `soccer-ranking-web`

4. **「Firebase Hosting」はチェックしない**

5. **「アプリを登録」をクリック**

6. **設定情報が表示されます**:

```javascript
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
```

---

### **ステップ5: APIキーをプロジェクトに設定**

1. **firebase-config.js を開く**

2. **コピーした設定情報で置き換え**:

```javascript
const firebaseConfig = {
    apiKey: "YOUR_API_KEY_HERE",  // ← ここを書き換え
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",  // ← ここを書き換え
    projectId: "YOUR_PROJECT_ID",  // ← ここを書き換え
    storageBucket: "YOUR_PROJECT_ID.appspot.com",  // ← ここを書き換え
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",  // ← ここを書き換え
    appId: "YOUR_APP_ID"  // ← ここを書き換え
};
```

3. **ファイルを保存**

---

### **ステップ6: GitHub Pagesの認証ドメインを追加**

1. Firebase Console の **「Authentication」** → **「Settings」** に移動

2. **「承認済みドメイン」タブを選択**

3. **「ドメインを追加」をクリック**

4. 以下のドメインを追加:
   ```
   s1f10220109.github.io
   ```

5. **「追加」をクリック**

---

### **ステップ7: GitHubにプッシュ**

```bash
git add .
git commit -m "Add Firebase authentication and Firestore sync"
git push
```

---

## ✅ 完了！

数分後、以下のURLでGoogleログイン機能が使えるようになります：
```
https://s1f10220109.github.io/soccer-ranking/
```

## 📱 使い方

### **ログインする**
1. サイトにアクセス
2. 「Googleでログイン」ボタンをクリック
3. Googleアカウントを選択

### **データが自動的に同期される**
- ログイン後、データはFirestoreに自動保存
- 別のデバイスでログインしても同じデータが表示される
- 複数のユーザーがそれぞれ独自のランキングを管理可能

### **ログインせずに使う**
- ログインしなくても、従来通りローカルストレージで使用可能
- データはブラウザに保存され、デバイス間の同期はされません

---

## 🔒 セキュリティ

- 各ユーザーは自分のデータのみアクセス可能
- 他のユーザーのデータは見れません
- APIキーは公開されても問題ありません（Firebase側で制限されています）

---

## 🤝 データ共有機能（今後追加予定）

複数人で同じランキングを編集したい場合は、追加の実装が必要です。
必要であれば、共有機能も実装できます！
