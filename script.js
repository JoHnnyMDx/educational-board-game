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
  appId: "1:932738671560:web:2e3da125d4ac7d20e616fd"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const playersRef = db.ref("players");

let myPlayerId = "";
let localPlayer = { name: "", position: 0, score: 100 };
const boardSize = 40; 
let allNetworkPlayers = {};

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
// 3. EVENIMENTE EXTINSE (30+ ZONE ACTIVE)
// ==========================================
const gameEvents = [
    // 15 ÎNTREBĂRI TEORETICE
    { tile: 1, type: "question", category: "Hardware", question: "Ce unitate execută operațiile aritmetice și logice?", options: ["UCC", "UAL", "Memoria"], correct: 1 },
    { tile: 3, type: "question", category: "Instrucțiuni", question: "Din ce este format formatul unei instrucțiuni?", options: ["Cod operație + Adrese", "Nume + Extensie", "Bit + Byte"], correct: 0 },
    { tile: 5, type: "question", category: "Memorie", question: "Care este un suport magnetic de stocare?", options: ["CD-ROM", "HDD", "Blu-ray"], correct: 1 },
    { tile: 8, type: "question", category: "Rețele", question: "Ce rețea acoperă o arie geografică de mărimea unui județ/țări?", options: ["LAN", "WAN", "MAN"], correct: 1 },
    { tile: 11, type: "question", category: "Topologie", question: "În ce topologie toate nodurile sunt legate la un cablu central?", options: ["Stea", "Inel", "Magistrală"], correct: 2 },
    { tile: 13, type: "question", category: "Internet", question: "Protocolul de bază al Internetului este:", options: ["TCP/IP", "HTTP", "FTP"], correct: 0 },
    { tile: 15, type: "question", category: "Periferice", question: "Care dispozitiv este exclusiv de ieșire?", options: ["Tastatura", "Vizualizatorul", "Scanerul"], correct: 1 },
    { tile: 17, type: "question", category: "Procesoare", question: "Cum se numește CPU-ul realizat pe un singur cip?", options: ["Mainframe", "Microprocesor", "Controller"], correct: 1 },
    { tile: 19, type: "question", category: "Servicii", question: "Serviciul pentru transferul de fișiere este:", options: ["DNS", "FTP", "E-mail"], correct: 1 },
    { tile: 21, type: "question", category: "Hardware", question: "Care imprimantă este ideală pentru volume mari de text?", options: ["Laser", "Matricială", "Jet cerneală"], correct: 0 },
    { tile: 23, type: "question", category: "Clasificare", question: "Calculatoarele de mare putere folosite în centre meteo sunt:", options: ["Micro", "Supercalculatoare", "Laptop"], correct: 1 },
    { tile: 25, type: "question", category: "Memorie", question: "Capacitatea unui disc Blu-ray este mai mare decât a unui DVD?", options: ["Da", "Nu", "Sunt egale"], correct: 0 },
    { tile: 27, type: "question", category: "Asamblare", question: "Limbajul de nivel scăzut care folosește mnemonici este:", options: ["C++", "Python", "Asamblare"], correct: 2 },
    { tile: 31, type: "question", category: "Resurse", question: "Componentele fizice ale calculatorului se numesc resurse:", options: ["Programate", "Tehnice", "Umane"], correct: 1 },
    { tile: 35, type: "question", category: "Scheme", question: "Cine dirijează execuția instrucțiunilor în schema von Neumann?", options: ["UAL", "Memoria", "UCC"], correct: 2 },

    // 5 ÎNTREBĂRI CULTURĂ GENERALĂ
    { tile: 2, type: "question", category: "Trivia", question: "Ce a fost primul 'bug' informatic?", options: ["O molie reală", "O virgulă lipsă", "Un scurtcircuit"], correct: 0 },
    { tile: 10, type: "question", category: "Trivia", question: "Cine este considerat părintele arhitecturii calculatoarelor moderne?", options: ["Bill Gates", "John von Neumann", "Steve Jobs"], correct: 1 },
    { tile: 18, type: "question", category: "Trivia", question: "Ce înseamnă extensia '.exe'?", options: ["Example", "Executable", "Exit"], correct: 1 },
    { tile: 26, type: "question", category: "Trivia", question: "Câte taste are, în medie, o tastatură standard?", options: ["101-105", "50-60", "peste 200"], correct: 0 },
    { tile: 33, type: "question", category: "Trivia", question: "Care este unitatea minimă de informație?", options: ["Byte", "Bit", "Kilobyte"], correct: 1 },

    // 5 ELEMENTE GHINION (MINI-JOCURI)
    { tile: 4, type: "minigame", title: "⚠️ SYSTEM CRASH!", text: "Fă 10 puncte la Snake pentru a restabili sistemul!" },
    { tile: 14, type: "minigame", title: "⚠️ VIRUS DETECTED!", text: "Elimină amenințarea! Obține 10 puncte la Snake." },
    { tile: 22, type: "trap", title: "⚠️ BSOD!", text: "Blue Screen of Death! Pierzi 20 Energie.", effect: -20 },
    { tile: 29, type: "trap", title: "⚠️ OVERHEAT!", text: "Mergi 3 pași înapoi pentru răcire.", move: -3 },
    { tile: 37, type: "trap", title: "⚠️ DATA LEAK!", text: "Ai pierdut pachete de date. -30 Energie.", effect: -30 },

    // 5 ELEMENTE POZITIVE (ATAC / BOOST)
    { tile: 7, type: "attack", title: "⚔️ HACKER SKILLS!", text: "Furi 25 XP de la un oponent activ!" },
    { tile: 16, type: "boost", title: "🚀 OVERCLOCK!", text: "Primești 40 Energie bonus.", effect: 40 },
    { tile: 24, type: "attack", title: "⚔️ SQL INJECTION!", text: "Atacă baza de date a unui coleg! Furi 25 XP." },
    { tile: 30, type: "boost", title: "🔋 UPS ACTIV!", text: "Ești protejat. Mai dă o dată cu zarul.", action: "reroll" },
    { tile: 39, type: "attack", title: "⚔️ ROOT ACCESS!", text: "Furi 25 XP de la liderul clasamentului!" }
];

// ==========================================
// 4. AUTENTIFICARE ȘI INIT
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

window.addEventListener('beforeunload', () => { 
    if (myPlayerId) playersRef.child(myPlayerId).remove(); 
});

// ==========================================
// 5. MOTOR MULTIPLAYER & DESENARE TABLĂ
// ==========================================
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
            else if (event.type === "minigame") { cell.style.borderColor = "#ffaa00"; cell.innerText += "\n🕹️"; }
            else if (event.type === "boost") { cell.style.borderColor = "#00ffcc"; cell.innerText += "\n🟢"; }
            else if (event.type === "trap") { cell.style.borderColor = "#ffaa00"; cell.innerText += "\n⚠️"; }
            else if (event.type === "attack") { cell.style.borderColor = "#9900ff"; cell.innerText += "\n⚔️"; }
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

// ==========================================
// 7. LOGICA DE ATAC (PvP REAL)
// ==========================================
function performAttack(amount) {
    let opponents = Object.keys(allNetworkPlayers).filter(id => id !== myPlayerId);
    if (opponents.length > 0) {
        // Alegem victima (cel mai mare scor sau primul găsit)
        let targetId = opponents.sort((a, b) => allNetworkPlayers[b].score - allNetworkPlayers[a].score)[0];
        let targetName = allNetworkPlayers[targetId].name;
        let newTargetScore = (allNetworkPlayers[targetId].score || 100) - amount;

        // Update în Firebase pentru VICTIMĂ
        playersRef.child(targetId).update({ score: newTargetScore });
        
        // Update local pentru ATACATOR
        localPlayer.score += amount;
        alert(`⚔️ Atac reușit asupra lui ${targetName}! I-ai furat ${amount} XP.`);
    } else {
        alert("Nu sunt alți agenți online pentru a fi atacați. Ai primit 10 XP bonus de la server.");
        localPlayer.score += 10;
    }
    syncPlayer();
}

// ==========================================
// 8. MINI-JOC SNAKE (CANVAS)
// ==========================================
let snakeInterval;
function startSnakeGame() {
    const canvas = document.getElementById('miniGameCanvas');
    const ctx = canvas.getContext('2d');
    canvas.style.display = "block";
    
    let snake = [{x: 10, y: 10}];
    let food = {x: 15, y: 15};
    let dx = 1, dy = 0;
    let score = 0;
    let box = 15;

    // Control taste pentru Snake
    const changeDir = (e) => {
        if (e.key === "ArrowUp" && dy === 0) { dx = 0; dy = -1; e.preventDefault(); }
        if (e.key === "ArrowDown" && dy === 0) { dx = 0; dy = 1; e.preventDefault(); }
        if (e.key === "ArrowLeft" && dx === 0) { dx = -1; dy = 0; e.preventDefault(); }
        if (e.key === "ArrowRight" && dx === 0) { dx = 1; dy = 0; e.preventDefault(); }
    };
    document.addEventListener('keydown', changeDir);

    snakeInterval = setInterval(() => {
        let head = {x: snake[0].x + dx, y: snake[0].y + dy};
        
        // Verificare coliziuni
        if (head.x < 0 || head.x >= 20 || head.y < 0 || head.y >= 20 || snake.some(s => s.x === head.x && s.y === head.y)) {
            clearInterval(snakeInterval);
            alert("Game Over! Nu ai atins 10 puncte. -20 Energie.");
            localPlayer.score -= 20;
            finishMiniGame(changeDir);
            return;
        }

        snake.unshift(head);
        if (head.x === food.x && head.y === food.y) {
            score++;
            food = {x: Math.floor(Math.random() * 20), y: Math.floor(Math.random() * 20)};
            if (score >= 10) {
                clearInterval(snakeInterval);
                alert("Sistem restaurat! Ai câștigat 20 Energie.");
                localPlayer.score += 20;
                finishMiniGame(changeDir);
            }
        } else {
            snake.pop();
        }

        // Desenare cadru
        ctx.fillStyle = "black"; ctx.fillRect(0, 0, 300, 300);
        ctx.fillStyle = "red"; ctx.fillRect(food.x * box, food.y * box, box, box);
        ctx.fillStyle = "#00ffcc";
        snake.forEach(s => ctx.fillRect(s.x * box, s.y * box, box, box));
    }, 150);
}

function finishMiniGame(eventListener) {
    document.removeEventListener('keydown', eventListener);
    document.getElementById('miniGameCanvas').style.display = "none";
    document.getElementById('challengeModal').classList.add('hidden');
    document.getElementById('rollDiceBtn').disabled = false;
    syncPlayer();
}

// ==========================================
// 9. MOTORUL DE EVENIMENTE (TRIGGER)
// ==========================================
function triggerEvent(eventData) {
    const modal = document.getElementById('challengeModal');
    document.getElementById('challengeTitle').innerText = eventData.title || `[${eventData.category}]`;
    document.getElementById('challengeText').innerText = eventData.text || eventData.question;
    const ansContainer = document.getElementById('answersContainer');
    ansContainer.innerHTML = '';

    if (eventData.type === "question") {
        eventData.options.forEach((opt, index) => {
            let btn = document.createElement('button');
            btn.classList.add('answer-btn');
            btn.innerText = opt;
            btn.onclick = () => {
                if (index === eventData.correct) {
                    alert("Corect! +20 XP");
                    localPlayer.score += 20;
                } else {
                    alert("Greșit! -15 XP");
                    localPlayer.score -= 15;
                }
                modal.classList.add('hidden');
                document.getElementById('rollDiceBtn').disabled = false;
                syncPlayer();
            };
            ansContainer.appendChild(btn);
        });
        modal.classList.remove('hidden');
        document.getElementById('rollDiceBtn').disabled = true;
    } 
    else if (eventData.type === "minigame") {
        modal.classList.remove('hidden');
        document.getElementById('rollDiceBtn').disabled = true;
        startSnakeGame();
    }
    else if (eventData.type === "attack") {
        performAttack(25);
    }
    else {
        // Pentru capcane (trap) și boost-uri (boost) care doar afișează un mesaj
        alert(eventData.title + "\n" + eventData.text);
        if (eventData.effect) localPlayer.score += eventData.effect;
        if (eventData.move) localPlayer.position += eventData.move;
        syncPlayer();
    }
}
