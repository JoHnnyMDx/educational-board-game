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

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const playersRef = db.ref("players");

let myPlayerId = "";
let localPlayer = { name: "", position: 0, score: 100 };
const boardSize = 40; 

// ==========================================
// 2. SISTEM ANTI-FRAUDĂ
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
// 3. EVENIMENTE AVANSATE (Întrebări + Acțiuni)
// ==========================================
const gameEvents = [
    // Întrebări (Cap 6 & 7)
    { tile: 3, type: "question", category: "Laborator Hardware", question: "Cine coordonează funcționarea tuturor componentelor?", options: ["UAL", "UCC", "Memoria"], correct: 1 },
    { tile: 6, type: "question", category: "Data Vault", question: "Din ce este formată partea de comandă a unei instrucțiuni?", options: ["Adresele operanzilor", "Codul operației", "Rezultatul"], correct: 1 },
    { tile: 12, type: "question", category: "Rețele", question: "Cum se numește o rețea de calculatoare la nivelul unui oraș? (Cap. 7.1)", options: ["LAN", "MAN", "WAN"], correct: 1 },
    { tile: 15, type: "question", category: "Cyber Attack", question: "Ce topologie folosește un nod central (hub/switch)?", options: ["Inel", "Stea", "Magistrală"], correct: 1 },
    { tile: 21, type: "question", category: "Escape Room", question: "Protocolul de bază al rețelei Internet este:", options: ["HTTP", "TCP/IP", "FTP"], correct: 1 },
    { tile: 28, type: "question", category: "Hardware", question: "Care imprimantă funcționează prin pulverizarea picăturilor de cerneală? (Cap. 6.9)", options: ["Matricială", "Laser", "Cu jet de cerneală"], correct: 2 },
    { tile: 30, type: "question", category: "Memory Scan", question: "Care este o memorie pe disc optic?", options: ["HDD", "Bandă magnetică", "Blu-ray Disc"], correct: 2 },
    { tile: 37, type: "question", category: "Clasificare", question: "Care sunt cele mai puternice calculatoare? (Cap. 6.10)", options: ["Microcalculatoare", "Supercalculatoare", "Mainframe"], correct: 1 },

    // Acțiuni Speciale (Noroc / Capcane)
    { tile: 9, type: "trap", title: "⚠️ Atac Ransomware!", text: "Sistemul tău a fost blocat temporar. Pierzi 20 Energie.", effect: -20 },
    { tile: 18, type: "boost", title: "🟢 Data Cache Descoperit!", text: "Ai găsit un pachet de date ascuns. Primești 30 Energie Bonus.", effect: 30 },
    { tile: 25, type: "teleport", title: "🌀 Wormhole Activ!", text: "Ai intrat într-un tunel de rețea. Ești teleportat la Zona 32!", destination: 32 },
    { tile: 34, type: "trap", title: "🛑 Firewall Defensiv!", text: "Ai lovit un zid de securitate. Pierzi 10 Energie și ești aruncat 3 pași înapoi.", effect: -10, move: -3 }
];

// ==========================================
// 4. AUTENTIFICARE
// ==========================================
document.getElementById('joinGameBtn').addEventListener('click', () => {
    let name = document.getElementById('playerNameInput').value.trim();
    if (name.length < 3) return alert("Introdu un nume valid!");

    myPlayerId = "agent_" + Math.random().toString(36).substr(2, 9);
    localPlayer.name = name;
    
    playersRef.child(myPlayerId).set(localPlayer);
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('gameUI').style.display = 'block';
    document.getElementById('displayName').innerText = name;
    
    initBoard();
    listenToNetwork(); 
});

window.addEventListener('beforeunload', () => { if (myPlayerId) playersRef.child(myPlayerId).remove(); });

// ==========================================
// 5. MOTOR MULTIPLAYER & TABLĂ
// ==========================================
let allNetworkPlayers = {};

function listenToNetwork() {
    playersRef.on("value", (snapshot) => {
        allNetworkPlayers = snapshot.val() || {};
        updateBoardLive(allNetworkPlayers);
        updateLeaderboard(allNetworkPlayers);
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
        
        let event = gameEvents.find(e => e.tile === i);
        if (event) {
            if (event.type === "question") { cell.style.borderColor = "#ff0055"; cell.innerText += "\n🔒"; }
            else if (event.type === "boost") { cell.style.borderColor = "#00ffcc"; cell.innerText += "\n🟢"; }
            else if (event.type === "trap") { cell.style.borderColor = "#ffaa00"; cell.innerText += "\n⚠️"; }
            else if (event.type === "teleport") { cell.style.borderColor = "#9900ff"; cell.innerText += "\n🌀"; }
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
            token.style.backgroundColor = id === myPlayerId ? "#00ffcc" : "#ff0055";
            let offset = Math.random() * 15;
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
    Object.values(players).sort((a, b) => b.score - a.score).forEach(p => {
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
// 6. ZAR ȘI SISTEM DE EVENIMENTE / PvP
// ==========================================
document.getElementById('rollDiceBtn').addEventListener('click', () => {
    let roll = Math.floor(Math.random() * 6) + 1;
    document.getElementById('diceResult').innerText = `Zar: 🎲 ${roll}`;
    
    localPlayer.position += roll;
    
    // Buclă
    if (localPlayer.position >= boardSize) {
        localPlayer.position = localPlayer.position - boardSize;
        localPlayer.score += 50; 
        alert("🔄 Ai completat un ciclu de rețea! Bonus: +50 Energie.");
    }
    
    syncPlayer();
    
    // Verificăm PvP (Dacă pică peste alt jucător)
    for (let id in allNetworkPlayers) {
        if (id !== myPlayerId && allNetworkPlayers[id].position === localPlayer.position && localPlayer.position !== 0) {
            alert(`⚔️ HACK ATACK! L-ai interceptat pe ${allNetworkPlayers[id].name}! Ai câștigat +15 Energie.`);
            localPlayer.score += 15;
            syncPlayer();
        }
    }

    // Verificăm dacă există eveniment pe căsuță
    let event = gameEvents.find(e => e.tile === localPlayer.position);
    if (event) {
        setTimeout(() => triggerEvent(event), 400);
    }
});

function triggerEvent(eventData) {
    if (eventData.type === "question") {
        const modal = document.getElementById('challengeModal');
        document.getElementById('challengeTitle').innerText = `[${eventData.category}]`;
        document.getElementById('challengeText').innerText = eventData.question;
        const ansContainer = document.getElementById('answersContainer');
        ansContainer.innerHTML = '';
        
        eventData.options.forEach((opt, index) => {
            let btn = document.createElement('button');
            btn.classList.add('answer-btn');
            btn.innerText = opt;
            btn.onclick = () => checkAnswer(index, eventData.correct, modal);
            ansContainer.appendChild(btn);
        });
        
        modal.classList.remove('hidden');
        document.getElementById('rollDiceBtn').disabled = true;
    } 
    else if (eventData.type === "boost" || eventData.type === "trap") {
        alert(`${eventData.title}\n\n${eventData.text}`);
        localPlayer.score += eventData.effect;
        if (eventData.move) localPlayer.position += eventData.move;
        syncPlayer();
    }
    else if (eventData.type === "teleport") {
        alert(`${eventData.title}\n\n${eventData.text}`);
        localPlayer.position = eventData.destination;
        syncPlayer();
    }
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
