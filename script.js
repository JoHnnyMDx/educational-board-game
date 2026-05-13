// ==========================================
// 1. CONFIGURARE FIREBASE
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyCsaDykKgbVUYyO7o1NjGRoD-TMrXo79SE",
  authDomain: "neocity-game.firebaseapp.com",
  databaseURL: "https://neocity-game-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "neocity-game",
  storageBucket: "neocity-game.firebasestorage.app",
  messagingSenderId: "932738671560",
  appId: "1:932738671560:web:2e3da125d4ac7d20e616fd",
  measurementId: "G-L2SRJCDVH1"
};

// Inițializare
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const playersRef = db.ref("players");

let myPlayerId = "";
let localPlayer = { name: "", position: 0, score: 100 };
const boardSize = 40; 

// ==========================================
// 2. SISTEMUL ANTI-FRAUDĂ
// ==========================================
document.addEventListener('contextmenu', event => event.preventDefault());
document.addEventListener('keydown', function(event) {
    if (event.key === 'PrintScreen' || event.keyCode === 123 || 
        (event.ctrlKey && (event.key === 'c' || event.key === 'v' || event.key === 'u' || event.key === 'p' || event.key === 's'))) {
        event.preventDefault();
        alert('⚠️ SECURITY BREACH: Tentativă de fraudă! Ai pierdut 15 Energie.');
        localPlayer.score -= 15;
        syncPlayer();
    }
});
document.addEventListener('selectstart', event => event.preventDefault());

// ==========================================
// 3. PROVOCĂRILE (Din manual Capitolele 6-7)
// ==========================================
const challenges = [
    { tile: 3, type: "Laborator Hardware", question: "Cine coordonează funcționarea tuturor componentelor?", options: ["UAL", "UCC", "Memoria"], correct: 1 },
    { tile: 8, type: "Data Vault", question: "Ce serviciu este folosit pentru transferul de fișiere?", options: ["DNS", "FTP", "WWW"], correct: 1 },
    { tile: 15, type: "Cyber Attack", question: "Ce topologie folosește un nod central (hub/switch)?", options: ["Inel", "Stea", "Magistrală"], correct: 1 },
    { tile: 22, type: "Escape Room", question: "Protocolul de bază al rețelei Internet este:", options: ["HTTP", "TCP/IP", "FTP"], correct: 1 },
    { tile: 30, type: "Memory Scan", question: "Care este o memorie pe disc optic?", options: ["HDD", "Bandă magnetică", "Blu-ray Disc"], correct: 2 },
    { tile: 36, type: "Core Breach", question: "Din ce este formată partea de comandă a unei instrucțiuni?", options: ["Adresele operanzilor", "Codul operației", "Rezultatul"], correct: 1 }
];

// ==========================================
// 4. AUTENTIFICARE ȘI CONECTARE
// ==========================================
document.getElementById('joinGameBtn').addEventListener('click', () => {
    let name = document.getElementById('playerNameInput').value.trim();
    if (name.length < 3) {
        alert("Introdu un nume valid!");
        return;
    }

    myPlayerId = "agent_" + Math.random().toString(36).substr(2, 9);
    localPlayer.name = name;
    
    playersRef.child(myPlayerId).set(localPlayer);

    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('gameUI').style.display = 'block';
    document.getElementById('displayName').innerText = name;
    
    initBoard();
    listenToNetwork(); 
});

window.addEventListener('beforeunload', () => {
    if (myPlayerId) playersRef.child(myPlayerId).remove();
});

// ==========================================
// 5. MOTORUL MULTIPLAYER
// ==========================================
function listenToNetwork() {
    playersRef.on("value", (snapshot) => {
        let players = snapshot.val() || {};
        updateBoardLive(players);
        updateLeaderboard(players);
    });
}

function initBoard() {
    const gameBoard = document.getElementById('gameBoard');
    gameBoard.innerHTML = '';
    for (let i = 0; i < boardSize; i++) {
        let cell = document.createElement('div');
        cell.classList.add('cell');
        cell.id = `cell-${i}`;
        cell.innerText = i === 0 ? "START" : `Zona ${i}`;
        
        if (challenges.some(c => c.tile === i)) {
            cell.style.borderColor = "#ff0055";
            cell.innerText += "\n🔒";
        }
        gameBoard.appendChild(cell);
    }
}

function updateBoardLive(players) {
    document.querySelectorAll('.player-token').forEach(el => el.remove());

    for (let id in players) {
        let p = players[id];
        let cell = document.getElementById(`cell-${p.position}`);
        
        if (cell) {
            let token = document.createElement('div');
            token.classList.add('player-token');
            token.innerText = p.name.charAt(0).toUpperCase();
            // Tu ești verde, ceilalți roșii
            token.style.backgroundColor = id === myPlayerId ? "#00ffcc" : "#ff0055";
            
            // Offset ca să nu se suprapună complet pionii vizual
            let offset = Math.random() * 10;
            token.style.marginTop = offset + "px";
            token.style.marginLeft = offset + "px";
            
            cell.appendChild(token);
        }
    }
}

function updateLeaderboard(players) {
    let list = document.getElementById('leaderboardList');
    if (!list) return;
    list.innerHTML = "";
    
    let arr = Object.values(players).sort((a, b) => b.score - a.score);
    arr.forEach(p => {
        let li = document.createElement('li');
        li.innerText = `${p.name}: ${p.score} XP`;
        list.appendChild(li);
    });
}

function syncPlayer() {
    document.getElementById('playerScore').innerText = localPlayer.score;
    playersRef.child(myPlayerId).set(localPlayer);
}

// ==========================================
// 6. ZAR ȘI LOGICA JOCULUI
// ==========================================
document.getElementById('rollDiceBtn').addEventListener('click', () => {
    let roll = Math.floor(Math.random() * 6) + 1;
    document.getElementById('diceResult').innerText = `Zar: 🎲 ${roll}`;
    
    localPlayer.position += roll;
    
    if (localPlayer.position >= boardSize) {
        localPlayer.position = localPlayer.position - boardSize;
        localPlayer.score += 50; 
        alert("🔄 Ai completat un ciclu de rețea! Bonus: +50 Energie.");
    }
    
    syncPlayer();
    
    let event = challenges.find(c => c.tile === localPlayer.position);
    if (event) {
        setTimeout(() => showChallenge(event), 300);
    }
});

function showChallenge(challengeData) {
    const modal = document.getElementById('challengeModal');
    document.getElementById('challengeTitle').innerText = `[${challengeData.type}]`;
    document.getElementById('challengeText').innerText = challengeData.question;
    const ansContainer = document.getElementById('answersContainer');
    ansContainer.innerHTML = '';
    
    challengeData.options.forEach((opt, index) => {
        let btn = document.createElement('button');
        btn.classList.add('answer-btn');
        btn.innerText = opt;
        btn.onclick = () => checkAnswer(index, challengeData.correct, modal);
        ansContainer.appendChild(btn);
    });
    
    modal.classList.remove('hidden');
    document.getElementById('rollDiceBtn').disabled = true;
}

function checkAnswer(selectedIndex, correctIndex, modal) {
    if (selectedIndex === correctIndex) {
        alert("✅ Acces Acordat! Ai primit 20 Energie.");
        localPlayer.score += 20;
    } else {
        alert("❌ Eroare! Sistemul te-a penalizat cu 15 Energie.");
        localPlayer.score -= 15;
    }
    
    syncPlayer();
    modal.classList.add('hidden');
    document.getElementById('rollDiceBtn').disabled = false;
}
