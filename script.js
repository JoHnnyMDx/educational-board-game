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
// ==========================================
// 3. BAZA DE DATE MASIVĂ - 100 ÎNTREBĂRI
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
    { q: "Care este simbolul folosit pentru a scrie un comentariu pe un singur rând în C++?", options: ["//", "

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
