// ==========================================
// PROTOCOL DE SECURITATE ANTI-CHEAT
// ==========================================
document.addEventListener('contextmenu', event => event.preventDefault());

document.addEventListener('keydown', function(event) {
    if (event.key === 'PrintScreen' || 
        event.keyCode === 123 || // F12
        (event.ctrlKey && (event.key === 'c' || event.key === 'v' || event.key === 'u' || event.key === 'p' || event.key === 's'))) {
        
        event.preventDefault();
        alert('SECURITY BREACH DETECTED: Tentativă de fraudă! Ai pierdut 20 XP.');
        player.score -= 20;
        updateHUD();
    }
});

// ==========================================
// LOGICA JOCULUI
// ==========================================
const boardSize = 25; // 5x5 grid
const gameBoard = document.getElementById('gameBoard');
let player = { position: 0, score: 100 };

// Generăm tabla de joc vizual
for (let i = 0; i < boardSize; i++) {
    let cell = document.createElement('div');
    cell.classList.add('cell');
    cell.id = `cell-${i}`;
    cell.innerText = i === 0 ? "START" : `Zona ${i}`;
    gameBoard.appendChild(cell);
}

// Baza de date cu provocări (din capitolele 6 și 7)
const challenges = [
    {
        tile: 3,
        question: "Laborator Hardware: Conform schemei funcționale (Cap. 6.1), cine coordonează funcționarea tuturor componentelor?",
        options: ["Microprocesorul (UCC)", "Memoria Externă", "Tastatura"],
        correct: 0
    },
    {
        tile: 7,
        question: "Cyber Attack: Ai fost interceptat! Ce topologie de rețea folosește un cablu central la care sunt conectate toate calculatoarele? (Cap. 7.3)",
        options: ["Topologia Inel", "Topologia Magistrală", "Topologia Stea"],
        correct: 1
    },
    {
        tile: 12,
        question: "Data Vault: Ce serviciu Internet este utilizat pentru a transfera fișiere între calculatoare? (Cap. 7.5)",
        options: ["DNS", "FTP", "WWW"],
        correct: 1
    }
];

function updateHUD() {
    document.getElementById('playerPosition').innerText = player.position;
    document.getElementById('playerScore').innerText = player.score;
    
    // Reset colors
    document.querySelectorAll('.cell').forEach(c => c.classList.remove('active'));
    document.getElementById(`cell-${player.position}`).classList.add('active');
}

document.getElementById('rollDiceBtn').addEventListener('click', () => {
    let roll = Math.floor(Math.random() * 6) + 1;
    document.getElementById('diceResult').innerText = `Ai dat: ${roll}`;
    
    player.position += roll;
    if (player.position >= boardSize) player.position = boardSize - 1; // Nu depășim tabla
    
    updateHUD();
    checkForEvents(player.position);
});

function checkForEvents(pos) {
    let event = challenges.find(c => c.tile === pos);
    if (event) {
        showChallenge(event);
    }
}

function showChallenge(challengeData) {
    const modal = document.getElementById('challengeModal');
    const qText = document.getElementById('challengeText');
    const ansContainer = document.getElementById('answersContainer');
    
    qText.innerText = challengeData.question;
    ansContainer.innerHTML = ''; // Curățăm răspunsurile vechi
    
    challengeData.options.forEach((opt, index) => {
        let btn = document.createElement('button');
        btn.classList.add('answer-btn');
        btn.innerText = opt;
        btn.onclick = () => checkAnswer(index, challengeData.correct, modal);
        ansContainer.appendChild(btn);
    });
    
    modal.classList.remove('hidden');
}

function checkAnswer(selectedIndex, correctIndex, modal) {
    if (selectedIndex === correctIndex) {
        alert("Cod spart cu succes! Ai câștigat 30 XP.");
        player.score += 30;
    } else {
        alert("Eroare de sistem! Răspuns greșit. Ai pierdut 20 XP.");
        player.score -= 20;
    }
    updateHUD();
    modal.classList.add('hidden');
}

// Inițializare
updateHUD();