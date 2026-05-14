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
const gameStateRef = db.ref("gameState");

let myPlayerId = "";
let localPlayer = { name: "", position: 0, score: 100, winner: false, bossKeys: 0 };
const boardSize = 40;
const gameDurationMs = 30 * 60 * 1000;
const minFastWinMs = 20 * 60 * 1000;
const winningScore = 1200;
const bossMaxHP = 300;
const coopGatePosition = boardSize - 1;
let bossHP = bossMaxHP;
let allNetworkPlayers = {};
let currentActiveMinigame = "";
let localTileMap = {};
let gameLocked = false;
let gameFinished = false;
let wrongAnswerStreak = 0;
let waitingAtCoopGate = false;
let activeQuestionType = "question";
let gameState = {};
let gameTimerInterval = null;
let targetNoticeShown = false;

const tileMeta = {
    question: { icon: "❓", label: "Quiz", className: "tile-question" },
    trivia: { icon: "💡", label: "Trivia", className: "tile-trivia" },
    minigame: { icon: "🕹️", label: "Mini", className: "tile-minigame" },
    attack: { icon: "⚔️", label: "Atac", className: "tile-attack" },
    boost: { icon: "🟢", label: "Boost", className: "tile-boost" },
    boss: { icon: "👾", label: "Boss", className: "tile-boss" },
    voice: { icon: "🎙️", label: "Voice", className: "tile-voice" },
    coop: { icon: "🔐🤝", label: "Co-Op Gate", className: "tile-coop" },
    empty: { icon: "", label: "Safe", className: "tile-empty" }
};

function clampScore(value) { return Math.max(0, Number(value) || 0); }
function randomBetween(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function getLevel(score) {
    score = clampScore(score);
    if (score >= 1000) return 4;
    if (score >= 650) return 3;
    if (score >= 300) return 2;
    return 1;
}
function getMissionPhase(score) {
    const level = getLevel(score);
    return {
        1: "Nivel 1: Recrut",
        2: "Nivel 2: Infiltrare",
        3: "Nivel 3: Asalt AI",
        4: "Nivel 4: Finalist"
    }[level];
}
function formatTime(ms) {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const seconds = (totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
}
function getElapsedMs() {
    if (!gameState.startedAt) return 0;
    return Math.max(0, Date.now() - Number(gameState.startedAt));
}
function canFastWin() {
    return getElapsedMs() >= minFastWinMs;
}
function cleanName(name) { return name.replace(/[<>]/g, "").slice(0, 24).trim(); }

function setGameLocked(value) {
    gameLocked = value;
    const rollBtn = document.getElementById('rollDiceBtn');
    if (rollBtn) rollBtn.disabled = value || gameFinished;
}

function playTone(type = "click") {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const freq = { click: 220, win: 680, loss: 120, dice: 420, attack: 90, boost: 760, boss: 55, voice: 520 }[type] || 220;
        osc.frequency.value = freq;
        osc.type = type === "attack" || type === "boss" ? "sawtooth" : "square";
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
    } catch (e) {}
}

function updateHud() {
    const scoreEl = document.getElementById('playerScore');
    const levelEl = document.getElementById('playerLevel');
    const streakEl = document.getElementById('wrongStreakLabel');
    const bossEl = document.getElementById('bossHpLabel');
    const winningEl = document.getElementById('winningScoreLabel');
    const phaseEl = document.getElementById('missionPhaseLabel');
    const keysEl = document.getElementById('bossKeysLabel');
    if (scoreEl) scoreEl.innerText = localPlayer.score;
    if (levelEl) levelEl.innerText = getLevel(localPlayer.score);
    if (streakEl) streakEl.innerText = wrongAnswerStreak;
    if (bossEl) bossEl.innerText = bossHP;
    if (winningEl) winningEl.innerText = winningScore;
    if (phaseEl) phaseEl.innerText = getMissionPhase(localPlayer.score);
    if (keysEl) keysEl.innerText = localPlayer.bossKeys || 0;
}

function resetChallengeUI() {
    document.getElementById('miniGameArea').style.display = 'none';
    document.getElementById('miniGameCanvas').style.display = 'none';
    document.getElementById('bugGameContainer').style.display = 'none';
    document.getElementById('memoryGameContainer').style.display = 'none';
    document.getElementById('miniGameStats').style.display = 'none';
    document.getElementById('answersContainer').innerHTML = '';
    document.getElementById('retryBtn').style.display = 'none';
    document.getElementById('voiceChallengeBtn').style.display = 'none';
    document.getElementById('voiceResult').innerText = '';
    document.getElementById('closeModalBtn').style.display = 'none';
}

function closeMissionModal() {
    document.getElementById('challengeModal').classList.add('hidden');
}

// ==========================================
// 2. SISTEM ANTI-FRAUDĂ / DISCIPLINĂ DE JOC
// ==========================================
document.addEventListener('contextmenu', event => {
    event.preventDefault();
    if (myPlayerId && !gameFinished) {
        alert('⚠️ SECURITY BREACH: click dreapta blocat. -5 XP.');
        localPlayer.score = clampScore(localPlayer.score - 5);
        syncPlayer();
    }
});

document.addEventListener('keydown', function(event) {
    const blockedShortcut = event.key === 'F12' ||
        (event.ctrlKey && ['s', 'u'].includes(event.key.toLowerCase())) ||
        (event.ctrlKey && event.shiftKey && ['i', 'j', 'c'].includes(event.key.toLowerCase()));
    if (blockedShortcut) {
        event.preventDefault();
        if (myPlayerId && !gameFinished) {
            alert('⚠️ SECURITY BREACH: tentativă de ocolire a jocului. -10 XP.');
            localPlayer.score = clampScore(localPlayer.score - 10);
            syncPlayer();
        }
    }
});

document.addEventListener('selectstart', event => event.preventDefault());

// ==========================================
// 3. BAZA DE DATE ÎNTREBĂRI
// ==========================================
const questionsDB = [
    // --- Cap 6.1 Schema funcțională ---
    { q: "Ce unitate coordonează funcționarea tuturor componentelor calculatorului?", options: ["UCC", "UAL", "Memoria Externă"], correct: 0 },
    { q: "Ce unitate execută operațiile aritmetice și logice?", options: ["Unitatea de Comandă", "Unitatea Aritmetică și Logică", "Unitatea I/E"], correct: 1 },
    { q: "Cum se numește ansamblul de fire prin care circulă informația între componente?", options: ["Cablu de rețea", "Magistrală", "Fibră optică"], correct: 1 },
    { q: "Care memorie comunică direct cu procesorul?", options: ["Memoria Internă (RAM)", "Hard Disk-ul (HDD)", "Memoria USB"], correct: 0 },
    { q: "Ce memorie păstrează datele definitiv, chiar și când calculatorul este oprit?", options: ["Memoria RAM", "Memoria Externă", "Memoria Cache"], correct: 1 },
    { q: "Cine asigură introducerea datelor în sistem?", options: ["Dispozitivele de ieșire", "UCC", "Dispozitivele de intrare"], correct: 2 },
    { q: "Care din următoarele formează Unitatea Centrală de Procesare (CPU)?", options: ["UCC + UAL", "Memoria + Dispozitive I/E", "RAM + ROM"], correct: 0 },
    // --- Cap 6.2 Formatul instrucțiunilor ---
    { q: "Din ce este formată o instrucțiune în cod-calculator?", options: ["Nume + Extensie", "Codul operației + Adresele operanzilor", "Sintaxă + Variabile"], correct: 1 },
    { q: "Ce indică partea de 'cod al operației' dintr-o instrucțiune?", options: ["Adresa memoriei", "Natura acțiunii (ex: adunare)", "Dimensiunea fișierului"], correct: 1 },
    { q: "Ce indică adresele operanzilor dintr-o instrucțiune?", options: ["Locul unde se află datele în memorie", "Tipul procesorului", "IP-ul calculatorului"], correct: 0 },
    // --- Cap 6.3 Tipuri de instrucțiuni ---
    { q: "Ce instrucțiuni modifică ordinea naturală de execuție a unui program?", options: ["De transfer", "De salt", "Aritmetice"], correct: 1 },
    { q: "Ce instrucțiune copiază o dată din memorie în procesor?", options: ["Instrucțiune de salt", "Instrucțiune de oprire", "Instrucțiune de transfer"], correct: 2 },
    { q: "Adunarea și scăderea fac parte din categoria instrucțiunilor:", options: ["De transfer", "Aritmetice și logice", "De comparare"], correct: 1 },
    // --- Cap 6.4 Limbaje de asamblare ---
    { q: "Ce limbaj folosește mnemonici (prescurtări din engleză) în loc de cod binar?", options: ["Limbaj mașină", "Limbajul de asamblare", "Limbajul HTML"], correct: 1 },
    { q: "Ce program traduce codul de asamblare în limbaj cod-calculator (binar)?", options: ["Asamblorul", "Compilatorul", "Sistemul de operare"], correct: 0 },
    { q: "Instrucțiunea ADD într-un limbaj de asamblare reprezintă:", options: ["Adunarea", "Scăderea", "Saltul condiționat"], correct: 0 },
    // --- Cap 6.5 Resurse tehnice și programate ---
    { q: "Totalitatea componentelor fizice ale calculatorului se numește:", options: ["Software", "Hardware", "Freeware"], correct: 1 },
    { q: "Programele care asigură funcționarea calculatorului formează:", options: ["Resursele tehnice", "Resursele fizice", "Resursele programate (Software)"], correct: 2 },
    { q: "Care dintre următoarele este o resursă programată?", options: ["Sistemul de operare", "Placa de bază", "Microprocesorul"], correct: 0 },
    // --- Cap 6.6 Memorii magnetice ---
    { q: "Pe ce suport magnetic accesul la date este strict secvențial (nu direct)?", options: ["Banda magnetică", "Hard Disk-ul (HDD)", "Memoria RAM"], correct: 0 },
    { q: "Suprafața unui disc magnetic este împărțită în cercuri concentrice numite:", options: ["Sectoare", "Piste", "Cilindri"], correct: 1 },
    { q: "Împărțirea pistelor de pe un disc magnetic se face în porțiuni numite:", options: ["Blocuri", "Pachete", "Sectoare"], correct: 2 },
    { q: "Ce formează totalitatea pistelor de aceeași rază de pe toate fețele unui HDD?", options: ["Un cilindru", "Un cluster", "Un format"], correct: 0 },
    { q: "Timpul de acces la datele de pe un HDD se măsoară de regulă în:", options: ["Nanosecunde (ns)", "Milisecunde (ms)", "Picosecunde (ps)"], correct: 1 },
    // --- Cap 6.7 Memorii optice ---
    { q: "Ce tehnologie folosește fasciculul laser pentru citirea datelor?", options: ["Benzi magnetice", "Discuri magnetice", "Discuri optice"], correct: 2 },
    { q: "Care disc optic are, de obicei, cea mai mare capacitate de stocare?", options: ["CD", "DVD", "Blu-ray Disc (BD)"], correct: 2 },
    { q: "O unitate inscripționată cu 'CD-ROM' poate scrie date pe un CD gol?", options: ["Da", "Nu, poate doar citi", "Doar dacă este formatat"], correct: 1 },
    { q: "Un disc optic stochează informația sub formă de:", options: ["Adâncituri (pits) și porțiuni plane (lands)", "Sarcini electrice", "Domenii magnetizate"], correct: 0 },
    // --- Cap 6.8 Vizualizatorul și tastatura ---
    { q: "Cel mai mic element luminos de pe ecranul unui monitor se numește:", options: ["Vector", "Pixel", "Diodă"], correct: 1 },
    { q: "Numărul de pixeli afișați pe orizontală și verticală definește:", options: ["Contrastul", "Luminozitatea", "Rezoluția ecranului"], correct: 2 },
    { q: "La apăsarea unei taste, tastatura trimite către unitatea centrală:", options: ["Codul ASCII/numeric al tastei", "Culoarea caracterului", "Tipul fontului"], correct: 0 },
    { q: "Culorile pe un monitor standard sunt formate prin combinarea a 3 culori de bază:", options: ["Roșu, Galben, Albastru", "Roșu, Verde, Albastru (RGB)", "Cyan, Magenta, Galben"], correct: 1 },
    // --- Cap 6.9 Imprimante ---
    { q: "Ce imprimantă folosește o bandă tușată lovită de ace pentru a tipări?", options: ["Laser", "Matricială", "Cu jet de cerneală"], correct: 1 },
    { q: "Care imprimantă pulverizează picături fine de lichid pe hârtie?", options: ["Matricială", "Laser", "Cu jet de cerneală"], correct: 2 },
    { q: "Ce imprimantă folosește o pulbere uscată (toner) și un fascicul luminos?", options: ["Imprimanta Laser", "Imprimanta 3D", "Imprimanta Termică"], correct: 0 },
    { q: "Calitatea imprimării se măsoară în:", options: ["BPS (biți pe secundă)", "DPI (puncte per inch)", "Hz (Hertzi)"], correct: 1 },
    // --- Cap 6.10 Clasificarea calculatoarelor ---
    { q: "Cele mai performante calculatoare, folosite în cercetarea spațială, sunt:", options: ["Mainframe", "Supercalculatoare", "Minicalculatoare"], correct: 1 },
    { q: "Calculatoarele de mari dimensiuni care deservesc simultan mii de utilizatori se numesc:", options: ["Microcalculatoare", "Tablete", "Mainframe-uri"], correct: 2 },
    { q: "Din ce clasă face parte un PC (Personal Computer) standard?", options: ["Microcalculatoare", "Mainframe", "Supercalculatoare"], correct: 0 },
    { q: "Laptopurile și tabletele sunt concepute având ca prioritate:", options: ["Portabilitatea și autonomia", "Puterea maximă de calcul", "Capacitatea de stocare infinită"], correct: 0 },
    // --- Cap 6.11 Microprocesorul ---
    { q: "Care este piesa centrală a unui microcalculator, montată pe placa de bază?", options: ["Sursa de alimentare", "Microprocesorul", "Unitatea optică"], correct: 1 },
    { q: "Frecvența de tact (viteza) unui microprocesor modern se măsoară în:", options: ["Gigabyte (GB)", "Gigahertzi (GHz)", "Megabiți per secundă (Mbps)"], correct: 1 },
    { q: "Ce semnifică un microprocesor pe '64 de biți'?", options: ["Are 64 de nuclee", "Lățimea magistralei de date/adrese este de 64 biți", "Consumă 64 Wați"], correct: 1 },
    { q: "Pentru a spori performanța, microprocesoarele moderne conțin mai multe:", options: ["Ecrane", "Nuclee de procesare (Cores)", "Plăci video"], correct: 1 },
    // --- Cap 7.1 Introducere în rețele ---
    { q: "Cum se numește ansamblul de calculatoare interconectate pentru a face schimb de date?", options: ["Sistem de operare", "Rețea de calculatoare", "Bază de date"], correct: 1 },
    { q: "Ce arie de acoperire are o rețea LAN (Local Area Network)?", options: ["O clădire sau un campus", "Un oraș întreg", "O țară sau un continent"], correct: 0 },
    { q: "Rețeaua care conectează instituții la nivelul unui oraș este de tip:", options: ["WAN", "LAN", "MAN (Metropolitan Area Network)"], correct: 2 },
    { q: "Rețeaua globală (precum Internetul) se încadrează în categoria:", options: ["WAN (Wide Area Network)", "MAN", "LAN"], correct: 0 },
    // --- Cap 7.2 Tehnologii de cooperare ---
    { q: "Calculatorul care oferă resurse și servicii altor calculatoare se numește:", options: ["Client", "Server", "Hub"], correct: 1 },
    { q: "Calculatorul care solicită informații de la un Server se numește:", options: ["Client", "Ruter", "Switch"], correct: 0 },
    { q: "O rețea în care toate calculatoarele au drepturi egale se numește:", options: ["Client-Server", "Peer-to-Peer (De la egal la egal)", "Mainframe"], correct: 1 },
    // --- Cap 7.3 Topologia și arhitectura rețelelor ---
    { q: "Dispunerea fizică a cablurilor și a calculatoarelor într-o rețea formează:", options: ["Topologia rețelei", "Protocolul rețelei", "Sistemul de operare"], correct: 0 },
    { q: "Topologia în care toate calculatoarele sunt legate la un singur cablu central este:", options: ["Topologia Stea", "Topologia Magistrală (Bus)", "Topologia Inel"], correct: 1 },
    { q: "Topologia în care fiecare nod este conectat la un dispozitiv central (ex: Switch) este:", options: ["Stea", "Inel", "Magistrală"], correct: 0 },
    { q: "Topologia în care semnalul trece de la un calculator la altul formând o buclă închisă este:", options: ["Topologia Inel", "Topologia Stea", "Topologia Punct-la-Punct"], correct: 0 },
    { q: "Care este modelul de referință teoretic folosit pentru a explica arhitectura rețelelor?", options: ["Modelul TCP", "Modelul ISO/OSI (cu 7 niveluri)", "Modelul HTML"], correct: 1 },
    { q: "Pe ce nivel al modelului OSI se află cablurile fizice și semnalele electrice?", options: ["Nivelul Fizic", "Nivelul Aplicație", "Nivelul Rețea"], correct: 0 },
    // --- Cap 7.4 Rețeaua Internet ---
    { q: "Care este setul de protocoale fundamental care stă la baza Internetului?", options: ["HTTP/FTP", "TCP/IP", "SMTP/POP3"], correct: 1 },
    { q: "Ce identificator numeric unic primește fiecare dispozitiv conectat la Internet?", options: ["Adresa MAC", "Adresa de email", "Adresa IP"], correct: 2 },
    { q: "Pentru a fi transmise prin Internet, fișierele mari sunt tăiate în bucăți mici numite:", options: ["Sectoare", "Pachete de date", "Clustere"], correct: 1 },
    { q: "Echipamentul care dirijează pachetele de date pe cel mai bun traseu este:", options: ["Monitorul", "Ruterul (Router)", "Imprimanta de rețea"], correct: 1 },
    { q: "Rolul protocolului IP (Internet Protocol) este de a:", options: ["Asigura adresarea și rutarea pachetelor", "Afișa pagini web colorate", "Tipări documente"], correct: 0 },
    { q: "Rolul protocolului TCP (Transmission Control Protocol) este de a:", options: ["Căuta viruși", "Asigura asamblarea corectă și fără erori a pachetelor la destinație", "Genera parole"], correct: 1 },
    // --- Cap 7.5 Servicii Internet ---
    { q: "Ce serviciu asociază un IP (ex: 142.250.190.46) cu un nume ușor de reținut (google.com)?", options: ["WWW", "FTP", "DNS (Domain Name System)"], correct: 2 },
    { q: "Serviciul care permite vizualizarea paginilor multimedia interconectate se numește:", options: ["WWW (World Wide Web)", "Telnet", "E-mail"], correct: 0 },
    { q: "Ce protocol se utilizează pentru transferul paginilor web în browser?", options: ["SMTP", "HTTP / HTTPS", "FTP"], correct: 1 },
    { q: "Cum se numesc legăturile care te duc de la o pagină web la alta?", options: ["Hiperlinkuri", "Protocoale", "Noduri"], correct: 0 },
    { q: "Ce serviciu folosești exclusiv pentru transferul de fișiere (upload/download)?", options: ["DNS", "WWW", "FTP (File Transfer Protocol)"], correct: 2 },
    { q: "Ce serviciu permite schimbul de mesaje electronice asincrone?", options: ["Chat", "E-mail (Poșta Electronică)", "Ping"], correct: 1 },
    { q: "Care dintre următoarele este un protocol folosit la trimiterea unui E-mail?", options: ["SMTP", "HTTP", "TCP"], correct: 0 },
    { q: "Unde este stocată poșta electronică până când utilizatorul decide să o citească?", options: ["Pe hard disk-ul local", "În cutia poștală de pe Serverul de E-mail", "În ruter"], correct: 1 },
    { q: "Ce serviciu permite conectarea de la distanță la un alt calculator prin consolă text?", options: ["WWW", "Telnet / SSH", "DNS"], correct: 1 },
    { q: "Cum se numește programul utilizat pentru a accesa și afișa pagini web?", options: ["Editor de text", "Browser (Navigator)", "Sistem de operare"], correct: 1 },
    // --- Extra Teorie recapitulativă ---
    { q: "Care memorie este volatilă (își pierde conținutul la oprirea curentului)?", options: ["HDD", "ROM", "RAM"], correct: 2 },
    { q: "Ce componentă măsoară capacitatea sa în Gigabytes (GB) sau Terabytes (TB)?", options: ["Procesorul", "Unitatea de stocare (HDD/SSD)", "Monitorul"], correct: 1 },
    { q: "Dacă viteza Internetului tău este de 100 Mbps, litera 'b' mic înseamnă:", options: ["Biți (Bits)", "Bytes (Octeți)", "Blocuri"], correct: 0 },
    { q: "Care din următoarele rețele este cea mai restrânsă ca spațiu geografic?", options: ["WAN", "MAN", "LAN"], correct: 2 },
    { q: "Ce tip de cablu transmite informația sub formă de impulsuri luminoase?", options: ["Cablul coaxial", "Cablul UTP", "Fibra optică"], correct: 2 },
    { q: "Ce extensie sugerează că fișierul este o pagină web creată cu marcaje hipertext?", options: [".txt", ".html / .htm", ".exe"], correct: 1 },
    { q: "O pagină web este descrisă cu ajutorul limbajului de marcare:", options: ["C++", "Java", "HTML"], correct: 2 },
    { q: "Codificarea standard care alocă un număr unic fiecărui caracter de pe tastatură este:", options: ["IP", "TCP", "ASCII / Unicode"], correct: 2 },
    { q: "Dispozitivele I/E (Intrare/Ieșire) sunt controlate de programe speciale numite:", options: ["Drivere", "Browsere", "Antiviruși"], correct: 0 },
    { q: "În schema von Neumann, datele și instrucțiunile programului se află:", options: ["În memorii separate", "În aceeași memorie internă", "Doar pe HDD"], correct: 1 }
];

const triviaDB = [
    { q: "Cine este considerat inventatorul World Wide Web (WWW)?", options: ["Bill Gates", "Steve Jobs", "Tim Berners-Lee"], correct: 2 },
    { q: "Ce reprezintă codul de eroare '404' pe Internet?", options: ["Pagina nu a fost găsită", "Acces interzis", "Serverul a căzut"], correct: 0 },
    { q: "Care a fost numele primului calculator electronic de uz general?", options: ["Macintosh", "ENIAC", "Apollo 11"], correct: 1 },
    { q: "Care companie de tehnologie are logo-ul un măr mușcat?", options: ["Microsoft", "IBM", "Apple"], correct: 2 },
    { q: "Câți biți formează un Byte (octet)?", options: ["4", "8", "16"], correct: 1 },
    { q: "Cum se numește mascota oficială (pinguinul) a sistemului Linux?", options: ["Tux", "Linus", "Mac"], correct: 0 },
    { q: "Ce companie a creat sistemul de operare Windows?", options: ["Google", "Microsoft", "Intel"], correct: 1 },
    { q: "Care este cel mai utilizat sistem de operare pentru smartphone-uri în lume?", options: ["iOS", "Symbian", "Android"], correct: 2 },
    { q: "În ce an a fost lansat primul model de iPhone?", options: ["2000", "2007", "2010"], correct: 1 },
    { q: "Ce tastă este cel mai frecvent folosită pentru a reîncărca (Refresh) o pagină web?", options: ["F5", "Esc", "F1"], correct: 0 },
    { q: "Ce înseamnă acronimul USB?", options: ["Universal Serial Bus", "United State Band", "User System Block"], correct: 0 },
    { q: "Care limbaj de programare este folosit pentru a stiliza (da culoare) paginilor web?", options: ["Python", "C++", "CSS"], correct: 2 },
    { q: "Care este simbolul folosit pentru a scrie un comentariu pe un singur rând în C++?", options: ["//", "/*", "#"], correct: 0 },
    { q: "Ce companie majoră a cumpărat platforma GitHub în 2018?", options: ["Facebook", "Microsoft", "Amazon"], correct: 1 },
    { q: "Cum se numește software-ul creat special pentru a dăuna calculatorului?", options: ["Freeware", "Malware", "Firmware"], correct: 1 },
    { q: "Care a fost prima consolă de jocuri cu succes masiv lansată de Nintendo?", options: ["PlayStation", "Xbox", "NES"], correct: 2 },
    { q: "În ce sistem de numerație efectuează calculele un procesor?", options: ["Zecimal", "Hexazecimal", "Binar"], correct: 2 },
    { q: "Ce reprezintă 'Bluetooth'?", options: ["Un antivirus", "O tehnologie wireless pe distanțe scurte", "Un tip de monitor"], correct: 1 },
    { q: "Ce limbaj de programare a fost numit după o trupă de comedie britanică?", options: ["Java", "Ruby", "Python"], correct: 2 },
    { q: "Ce combinație de taste folosești pentru a copia rapid un text selectat?", options: ["Ctrl+V", "Ctrl+C", "Ctrl+X"], correct: 1 }
];

// ==========================================
// 4. GENERATOR HARTĂ
// ==========================================
function generateRandomBoard() {
    let eventsPool = [];
    for(let i=0; i<10; i++) eventsPool.push('question');
    for(let i=0; i<4; i++) eventsPool.push('trivia');
    for(let i=0; i<4; i++) eventsPool.push('minigame');
    for(let i=0; i<5; i++) eventsPool.push('attack');
    for(let i=0; i<4; i++) eventsPool.push('boost');
    for(let i=0; i<3; i++) eventsPool.push('boss');
    for(let i=0; i<2; i++) eventsPool.push('voice');
    for(let i=0; i<7; i++) eventsPool.push('empty');

    for (let i = eventsPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [eventsPool[i], eventsPool[j]] = [eventsPool[j], eventsPool[i]];
    }

    localTileMap = {};
    for(let i = 1; i < boardSize; i++) { localTileMap[i] = eventsPool[i - 1] || 'empty'; }
    localTileMap[coopGatePosition] = 'coop';
    updateBoardVisuals();
}

function updateBoardVisuals() {
    for(let i = 0; i < boardSize; i++) {
        let cell = document.getElementById(`cell-${i}`);
        if(!cell) continue;
        let type = i === 0 ? 'start' : (localTileMap[i] || 'empty');
        let meta = i === 0 ? { icon: '🚀', label: 'Start', className: 'tile-start' } : (tileMeta[type] || tileMeta.empty);
        cell.className = `cell ${meta.className}`;
        cell.innerHTML = `<span class="zone-title">${i === 0 ? 'START' : 'Zona ' + i}</span><span class="zone-icon">${meta.icon}</span><small>${meta.label}</small>`;
    }
}

// ==========================================
// 5. AUTENTIFICARE ȘI MULTIPLAYER
// ==========================================
document.getElementById('joinGameBtn').addEventListener('click', () => {
    let name = cleanName(document.getElementById('playerNameInput').value);
    if (name.length < 3) return alert("Introdu un nume valid!");
    myPlayerId = "agent_" + Math.random().toString(36).substr(2, 9);
    localPlayer = { name, position: 0, score: 100, winner: false, bossKeys: 0 };
    playersRef.child(myPlayerId).set(localPlayer);
    initSharedGameState();
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('gameUI').style.display = 'block';
    document.getElementById('displayName').innerText = name;
    updateHud();
    initBoard();
    listenToNetwork();
    listenToGameState();
});

document.getElementById('playerNameInput').addEventListener('keydown', event => {
    if (event.key === 'Enter') document.getElementById('joinGameBtn').click();
});

document.getElementById('rulesBtn').addEventListener('click', showRules);
document.getElementById('resetArenaBtn').addEventListener('click', requestNewArenaSession);
document.getElementById('closeModalBtn').addEventListener('click', () => {
    closeMissionModal();
    if (!gameFinished) setGameLocked(false);
});

window.addEventListener('beforeunload', () => { if (myPlayerId) playersRef.child(myPlayerId).remove(); });

function initBoard() {
    const gameBoard = document.getElementById('gameBoard');
    gameBoard.innerHTML = '';
    for (let i = 0; i < boardSize; i++) {
        let cell = document.createElement('div');
        cell.classList.add('cell');
        cell.id = `cell-${i}`;
        gameBoard.appendChild(cell);
    }
    generateRandomBoard();
}

function listenToNetwork() {
    playersRef.on("value", (snapshot) => {
        allNetworkPlayers = snapshot.val() || {};
        updateBoardLive(allNetworkPlayers);
        updateLeaderboard(allNetworkPlayers);
        if (waitingAtCoopGate && localPlayer.position === coopGatePosition && !gameFinished) checkCoopGate();
        const winners = Object.values(allNetworkPlayers).filter(p => p.winner);
        if (winners.length && !gameFinished) announceExternalWinner(winners[0]);
    });
}

function initSharedGameState() {
    gameStateRef.transaction(state => {
        if (!state || state.status === "ended") {
            return {
                status: "running",
                startedAt: firebase.database.ServerValue.TIMESTAMP,
                durationMs: gameDurationMs,
                minFastWinMs,
                winningScore,
                sessionId: Date.now()
            };
        }
        return state;
    });
}

function listenToGameState() {
    gameStateRef.on("value", snapshot => {
        gameState = snapshot.val() || {};
        updateSessionClock();
        if (gameState.status === "ended") {
            gameFinished = true;
            setGameLocked(true);
            showEndScreen(gameState.message || `🏁 Joc încheiat. Câștigător: ${gameState.winnerName || "necunoscut"}.`);
            return;
        }
        if (!gameTimerInterval) {
            gameTimerInterval = setInterval(updateSessionClock, 1000);
        }
    });
}

function updateSessionClock() {
    const timerEl = document.getElementById('sessionTimerLabel');
    const progressEl = document.getElementById('sessionProgressFill');
    const fastWinEl = document.getElementById('fastWinLabel');
    if (!gameState.startedAt) return;

    const duration = Number(gameState.durationMs || gameDurationMs);
    const elapsed = getElapsedMs();
    const remaining = Math.max(0, duration - elapsed);
    if (timerEl) timerEl.innerText = formatTime(remaining);
    if (progressEl) progressEl.style.width = `${Math.min(100, (elapsed / duration) * 100)}%`;
    if (fastWinEl) fastWinEl.innerText = canFastWin() ? "Victorie rapidă activă" : `Victorie rapidă după ${formatTime(minFastWinMs - elapsed)}`;

    if (remaining <= 0 && gameState.status !== "ended") {
        finishGameByTime();
    }
}

function getTopPlayer() {
    const players = Object.values(allNetworkPlayers || {});
    if (!players.length && localPlayer.name) return localPlayer;
    return players.sort((a, b) => (b.score || 0) - (a.score || 0))[0];
}

function finishGameByTime() {
    const top = getTopPlayer();
    if (!top) return;
    const message = `⏱️ Timpul de 30 minute s-a încheiat! Câștigător: ${top.name} cu ${top.score || 0} XP.`;
    gameStateRef.transaction(state => {
        if (state && state.status === "running") {
            state.status = "ended";
            state.endedAt = firebase.database.ServerValue.TIMESTAMP;
            state.winnerName = top.name;
            state.winnerScore = top.score || 0;
            state.reason = "time";
            state.message = message;
        }
        return state;
    });
}

function finishGameByFastWin() {
    const message = `🏆 VICTORIE RAPIDĂ! ${localPlayer.name} a atins ${localPlayer.score} XP după minutul 20 și a obținut cheia Boss.`;
    gameStateRef.transaction(state => {
        if (state && state.status === "running") {
            state.status = "ended";
            state.endedAt = firebase.database.ServerValue.TIMESTAMP;
            state.winnerName = localPlayer.name;
            state.winnerScore = localPlayer.score;
            state.reason = "fast-win";
            state.message = message;
        }
        return state;
    });
}

function requestNewArenaSession() {
    const ok = confirm("Resetezi arena pentru o sesiune nouă de 30 minute? Se vor șterge jucătorii și scorurile curente.");
    if (!ok) return;
    playersRef.remove();
    gameStateRef.set({
        status: "running",
        startedAt: firebase.database.ServerValue.TIMESTAMP,
        durationMs: gameDurationMs,
        minFastWinMs,
        winningScore,
        sessionId: Date.now()
    });
    alert("Arena a fost resetată. Elevii se pot reconecta.");
    location.reload();
}

function updateBoardLive(players) {
    document.querySelectorAll('.player-token').forEach(el => el.remove());
    const offsets = {};
    for (let id in players) {
        let p = players[id];
        let cell = document.getElementById(`cell-${p.position}`);
        if (cell) {
            offsets[p.position] = (offsets[p.position] || 0) + 1;
            let token = document.createElement('div');
            token.classList.add('player-token');
            token.title = `${p.name} - ${p.score} XP`;
            token.innerText = (p.name || '?').charAt(0).toUpperCase();
            token.style.backgroundColor = id === myPlayerId ? "#00ffcc" : "#ff0055";
            token.style.right = (5 + (offsets[p.position] - 1) * 18) + "px";
            cell.appendChild(token);
        }
    }
}

function updateLeaderboard(players) {
    let list = document.getElementById('leaderboardList');
    if (!list) return;
    list.innerHTML = "";
    Object.values(players).sort((a, b) => (b.score || 0) - (a.score || 0)).forEach((p, idx) => {
        let li = document.createElement('li');
        li.innerText = `${idx + 1}. ${p.name}: ${p.score || 0} XP${p.winner ? ' 🏆' : ''}`;
        list.appendChild(li);
    });
}

function syncPlayer() {
    localPlayer.score = clampScore(localPlayer.score);
    updateHud();
    if (myPlayerId) playersRef.child(myPlayerId).set(localPlayer);
    checkWinCondition();
}

// ==========================================
// 6. ZAR ȘI EVENIMENTE
// ==========================================
document.getElementById('rollDiceBtn').addEventListener('click', () => {
    if (gameLocked || gameFinished) return;
    setGameLocked(true);
    playTone('dice');
    let roll = randomBetween(1, 6);
    document.getElementById('diceResult').innerText = `Zar: 🎲 ${roll}`;

    localPlayer.position += roll;
    if (localPlayer.position >= boardSize) {
        localPlayer.position = localPlayer.position % boardSize;
        localPlayer.score += 50;
        alert("🔄 CICLU COMPLETAT! Harta a fost regenerată. Bonus: +50 XP.");
        generateRandomBoard();
    }
    syncPlayer();

    interceptPlayersOnSameTile();

    if (localPlayer.position === coopGatePosition) {
        setTimeout(checkCoopGate, 350);
        return;
    }

    let eventType = localTileMap[localPlayer.position];
    if (eventType && eventType !== 'empty') setTimeout(() => handleTileEvent(eventType), 350);
    else setTimeout(() => setGameLocked(false), 350);
});

function interceptPlayersOnSameTile() {
    for (let id in allNetworkPlayers) {
        if (id !== myPlayerId && allNetworkPlayers[id].position === localPlayer.position && localPlayer.position !== 0) {
            let stolenXP = randomBetween(5, 20);
            playersRef.child(id).child('score').transaction(score => clampScore((score || 100) - stolenXP));
            localPlayer.score += stolenXP;
            alert(`⚔️ Interceptare! Ai furat ${stolenXP} XP de la ${allNetworkPlayers[id].name}.`);
            syncPlayer();
            break;
        }
    }
}

function handleTileEvent(type) {
    const modal = document.getElementById('challengeModal');
    const title = document.getElementById('challengeTitle');
    const text = document.getElementById('challengeText');

    resetChallengeUI();
    setGameLocked(true);

    if (type === 'question' || type === 'trivia') launchQuestion(type);
    else if (type === 'attack') { performAttack(); setGameLocked(false); }
    else if (type === 'boost') {
        playTone('boost');
        let bonus = randomBetween(20, 45);
        alert(`🚀 OVERCLOCK! Primești ${bonus} XP bonus.`);
        localPlayer.score += bonus;
        wrongAnswerStreak = 0;
        syncPlayer();
        setGameLocked(false);
    }
    else if (type === 'boss') launchBossBattle();
    else if (type === 'voice') launchVoiceChallenge("Ai nimerit pe zona vocală. Spune parola pentru a continua.");
    else if (type === 'minigame') {
        let games = ['snake', 'bugs', 'memory'];
        currentActiveMinigame = games[Math.floor(Math.random() * games.length)];
        launchMinigame(currentActiveMinigame);
    }
}

function applyWrongPenalty(reason = "Răspuns greșit") {
    wrongAnswerStreak++;
    let penalty = 10 * wrongAnswerStreak;
    localPlayer.score = clampScore(localPlayer.score - penalty);
    playTone('loss');
    alert(`❌ ${reason}! Penalizare progresivă: -${penalty} XP.`);
    syncPlayer();
    if (wrongAnswerStreak >= 4) {
        launchVoiceChallenge("Ai acumulat 4 greșeli consecutive. Pentru deblocare trebuie să spui fraza de verificare.");
        return true;
    }
    return false;
}

function rewardCorrect(points = 20, message = "Corect") {
    wrongAnswerStreak = 0;
    localPlayer.score += points;
    playTone('win');
    alert(`✅ ${message}! +${points} XP.`);
    syncPlayer();
}

function launchQuestion(type) {
    activeQuestionType = type;
    const modal = document.getElementById('challengeModal');
    const title = document.getElementById('challengeTitle');
    const text = document.getElementById('challengeText');
    const ansContainer = document.getElementById('answersContainer');
    const retryBtn = document.getElementById('retryBtn');
    let dbPool = type === 'question' ? questionsDB : triviaDB;
    let qData = dbPool[Math.floor(Math.random() * dbPool.length)];

    title.innerText = type === 'question' ? "[Teorie]" : "[Cultură Generală]";
    text.innerText = qData.q;

    qData.options.forEach((opt, index) => {
        let btn = document.createElement('button');
        btn.classList.add('answer-btn');
        btn.innerText = opt;
        btn.onclick = () => {
            if (index === qData.correct) {
                rewardCorrect(20, "Răspuns corect");
                modal.classList.add('hidden');
                setGameLocked(false);
            } else {
                const launchedVoice = applyWrongPenalty("Răspuns greșit");
                if (!launchedVoice) {
                    ansContainer.innerHTML = '';
                    retryBtn.innerText = `Reîncearcă întrebarea. Următoarea greșeală: -${10 * (wrongAnswerStreak + 1)} XP`;
                    retryBtn.style.display = 'block';
                    retryBtn.onclick = () => launchQuestion(type);
                }
            }
        };
        ansContainer.appendChild(btn);
    });

    modal.classList.remove('hidden');
}

function performAttack() {
    playTone('attack');
    let opponents = Object.keys(allNetworkPlayers).filter(id => id !== myPlayerId);
    if (opponents.length > 0) {
        let targetId = opponents[Math.floor(Math.random() * opponents.length)];
        let stolenXP = randomBetween(10, 45);
        playersRef.child(targetId).child('score').transaction(score => clampScore((score || 100) - stolenXP));
        localPlayer.score += stolenXP;
        alert(`⚔️ Atac random reușit! Ai furat ${stolenXP} XP de la ${allNetworkPlayers[targetId].name}.`);
    } else {
        let bonus = randomBetween(5, 20);
        alert(`Nu sunt alți agenți. Ai primit ${bonus} XP bonus.`);
        localPlayer.score += bonus;
    }
    syncPlayer();
}

// ==========================================
// 7. CO-OP GATE
// ==========================================
function checkCoopGate() {
    let playersHere = [];
    for (let id in allNetworkPlayers) {
        if (allNetworkPlayers[id].position === coopGatePosition) playersHere.push({ id, ...allNetworkPlayers[id] });
    }

    if (playersHere.length < 2) {
        waitingAtCoopGate = true;
        alert("🔐 Ai ajuns la FIREWALL GATE! Ai nevoie de încă un agent pentru a continua.");
        setGameLocked(true);
        return;
    }

    waitingAtCoopGate = false;
    launchCoopMission(playersHere.slice(0, 2));
}

function launchCoopMission(playersHere) {
    resetChallengeUI();
    const modal = document.getElementById('challengeModal');
    const title = document.getElementById('challengeTitle');
    const text = document.getElementById('challengeText');
    const ansContainer = document.getElementById('answersContainer');
    let qData = questionsDB[Math.floor(Math.random() * questionsDB.length)];

    title.innerText = "🤝 MISIUNE CO-OP: Spargerea Firewall-ului";
    text.innerText = `Agenți conectați: ${playersHere.map(p => p.name).join(' + ')}. Rezolvați provocarea pentru a reseta poarta și a primi bonus.`;

    let p = document.createElement('p');
    p.innerText = qData.q;
    ansContainer.appendChild(p);

    qData.options.forEach((opt, index) => {
        let btn = document.createElement('button');
        btn.classList.add('answer-btn');
        btn.innerText = opt;
        btn.onclick = () => {
            if (index === qData.correct) {
                alert("✅ Misiune co-op reușită! Ambii agenți primesc +50 XP și revin la START.");
                playersHere.forEach(p => {
                    playersRef.child(p.id).update({ score: clampScore((p.score || 100) + 50), position: 0 });
                });
                if (playersHere.some(p => p.id === myPlayerId)) {
                    localPlayer.score += 50;
                    localPlayer.position = 0;
                    syncPlayer();
                }
                modal.classList.add('hidden');
                setGameLocked(false);
            } else {
                applyWrongPenalty("Misiune co-op eșuată");
            }
        };
        ansContainer.appendChild(btn);
    });

    modal.classList.remove('hidden');
}

// ==========================================
// 8. BOSS BATTLE
// ==========================================
function launchBossBattle() {
    resetChallengeUI();
    playTone('boss');
    const modal = document.getElementById('challengeModal');
    const title = document.getElementById('challengeTitle');
    const text = document.getElementById('challengeText');
    const ansContainer = document.getElementById('answersContainer');
    let qData = questionsDB[Math.floor(Math.random() * questionsDB.length)];

    title.innerText = `👾 BOSS BATTLE: AI CORE HP ${bossHP}/${bossMaxHP}`;
    text.innerText = qData.q;

    qData.options.forEach((opt, index) => {
        let btn = document.createElement('button');
        btn.classList.add('answer-btn');
        btn.innerText = opt;
        btn.onclick = () => {
            if (index === qData.correct) {
                let damage = randomBetween(25, 60);
                bossHP = Math.max(0, bossHP - damage);
                rewardCorrect(damage, `Lovitură reușită. Damage: ${damage}`);
                updateHud();
                if (bossHP <= 0) {
                    alert("🏆 BOSS ÎNVINS! Bonus final +100 XP și +1 Cheie Boss. AI Core se regenerează pentru următorii jucători.");
                    localPlayer.score += 100;
                    localPlayer.bossKeys = (localPlayer.bossKeys || 0) + 1;
                    bossHP = bossMaxHP;
                    syncPlayer();
                    modal.classList.add('hidden');
                    setGameLocked(false);
                } else {
                    launchBossBattle();
                }
            } else {
                const launchedVoice = applyWrongPenalty("Boss-ul te-a lovit");
                if (!launchedVoice) launchBossBattle();
            }
        };
        ansContainer.appendChild(btn);
    });

    modal.classList.remove('hidden');
}

// ==========================================
// 9. VOICE CHALLENGE
// ==========================================
function launchVoiceChallenge(customText = "Spune parola în microfon pentru a continua.") {
    resetChallengeUI();
    playTone('voice');
    const modal = document.getElementById('challengeModal');
    const title = document.getElementById('challengeTitle');
    const text = document.getElementById('challengeText');
    const voiceBtn = document.getElementById('voiceChallengeBtn');
    const voiceResult = document.getElementById('voiceResult');
    const secretPhrase = "calculatorul este inteligent";

    title.innerText = "🎙️ VERIFICARE VOCALĂ";
    text.innerText = `${customText} Fraza: „${secretPhrase}”.`;
    voiceBtn.style.display = "block";
    voiceResult.innerText = "";
    modal.classList.remove('hidden');
    setGameLocked(true);

    voiceBtn.onclick = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Browserul nu suportă recunoaștere vocală. Folosește Google Chrome sau Microsoft Edge.");
            document.getElementById('closeModalBtn').style.display = 'block';
            return;
        }
        const recognition = new SpeechRecognition();
        recognition.lang = "ro-RO";
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;
        recognition.start();
        voiceResult.innerText = "Ascult...";

        recognition.onresult = event => {
            let spokenText = event.results[0][0].transcript.toLowerCase().trim();
            voiceResult.innerText = `Ai spus: „${spokenText}”`;
            if (spokenText.includes(secretPhrase)) {
                alert("✅ Verificare vocală reușită! +15 XP și greșelile consecutive se resetează.");
                wrongAnswerStreak = 0;
                localPlayer.score += 15;
                syncPlayer();
                modal.classList.add('hidden');
                setGameLocked(false);
            } else {
                alert("❌ Fraza nu a fost recunoscută corect. -30 XP.");
                localPlayer.score = clampScore(localPlayer.score - 30);
                syncPlayer();
            }
        };
        recognition.onerror = () => {
            voiceResult.innerText = "Microfonul nu a putut fi folosit. Verifică permisiunile browserului.";
        };
    };
}

// ==========================================
// 10. MINI-JOCURI
// ==========================================
function launchMinigame(gameType) {
    resetChallengeUI();
    const modal = document.getElementById('challengeModal');
    const title = document.getElementById('challengeTitle');
    const text = document.getElementById('challengeText');
    const area = document.getElementById('miniGameArea');
    area.style.display = 'block';
    modal.classList.remove('hidden');

    if (gameType === 'snake') {
        title.innerText = "⚠️ SYSTEM CRASH";
        text.innerText = "Strânge 10 puncte la Snake pentru a debloca!";
        startSnakeGame();
    } else if (gameType === 'bugs') {
        title.innerText = "🐞 VÂNĂTOAREA DE ERORI";
        text.innerText = "Zdrobește 10 erori în 15 secunde!";
        startBugGame();
    } else if (gameType === 'memory') {
        title.innerText = "🧠 CELULA DE MEMORIE";
        text.innerText = "Găsește toate perechile!";
        startMemoryGame();
    }
}

function minigameWin() {
    rewardCorrect(25, "Mini-joc reușit");
    document.getElementById('challengeModal').classList.add('hidden');
    setGameLocked(false);
}

function minigameLoss() {
    const launchedVoice = applyWrongPenalty("Eșec critic la mini-joc");
    document.getElementById('miniGameCanvas').style.display = 'none';
    document.getElementById('bugGameContainer').style.display = 'none';
    document.getElementById('memoryGameContainer').style.display = 'none';
    if (!launchedVoice) {
        const retryBtn = document.getElementById('retryBtn');
        retryBtn.innerText = `Reîncearcă mini-jocul. Următoarea greșeală: -${10 * (wrongAnswerStreak + 1)} XP`;
        retryBtn.style.display = 'block';
        retryBtn.onclick = () => launchMinigame(currentActiveMinigame);
    }
}

let snakeInterval;
let snakeKeyHandler;
function startSnakeGame() {
    const canvas = document.getElementById('miniGameCanvas');
    const ctx = canvas.getContext('2d');
    canvas.style.display = "block";
    let snake = [{x: 10, y: 10}];
    let food = {x: 15, y: 15};
    let dx = 1, dy = 0, score = 0, box = 15;
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
            clearInterval(snakeInterval); document.removeEventListener('keydown', snakeKeyHandler); minigameLoss(); return;
        }
        snake.unshift(head);
        if (head.x === food.x && head.y === food.y) {
            score++;
            food = {x: Math.floor(Math.random() * 20), y: Math.floor(Math.random() * 20)};
            if (score >= 10) { clearInterval(snakeInterval); document.removeEventListener('keydown', snakeKeyHandler); minigameWin(); }
        } else snake.pop();
        ctx.fillStyle = "black"; ctx.fillRect(0, 0, 300, 300);
        ctx.fillStyle = "red"; ctx.fillRect(food.x * box, food.y * box, box, box);
        ctx.fillStyle = "#00ffcc"; snake.forEach(s => ctx.fillRect(s.x * box, s.y * box, box, box));
    }, 120);
}

let bugSpawnTimer;
let bugCountdown;
function startBugGame() {
    const container = document.getElementById('bugGameContainer');
    const stats = document.getElementById('miniGameStats');
    container.style.display = "block";
    stats.style.display = "block";
    container.innerHTML = '';
    let score = 0, timeLeft = 15;
    stats.innerText = `Timp: ${timeLeft}s | Erori: ${score}/10`;
    if(bugCountdown) clearInterval(bugCountdown);
    bugCountdown = setInterval(() => {
        timeLeft--;
        stats.innerText = `Timp: ${timeLeft}s | Erori: ${score}/10`;
        if (timeLeft <= 0) { clearInterval(bugCountdown); clearTimeout(bugSpawnTimer); score >= 10 ? minigameWin() : minigameLoss(); }
    }, 1000);
    function spawnBug() {
        if(timeLeft <= 0) return;
        let bug = document.createElement('div');
        bug.className = 'bug-icon';
        bug.innerText = ['🐞','🐛','🦠'][Math.floor(Math.random()*3)];
        bug.style.top = Math.random() * 250 + 'px';
        bug.style.left = Math.random() * 250 + 'px';
        bug.onmousedown = () => {
            score++; stats.innerText = `Timp: ${timeLeft}s | Erori: ${score}/10`; bug.remove();
            if (score >= 10) { clearInterval(bugCountdown); clearTimeout(bugSpawnTimer); minigameWin(); }
        };
        container.appendChild(bug);
        setTimeout(() => { if(bug.parentNode) bug.remove(); }, 1200);
        bugSpawnTimer = setTimeout(spawnBug, 700);
    }
    spawnBug();
}

function startMemoryGame() {
    const container = document.getElementById('memoryGameContainer');
    container.style.display = "grid";
    container.innerHTML = '';
    const symbols = ['ROM', 'RAM', 'CPU', 'LAN'];
    let cardsData = [...symbols, ...symbols].sort(() => Math.random() - 0.5);
    let hasFlippedCard = false, lockBoard = false, firstCard, secondCard, matchedPairs = 0;
    cardsData.forEach(symbol => {
        let card = document.createElement('div');
        card.classList.add('memory-card');
        card.dataset.symbol = symbol;
        card.innerHTML = `<div class="front-face">${symbol}</div><div class="back-face">?</div>`;
        card.onclick = function() {
            if (lockBoard || this === firstCard || this.classList.contains('flip')) return;
            this.classList.add('flip');
            if (!hasFlippedCard) { hasFlippedCard = true; firstCard = this; return; }
            secondCard = this; lockBoard = true;
            if (firstCard.dataset.symbol === secondCard.dataset.symbol) {
                matchedPairs++; [hasFlippedCard, lockBoard, firstCard, secondCard] = [false, false, null, null];
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

// ==========================================
// 11. FINAL JOC ȘI REGULI
// ==========================================
function checkWinCondition() {
    if (gameFinished || !myPlayerId) return;

    if (localPlayer.score >= winningScore && !canFastWin()) {
        if (!targetNoticeShown) {
            targetNoticeShown = true;
            alert(`Ai atins ${winningScore} XP, dar finalul rapid se activează doar după minutul 20. Păstrează avantajul!`);
        }
        return;
    }

    if (localPlayer.score >= winningScore && canFastWin() && (localPlayer.bossKeys || 0) >= 1) {
        gameFinished = true;
        localPlayer.winner = true;
        playersRef.child(myPlayerId).update({ winner: true, score: localPlayer.score, bossKeys: localPlayer.bossKeys || 0 });
        setGameLocked(true);
        finishGameByFastWin();
    }
}

function announceExternalWinner(winner) {
    gameFinished = true;
    setGameLocked(true);
    showEndScreen(`🏆 Joc încheiat! ${winner.name} a câștigat cu ${winner.score} XP.`);
}

function showEndScreen(message) {
    resetChallengeUI();
    document.getElementById('challengeTitle').innerText = "Final de joc";
    document.getElementById('challengeText').innerText = message;
    document.getElementById('closeModalBtn').style.display = 'block';
    document.getElementById('challengeModal').classList.remove('hidden');
}

function showRules() {
    resetChallengeUI();
    document.getElementById('challengeTitle').innerText = "Reguli rapide";
    document.getElementById('challengeText').innerText = "Durata standard este 30 minute. Câștigă jucătorul cu cel mai mare XP la final. Victorie rapidă este posibilă doar după minutul 20, dacă ai minimum " + winningScore + " XP și cel puțin o Cheie Boss. Răspuns corect: +20 XP. Greșeli consecutive: -10, -20, -30 etc. Atacul fură random 10–45 XP. Boss-ul oferă damage ca XP și la înfrângere dă Cheie Boss. La 4 greșeli consecutive apare verificarea vocală. Ultima zonă este Co-Op Gate și cere 2 jucători.";
    document.getElementById('closeModalBtn').style.display = 'block';
    document.getElementById('challengeModal').classList.remove('hidden');
    setGameLocked(true);
}

updateHud();
