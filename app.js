// データ構造
let teams = [];
let matches = [];

// ローカルストレージのキー
const STORAGE_KEYS = {
    TEAMS: 'soccer_ranking_teams',
    MATCHES: 'soccer_ranking_matches'
};

// 試合タイプの重み係数（FIFAランキングに基づく）
const MATCH_WEIGHTS = {
    friendly: 1.0,      // 親善試合
    qualifier: 2.5,     // 予選
    continental: 3.0,   // 大陸選手権
    worldcup: 4.0       // ワールドカップ
};

// 試合タイプの日本語名
const MATCH_TYPE_NAMES = {
    friendly: '親善試合',
    qualifier: '予選',
    continental: '大陸選手権',
    worldcup: 'ワールドカップ'
};

// 初期化
function init() {
    loadData();
    updateTeamSelects();
    displayRanking();
    displayMatchHistory();
    
    // 今日の日付を設定
    document.getElementById('matchDate').valueAsDate = new Date();
}

// データの読み込み
function loadData() {
    const teamsData = localStorage.getItem(STORAGE_KEYS.TEAMS);
    const matchesData = localStorage.getItem(STORAGE_KEYS.MATCHES);
    
    if (teamsData) {
        teams = JSON.parse(teamsData);
    }
    
    if (matchesData) {
        matches = JSON.parse(matchesData);
    }
}

// データの保存
function saveData() {
    localStorage.setItem(STORAGE_KEYS.TEAMS, JSON.stringify(teams));
    localStorage.setItem(STORAGE_KEYS.MATCHES, JSON.stringify(matches));
}

// チームを追加
function addTeam() {
    const teamNameInput = document.getElementById('teamName');
    const teamName = teamNameInput.value.trim();
    
    if (!teamName) {
        alert('チーム名を入力してください');
        return;
    }
    
    // 既存チェック
    if (teams.find(t => t.name === teamName)) {
        alert('このチーム名は既に登録されています');
        return;
    }
    
    // 新しいチームを追加
    const newTeam = {
        id: Date.now(),
        name: teamName,
        points: 1000, // 初期ポイント（FIFAランキングに倣って1000から開始）
        matches: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        goalsFor: 0,
        goalsAgainst: 0
    };
    
    teams.push(newTeam);
    saveData();
    updateTeamSelects();
    displayRanking();
    
    teamNameInput.value = '';
    alert(`${teamName} を追加しました！`);
}

// チーム選択を更新
function updateTeamSelects() {
    const homeSelect = document.getElementById('homeTeam');
    const awaySelect = document.getElementById('awayTeam');
    
    homeSelect.innerHTML = '<option value="">選択してください</option>';
    awaySelect.innerHTML = '<option value="">選択してください</option>';
    
    teams.forEach(team => {
        homeSelect.innerHTML += `<option value="${team.id}">${team.name}</option>`;
        awaySelect.innerHTML += `<option value="${team.id}">${team.name}</option>`;
    });
}

// FIFAランキングポイントの計算
function calculatePoints(teamPoints, opponentPoints, result, matchType) {
    // 基本ポイント
    let points = 0;
    if (result === 'win') {
        points = 3;
    } else if (result === 'draw') {
        points = 1;
    } else {
        points = 0;
    }
    
    // 対戦相手の強さによる補正（ポイント差に基づく）
    const pointsDiff = opponentPoints - teamPoints;
    const strengthFactor = 1 + (pointsDiff / 600);
    
    // 試合タイプの重み
    const weight = MATCH_WEIGHTS[matchType];
    
    // 最終ポイント計算
    const finalPoints = points * strengthFactor * weight;
    
    return Math.round(finalPoints * 10) / 10; // 小数点第1位まで
}

// 試合を記録
function recordMatch() {
    const homeTeamId = parseInt(document.getElementById('homeTeam').value);
    const awayTeamId = parseInt(document.getElementById('awayTeam').value);
    const homeScore = parseInt(document.getElementById('homeScore').value);
    const awayScore = parseInt(document.getElementById('awayScore').value);
    const matchType = document.getElementById('matchType').value;
    const matchDate = document.getElementById('matchDate').value;
    
    // バリデーション
    if (!homeTeamId || !awayTeamId) {
        alert('両方のチームを選択してください');
        return;
    }
    
    if (homeTeamId === awayTeamId) {
        alert('同じチーム同士の試合は記録できません');
        return;
    }
    
    if (isNaN(homeScore) || isNaN(awayScore) || homeScore < 0 || awayScore < 0) {
        alert('有効なスコアを入力してください');
        return;
    }
    
    if (!matchDate) {
        alert('試合日を選択してください');
        return;
    }
    
    // チームを取得
    const homeTeam = teams.find(t => t.id === homeTeamId);
    const awayTeam = teams.find(t => t.id === awayTeamId);
    
    // 試合結果を判定
    let homeResult, awayResult;
    if (homeScore > awayScore) {
        homeResult = 'win';
        awayResult = 'loss';
    } else if (homeScore < awayScore) {
        homeResult = 'loss';
        awayResult = 'win';
    } else {
        homeResult = 'draw';
        awayResult = 'draw';
    }
    
    // ポイント計算
    const homePointsChange = calculatePoints(homeTeam.points, awayTeam.points, homeResult, matchType);
    const awayPointsChange = calculatePoints(awayTeam.points, homeTeam.points, awayResult, matchType);
    
    // チーム情報を更新
    homeTeam.points += homePointsChange;
    homeTeam.matches++;
    homeTeam.goalsFor += homeScore;
    homeTeam.goalsAgainst += awayScore;
    if (homeResult === 'win') homeTeam.wins++;
    else if (homeResult === 'draw') homeTeam.draws++;
    else homeTeam.losses++;
    
    awayTeam.points += awayPointsChange;
    awayTeam.matches++;
    awayTeam.goalsFor += awayScore;
    awayTeam.goalsAgainst += homeScore;
    if (awayResult === 'win') awayTeam.wins++;
    else if (awayResult === 'draw') awayTeam.draws++;
    else awayTeam.losses++;
    
    // 試合記録を保存
    const match = {
        id: Date.now(),
        date: matchDate,
        homeTeam: { id: homeTeam.id, name: homeTeam.name },
        awayTeam: { id: awayTeam.id, name: awayTeam.name },
        homeScore: homeScore,
        awayScore: awayScore,
        matchType: matchType,
        homePointsChange: homePointsChange,
        awayPointsChange: awayPointsChange
    };
    
    matches.unshift(match); // 最新の試合を先頭に追加
    
    saveData();
    displayRanking();
    displayMatchHistory();
    
    // フォームをリセット
    document.getElementById('homeScore').value = 0;
    document.getElementById('awayScore').value = 0;
    
    alert('試合を記録しました！');
}

// ランキングを表示
function displayRanking() {
    const rankingDiv = document.getElementById('rankingTable');
    
    if (teams.length === 0) {
        rankingDiv.innerHTML = '<div class="empty-message">まだチームが登録されていません</div>';
        return;
    }
    
    // ポイント順にソート
    const sortedTeams = [...teams].sort((a, b) => {
        if (b.points !== a.points) {
            return b.points - a.points;
        }
        // ポイントが同じ場合は得失点差で比較
        const goalDiffA = a.goalsFor - a.goalsAgainst;
        const goalDiffB = b.goalsFor - b.goalsAgainst;
        return goalDiffB - goalDiffA;
    });
    
    let html = '<div class="ranking-table"><table>';
    html += '<thead><tr>';
    html += '<th>順位</th>';
    html += '<th>チーム名</th>';
    html += '<th>ポイント</th>';
    html += '<th>試合数</th>';
    html += '<th>勝</th>';
    html += '<th>分</th>';
    html += '<th>敗</th>';
    html += '<th>得点</th>';
    html += '<th>失点</th>';
    html += '<th>得失点差</th>';
    html += '</tr></thead><tbody>';
    
    sortedTeams.forEach((team, index) => {
        const rank = index + 1;
        const goalDiff = team.goalsFor - team.goalsAgainst;
        const goalDiffStr = goalDiff > 0 ? `+${goalDiff}` : goalDiff;
        
        let rankClass = 'rank-other';
        if (rank === 1) rankClass = 'rank-1';
        else if (rank === 2) rankClass = 'rank-2';
        else if (rank === 3) rankClass = 'rank-3';
        
        html += '<tr>';
        html += `<td><span class="rank-badge ${rankClass}">${rank}</span></td>`;
        html += `<td><strong>${team.name}</strong></td>`;
        html += `<td><span class="points-badge">${team.points.toFixed(1)}</span></td>`;
        html += `<td>${team.matches}</td>`;
        html += `<td>${team.wins}</td>`;
        html += `<td>${team.draws}</td>`;
        html += `<td>${team.losses}</td>`;
        html += `<td>${team.goalsFor}</td>`;
        html += `<td>${team.goalsAgainst}</td>`;
        html += `<td>${goalDiffStr}</td>`;
        html += '</tr>';
    });
    
    html += '</tbody></table></div>';
    rankingDiv.innerHTML = html;
}

// 試合履歴を表示
function displayMatchHistory() {
    const historyDiv = document.getElementById('matchHistory');
    
    if (matches.length === 0) {
        historyDiv.innerHTML = '<div class="empty-message">まだ試合が記録されていません</div>';
        return;
    }
    
    let html = '';
    matches.forEach(match => {
        const matchTypeName = MATCH_TYPE_NAMES[match.matchType];
        const homeChange = match.homePointsChange >= 0 ? `+${match.homePointsChange}` : match.homePointsChange;
        const awayChange = match.awayPointsChange >= 0 ? `+${match.awayPointsChange}` : match.awayPointsChange;
        
        html += '<div class="match-item">';
        html += '<div class="match-header">';
        html += `<div class="match-teams">${match.homeTeam.name} vs ${match.awayTeam.name}</div>`;
        html += `<div class="match-score">${match.homeScore} - ${match.awayScore}</div>`;
        html += '</div>';
        html += '<div class="match-info">';
        html += `<span class="match-type">${matchTypeName}</span>`;
        html += `<span>📅 ${match.date}</span>`;
        html += `<span>${match.homeTeam.name}: ${homeChange}pt</span>`;
        html += `<span>${match.awayTeam.name}: ${awayChange}pt</span>`;
        html += '</div>';
        html += '</div>';
    });
    
    historyDiv.innerHTML = html;
}

// データをエクスポート
function exportData() {
    const data = {
        teams: teams,
        matches: matches,
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `soccer_ranking_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
}

// 全データをクリア
function clearAllData() {
    if (!confirm('本当に全てのデータを削除しますか？この操作は取り消せません。')) {
        return;
    }
    
    teams = [];
    matches = [];
    saveData();
    
    updateTeamSelects();
    displayRanking();
    displayMatchHistory();
    
    alert('全てのデータを削除しました');
}

// ページ読み込み時に初期化
window.addEventListener('DOMContentLoaded', init);
