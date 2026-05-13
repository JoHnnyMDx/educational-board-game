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
let currentActiveMinigame = ""; // Tine minte in ce joc suntem blocati

// ==========================================
// 2. SISTEM ANTI-FRAUDĂ
// ==========================================
document.addEventListener('contextmenu', event => event.preventDefault());
document.addEventListener('keydown', function(event) {
    if (event.key === 'PrintScreen' || event.keyCode === 123 || 
        (event.ctrlKey && (event.key === 'c' || event.key === 'v' || event.key === 's'))) {
        event.preventDefault();
        alert('⚠️ SECURITY BREACH: Tentativă de fraudă! Ai pierdut 15 Energie.');
        localPlayer.score -= 15;
        syncPlayer();
    }
});
document.addEventListener('selectstart', event => event.preventDefault());

// ==========================================
// 3. BAZA DE DATE - ÎNTREBĂRI ALEATORII
// ==========================================
const questionsDB = [
    { q: "Ce unitate execută operațiile aritmetice și logice?", options: ["UCC", "UAL", "Memoria"], correct: 1 },
    { q: "Din ce este format formatul unei instrucțiuni?", options: ["Cod operație + Adrese", "Nume + Extensie", "Bit + Byte"], correct: 0 },
    { q: "Care este un suport magnetic de stocare?", options: ["CD-ROM", "HDD", "Blu-ray"], correct: 1 },
    { q: "Ce rețea acoperă o arie geografică de mărimea unui județ/țări?", options: ["LAN", "WAN", "MAN"], correct: 1 },
    { q: "În ce topologie toate nodurile sunt legate la un cablu central?", options: ["Stea", "Inel", "Magistrală"], correct: 2 },
    { q: "Protocolul de bază al Internetului este:", options: ["TCP/IP", "HTTP", "FTP"], correct: 0 },
    { q: "Care dispozitiv este exclusiv de ieșire?", options: ["Tastatura", "Vizualizatorul", "Scanerul"], correct: 1 },
    { q: "Cum se numește CPU-ul realizat pe un singur cip?", options: ["Mainframe", "Microprocesor", "Controller"], correct: 1 },
    { q: "Serviciul pentru transferul de fișiere este:", options: ["DNS", "FTP", "E-mail"], correct: 1 },
    { q: "Limbajul de nivel scăzut care folosește mnemonici este:", options: ["C++", "Python", "Asamblare"], correct: 2 }
];

const triviaDB = [
    { q: "Ce a fost primul 'bug' informatic?", options: ["O molie reală", "O virgulă lipsă", "Un scurtcircuit"], correct: 0 },
    { q: "Cine este părintele arhitecturii calculatoarelor moderne?", options: ["Bill Gates", "John von Neumann", "Steve Jobs"], correct: 1 },
    { q: "Ce înseamnă extensia '.exe'?", options: ["Example", "Executable", "Exit"], correct: 1 },
    { q: "Care este unitatea minimă de informație?", options: ["Byte", "Bit", "Kilobyte"], correct: 1 }
];

// Maparea Tablei (Ce tip de eveniment este pe fiecare căsuță)
const tileMap = {
    3: 'question', 6: 'trivia', 9: 'minigame', 12: 'attack', 15: 'question',
    18: 'boost', 21: 'minigame', 24: 'question', 27: 'trivia', 30: 'minigame',
    33: 'attack', 36: 'question', 39: 'boost'
};

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
// 5. MOTOR MULTIPLAYER
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
        
        let type = tileMap[i];
        if (type === 'question' || type === 'trivia') { cell.style.borderColor = "#ff0055"; cell.innerText += "\n❓"; }
        else if (type === 'minigame') { cell.style.borderColor = "#ffaa00"; cell.innerText += "\n🕹️"; }
        else if (type === 'attack') { cell.style.borderColor = "#9900ff"; cell.innerText += "\n⚔️"; }
        else if (type === 'boost') { cell.style.borderColor = "#00ffcc"; cell.innerText += "\n🟢"; }
        
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
            token.style.marginTop = (Math.random() * 15) + "px";
            token.style.marginLeft = (Math.random() * 15) + "px";
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
    if (myPlayerId) playersRef.child(myPlayerId).set(localPlayer);
}

// ==========================================
// 6. ZAR ȘI DECLANȘARE EVENIMENTE
// ==========================================
document.getElementById('rollDiceBtn').addEventListener('click', () => {
    let roll = Math.floor(Math.random() * 6) + 1;
    document.getElementById('diceResult').innerText = `Zar: 🎲 ${roll}`;
    
    localPlayer.position += roll;
    if (localPlayer.position >= boardSize) {
        localPlayer.position -= boardSize;
        localPlayer.score += 50; 
        alert("🔄 Ciclu completat! Bonus: +50 Energie.");
    }
    syncPlayer();
    
    // Verificare PvP
    for (let id in allNetworkPlayers) {
        if (id !== myPlayerId && allNetworkPlayers[id].position === localPlayer.position && localPlayer.position !== 0) {
            alert(`⚔️ HACK ATACK! L-ai interceptat pe ${allNetworkPlayers[id].name}! +15 Energie.`);
            localPlayer.score += 15;
            syncPlayer();
        }
    }

    let eventType = tileMap[localPlayer.position];
    if (eventType) setTimeout(() => handleTileEvent(eventType), 300);
});

function handleTileEvent(type) {
    const modal = document.getElementById('challengeModal');
    const title = document.getElementById('challengeTitle');
    const text = document.getElementById('challengeText');
    const ansContainer = document.getElementById('answersContainer');
    const retryBtn = document.getElementById('retryBtn');
    
    // Reset Modal
    document.getElementById('miniGameArea').style.display = 'none';
    document.getElementById('miniGameCanvas').style.display = 'none';
    document.getElementById('bugGameContainer').style.display = 'none';
    document.getElementById('memoryGameContainer').style.display = 'none';
    document.getElementById('miniGameStats').style.display = 'none';
    ansContainer.innerHTML = '';
    retryBtn.style.display = 'none';
    document.getElementById('rollDiceBtn').disabled = true;

    if (type === 'question' || type === 'trivia') {
        let db = type === 'question' ? questionsDB : triviaDB;
        let qData = db[Math.floor(Math.random() * db.length)];
        title.innerText = type === 'question' ? "[Teorie]" : "[Cultură Generală]";
        text.innerText = qData.q;
        
        qData.options.forEach((opt, index) => {
            let btn = document.createElement('button');
            btn.classList.add('answer-btn');
            btn.innerText = opt;
            btn.onclick = () => {
                if (index === qData.correct) {
                    alert("Corect! +20 XP");
                    localPlayer.score += 20;
                    modal.classList.add('hidden');
                    document.getElementById('rollDiceBtn').disabled = false;
                } else {
                    alert("Greșit! Ești blocat, încearcă altă variantă. (-5 XP)");
                    localPlayer.score -= 5;
                    btn.disabled = true; // Dezactivează butonul greșit
                }
                syncPlayer();
            };
            ansContainer.appendChild(btn);
        });
        modal.classList.remove('hidden');
    }
    else if (type === 'attack') {
        performAttack(25);
        document.getElementById('rollDiceBtn').disabled = false;
    }
    else if (type === 'boost') {
        alert("🚀 OVERCLOCK! Primești 30 Energie bonus.");
        localPlayer.score += 30;
        syncPlayer();
        document.getElementById('rollDiceBtn').disabled = false;
    }
    else if (type === 'minigame') {
        let games = ['snake', 'bugs', 'memory'];
        currentActiveMinigame = games[Math.floor(Math.random() * games.length)];
        launchMinigame(currentActiveMinigame);
    }
}

function performAttack(amount) {
    let opponents = Object.keys(allNetworkPlayers).filter(id => id !== myPlayerId);
    if (opponents.length > 0) {
        let targetId = opponents.sort((a, b) => allNetworkPlayers[b].score - allNetworkPlayers[a].score)[0];
        playersRef.child(targetId).update({ score: (allNetworkPlayers[targetId].score || 100) - amount });
        localPlayer.score += amount;
        alert(`⚔️ Atac reușit! I-ai furat ${amount} XP lui ${allNetworkPlayers[targetId].name}.`);
    } else {
        alert("Nu sunt alți agenți. Ai primit 10 XP bonus.");
        localPlayer.score += 10;
    }
    syncPlayer();
}

// ==========================================
// 7. MOTOR MINI-JOCURI (CU BLOCARE)
// ==========================================
function launchMinigame(gameType) {
    const modal = document.getElementById('challengeModal');
    const title = document.getElementById('challengeTitle');
    const text = document.getElementById('challengeText');
    const area = document.getElementById('miniGameArea');
    const retryBtn = document.getElementById('retryBtn');
    
    area.style.display = 'block';
    retryBtn.style.display = 'none';
    modal.classList.remove('hidden');

    if (gameType === 'snake') {
        title.innerText = "⚠️ SYSTEM CRASH";
        text.innerText = "Strânge 10 puncte la Snake pentru a debloca zarul!";
        startSnakeGame();
    } else if (gameType === 'bugs') {
        title.innerText = "🐞 VÂNĂTOAREA DE ERORI";
        text.innerText = "Zdrobește 10 erori în 15 secunde!";
        startBugGame();
    } else if (gameType === 'memory') {
        title.innerText = "🧠 CELULA DE MEMORIE";
        text.innerText = "Găsește toate perechile pentru a evada!";
        startMemoryGame();
    }
}

// Funcții ajutătoare pentru finalizare jocuri
function minigameWin() {
    alert("✅ Succes! Ai deblocat sistemul și primești +20 XP.");
    localPlayer.score += 20;
    syncPlayer();
    document.getElementById('challengeModal').classList.add('hidden');
    document.getElementById('rollDiceBtn').disabled = false;
}

function minigameLoss() {
    alert("❌ EȘEC CRITIC! Rămâi blocat. Apasă Reîncearcă.");
    localPlayer.score -= 10;
    syncPlayer();
    
    // Ascundem jocurile și arătăm butonul de reîncercare
    document.getElementById('miniGameCanvas').style.display = 'none';
    document.getElementById('bugGameContainer').style.display = 'none';
    document.getElementById('memoryGameContainer').style.display = 'none';
    
    const retryBtn = document.getElementById('retryBtn');
    retryBtn.style.display = 'block';
    retryBtn.onclick = () => launchMinigame(currentActiveMinigame);
}

// --- JOC 1: SNAKE ---
let snakeInterval;
let snakeKeyHandler;
function startSnakeGame() {
    const canvas = document.getElementById('miniGameCanvas');
    const ctx = canvas.getContext('2d');
    canvas.style.display = "block";
    
    let snake = [{x: 10, y: 10}];
    let food = {x: 15, y: 15};
    let dx = 1, dy = 0; let score = 0; let box = 15;

    if(snakeKeyHandler) document.removeEventListener('keydown', snakeKeyHandler);
    snakeKeyHandler = (e) => {
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) e.preventDefault();
        if (e.key === "ArrowUp" && dy === 0) { dx = 0; dy = -1; }
        if (e.key === "ArrowDown" && dy === 0) { dx = 0; dy = 1; }
        if (e.key === "ArrowLeft" && dx === 0) { dx = -1; dy = 0; }
        if (e.key === "ArrowRight" && dx === 0) { dx = 1; dy = 0; }
    };
    document.addEventListener('keydown', snakeKeyHandler);

    if(snakeInterval) clearInterval(snakeInterval);
    snakeInterval = setInterval(() => {
        let head = {x: snake[0].x + dx, y: snake[0].y + dy};
        if (head.x < 0 || head.x >= 20 || head.y < 0 || head.y >= 20 || snake.some(s => s.x === head.x && s.y === head.y)) {
            clearInterval(snakeInterval); document.removeEventListener('keydown', snakeKeyHandler);
            minigameLoss(); return;
        }
        snake.unshift(head);
        if (head.x === food.x && head.y === food.y) {
            score++;
            food = {x: Math.floor(Math.random() * 20), y: Math.floor(Math.random() * 20)};
            if (score >= 10) {
                clearInterval(snakeInterval); document.removeEventListener('keydown', snakeKeyHandler);
                minigameWin();
            }
        } else snake.pop();

        ctx.fillStyle = "black"; ctx.fillRect(0, 0, 300, 300);
        ctx.fillStyle = "red"; ctx.fillRect(food.x * box, food.y * box, box, box);
        ctx.fillStyle = "#00ffcc"; snake.forEach(s => ctx.fillRect(s.x * box, s.y * box, box, box));
    }, 120); // Puțin mai rapid
}

// --- JOC 2: BUG SMASHER ---
let bugSpawnTimer;
let bugCountdown;
function startBugGame() {
    const container = document.getElementById('bugGameContainer');
    const stats = document.getElementById('miniGameStats');
    container.style.display = "block";
    stats.style.display = "block";
    container.innerHTML = '';
    
    let score = 0; let timeLeft = 15;
    stats.innerText = `Timp: ${timeLeft}s | Erori: ${score}/10`;
    
    if(bugCountdown) clearInterval(bugCountdown);
    bugCountdown = setInterval(() => {
        timeLeft--;
        stats.innerText = `Timp: ${timeLeft}s | Erori: ${score}/10`;
        if (timeLeft <= 0) {
            clearInterval(bugCountdown); clearTimeout(bugSpawnTimer);
            if (score >= 10) minigameWin();
            else minigameLoss();
        }
    }, 1000);

    function spawnBug() {
        if(timeLeft <= 0) return;
        let bug = document.createElement('div');
        bug.className = 'bug-icon';
        bug.innerText = ['🐞','🐛','🦠'][Math.floor(Math.random()*3)];
        bug.style.top = Math.random() * 250 + 'px';
        bug.style.left = Math.random() * 250 + 'px';
        
        bug.onmousedown = () => {
            score++; stats.innerText = `Timp: ${timeLeft}s | Erori: ${score}/10`;
            bug.remove();
        };
        container.appendChild(bug);
        setTimeout(() => { if(bug.parentNode) bug.remove(); }, 1200);
        bugSpawnTimer = setTimeout(spawnBug, 700);
    }
    spawnBug();
}

// --- JOC 3: MEMORY CARD ---
function startMemoryGame() {
    const container = document.getElementById('memoryGameContainer');
    container.style.display = "grid";
    container.innerHTML = '';
    
    const symbols = ['ROM', 'RAM', 'CPU', 'LAN'];
    let cardsData = [...symbols, ...symbols];
    cardsData.sort(() => Math.random() - 0.5); // Shuffle
    
    let hasFlippedCard = false; let lockBoard = false;
    let firstCard, secondCard; let matchedPairs = 0;

    cardsData.forEach(symbol => {
        let card = document.createElement('div');
        card.classList.add('memory-card');
        card.dataset.symbol = symbol;
        card.innerHTML = `<div class="front-face">${symbol}</div><div class="back-face">?</div>`;
        
        card.onclick = function() {
            if (lockBoard || this === firstCard || this.classList.contains('flip')) return;
            this.classList.add('flip');

            if (!hasFlippedCard) {
                hasFlippedCard = true; firstCard = this; return;
            }
            secondCard = this; lockBoard = true;
            
            if (firstCard.dataset.symbol === secondCard.dataset.symbol) {
                matchedPairs++;
                [hasFlippedCard, lockBoard, firstCard, secondCard] = [false, false, null, null];
                if (matchedPairs === 4) setTimeout(minigameWin, 500);
            } else {
                setTimeout(() => {
                    firstCard.classList.remove('flip'); secondCard.classList.remove('flip');
                    [hasFlippedCard, lockBoard, firstCard, secondCard] = [false, false, null, null];
                }, 800);
            }
        };
        container.appendChild(card);
    });
}
