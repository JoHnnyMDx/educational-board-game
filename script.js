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
let currentActiveMinigame = ""; 
let localTileMap = {}; // Harta va fi generată dinamic

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
// 3. BAZA DE DATE MASIVĂ - ÎNTREBĂRI
// ==========================================
const questionsDB = [
    { q: "Ce unitate coordonează funcționarea tuturor componentelor calculatorului?", options: ["UCC", "UAL", "Memoria Externă"], correct: 0 },
    { q: "Ce unitate execută operațiile aritmetice și logice?", options: ["Unitatea de Comandă", "Unitatea Aritmetică și Logică", "Unitatea I/E"], correct: 1 },
    { q: "Cum se numește ansamblul de fire prin care circulă informația între componente?", options: ["Cablu de rețea", "Magistrală", "Fibră optică"], correct: 1 },
    { q: "Ce memorie păstrează datele definitiv, chiar și când calculatorul este oprit?", options: ["Memoria RAM", "Memoria Externă", "Memoria Cache"], correct: 1 },
    { q: "Cine asigură introducerea datelor în sistem?", options: ["Dispozitivele de ieșire", "UCC", "Dispozitivele de intrare"], correct: 2 },
    { q: "Din ce este formată o instrucțiune în cod-calculator?", options: ["Nume + Extensie", "Codul operației + Adresele operanzilor", "Sintaxă + Variabile"], correct: 1 },
    { q: "Ce instrucțiuni modifică ordinea naturală de execuție a unui program?", options: ["De transfer", "De salt", "Aritmetice"], correct: 1 },
    { q: "Ce limbaj folosește mnemonici (prescurtări din engleză) în loc de cod binar?", options: ["Limbaj mașină", "Limbajul de asamblare", "Limbajul HTML"], correct: 1 },
    { q: "Totalitatea componentelor fizice ale calculatorului se numește:", options: ["Software", "Hardware", "Freeware"], correct: 1 },
    { q: "Programele care asigură funcționarea calculatorului formează:", options: ["Resursele tehnice", "Resursele fizice", "Resursele programate"], correct: 2 },
    { q: "Suprafața unui disc magnetic este împărțită în cercuri concentrice numite:", options: ["Sectoare", "Piste", "Cilindri"], correct: 1 },
    { q: "Ce tehnologie folosește fasciculul laser pentru citirea datelor?", options: ["Benzi magnetice", "Discuri magnetice", "Discuri optice"], correct: 2 },
    { q: "Cel mai mic element luminos de pe ecranul unui monitor se numește:", options: ["Vector", "Pixel", "Diodă"], correct: 1 },
    { q: "Numărul de pixeli afișați pe orizontală și verticală definește:", options: ["Contrastul", "Luminozitatea", "Rezoluția ecranului"], correct: 2 },
    { q: "Culorile pe un monitor standard sunt formate din:", options: ["Roșu, Galben, Albastru", "Roșu, Verde, Albastru (RGB)", "Cyan, Magenta, Galben"], correct: 1 },
    { q: "Care imprimantă folosește o pulbere uscată (toner) și un fascicul luminos?", options: ["Laser", "Matricială", "Termică"], correct: 0 },
    { q: "Cele mai performante calculatoare, folosite în cercetarea spațială, sunt:", options: ["Mainframe", "Supercalculatoare", "Minicalculatoare"], correct: 1 },
    { q: "Care este piesa centrală a unui microcalculator, montată pe placa de bază?", options: ["Sursa de alimentare", "Microprocesorul", "Unitatea optică"], correct: 1 },
    { q: "Frecvența de tact (viteza) unui microprocesor modern se măsoară în:", options: ["Gigabyte (GB)", "Gigahertzi (GHz)", "Megabiți per secundă"], correct: 1 },
    { q: "Rețeaua globală (precum Internetul) se încadrează în categoria:", options: ["WAN (Wide Area Network)", "MAN", "LAN"], correct: 0 },
    { q: "Calculatorul care oferă resurse și servicii altor calculatoare se numește:", options: ["Client", "Server", "Hub"], correct: 1 },
    { q: "Topologia în care toate calculatoarele sunt legate la un singur cablu central este:", options: ["Topologia Stea", "Topologia Magistrală (Bus)", "Topologia Inel"], correct: 1 },
    { q: "Care este modelul de referință teoretic folosit pentru a explica arhitectura rețelelor?", options: ["Modelul TCP", "Modelul ISO/OSI (cu 7 niveluri)", "Modelul HTML"], correct: 1 },
    { q: "Care este setul de protocoale fundamental care stă la baza Internetului?", options: ["HTTP/FTP", "TCP/IP", "SMTP/POP3"], correct: 1 },
    { q: "Ce serviciu asociază un IP cu un nume ușor de reținut (google.com)?", options: ["WWW", "FTP", "DNS"], correct: 2 },
    { q: "Ce protocol se utilizează pentru transferul paginilor web în browser?", options: ["SMTP", "HTTP / HTTPS", "FTP"], correct: 1 },
    { q: "Ce serviciu folosești exclusiv pentru transferul de fișiere (upload/download)?", options: ["DNS", "WWW", "FTP"], correct: 2 },
    { q: "Cum se numește programul utilizat pentru a accesa și afișa pagini web?", options: ["Editor de text", "Browser (Navigator)", "Sistem de operare"], correct: 1 },
    { q: "Care memorie este volatilă (își pierde conținutul la oprirea curentului)?", options: ["HDD", "ROM", "RAM"], correct: 2 },
    { q: "Ce tip de cablu transmite informația sub formă de impulsuri luminoase?", options: ["Cablul coaxial", "Cablul UTP", "Fibra optică"], correct: 2 }
];

const triviaDB = [
    { q: "Cine este considerat inventatorul World Wide Web (WWW)?", options: ["Bill Gates", "Steve Jobs", "Tim Berners-Lee"], correct: 2 },
    { q: "Ce reprezintă codul de eroare '404' pe Internet?", options: ["Pagina nu a fost găsită", "Acces interzis", "Serverul a căzut"], correct: 0 },
    { q: "Care a fost numele primului calculator electronic de uz general?", options: ["Macintosh", "ENIAC", "Apollo 11"], correct: 1 },
    { q: "Care companie de tehnologie are logo-ul un măr mușcat?", options: ["Microsoft", "IBM", "Apple"], correct: 2 },
    { q: "Câți biți formează un Byte (octet)?", options: ["4", "8", "16"], correct: 1 },
    { q: "Ce companie a creat sistemul de operare Windows?", options: ["Google", "Microsoft", "Intel"], correct: 1 },
    { q: "Care este cel mai utilizat sistem de operare pentru smartphone-uri în lume?", options: ["iOS", "Symbian", "Android"], correct: 2 },
    { q: "Ce înseamnă acronimul USB?", options: ["Universal Serial Bus", "United State Band", "User System Block"], correct: 0 },
    { q: "Care limbaj de programare este folosit pentru a stiliza (da culoare) paginilor web?", options: ["Python", "C++", "CSS"], correct: 2 },
    { q: "Ce companie majoră a cumpărat platforma GitHub în 2018?", options: ["Facebook", "Microsoft", "Amazon"], correct: 1 }
];

// ==========================================
// 4. GENERATOR ALEATORIU DE HARTĂ (ACTUALIZAT)
// ==========================================
function generateRandomBoard() {
    let eventsPool = [];
    
    // Distribuim cele 39 de căsuțe:
    for(let i=0; i<10; i++) eventsPool.push('question'); // 10 Întrebări
    for(let i=0; i<3; i++) eventsPool.push('trivia');    // 3 Curiozități
    for(let i=0; i<4; i++) eventsPool.push('minigame');  // 4 Mini-jocuri
    for(let i=0; i<3; i++) eventsPool.push('attack');    // 3 Atacuri
    for(let i=0; i<3; i++) eventsPool.push('boost');     // 3 Bonusuri
    for(let i=0; i<16; i++) eventsPool.push('empty');    // 16 CĂSUȚE GOALE (Liber)

    // Amestecăm array-ul (Shuffle algoritmic Fisher-Yates)
    for (let i = eventsPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [eventsPool[i], eventsPool[j]] = [eventsPool[j], eventsPool[i]];
    }

    // Asociem evenimentele noilor celule
    localTileMap = {};
    for(let i = 1; i < boardSize; i++) {
        localTileMap[i] = eventsPool[i - 1];
    }
    
    // Actualizăm interfața grafică a tablei curente
    updateBoardVisuals();
}

function updateBoardVisuals() {
    for(let i = 1; i < boardSize; i++) {
        let cell = document.getElementById(`cell-${i}`);
        if(!cell) continue;
        
        let type = localTileMap[i];
        
        // Resetăm vizualul de bază
        cell.innerText = `Zona ${i}`;
        cell.style.borderColor = "#30363d";
        
        // Aplicăm noul stil
        if (type === 'question' || type === 'trivia') { cell.style.borderColor = "#ff0055"; cell.innerText += "\n❓"; }
        else if (type === 'minigame') { cell.style.borderColor = "#ffaa00"; cell.innerText += "\n🕹️"; }
        else if (type === 'attack') { cell.style.borderColor = "#9900ff"; cell.innerText += "\n⚔️"; }
        else if (type === 'boost') { cell.style.borderColor = "#00ffcc"; cell.innerText += "\n🟢"; }
        // Căsuțele 'empty' rămân cu stilul de bază
    }
}

// ==========================================
// 5. AUTENTIFICARE ȘI INIȚIALIZARE TABLĂ
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

function initBoard() {
    const gameBoard = document.getElementById('gameBoard');
    gameBoard.innerHTML = '';
    
    // 1. Creăm celulele HTML goale o singură dată
    for (let i = 0; i < boardSize; i++) {
        let cell = document.createElement('div');
        cell.classList.add('cell');
        cell.id = `cell-${i}`;
        cell.innerText = i === 0 ? "START" : `Zona ${i}`;
        gameBoard.appendChild(cell);
    }
    
    // 2. Generăm structura hărții aleatorii pentru acest jucător
    generateRandomBoard();
}

function listenToNetwork() {
    playersRef.on("value", (snapshot) => {
        allNetworkPlayers = snapshot.val() || {};
        updateBoardLive(allNetworkPlayers);
        updateLeaderboard(allNetworkPlayers);
    });
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
// 6. ZAR ȘI DECLANȘARE EVENIMENTE DINAMICE (ACTUALIZAT)
// ==========================================
document.getElementById('rollDiceBtn').addEventListener('click', () => {
    let roll = Math.floor(Math.random() * 6) + 1;
    document.getElementById('diceResult').innerText = `Zar: 🎲 ${roll}`;
    
    localPlayer.position += roll;
    
    // Dacă am terminat un tur (Buclă Completă)
    if (localPlayer.position >= boardSize) {
        localPlayer.position -= boardSize;
        localPlayer.score += 50; 
        alert("🔄 CICLU COMPLETAT! Harta sistemului a fost regenerată. Bonus: +50 Energie.");
        
        // RE-GENERĂM HARTA COMPLETA LA FIECARE TUR PARCURS
        generateRandomBoard();
    }
    syncPlayer();
    
    // Verificare PvP (Luptă live pe aceeași celulă)
    for (let id in allNetworkPlayers) {
        if (id !== myPlayerId && allNetworkPlayers[id].position === localPlayer.position && localPlayer.position !== 0) {
            alert(`⚔️ HACK ATACK! L-ai interceptat pe ${allNetworkPlayers[id].name}! Ai furat +15 Energie.`);
            localPlayer.score += 15;
            syncPlayer();
        }
    }

    // Extragem evenimentul din harta random a jucătorului
    let eventType = localTileMap[localPlayer.position];
    
    // Declanșăm evenimentul DOAR dacă există și NU este 'empty'
    if (eventType && eventType !== 'empty') {
        setTimeout(() => handleTileEvent(eventType), 300);
    }
});

function handleTileEvent(type) {
    const modal = document.getElementById('challengeModal');
    const title = document.getElementById('challengeTitle');
    const text = document.getElementById('challengeText');
    const ansContainer = document.getElementById('answersContainer');
    const retryBtn = document.getElementById('retryBtn');
    
    // Reset complet Modal
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
        let qData = db[Math.floor(Math.random() * db.length)]; // Întrebare Random din pool
        
        title.innerText = type === 'question' ? "[Teorie]" : "[Cultură Generală]";
        text.innerText = qData.q;
        
        qData.options.forEach((opt, index) => {
            let btn = document.createElement('button');
            btn.classList.add('answer-btn');
            btn.innerText = opt;
            btn.onclick = () => {
                if (index === qData.correct) {
                    alert("✅ Corect! +20 XP");
                    localPlayer.score += 20;
                    modal.classList.add('hidden');
                    document.getElementById('rollDiceBtn').disabled = false;
                } else {
                    alert("❌ Răspuns greșit! Ai pierdut 10 XP.");
                    localPlayer.score -= 10;
                    ansContainer.innerHTML = ''; 
                    retryBtn.style.display = 'block'; 
                    retryBtn.onclick = () => handleTileEvent(type); // O NOUĂ ÎNTREBARE
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
// 7. MOTOR MINI-JOCURI (ESCAPE ROOM)
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
    }, 120); 
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
    cardsData.sort(() => Math.random() - 0.5); 
    
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
