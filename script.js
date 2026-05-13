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
// EVENIMENTE EXTINSE (30 DE ZONE ACTIVE)
// ==========================================
const gameEvents = [
    // --- 15 ÎNTREBĂRI TEORETICE (Cap. 6 & 7) ---
    { tile: 1, type: "question", category: "Hardware", question: "Ce unitate execută operațiile aritmetice și logice? (Cap. 6.1)", options: ["UCC", "UAL", "Memoria"], correct: 1 },
    { tile: 3, type: "question", category: "Instrucțiuni", question: "Din ce este format formatul unei instrucțiuni? (Cap. 6.2)", options: ["Cod operație + Adrese", "Nume + Extensie", "Bit + Byte"], correct: 0 },
    { tile: 5, type: "question", category: "Memorie", question: "Care este un suport magnetic de stocare? (Cap. 6.6)", options: ["CD-ROM", "HDD", "Blu-ray"], correct: 1 },
    { tile: 8, type: "question", category: "Rețele", question: "Ce tip de rețea acoperă o arie geografică foarte mare (țări)? (Cap. 7.1)", options: ["LAN", "WAN", "MAN"], correct: 1 },
    { tile: 11, type: "question", category: "Topologie", question: "În ce topologie toate nodurile sunt legate la un cablu central? (Cap. 7.3)", options: ["Stea", "Inel", "Magistrală"], correct: 2 },
    { tile: 13, type: "question", category: "Internet", question: "Protocolul de bază al Internetului este: (Cap. 7.4)", options: ["TCP/IP", "HTTP", "FTP"], correct: 0 },
    { tile: 15, type: "question", category: "Periferice", question: "Care dispozitiv este exclusiv de ieșire? (Cap. 6.8)", options: ["Tastatura", "Vizualizatorul", "Scanerul"], correct: 1 },
    { tile: 17, type: "question", category: "Procesoare", question: "Cum se numește CPU-ul realizat pe un singur cip? (Cap. 6.11)", options: ["Mainframe", "Microprocesor", "Controller"], correct: 1 },
    { tile: 21, type: "question", category: "Servicii", question: "Serviciul pentru transferul de fișiere este: (Cap. 7.5)", options: ["DNS", "FTP", "E-mail"], correct: 1 },
    { tile: 23, type: "question", category: "Hardware", question: "Care imprimantă este cea mai rapidă pentru volume mari? (Cap. 6.9)", options: ["Laser", "Matricială", "Jet cerneală"], correct: 0 },
    { tile: 25, type: "question", category: "Clasificare", question: "Calculatoarele folosite în cercetare nucleară sunt: (Cap. 6.10)", options: ["Micro", "Supercalculatoare", "Laptop"], correct: 1 },
    { tile: 27, type: "question", category: "Memorie", question: "Capacitatea unui disc Blu-ray este mai mare decât a unui DVD? (Cap. 6.7)", options: ["Da", "Nu", "Sunt egale"], correct: 0 },
    { tile: 31, type: "question", category: "Asamblare", question: "Limbajul apropiat de codul-calculator (mnemonici) este: (Cap. 6.4)", options: ["C++", "Python", "Asamblare"], correct: 2 },
    { tile: 35, type: "question", category: "Resurse", question: "Componentele fizice se numesc resurse: (Cap. 6.5)", options: ["Programate", "Tehnice", "Umane"], correct: 1 },
    { tile: 38, type: "question", category: "Scheme", question: "Cine dirijează execuția instrucțiunilor? (Cap. 6.1)", options: ["UAL", "Memoria", "UCC"], correct: 2 },

    // --- 5 ÎNTREBĂRI AMUZANTE (CULTURĂ GENERALĂ) ---
    { tile: 2, type: "question", category: "Funny", question: "Ce a fost primul 'bug' din istoria informaticii?", options: ["Un gândac real", "O eroare de scriere", "Un virus"], correct: 0 },
    { tile: 10, type: "question", category: "Funny", question: "Dacă Google ar fi o persoană, unde ar locui?", options: ["În Cloud", "În garaj", "Peste tot"], correct: 0 },
    { tile: 18, type: "question", category: "Funny", question: "Ce înseamnă PDF?", options: ["Portable Document Format", "Please Do Format", "Pâine De Fornetti"], correct: 0 },
    { tile: 26, type: "question", category: "Funny", question: "Cea mai mare tastă de pe tastatură este:", options: ["Enter", "Shift", "Space"], correct: 2 },
    { tile: 34, type: "question", category: "Funny", question: "Câte degete au 'picioarele' unui procesor modern?", options: ["Sute (pini)", "Două", "Niciunul"], correct: 0 },

    // --- 5 ELEMENTE DE GHINION (MINI-JOCURI / CAPCANE) ---
    { tile: 4, type: "minigame", title: "⚠️ SYSTEM CRASH!", text: "Trebuie să recuperezi datele! Joacă Snake și fă 10 puncte.", gameType: "snake" },
    { tile: 14, type: "minigame", title: "⚠️ PACKET LOSS!", text: "Sari printre servere! Obține 10 puncte la DoodleJump.", gameType: "jump" },
    { tile: 22, type: "trap", title: "⚠️ BSOD!", text: "Blue Screen of Death! Pierzi un rând și 20 Energie.", effect: -20 },
    { tile: 32, type: "trap", title: "⚠️ TROJAN!", text: "Un virus ți-a mâncat resursele. Pierzi 30 Energie.", effect: -30 },
    { tile: 37, type: "trap", title: "⚠️ OVERHEAT!", text: "Procesorul s-a încins. Mergi 5 pași înapoi.", move: -5 },

    // --- 5 ELEMENTE POZITIVE (ATAC / BOOST) ---
    { tile: 7, type: "attack", title: "⚔️ SQL INJECTION!", text: "Alege un oponent și fură-i 20 XP!" },
    { tile: 16, type: "boost", title: "🚀 OVERCLOCK!", text: "Sistemul zboară! Mai dă o dată cu zarul.", action: "reroll" },
    { tile: 24, type: "attack", title: "⚔️ DDOS ATTACK!", text: "Blochează liderul! Fură-i 15 XP." },
    { tile: 29, type: "boost", title: "🔋 UPS ACTIV!", text: "Protecție totală. Primești 40 Energie.", effect: 40 },
    { tile: 39, type: "attack", title: "⚔️ ROOT ACCESS!", text: "Ai control total! Fură 25 XP de la cel mai apropiat jucător." }
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
        showChallenge(eventData);
    } 
    else if (eventData.type === "minigame") {
        // Logica pentru mini-jocuri (poți integra scripturi de Snake simple)
        alert(`${eventData.title}\n${eventData.text}`);
        let success = confirm("Ai reușit să faci cele 10 puncte?"); // Simulare pentru moment
        if (!success) {
            localPlayer.score -= 20;
            alert("Eșec! Ai pierdut 20 Energie.");
        } else {
            localPlayer.score += 10;
            alert("Succes! Sistem restaurat.");
        }
        syncPlayer();
    }
    else if (eventData.type === "attack") {
        // Mecanica de furt puncte
        alert(eventData.title + "\n" + eventData.text);
        // Căutăm un oponent (dacă există alții în afară de mine)
        let opponents = Object.keys(allNetworkPlayers).filter(id => id !== myPlayerId);
        if (opponents.length > 0) {
            let targetId = opponents[0]; // Furăm de la primul găsit
            let targetName = allNetworkPlayers[targetId].name;
            localPlayer.score += 20;
            alert(`Succes! Ai furat 20 puncte de la ${targetName}.`);
        } else {
            alert("Nu sunt alți agenți online. Ai primit 10 puncte bonus de la server.");
            localPlayer.score += 10;
        }
        syncPlayer();
    }
    else if (eventData.type === "trap" || eventData.type === "boost") {
        alert(eventData.title + "\n" + eventData.text);
        if (eventData.effect) localPlayer.score += eventData.effect;
        if (eventData.move) localPlayer.position += eventData.move;
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
