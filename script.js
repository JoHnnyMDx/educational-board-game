// ==========================================
// 1. SISTEMUL ANTI-FRAUDĂ (SECURITY PROTOCOL)
// ==========================================
// Blochează click-dreapta
document.addEventListener('contextmenu', event => event.preventDefault());

// Blochează combinații de taste (Copy, Paste, PrintScreen, Inspect Element)
document.addEventListener('keydown', function(event) {
    if (event.key === 'PrintScreen' || 
        event.keyCode === 123 || // F12
        (event.ctrlKey && (event.key === 'c' || event.key === 'v' || event.key === 'u' || event.key === 'p' || event.key === 's'))) {
        
        event.preventDefault();
        
        // Penalizare în joc pentru tentativă de fraudă
        alert('⚠️ SECURITY BREACH DETECTED: Acțiune neautorizată! Ai pierdut 15 Energie.');
        player.score -= 15;
        updateHUD();
    }
});

// Blochează selectarea textului cu mouse-ul
document.addEventListener('selectstart', event => event.preventDefault());


// ==========================================
// 2. LOGICA DE BAZĂ A JOCULUI
// ==========================================
const boardSize = 25; // Grilă 5x5
const gameBoard = document.getElementById('gameBoard');
let player = { position: 0, score: 100 };

// Baza de date cu provocări (din Capitolele 6 și 7 - Manual Info clasa 11)
const challenges = [
    {
        tile: 3,
        type: "Laborator Hardware",
        question: "Conform schemei funcționale (Cap. 6.1), care unitate are rolul de a extrage instrucțiunile din memoria internă și de a dirija execuția lor?",
        options: ["Unitatea Aritmetică și Logică (UAL)", "Unitatea de Comandă și Control (UCC)", "Unitatea de Memorie Externă"],
        correct: 1
    },
    {
        tile: 6,
        type: "Data Vault",
        question: "Din ce este formată partea de comandă a unei instrucțiuni în format cod-calculator? (Cap. 6.2)",
        options: ["Adresele operanzilor", "Codul operației", "Rezultatul operației"],
        correct: 1
    },
    {
        tile: 10,
        type: "Cyber Attack",
        question: "Sistemul a fost virusat! Trebuie să restabilești rețeaua. Care topologie folosește un nod central (ex: hub sau switch) la care sunt conectate toate celelalte calculatoare? (Cap. 7.3)",
        options: ["Topologia Inel", "Topologia Stea", "Topologia Magistrală"],
        correct: 1
    },
    {
        tile: 15,
        type: "Escape Room",
        question: "Pentru a debloca ușa, identifică protocolul de bază al rețelei Internet care asigură transmiterea pachetelor de date: (Cap. 7.4)",
        options: ["HTTP/HTML", "TCP/IP", "FTP/SMTP"],
        correct: 1
    },
    {
        tile: 19,
        type: "Memory Scan",
        question: "Care dintre următoarele este considerată o memorie pe disc optic? (Cap. 6.7)",
        options: ["Hard Disk (HDD)", "Bandă magnetică", "Blu-ray Disc (BD)"],
        correct: 2
    },
    {
        tile: 22,
        type: "Laborator STEM",
        question: "Cum se numește circuitul integrat care include pe un singur cip Unitatea de Comandă și Control și Unitatea Aritmetică și Logică? (Cap. 6.11)",
        options: ["Placa de bază", "Microprocesorul", "Memoria ROM"],
        correct: 1
    }
];

// Generăm vizual celulele pe tablă
function initBoard() {
    gameBoard.innerHTML = ''; // Curățăm tabla
    for (let i = 0; i < boardSize; i++) {
        let cell = document.createElement('div');
        cell.classList.add('cell');
        cell.id = `cell-${i}`;
        
        // Denumim celulele special
        if (i === 0) cell.innerText = "START";
        else if (i === boardSize - 1) cell.innerText = "NUCLEU AI (FINISH)";
        else cell.innerText = `Zona ${i}`;
        
        // Colorăm vizual zonele cu provocări pentru a atrage atenția
        if (challenges.some(c => c.tile === i)) {
            cell.style.borderColor = "#ff0055";
            cell.innerText += "\n🔒"; // Adăugăm un lacăt vizual
        }

        gameBoard.appendChild(cell);
    }
    updateHUD();
}

// Actualizează interfața (HUD) și mută pionul (clasa .active)
function updateHUD() {
    document.getElementById('playerPosition').innerText = player.position;
    document.getElementById('playerScore').innerText = player.score;
    
    // Scoatem pionul de pe celula veche
    document.querySelectorAll('.cell').forEach(c => c.classList.remove('active'));
    
    // Punem pionul pe noua celulă
    let currentCell = document.getElementById(`cell-${player.position}`);
    if(currentCell) {
        currentCell.classList.add('active');
    }
}

// ==========================================
// 3. MECANICA DE ZAR ȘI MIȘCARE
// ==========================================
document.getElementById('rollDiceBtn').addEventListener('click', () => {
    // Dacă jucătorul a terminat deja, nu mai dă cu zarul
    if (player.position >= boardSize - 1) return;

    let roll = Math.floor(Math.random() * 6) + 1; // Zar de la 1 la 6
    document.getElementById('diceResult').innerText = `Zar: 🎲 ${roll}`;
    
    // Mutăm jucătorul
    player.position += roll;
    
    // Ne asigurăm că nu iese de pe tablă
    if (player.position >= boardSize - 1) {
        player.position = boardSize - 1;
        updateHUD();
        setTimeout(() => alert("🎉 Felicitări! Ai recuperat Nucleul AI și ai salvat NeoCity! Scorul tău final: " + player.score + " Energie."), 500);
        return;
    }
    
    updateHUD();
    
    // Verificăm dacă a picat pe o celulă cu o provocare
    checkForEvents(player.position);
});

// ==========================================
// 4. SISTEMUL DE PROVOCĂRI (MODAL)
// ==========================================
function checkForEvents(pos) {
    let event = challenges.find(c => c.tile === pos);
    if (event) {
        // Punem un mic delay ca jucătorul să vadă că s-a mutat înainte să apară întrebarea
        setTimeout(() => showChallenge(event), 300);
    }
}

function showChallenge(challengeData) {
    const modal = document.getElementById('challengeModal');
    const qTitle = document.getElementById('challengeTitle');
    const qText = document.getElementById('challengeText');
    const ansContainer = document.getElementById('answersContainer');
    
    qTitle.innerText = `[${challengeData.type}]`;
    qText.innerText = challengeData.question;
    ansContainer.innerHTML = ''; // Curățăm butoanele vechi
    
    // Generăm butoanele pentru răspunsuri
    challengeData.options.forEach((opt, index) => {
        let btn = document.createElement('button');
        btn.classList.add('answer-btn');
        btn.innerText = opt;
        btn.onclick = () => checkAnswer(index, challengeData.correct, modal);
        ansContainer.appendChild(btn);
    });
    
    // Afișăm fereastra modală
    modal.classList.remove('hidden');
    // Dezactivăm temporar butonul de zar până răspunde
    document.getElementById('rollDiceBtn').disabled = true;
}

function checkAnswer(selectedIndex, correctIndex, modal) {
    if (selectedIndex === correctIndex) {
        alert("✅ Acces Acordat! Răspuns corect. Ai primit 20 Energie.");
        player.score += 20;
    } else {
        alert("❌ Eroare! Răspuns incorect. Sistemul te-a penalizat cu 15 Energie.");
        player.score -= 15;
    }
    
    updateHUD();
    modal.classList.add('hidden'); // Ascundem modalul
    document.getElementById('rollDiceBtn').disabled = false; // Reactivăm zarul
}

// Pornim jocul
initBoard();
