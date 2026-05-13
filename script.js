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

// Inițializare Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const playersRef = db.ref("players");

// Variabile jucător local
let myPlayerId = "";
let localPlayer = { name: "", position: 0, score: 100 };
const boardSize = 40; // Am mărit tabla pentru 30 minute de joc

// ==========================================
// AUTENTIFICARE ȘI CONECTARE LIVE
// ==========================================
document.getElementById('joinGameBtn').addEventListener('click', () => {
    let name = document.getElementById('playerNameInput').value.trim();
    if (name.length < 3) {
        alert("Introdu un nume valid!");
        return;
    }

    myPlayerId = "agent_" + Math.random().toString(36).substr(2, 9);
    localPlayer.name = name;
    
    // Înregistrăm jucătorul în baza de date
    playersRef.child(myPlayerId).set(localPlayer);

    // Ascundem login-ul, arătăm jocul
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('gameUI').style.display = 'block';
    document.getElementById('displayName').innerText = name;
    
    initBoard();
    listenToNetwork(); // Pornim radarul pentru ceilalți jucători
});

// Sterge jucătorul din DB cand închide tab-ul
window.addEventListener('beforeunload', () => {
    if (myPlayerId) playersRef.child(myPlayerId).remove();
});

// ==========================================
// MOTORUL MULTIPLAYER (ASCULTARE LIVE)
// ==========================================
function listenToNetwork() {
    // Ori de câte ori SE SCHIMBĂ ceva pe server, updatăm tabla
    playersRef.on("value", (snapshot) => {
        let players = snapshot.val() || {};
        updateBoardLive(players);
        updateLeaderboard(players);
        
        // Mecanică PvP: Verificăm dacă cineva a picat peste noi
        checkPvP(players);
    });
}

function updateBoardLive(players) {
    // Curățăm toți pionii existenți de pe tablă
    document.querySelectorAll('.player-token').forEach(el => el.remove());

    // Desenăm pionii tuturor
    for (let id in players) {
        let p = players[id];
        let cell = document.getElementById(`cell-${p.position}`);
        
        if (cell) {
            let token = document.createElement('div');
            token.classList.add('player-token');
            token.innerText = p.name.charAt(0).toUpperCase(); // Inițiala numelui
            token.style.backgroundColor = id === myPlayerId ? "#00ffcc" : "#ff0055"; // Tu ești verde, ei sunt roșii
            
            // Adăugăm token-ul în celulă (folosind flexbox sau absolute positioning în CSS)
            cell.appendChild(token);
        }
    }
}

// ==========================================
// LOGICA DE BAZĂ EXTINSĂ (ZAR & BUCLE)
// ==========================================
document.getElementById('rollDiceBtn').addEventListener('click', () => {
    let roll = Math.floor(Math.random() * 6) + 1;
    document.getElementById('diceResult').innerText = `Zar: 🎲 ${roll}`;
    
    localPlayer.position += roll;
    
    // Mecanica de Buclă (când trece de capăt, primește bonus și o ia de la capăt)
    if (localPlayer.position >= boardSize) {
        localPlayer.position = localPlayer.position - boardSize;
        localPlayer.score += 50; 
        alert("🔄 Ai completat un ciclu de rețea! Bonus: +50 Energie.");
    }
    
    // Salvăm noua stare în baza de date! Asta îi va alerta pe toți ceilalți instant.
    syncPlayer();
    
    // Aici apelezi funcția ta veche checkForEvents(localPlayer.position) pentru întrebări!
});

function syncPlayer() {
    document.getElementById('playerScore').innerText = localPlayer.score;
    playersRef.child(myPlayerId).set(localPlayer);
}

function checkPvP(allPlayers) {
    // Verificăm dacă altcineva e pe aceeași celulă cu noi (și nu suntem la START)
    for (let id in allPlayers) {
        if (id !== myPlayerId && allPlayers[id].position === localPlayer.position && localPlayer.position !== 0) {
            alert(`⚔️ HACK ATACK! Te-ai intersectat cu ${allPlayers[id].name}!`);
            // Poți implementa o logică: cel cu scorul mai mare câștigă un duel, sau o mini-întrebare rapidă de departajare.
        }
    }
}

// + Include aici mecanica de Anti-Cheat și Modalul de Întrebări din codul precedent!
