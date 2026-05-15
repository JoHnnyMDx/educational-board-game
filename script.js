(() => {
  "use strict";

  // --- FIREBASE MULTIPLAYER ---
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

  if (typeof firebase !== "undefined" && !firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  const db = typeof firebase !== "undefined"
    ? firebase.database()
    : null;

  let roomCode = null;
  let localPlayerId = 1;
  let isMultiplayer = false;
  let ignoreNextSync = false;



  const GRID_SIZE = 30;
  const TILE_SIZE = 42;

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");

  const ui = {
    playerCount: document.getElementById("playerCount"),
    newGameBtn: document.getElementById("newGameBtn"),
    drawTileBtn: document.getElementById("drawTileBtn"),
    drawActionBtn: document.getElementById("drawActionBtn"),
    drawCharacterBtn: document.getElementById("drawCharacterBtn"),
    drawEventBtn: document.getElementById("drawEventBtn"),
    endTurnBtn: document.getElementById("endTurnBtn"),
    currentCard: document.getElementById("currentCard"),
    cardLog: document.getElementById("cardLog"),
    turnInfo: document.getElementById("turnInfo"),
    statusText: document.getElementById("statusText"),
    playersBox: document.getElementById("playersBox"),
    scoreBox: document.getElementById("scoreBox"),
    globalEventBox: document.getElementById("globalEventBox"),
    tileInfo: document.getElementById("tileInfo"),
    saveBtn: document.getElementById("saveBtn"),
    loadBtn: document.getElementById("loadBtn"),
    resetBtn: document.getElementById("resetBtn"),
    zoomInBtn: document.getElementById("zoomInBtn"),
    zoomOutBtn: document.getElementById("zoomOutBtn"),
    centerBtn: document.getElementById("centerBtn"),
    draftZone: document.getElementById("draftZone"),
    draftOptions: document.getElementById("draftOptions"),
    mapTooltip: document.getElementById("mapTooltip"),
    openBankBtn: document.getElementById("openBankBtn"),
    openUpgradeBtn: document.getElementById("openUpgradeBtn"),
    bankZone: document.getElementById("bankZone"),
    bankGet: document.getElementById("bankGet"),
    execBankBtn: document.getElementById("execBankBtn"),
    missionsBox: document.getElementById("missionsBox"),
    factionInfoBox: document.getElementById("factionInfoBox"),
    upgradeModal: document.getElementById("upgradeModal"),
    closeUpgradeModal: document.getElementById("closeUpgradeModal"),
    upgradeList: document.getElementById("upgradeList"),
    endGameModal: document.getElementById("endGameModal"),
    winnerPodium: document.getElementById("winnerPodium"),
    finalStats: document.getElementById("finalStats")
  };


  const factions = [
    { id: "ong", name: "ONG-ul Edu", power: "Colaborare Extra", desc: "Activitățile costă cu 1 🤝 mai puțin.", bonusType: "discount_collab" },
    { id: "gov", name: "Ministerul Inovației", power: "Buget Tehnologic", desc: "Hub-urile și Centrele STEAM costă cu 1 🧰 mai puțin.", bonusType: "discount_tech" },
    { id: "students", name: "Consiliul Elevilor", power: "Vocea Tinerilor", desc: "Elevii oferă +2 ⭐ Impact.", bonusType: "student_boost" },
    { id: "biz", name: "Antreprenorii", power: "Investiții Rapide", desc: "Schimbul la bancă este 2:1.", bonusType: "bank_2_1" }
  ];

  const upgrades = [
    { id: "lab", name: "Laborator STEM", cost: { equipment: 2, innovation: 1 }, prod: { impact: 1 }, icon: "🔬" },
    { id: "tic", name: "Sală TIC Modernă", cost: { equipment: 3 }, prod: { innovation: 1 }, icon: "💻" },
    { id: "club", name: "Club de Robotică", cost: { innovation: 2, collaboration: 1 }, prod: { equipment: 1 }, icon: "🤖" }
  ];

  const tileTypes = {
    city: { label: "Oraș", icon: "🏙️", color: "#10ECD2", text: "#062b31", buildable: false, cost: {}, produces: {} },
    school: { label: "Școală", icon: "🏫", color: "#F5FBFF", text: "#173b4a", buildable: false, cost: {}, produces: {} },
    road: { label: "Drum normal", icon: "🚗", color: "#D7A86E", text: "#2b1605", buildable: true, cost: { equipment: 1 }, produces: {} },
    village: { label: "Sat", icon: "🏡", color: "#9BE564", text: "#17320c", buildable: true, cost: { collaboration: 1 }, produces: { collaboration: 1 } },
    hub: { label: "Hub Digital", icon: "💻", color: "#6CE5FF", text: "#052a36", buildable: true, cost: { innovation: 1, equipment: 1 }, produces: { innovation: 1 } },
    steam: { label: "Centru STEAM", icon: "🔬", color: "#B388FF", text: "#260d46", buildable: true, cost: { innovation: 1, equipment: 2 }, produces: { impact: 1 } },
    rural: { label: "Zonă rurală", icon: "🌱", color: "#56C596", text: "#062d21", buildable: true, cost: { collaboration: 1 }, produces: { impact: 1 } },
    blocked: { label: "Zonă blocată", icon: "⛔", color: "#362B2A", text: "#ffffff", buildable: true, cost: {}, produces: {} },
    digitalRoad: { label: "Rețea Digitală", icon: "🌐", color: "#10ECD2", text: "#062b31", buildable: true, cost: { innovation: 1, equipment: 1 }, produces: { innovation: 1 } },
    steamCorridor: { label: "Coridor STEAM", icon: "⚙️", color: "#E51491", text: "#ffffff", buildable: true, cost: { innovation: 1, collaboration: 1 }, produces: { impact: 1 } },
    ruralRoute: { label: "Rută Rurală", icon: "🚌", color: "#FFD166", text: "#3a2600", buildable: true, cost: { equipment: 1, collaboration: 1 }, produces: { collaboration: 1 } },
    university: { label: "Centru universitar", icon: "🎓", color: "#F5F7FA", text: "#1f2630", buildable: true, cost: { innovation: 2, equipment: 1, collaboration: 1 }, produces: { innovation: 1, impact: 1 } }
  };

  const cities = [
    { name: "Chișinău Digital Hub", specialization: "digitalizare", bonus: "+1 Inovație", x: 15, y: 15 },
    { name: "Bălți STEM", specialization: "robotică și STEM", bonus: "+1 proiecte STEAM", x: 8, y: 5 },
    { name: "Edineț EduTech", specialization: "formare regională", bonus: "+1 Competență", x: 3, y: 3 },
    { name: "Soroca MediaLab", specialization: "media și creație", bonus: "+1 Colaborare", x: 18, y: 4 },
    { name: "Orhei Innovation", specialization: "hub educațional", bonus: "+1 Echipament", x: 18, y: 10 },
    { name: "Ungheni Connect", specialization: "rețele școlare", bonus: "drumuri mai eficiente", x: 8, y: 14 },
    { name: "Cahul Rural Impact", specialization: "comunități rurale", bonus: "impact dublu rural", x: 8, y: 25 },
    { name: "Comrat STEAM Valley", specialization: "STEAM aplicat", bonus: "+1 Impact STEAM", x: 17, y: 24 },
    { name: "Cimișlia Green Lab", specialization: "sustenabilitate", bonus: "+1 Green Impact", x: 13, y: 21 },
    { name: "Dubăsari Bridge", specialization: "conectare comunitară", bonus: "+1 Parteneriat", x: 25, y: 14 }
  ];

  const playerColors = ["#10ECD2", "#E51491", "#FFD166", "#9BE564", "#B388FF", "#6CE5FF", "#FF8A65", "#F5F7FA", "#56C596", "#D7A86E"];

  const tileDeckTemplate = [
    "road","road","road","road","road","road","road","road","road","road",
    "digitalRoad","digitalRoad","digitalRoad","steamCorridor","steamCorridor",
    "ruralRoute","ruralRoute","village","village","village","rural","rural",
    "hub","hub","steam","steam","university","blocked"
  ];

  const actionDeckTemplate = [
    { type: "Activitate CNIDE", icon: "🧑‍🏫", title: "Formare profesori", mode: "activity", target: ["school"], cost: { collaboration: 1 }, reward: { collaboration: 1, impact: 2 }, mark: "Formare", text: "Aplică pe o școală proprie. Cost: 🤝1. Efect: 🤝+1, ⭐+2." },
    { type: "Activitate CNIDE", icon: "🔬", title: "Atelier STEAM", mode: "activity", target: ["steam", "school"], cost: { innovation: 1, equipment: 1 }, reward: { impact: 3 }, mark: "STEAM", text: "Aplică pe Centru STEAM sau școală proprie/conectată. Cost: 💡1, 🧰1. Efect: ⭐+3." },
    { type: "Activitate CNIDE", icon: "🤖", title: "Club robotică", mode: "activity", target: ["school", "steam"], cost: { equipment: 1 }, reward: { innovation: 1, impact: 2 }, mark: "Robotică", text: "Aplică pe școală sau Centru STEAM. Cost: 🧰1. Efect: 💡+1, ⭐+2." },
    { type: "Activitate CNIDE", icon: "🏆", title: "Hackathon", mode: "activity", target: ["hub", "steam", "university"], cost: { innovation: 1, collaboration: 1 }, reward: { impact: 4 }, mark: "Hackathon", text: "Aplică pe Hub, STEAM sau Universitate. Cost: 💡1, 🤝1. Efect: ⭐+4." },
    { type: "Activitate CNIDE", icon: "💻", title: "Lecții digitale", mode: "activity", target: ["school", "hub"], cost: { innovation: 1 }, reward: { innovation: 1, impact: 2 }, mark: "Lecții digitale", text: "Aplică pe școală sau hub. Cost: 💡1. Efect: 💡+1, ⭐+2." },
    { type: "Activitate CNIDE", icon: "🧭", title: "Mentorat", mode: "activity", target: ["school", "hub", "university"], cost: { collaboration: 1 }, reward: { equipment: 1, impact: 2 }, mark: "Mentorat", text: "Aplică pe școală, hub sau universitate. Cost: 🤝1. Efect: 🧰+1, ⭐+2." },
    { type: "Proiect", icon: "📘", title: "Proiect comunitar", mode: "project", text: "Aplică pe o școală proprie conectată. Cost: 🤝1. Efect: ⭐+2." },
    { type: "Inovație", icon: "⚡", title: "Resursă digitală nouă", mode: "instantInnovation", text: "Efect imediat: primești 💡+2." },
    { type: "Problemă", icon: "🚧", title: "Rezistență locală", mode: "blockConnection", text: "Aplică pe un drum/rețea/coridor. Devine zonă blocată temporar." },
    { type: "Misiune", icon: "🎯", title: "Conectează două școli", mode: "missionConnectivity", text: "Dacă ai minimum 2 școli conectate în zona ta: ⭐+3." },
    { type: "Parteneriat", icon: "🤝", title: "Colaborare regională", mode: "partnership", text: "Aplică pe o conexiune lângă zona ta. Efect: 🤝+2 și ⭐+1." },
    { type: "Misiune", icon: "🏫", title: "Extindere școlară", mode: "schoolExpansion", text: "Primești 1 token de extindere. Îl poți folosi pentru a prelua o școală conectată." }
  ];

  const characterDeckTemplate = [
    { type: "Personaj", icon: "🧑‍🏫", title: "Profesor", role: "teacher", allowed: ["school"], text: "Plasează într-o școală proprie. Efect: 🤝+1 și ⭐+1." },
    { type: "Personaj", icon: "👩‍🎓", title: "Elev", role: "student", allowed: ["school", "steam"], text: "Plasează în școală sau centru STEAM propriu. Efect: ⭐+1." },
    { type: "Personaj", icon: "🧠", title: "Expert STEAM", role: "expert", allowed: ["steam"], text: "Plasează în centru STEAM propriu/conectat. Efect: ⭐+2 și 💡+1." },
    { type: "Personaj", icon: "🤖", title: "Mentor digital", role: "mentor", allowed: ["hub"], text: "Plasează în hub digital propriu/conectat. Efect: 💡+1 și 🤝+1." }
  ];

  const eventDeckTemplate = [
    { type: "Eveniment pozitiv", icon: "🇰🇷", title: "Parteneriat internațional", global: "internationalPartnership", text: "Toți jucătorii primesc 💡+1 și 🤝+1." },
    { type: "Eveniment pozitiv", icon: "🚀", title: "Finanțare europeană STEM", global: "europeanFunding", text: "Până la finalul rundei, centrele STEAM și hub-urile costă cu 🧰1 mai puțin." },
    { type: "Eveniment pozitiv", icon: "🏆", title: "Hackathon național", global: "nationalHackathon", text: "Toți jucătorii cu cel puțin 1 hub/STEAM propriu primesc ⭐+2." },
    { type: "Eveniment pozitiv", icon: "🤖", title: "Donație de roboți", global: "robotDonation", text: "Toți jucătorii primesc 🧰+1. Jucătorul curent primește încă 🧰+1." },
    { type: "Eveniment negativ", icon: "🌩️", title: "Internet căzut", global: "internetDown", text: "Până la finalul rundei, Rețeaua Digitală nu produce 💡." },
    { type: "Eveniment negativ", icon: "📉", title: "Rezistență la schimbare", global: "resistance", text: "Toți jucătorii pierd 🤝1 dacă au." },
    { type: "Eveniment negativ", icon: "🔌", title: "Lipsă echipamente", global: "equipmentShortage", text: "Toți jucătorii pierd 🧰1 dacă au." },
    { type: "Eveniment negativ", icon: "😴", title: "Lipsă implicare elevi", global: "lowStudentEngagement", text: "Până la finalul rundei, proiectele oferă cu ⭐1 mai puțin." }
  ];


  // --- NOU: Misiuni Publice ---
  const publicMissionsDatabase = [
    { id: 1, title: "Capitală Regională", desc: "Conectează 3 orașe la rețeaua ta.", reward: 5, check: (p) => calculateScore(p).connectedCities >= 3 },
    { id: 2, title: "Rețea Extinsă", desc: "Zonă conectată de minim 15 tile-uri.", reward: 5, check: (p) => calculateScore(p).zoneSize >= 15 },
    { id: 3, title: "Silicon Valley MD", desc: "Deține 3 Hub-uri sau Centre STEAM.", reward: 5, check: (p) => countOwnedTileType(p.id, "hub") + countOwnedTileType(p.id, "steam") >= 3 },
    { id: 4, title: "Resurse Umane", desc: "Plasează 4 personaje pe hartă.", reward: 4, check: (p) => calculateScore(p).trainedTeachers + calculateScore(p).involvedStudents >= 4 },
    { id: 5, title: "Impact Rural", desc: "Controlează 3 sate sau rute rurale.", reward: 4, check: (p) => calculateScore(p).regionalImpact >= 3 },
    { id: 6, title: "Campion la Proiecte", desc: "Finalizează 3 activități (proiecte).", reward: 5, check: (p) => calculateScore(p).finishedProjects >= 3 },
    { id: 7, title: "Monopol", desc: "Adună 8 💡 Inovație în mână.", reward: 3, check: (p) => p.resources.innovation >= 8 },
    { id: 8, title: "Infrastructură", desc: "Adună 8 🧰 Echipament în mână.", reward: 3, check: (p) => p.resources.equipment >= 8 },
    { id: 9, title: "Diplomat", desc: "Adună 8 🤝 Colaborare în mână.", reward: 3, check: (p) => p.resources.collaboration >= 8 },
    { id: 10, title: "Pionier", desc: "Extinde-te și controlează 3 școli.", reward: 5, check: (p) => p.controlledSchools && p.controlledSchools.length >= 3 }
  ];

  // --- NOU: Evenimente de descoperire ---
  const discoveryEvents = [
    { type: "reward", icon: "🎁", title: "Sponsor local!", text: "Ai găsit o companie care donează PC-uri: +2 🧰", apply: p => p.resources.equipment += 2 },
    { type: "reward", icon: "🎁", title: "Comunitate unită!", text: "Oamenii te ajută la construcție: +2 🤝", apply: p => p.resources.collaboration += 2 },
    { type: "reward", icon: "🎁", title: "Idee genială!", text: "Un startup rural te susține: +2 💡", apply: p => p.resources.innovation += 2 },
    { type: "reward", icon: "⭐", title: "Presă favorabilă!", text: "Acțiunea ta e la știri: +2 ⭐ Impact", apply: p => p.resources.impact += 2 },
    { type: "risk", icon: "⚠️", title: "Birocrație!", text: "Pierzi 1 🤝.", apply: p => p.resources.collaboration = Math.max(0, p.resources.collaboration - 1) },
    { type: "risk", icon: "⚠️", title: "Furtună!", text: "Pierzi 1 🧰.", apply: p => p.resources.equipment = Math.max(0, p.resources.equipment - 1) },
    { type: "risk", icon: "⚠️", title: "Drum impracticabil!", text: "Pierzi 1 💡.", apply: p => p.resources.innovation = Math.max(0, p.resources.innovation - 1) }
  ];

  let state = null;
  let camera = { x: 130, y: 40, zoom: 1 };
  let dragging = false;
  let dragStart = { x: 0, y: 0 };
  let cameraStart = { x: 0, y: 0 };
  let hoverCell = null;

  function emptyMap() {
    return Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE }, () => null));
  }


  // --- FUNCȚII CLOUD ---
  function syncToCloud() {
    if (!isMultiplayer || !roomCode || !state || !db) return;

    ignoreNextSync = true;

    db.ref("rooms/" + roomCode + "/state")
      .set(JSON.stringify(state));
  }

  function listenToCloud() {
    if (!db) return;

    db.ref("rooms/" + roomCode + "/state").on("value", snapshot => {
      if (ignoreNextSync) {
        ignoreNextSync = false;
        return;
      }

      const rawState = snapshot.val();

      if (rawState) {
        state = JSON.parse(rawState);
        renderAll();

        if (isMyTurn()) {
          setStatus("🎯 Este rândul tău!");
        }
      }
    });
  }

  function isMyTurn() {
    if (!isMultiplayer) return true;
    return state.currentPlayer === (localPlayerId - 1);
  }

  function shuffle(array) {
    const copy = array.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function makeTile(type, extra = {}) {
    return {
      type,
      owner: extra.owner ?? null,
      cityName: extra.cityName ?? null,
      specialization: extra.specialization ?? null,
      bonus: extra.bonus ?? null,
      slots: type === "school" ? [
        "🔬 Laborator STEAM",
        "🤖 Club Robotică",
        "💻 Sală TIC",
        "🧠 Centru AI",
        "🎨 Studio Media",
        "🧑‍🏫 Centru Formare"
      ] : null,
      characters: [],
      activated: false,
      activityMarks: []
    };
  }

  function createInitialMap() {
    const map = emptyMap();

    cities.forEach((city) => {
      place(map, city.x, city.y, makeTile("city", {
        cityName: city.name,
        specialization: city.specialization,
        bonus: city.bonus
      }));

      [[city.x - 1, city.y], [city.x + 1, city.y], [city.x, city.y + 1]].forEach((pos, index) => {
        place(map, pos[0], pos[1], makeTile("school", {
          cityName: city.name,
          specialization: `Școala ${index + 1}`,
          bonus: "6 sloturi dezvoltare"
        }));
      });

      place(map, city.x, city.y - 1, makeTile("hub", { cityName: city.name }));
    });

    [
      [0, 1, "digitalRoad"], [0, 4, "road"], [0, 5, "road"], [0, 9, "digitalRoad"],
      [1, 2, "road"], [1, 3, "steamCorridor"], [5, 6, "ruralRoute"],
      [0, 8, "road"], [8, 7, "steamCorridor"], [7, 6, "ruralRoute"],
      [4, 3, "road"], [4, 9, "digitalRoad"]
    ].forEach(([a, b, type]) => drawRoute(map, cities[a].x, cities[a].y, cities[b].x, cities[b].y, type));

    [[2,8],[5,11],[11,18],[4,22],[22,20],[26,9],[20,27],[11,3]].forEach(([x,y]) => place(map, x, y, makeTile("village")));
    [[1,20],[2,21],[3,22],[24,23],[25,24],[21,25],[6,27]].forEach(([x,y]) => place(map, x, y, makeTile("rural")));
    [[13,8],[14,8],[23,6],[24,6],[21,16],[22,16],[4,17],[5,17]].forEach(([x,y]) => place(map, x, y, makeTile("blocked")));
    [[14,14],[10,6],[16,26]].forEach(([x,y]) => place(map, x, y, makeTile("university")));
    [[9,5],[18,23],[13,20],[17,11]].forEach(([x,y]) => place(map, x, y, makeTile("steam")));

    return map;
  }

  function place(map, x, y, tile) {
    if (inside(x, y) && !map[y][x]) map[y][x] = tile;
  }

  function drawRoute(map, x1, y1, x2, y2, type) {
    let x = x1;
    let y = y1;
    while (x !== x2) {
      x += x < x2 ? 1 : -1;
      if (!map[y][x]) map[y][x] = makeTile(type);
    }
    while (y !== y2) {
      y += y < y2 ? 1 : -1;
      if (!map[y][x]) map[y][x] = makeTile(type);
    }
  }

  function inside(x, y) {
    return x >= 0 && y >= 0 && x < GRID_SIZE && y < GRID_SIZE;
  }

  function initPlayerSelect() {
    ui.playerCount.innerHTML = "";
    for (let i = 3; i <= 10; i++) {
      const option = document.createElement("option");
      option.value = String(i);
      option.textContent = `${i} jucători`;
      if (i === 4) option.selected = true;
      ui.playerCount.appendChild(option);
    }
  }

  function newGame() {
    const count = Number(ui.playerCount.value || 4);

    state = {
      map: createInitialMap(),
      discovered: Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE }, () => false)),
      players: Array.from({ length: count }, (_, index) => {
        const playerFaction = factions[index % factions.length];
        return {
        id: index + 1,
        name: `Jucător ${index + 1}`,
        color: playerColors[index],
        school: null,
        controlledSchools: [],
        expansionTokens: 0,
        faction: playerFaction,
        upgrades: [],
        resources: { innovation: 2, equipment: 2, collaboration: 2, impact: 0 },
        production: { innovation: 1, equipment: 1, collaboration: 1, impact: 0 }
      };
      }),
      currentPlayer: 0,
      phase: "chooseSchool",
      selectedCell: null,
      currentTile: null,
      draftingTiles: [],
      tileDrawnThisTurn: false,
      actionDrawnThisTurn: false,
      characterDrawnThisTurn: false,
      eventDrawnThisRound: false,
      pendingAction: null,
      pendingCharacter: null,
      currentCardDisplay: null,
      cardHistory: [],
      tileDeck: shuffle(tileDeckTemplate),
      actionDeck: shuffle(actionDeckTemplate),
      characterDeck: shuffle(characterDeckTemplate),
      eventDeck: shuffle(eventDeckTemplate),
      round: 1,
      maxRounds: 20,
      targetImpact: 50,
      gameOver: false,
      globalEvent: null,
      activeMissions: shuffle([...publicMissionsDatabase]).slice(0, 3).map(m => ({ ...m, completedBy: null }))
    };

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const t = state.map[y][x];
        if (t && !["village", "rural", "blocked"].includes(t.type)) {
          state.discovered[y][x] = true;
          revealArea(x, y, 1, false);
        }
      }
    }

    if (ui.draftZone) ui.draftZone.style.display = "none";
    showCard(null);
    setStatus("Joc nou creat. Jucătorul 1 alege o școală liberă.");
    centerMap();
    renderAll();
  }

  function currentPlayer() {
    return state.players[state.currentPlayer];
  }

  function setStatus(text) {
    if (ui.statusText) ui.statusText.textContent = text;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function resourceLabel(key) {
    const labels = {
      innovation: "💡 Inovație",
      equipment: "🧰 Echipamente",
      collaboration: "🤝 Colaborare",
      impact: "⭐ Impact"
    };
    return labels[key] || key;
  }

  function formatCost(bundle = {}) {
    const entries = Object.entries(bundle).filter(([, value]) => value > 0);
    if (!entries.length) return "gratuit";
    return entries.map(([key, value]) => `${resourceLabel(key)} ${value}`).join(", ");
  }

  function canPay(player, cost = {}) {
    return Object.entries(cost).every(([key, value]) => (player.resources[key] || 0) >= value);
  }

  function payCost(player, cost = {}) {
    Object.entries(cost).forEach(([key, value]) => {
      player.resources[key] = (player.resources[key] || 0) - value;
    });
  }

  function addResources(player, bundle = {}) {
    Object.entries(bundle).forEach(([key, value]) => {
      player.resources[key] = (player.resources[key] || 0) + value;
    });
  }

  function addProduction(player, bundle = {}) {
    Object.entries(bundle).forEach(([key, value]) => {
      player.production[key] = (player.production[key] || 0) + value;
    });
  }

  function getEffectiveCost(type) {
    const player = state ? currentPlayer() : null;
    const base = { ...(tileTypes[type]?.cost || {}) };

    if (player?.faction?.bonusType === "discount_tech" && ["hub","steam"].includes(type) && base.equipment) {
      base.equipment = Math.max(0, base.equipment - 1);
    }

    if (state?.globalEvent?.global === "europeanFunding" && ["hub", "steam"].includes(type) && base.equipment) {
      base.equipment = Math.max(0, base.equipment - 1);
    }
    return Object.fromEntries(Object.entries(base).filter(([, value]) => value > 0));
  }


  function getEffectiveCardCost(card) {
    const p = currentPlayer();
    const base = { ...(card.cost || {}) };

    if (p?.faction?.bonusType === "discount_collab" && base.collaboration) {
      base.collaboration = Math.max(0, base.collaboration - 1);
    }

    return Object.fromEntries(Object.entries(base).filter(([, value]) => value > 0));
  }

  function produceAtTurnStart(player) {
    const productionBundle = { ...player.production };
    if (state.globalEvent?.global === "internetDown") {
      productionBundle.innovation = Math.max(0, productionBundle.innovation - countOwnedTileType(player.id, "digitalRoad"));
    }
    addResources(player, productionBundle);
    const bonus = calculateCityRegionBonus(player.id);
    addResources(player, bonus);
    return bonus;
  }

  function calculateCityRegionBonus(ownerId) {
    const bonus = { innovation: 0, equipment: 0, collaboration: 0, impact: 0 };

    cities.forEach(city => {
      const adjacent = [
        { x: city.x - 1, y: city.y },
        { x: city.x + 1, y: city.y },
        { x: city.x, y: city.y + 1 },
        { x: city.x, y: city.y - 1 }
      ].filter(p => inside(p.x, p.y));

      const ownedAround = adjacent.filter(p => state.map[p.y][p.x]?.owner === ownerId).length;
      if (ownedAround < 2) return;

      const spec = city.specialization.toLowerCase();
      if (spec.includes("digital") || spec.includes("hub")) bonus.innovation += 1;
      else if (spec.includes("stem") || spec.includes("robot") || spec.includes("steam")) bonus.impact += 1;
      else if (spec.includes("rural") || spec.includes("comunit")) bonus.collaboration += 1;
      else if (spec.includes("formare")) bonus.equipment += 1;
      else bonus.collaboration += 1;
    });

    return bonus;
  }



  function revealArea(cx, cy, radius = 1, triggerDiscovery = true) {
    if (!state || !state.discovered) return;

    for (let y = Math.max(0, cy - radius); y <= Math.min(GRID_SIZE - 1, cy + radius); y++) {
      for (let x = Math.max(0, cx - radius); x <= Math.min(GRID_SIZE - 1, cx + radius); x++) {

        if (!state.discovered[y][x]) {
          state.discovered[y][x] = true;

          const t = state.map[y][x];

          if (triggerDiscovery && t && ["village", "rural"].includes(t.type)) {
            if (Math.random() < 0.6) {
              const ev = discoveryEvents[Math.floor(Math.random() * discoveryEvents.length)];
              ev.apply(currentPlayer());

              setTimeout(() => {
                spawnFloatingText(`+${mission.reward} ⭐`, "#FFD166", window.innerWidth / 2, 120);
          showCard({ category: "Descoperire în Ceață", icon: ev.icon, title: ev.title, text: ev.text });
                setStatus(`${currentPlayer().name} a explorat și a găsit: ${ev.title}`);
                renderAll();
              }, 500);
            }
          }
        }
      }
    }
  }



  function triggerConfetti(intensity = "normal") {
    if (typeof confetti !== "function") {
      return;
    }

    const base = intensity === "big"
      ? { particleCount: 180, spread: 90, startVelocity: 45 }
      : { particleCount: 80, spread: 70, startVelocity: 35 };

    confetti({
      ...base,
      origin: { y: 0.65 }
    });

    if (intensity === "big") {
      setTimeout(() => {
        confetti({
          particleCount: 120,
          spread: 120,
          startVelocity: 38,
          origin: { y: 0.55 }
        });
      }, 350);
    }
  }

  function spawnFloatingText(text, color, x, y) {
    const el = document.createElement("div");
    el.className = "floating-text";
    el.textContent = text;
    el.style.color = color;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }

  function showCard(card) {
    if (!state) return;

    if (!card) {
      state.currentCardDisplay = null;
      renderCurrentCard();
      return;
    }

    const display = {
      category: card.category || card.type || "Card",
      icon: card.icon || "🃏",
      title: card.title || "Card extras",
      text: card.text || "",
      player: currentPlayer()?.name || "",
      round: state.round,
      time: new Date().toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })
    };

    state.currentCardDisplay = display;
    state.cardHistory.unshift(display);
    state.cardHistory = state.cardHistory.slice(0, 6);
    renderCurrentCard();
  }

  function renderCurrentCard() {
    if (!ui.currentCard) return;
    const card = state?.currentCardDisplay;

    ui.currentCard.innerHTML = card ? `
      <div class="card-type">${escapeHtml(card.category)} · ${escapeHtml(card.player)} · Runda ${escapeHtml(card.round)}</div>
      <div class="card-title">${escapeHtml(card.icon)} ${escapeHtml(card.title)}</div>
      <div class="card-text">${escapeHtml(card.text)}</div>
    ` : '<div class="empty-card">Niciun card extras.</div>';

    if (!ui.cardLog || !state) return;
    ui.cardLog.innerHTML = state.cardHistory.length ? `
      <div class="card-log-title">Ultimele carduri extrase</div>
      ${state.cardHistory.map(item => `
        <div class="card-log-item">
          <span>${escapeHtml(item.icon)} ${escapeHtml(item.title)}</span>
          <small>${escapeHtml(item.player)} · R${escapeHtml(item.round)}</small>
        </div>
      `).join("")}
    ` : "";
  }

  function updateTurnInfo() {
    if (!state) {
      ui.turnInfo.textContent = "Inițializează jocul.";
      return;
    }

    if (state.gameOver) {
      ui.turnInfo.innerHTML = "<strong>Joc terminat.</strong>";
      ui.drawTileBtn.disabled = true;
      ui.drawActionBtn.disabled = true;
      ui.drawCharacterBtn.disabled = true;
      ui.drawEventBtn.disabled = true;
      ui.endTurnBtn.disabled = true;
      return;
    }

    ui.endTurnBtn.disabled = false;
    const player = currentPlayer();

    if (state.phase === "chooseSchool") {
      ui.turnInfo.innerHTML = `<strong>${player.name}</strong><br>Alege o școală liberă de pe hartă.`;
      ui.drawTileBtn.disabled = true;
      ui.drawActionBtn.disabled = true;
      ui.drawCharacterBtn.disabled = true;
      ui.drawEventBtn.disabled = true;
      return;
    }

    ui.turnInfo.innerHTML = `<strong>${player.name}</strong><br>Runda ${state.round}. 1 tile + max. 1 acțiune + max. 1 personaj.`;
    ui.drawTileBtn.disabled = state.tileDrawnThisTurn || Boolean(state.currentTile) || Boolean(state.draftingTiles?.length);
    ui.drawActionBtn.disabled = state.actionDrawnThisTurn || Boolean(state.pendingAction);
    ui.drawCharacterBtn.disabled = state.characterDrawnThisTurn || Boolean(state.pendingCharacter);
    ui.drawEventBtn.disabled = state.eventDrawnThisRound;
  }

  function updateTooltip(event) {
    if (!state || !ui.mapTooltip || dragging) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = event.clientX - rect.left;
    const screenY = event.clientY - rect.top;
    const cell = screenToCell(screenX, screenY);

    hoverCell = cell && inside(cell.x, cell.y) ? cell : null;

    if (!hoverCell) {
      ui.mapTooltip.style.display = "none";
      draw();
      return;
    }

    if (state.discovered && !state.discovered[hoverCell.y][hoverCell.x]) {
      ui.mapTooltip.innerHTML = `<h4>☁️ Zonă Neexplorată</h4><div style="color: var(--muted)">Extinde-te în apropiere pentru a explora.</div>`;
      ui.mapTooltip.style.display = "block";
      ui.mapTooltip.style.left = `${event.clientX + 14}px`;
      ui.mapTooltip.style.top = `${event.clientY + 14}px`;
      draw();
      return;
    }

    const tile = state.map[hoverCell.y][hoverCell.x];

    if (!tile) {
      ui.mapTooltip.style.display = "none";
      draw();
      return;
    }

    const def = tileTypes[tile.type];
    const owner = tile.owner ? `Jucător ${tile.owner}` : "Nedeținut";

    ui.mapTooltip.innerHTML = `
      <h4>${def.icon} ${escapeHtml(def.label)}</h4>
      <div>Poziție: (${hoverCell.x}, ${hoverCell.y})</div>
      <div>Proprietar: ${escapeHtml(owner)}</div>
      ${tile.cityName ? `<div>Oraș: ${escapeHtml(tile.cityName)}</div>` : ""}
      ${tile.activated ? `<span class="badge">Proiect activat</span>` : ""}
    `;

    ui.mapTooltip.style.display = "block";
    ui.mapTooltip.style.left = `${event.clientX + 14}px`;
    ui.mapTooltip.style.top = `${event.clientY + 14}px`;

    draw();
  }


  function getSchoolTileForPlayer(playerId) {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const tile = state.map[y][x];
        if (tile?.type === "school" && tile.owner === playerId && tile.isBaseSchool) {
          return tile;
        }
      }
    }
    return null;
  }

  function openUpgradeModal() {
    if (!isMyTurn()) return alert("Așteaptă! Nu este rândul tău.");
    const p = currentPlayer();

    if (!p || !p.school) {
      setStatus("Alege mai întâi o școală de bază.");
      return;
    }

    const modal = ui.upgradeModal;
    const list = ui.upgradeList;

    if (!modal || !list) {
      setStatus("Panoul de upgrade nu este disponibil în HTML.");
      return;
    }

    list.innerHTML = upgrades.map(u => {
      const hasUpgrade = p.upgrades.includes(u.id);

      return `
        <div class="upgrade-item">
          <div>
            <strong>${u.icon} ${u.name}</strong><br>
            <small>Producție: ${formatCost(u.prod)}</small>
          </div>
          <button class="btn ${hasUpgrade ? 'disabled' : 'primary'}"
                  onclick="buyUpgrade('${u.id}')"
                  ${hasUpgrade ? 'disabled' : ''}>
            ${hasUpgrade ? 'Deținut' : 'Cumpără (' + formatCost(u.cost) + ')'}
          </button>
        </div>
      `;
    }).join("");

    modal.style.display = "block";
  }

  window.buyUpgrade = function(upgradeId) {
    const p = currentPlayer();
    const u = upgrades.find(x => x.id === upgradeId);

    if (!u) return;

    if (canPay(p, u.cost)) {
      payCost(p, u.cost);
      p.upgrades.push(u.id);

      Object.keys(u.prod).forEach(res => {
        p.production[res] += u.prod[res];
      });

      const schoolTile = getSchoolTileForPlayer(p.id);
      if (schoolTile) {
        schoolTile.upgradeIcons = schoolTile.upgradeIcons || [];
        schoolTile.upgradeIcons.push(u.icon);
      }

      spawnFloatingText("Upgrade Construit!", "#10ECD2", window.innerWidth / 2, window.innerHeight / 2);

      if (ui.upgradeModal) ui.upgradeModal.style.display = "none";
      renderAll();
    } else {
      alert("Resurse insuficiente!");
    }
  };

  function showVictoryScreen(winner) {
    if (!ui.endGameModal || !ui.winnerPodium || !ui.finalStats) return;

    ui.endGameModal.style.display = "block";
    triggerConfetti("big");

    ui.winnerPodium.innerHTML = `
      <h2>🥇 ${winner.player.name}</h2>
      <p>Liderul Educației Viitorului</p>
    `;

    ui.finalStats.innerHTML = `
      <div class="box">
        <p>Puncte Impact: ${winner.score.total}</p>
        <p>Facțiune: ${winner.player.faction.name}</p>
        <p>Școli Dezvoltate: ${winner.score.developedSchools}</p>
      </div>
    `;
  }

  function handleCanvasClick(event) {
    if (!isMyTurn()) return alert("Așteaptă! Nu este rândul tău.");
    if (!state || state.gameOver) return;

    const moved = Math.abs(event.clientX - dragStart.x) + Math.abs(event.clientY - dragStart.y);
    if (moved > 8) return;

    const cell = screenToCell(event.offsetX, event.offsetY);
    if (!cell || !inside(cell.x, cell.y)) return;

    state.selectedCell = cell;
    const tile = state.map[cell.y][cell.x];

    if (state.phase === "chooseSchool") {
      chooseSchool(cell, tile);
      renderAll();
      return;
    }

    if (tile && tile.type === "school" && tile.owner === currentPlayer().id && state.phase === "play" && !state.currentTile && !state.pendingAction && !state.pendingCharacter) {
      openUpgradeModal();
      return;
    }

    if (state.pendingAction) {
      applyPendingAction(cell, tile);
      renderAll();
      return;
    }

    if (state.pendingCharacter) {
      applyPendingCharacter(cell, tile);
      renderAll();
      return;
    }

    if (state.currentTile) {
      placeCurrentTile(cell, tile);
      renderAll();
      return;
    }

    if (tile && tile.type === "school" && !tile.owner) {
      claimSchool(cell, tile);
      renderAll();
      return;
    }

    renderAll();
  }

  function chooseSchool(cell, tile) {
    const player = currentPlayer();

    if (!tile || tile.type !== "school") {
      setStatus("Alege o celulă cu școală.");
      return;
    }

    if (tile.owner) {
      setStatus("Această școală este deja aleasă.");
      return;
    }

    tile.owner = player.id;
    tile.isBaseSchool = true;
    player.school = { x: cell.x, y: cell.y };
    player.controlledSchools = [{ x: cell.x, y: cell.y }];
    player.resources.impact += 1;
    revealArea(cell.x, cell.y, 1);

    if (state.players.every(p => p.school)) {
      state.phase = "play";
      state.currentPlayer = 0;
      resetTurnFlags();
      produceAtTurnStart(currentPlayer());
      setStatus(`Toți jucătorii au ales școala. Începe construcția. Este rândul lui ${currentPlayer().name}.`);
      return;
    }

    advancePlayer();
    setStatus(`${player.name} a ales școala. Urmează ${currentPlayer().name}.`);
  }

  function resetTurnFlags() {
    state.currentTile = null;
    state.draftingTiles = [];
    if (ui.draftZone) ui.draftZone.style.display = "none";
    if (ui.draftOptions) ui.draftOptions.innerHTML = "";
    state.pendingAction = null;
    state.pendingCharacter = null;
    state.tileDrawnThisTurn = false;
    state.actionDrawnThisTurn = false;
    state.characterDrawnThisTurn = false;
  }

  function endTurn() {
    if (!isMyTurn()) return alert("Așteaptă! Nu este rândul tău.");
    if (!state || state.gameOver) return;

    if (state.phase === "chooseSchool") {
      setStatus("În faza de început alegerea școlii se face prin click direct pe hartă.");
      return;
    }

    resetTurnFlags();
    advancePlayer();

    if (state.currentPlayer === 0) {
      state.round += 1;
      state.eventDrawnThisRound = false;
    }

    const bonus = produceAtTurnStart(currentPlayer());
    expireGlobalEventIfNeeded();
    checkMissions();
    checkWinCondition();
    setStatus(`Este rândul lui ${currentPlayer().name}. Producție primită. Bonus regional: ${formatCost(bonus)}.`);
    renderAll();
  }

  function advancePlayer() {
    state.currentPlayer = (state.currentPlayer + 1) % state.players.length;
  }

  function drawTileCard() {
    startTileDraft();
  }

  function startTileDraft() {
    if (!isMyTurn()) return alert("Așteaptă! Nu este rândul tău.");
    if (!state || state.phase !== "play" || state.gameOver) return;

    if (state.tileDrawnThisTurn) {
      setStatus("Ai extras deja un tile în această tură.");
      return;
    }

    state.draftingTiles = [];

    for (let i = 0; i < 3; i++) {
      if (!state.tileDeck.length) state.tileDeck = shuffle(tileDeckTemplate);
      state.draftingTiles.push(state.tileDeck.pop());
    }

    renderDraftZone();
    setStatus(`${currentPlayer().name} face drafting. Alege un tile din cele 3 opțiuni.`);
    renderAll();
  }

  function renderDraftZone() {
    if (!ui.draftZone || !ui.draftOptions) return;

    if (!state || !state.draftingTiles || state.draftingTiles.length === 0) {
      ui.draftZone.style.display = "none";
      ui.draftOptions.innerHTML = "";
      return;
    }

    ui.draftZone.style.display = "block";
    ui.draftOptions.innerHTML = state.draftingTiles.map((type, index) => {
      const def = tileTypes[type];
      return `
        <button class="draft-option" type="button" data-draft-index="${index}">
          <div class="draft-icon">${def.icon}</div>
          <div>${escapeHtml(def.label)}</div>
          <div class="draft-cost">${escapeHtml(formatCost(getEffectiveCost(type)))}</div>
        </button>
      `;
    }).join("");

    ui.draftOptions.querySelectorAll("[data-draft-index]").forEach(button => {
      button.addEventListener("click", () => selectDraftTile(Number(button.dataset.draftIndex)));
    });
  }

  function selectDraftTile(index) {
    if (!state || !state.draftingTiles || state.draftingTiles.length === 0) return;
    if (index < 0 || index >= state.draftingTiles.length) return;

    const chosenType = state.draftingTiles[index];
    const rejected = state.draftingTiles.filter((_, i) => i !== index);

    state.tileDeck.unshift(...rejected);
    state.draftingTiles = [];
    state.currentTile = makeTile(chosenType, { owner: currentPlayer().id });
    state.tileDrawnThisTurn = true;

    if (ui.draftZone) ui.draftZone.style.display = "none";
    if (ui.draftOptions) ui.draftOptions.innerHTML = "";

    const def = tileTypes[chosenType];

    showCard({
      category: "Cartonaș tile selectat",
      icon: def.icon,
      title: def.label,
      text: `Cost: ${formatCost(getEffectiveCost(chosenType))}. Producție/tură: ${formatCost(def.produces)}. Plasează-l lângă zona ta sau lângă o conexiune validă.`
    });

    setStatus(`${currentPlayer().name} a ales ${def.label}. Click pe hartă pentru plasare.`);
    renderAll();
  }

  window.selectDraftTile = selectDraftTile;

  function drawGenericCard(deckName) {
    if (!isMyTurn()) return alert("Așteaptă! Nu este rândul tău.");
    if (!state || state.phase !== "play" || state.gameOver) return;

    if (deckName === "action" && state.actionDrawnThisTurn) return setStatus("Ai extras deja o carte de acțiune în această tură.");
    if (deckName === "character" && state.characterDrawnThisTurn) return setStatus("Ai extras deja o carte de personaj în această tură.");
    if (deckName === "event" && state.eventDrawnThisRound) return setStatus("Evenimentul global a fost extras deja în această rundă.");

    let deck = deckName === "action" ? state.actionDeck : deckName === "character" ? state.characterDeck : state.eventDeck;

    if (!deck.length) {
      if (deckName === "action") state.actionDeck = shuffle(actionDeckTemplate);
      if (deckName === "character") state.characterDeck = shuffle(characterDeckTemplate);
      if (deckName === "event") state.eventDeck = shuffle(eventDeckTemplate);
      deck = deckName === "action" ? state.actionDeck : deckName === "character" ? state.characterDeck : state.eventDeck;
    }

    const card = deck.pop();
    showCard({ category: card.type, icon: card.icon, title: card.title, text: card.text });

    if (deckName === "action") {
      state.actionDrawnThisTurn = true;
      if (["instantInnovation", "missionConnectivity", "schoolExpansion"].includes(card.mode)) {
        applySimpleCardEffect(card);
      } else {
        state.pendingAction = card;
        setStatus(`${currentPlayer().name} a extras ${card.title}. Click pe hartă pentru aplicare.`);
      }
    }

    if (deckName === "character") {
      state.characterDrawnThisTurn = true;
      state.pendingCharacter = card;
      setStatus(`${currentPlayer().name} a extras ${card.title}. Click pe loc valid pentru plasare.`);
    }

    if (deckName === "event") {
      state.eventDrawnThisRound = true;
      applyGlobalEvent(card);
      setStatus(`Eveniment global activ: ${card.title}.`);
    }

    renderAll();
  }

  function applySimpleCardEffect(card) {
    const player = currentPlayer();

    if (card.mode === "instantInnovation") {
      player.resources.innovation += 2;
      setStatus(`${player.name} primește 💡 +2.`);
    }

    if (card.mode === "schoolExpansion") {
      player.expansionTokens += 1;
      setStatus(`${player.name} primește 1 token de extindere școlară.`);
    }

    if (card.mode === "missionConnectivity") {
      const count = countConnectedOwnedSchools(player.id);
      if (count >= 2) {
        player.resources.impact += 3;
        setStatus(`Misiune reușită: ${count} școli conectate. ⭐ +3.`);
      } else {
        setStatus(`Misiune nereușită: ai ${count} școală/școli conectate. Ai nevoie de minimum 2.`);
      }
    }
  }

  function applyGlobalEvent(card) {
    state.globalEvent = { ...card, expiresRound: state.round };

    if (card.global === "internationalPartnership") {
      state.players.forEach(p => {
        p.resources.innovation += 1;
        p.resources.collaboration += 1;
      });
    }

    if (card.global === "nationalHackathon") {
      state.players.forEach(p => {
        if (hasOwnedTileType(p.id, ["hub", "steam"])) p.resources.impact += 2;
      });
    }

    if (card.global === "robotDonation") {
      state.players.forEach(p => p.resources.equipment += 1);
      currentPlayer().resources.equipment += 1;
    }

    if (card.global === "resistance") {
      state.players.forEach(p => p.resources.collaboration = Math.max(0, p.resources.collaboration - 1));
    }

    if (card.global === "equipmentShortage") {
      state.players.forEach(p => p.resources.equipment = Math.max(0, p.resources.equipment - 1));
    }
  }

  function applyPendingAction(cell, tile) {
    const card = state.pendingAction;
    const player = currentPlayer();

    if (!card) return false;
    if (!tile) {
      setStatus("Cartea trebuie aplicată pe un tile existent.");
      return true;
    }

    if (card.mode === "activity") {
      if (!card.target.includes(tile.type)) {
        setStatus(`${card.title} nu poate fi aplicată pe acest tip de tile.`);
        return true;
      }

      if (tile.owner !== player.id && !isAdjacentToOwnedZone(cell, player.id)) {
        setStatus("Activitatea trebuie aplicată pe zona proprie sau lângă o conexiune proprie.");
        return true;
      }

      const effectiveCost = getEffectiveCardCost(card);
      if (!canPay(player, effectiveCost)) {
        setStatus(`Nu ai suficiente resurse. Cost: ${formatCost(effectiveCost)}.`);
        return true;
      }

      payCost(player, effectiveCost);
      addResources(player, card.reward);
      tile.owner = player.id;
      tile.activated = true;
      tile.activityMarks = tile.activityMarks || [];
      tile.activityMarks.push(card.mark || card.title);
      state.pendingAction = null;
      setStatus(`${card.title} implementată. Recompensă: ${formatCost(card.reward)}.`);
      return true;
    }

    if (card.mode === "project") {
      if (tile.type !== "school" || tile.owner !== player.id) {
        setStatus("Proiectul comunitar se aplică pe o școală proprie.");
        return true;
      }

      if (player.resources.collaboration < 1) {
        setStatus("Nu ai suficientă colaborare. Cost: 🤝1.");
        return true;
      }

      player.resources.collaboration -= 1;
      const impact = state.globalEvent?.global === "lowStudentEngagement" ? 1 : 2;
      player.resources.impact += impact;
      tile.activated = true;
      tile.activityMarks = tile.activityMarks || [];
      tile.activityMarks.push("Proiect comunitar");
      state.pendingAction = null;
      setStatus(`Proiect implementat. ⭐ +${impact}.`);
      return true;
    }

    if (card.mode === "blockConnection") {
      if (!["road", "digitalRoad", "steamCorridor", "ruralRoute"].includes(tile.type)) {
        setStatus("Problema poate fi aplicată doar pe conexiuni.");
        return true;
      }

      tile.previousType = tile.type;
      tile.type = "blocked";
      tile.owner = player.id;
      state.pendingAction = null;
      setStatus("Conexiunea a fost blocată temporar.");
      return true;
    }

    if (card.mode === "partnership") {
      if (!["road", "digitalRoad", "steamCorridor", "ruralRoute", "hub"].includes(tile.type)) {
        setStatus("Parteneriatul se aplică pe o conexiune sau pe un hub.");
        return true;
      }

      if (!isAdjacentToOwnedZone(cell, player.id) && tile.owner !== player.id) {
        setStatus("Parteneriatul trebuie aplicat lângă zona ta sau pe un tile propriu.");
        return true;
      }

      player.resources.collaboration += 2;
      player.resources.impact += 1;
      tile.owner = player.id;
      tile.activated = true;
      state.pendingAction = null;
      setStatus("Parteneriat activat. 🤝 +2 și ⭐ +1.");
      return true;
    }

    return false;
  }

  function applyPendingCharacter(cell, tile) {
    const card = state.pendingCharacter;
    const player = currentPlayer();

    if (!card) return false;
    if (!tile) return setStatus("Personajul trebuie plasat pe un tile existent."), true;

    if (!card.allowed.includes(tile.type)) {
      setStatus(`${card.title} nu poate fi plasat aici.`);
      return true;
    }

    if (tile.owner !== player.id && !isAdjacentToOwnedZone(cell, player.id)) {
      setStatus("Poți plasa personajul doar în zona proprie sau lângă o conexiune proprie.");
      return true;
    }

    tile.owner = player.id;
    tile.characters = tile.characters || [];
    tile.characters.push({ role: card.role, icon: card.icon, title: card.title, owner: player.id });

    if (card.role === "teacher") {
      player.resources.collaboration += 1;
      player.resources.impact += 1;
    }
    if (card.role === "student") {
      player.resources.impact += player.faction?.bonusType === "student_boost" ? 2 : 1;
    }
    if (card.role === "expert") {
      player.resources.impact += 2;
      player.resources.innovation += 1;
    }
    if (card.role === "mentor") {
      player.resources.innovation += 1;
      player.resources.collaboration += 1;
    }

    state.pendingCharacter = null;
    setStatus(`${card.title} a fost plasat.`);
    return true;
  }

  function placeCurrentTile(cell, existingTile) {
    if (existingTile) {
      setStatus("Această poziție este ocupată.");
      return;
    }

    if (!isValidPlacement(cell)) {
      setStatus("Plasare invalidă. Alege o poziție lângă zona proprie sau o conexiune validă.");
      return;
    }

    const player = currentPlayer();
    const tile = state.currentTile;
    const def = tileTypes[tile.type];
    const cost = getEffectiveCost(tile.type);

    if (!canPay(player, cost)) {
      setStatus(`Nu ai suficiente resurse. Cost: ${formatCost(cost)}.`);
      return;
    }

    payCost(player, cost);
    tile.owner = player.id;
    state.map[cell.y][cell.x] = tile;
    addProduction(player, def.produces);

    applyPlacementCombo(cell, tile, player);
    revealArea(cell.x, cell.y, 1);

    state.currentTile = null;
    setStatus(`${player.name} a construit ${def.label}.`);
  }

  function applyPlacementCombo(cell, tile, player) {
    const neighbors = getNeighbors(cell.x, cell.y).map(n => state.map[n.y][n.x]).filter(Boolean);

    if (tile.type === "digitalRoad" && neighbors.some(t => t.type === "hub")) {
      player.resources.innovation += 1;
      setStatus("Combo activ: Rețea Digitală + Hub Digital. 💡 +1.");
    }

    if (tile.type === "steamCorridor" && neighbors.some(t => t.type === "steam")) {
      player.resources.impact += 1;
      setStatus("Combo activ: Coridor STEAM + Centru STEAM. ⭐ +1.");
    }

    if (tile.type === "ruralRoute" && neighbors.some(t => ["village", "rural"].includes(t.type))) {
      player.resources.collaboration += 1;
      setStatus("Combo activ: Rută Rurală + comunitate. 🤝 +1.");
    }
  }

  function canClaimSchool(cell, tile, player) {
    if (!tile || tile.type !== "school" || tile.owner) return false;
    if (!isAdjacentToOwnedZone(cell, player.id)) return false;
    return player.expansionTokens > 0 || (player.resources.collaboration >= 2 && player.resources.equipment >= 1);
  }

  function claimSchool(cell, tile) {
    const player = currentPlayer();

    if (!canClaimSchool(cell, tile, player)) {
      setStatus("Pentru extindere ai nevoie de școală conectată și cost 🤝2 + 🧰1 sau 1 token de extindere.");
      return true;
    }

    if (player.expansionTokens > 0) player.expansionTokens -= 1;
    else {
      player.resources.collaboration -= 2;
      player.resources.equipment -= 1;
    }

    tile.owner = player.id;
    tile.isExpandedSchool = true;
    player.controlledSchools.push({ x: cell.x, y: cell.y });
    player.resources.impact += 2;
    revealArea(cell.x, cell.y, 1);
    setStatus(`${player.name} a preluat o școală nouă. ⭐ +2.`);
    return true;
  }

  function isValidPlacement(cell) {
    const player = currentPlayer();
    return getNeighbors(cell.x, cell.y).some(n => {
      const tile = state.map[n.y][n.x];
      if (!tile || tile.type === "blocked") return false;
      if (tile.owner === player.id) return true;
      if (tile.type === "city" && isAdjacentToOwnedZone(n, player.id)) return true;
      return ["road", "digitalRoad", "steamCorridor", "ruralRoute", "hub"].includes(tile.type) && isAdjacentToOwnedZone(n, player.id);
    });
  }

  function isConnectionTile(type) {
    return ["road", "digitalRoad", "steamCorridor", "ruralRoute", "city", "school", "hub", "steam", "university", "village", "rural"].includes(type);
  }

  function isAdjacentToOwnedZone(cell, ownerId) {
    return getNeighbors(cell.x, cell.y).some(n => {
      const tile = state.map[n.y][n.x];
      return tile && tile.owner === ownerId && tile.type !== "blocked";
    });
  }

  function getNeighbors(x, y) {
    return [
      { x: x - 1, y },
      { x: x + 1, y },
      { x, y: y - 1 },
      { x, y: y + 1 }
    ].filter(p => inside(p.x, p.y));
  }

  function countOwnedTileType(ownerId, type) {
    let count = 0;
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const tile = state.map[y][x];
        if (tile?.owner === ownerId && tile.type === type) count += 1;
      }
    }
    return count;
  }

  function hasOwnedTileType(ownerId, types) {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const tile = state.map[y][x];
        if (tile?.owner === ownerId && types.includes(tile.type)) return true;
      }
    }
    return false;
  }

  function countConnectedOwnedSchools(ownerId) {
    const zone = getConnectedZone(ownerId);
    let count = 0;

    for (const key of zone) {
      const [x, y] = key.split(",").map(Number);
      const tile = state.map[y][x];
      if (tile?.type === "school" && tile.owner === ownerId) count += 1;
    }

    return count;
  }

  function getConnectedZone(ownerId) {
    const starts = [];

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const tile = state.map[y][x];
        if (tile?.owner === ownerId && isConnectionTile(tile.type)) starts.push({ x, y });
      }
    }

    const visited = new Set(starts.map(s => `${s.x},${s.y}`));
    const queue = [...starts];

    while (queue.length) {
      const current = queue.shift();

      for (const n of getNeighbors(current.x, current.y)) {
        const key = `${n.x},${n.y}`;
        if (visited.has(key)) continue;

        const tile = state.map[n.y][n.x];
        if (!tile || tile.type === "blocked" || !isConnectionTile(tile.type)) continue;
        if (tile.owner !== ownerId && tile.type !== "city") continue;

        visited.add(key);
        queue.push(n);
      }
    }

    return visited;
  }

  function expireGlobalEventIfNeeded() {
    if (state.globalEvent && state.round > state.globalEvent.expiresRound) state.globalEvent = null;
  }

  function calculateScore(player) {
    let developedSchools = 0;
    let connectedCities = new Set();
    let finishedProjects = 0;
    let trainedTeachers = 0;
    let involvedStudents = 0;
    let regionalImpact = 0;

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const tile = state.map[y][x];
        if (!tile || tile.owner !== player.id) continue;

        if (tile.type === "school") developedSchools += 1;
        if (tile.cityName) connectedCities.add(tile.cityName);
        if (tile.activated) finishedProjects += 1;
        if (tile.activityMarks?.length) finishedProjects += tile.activityMarks.length;
        if (["village", "rural", "ruralRoute"].includes(tile.type)) regionalImpact += 1;

        tile.characters?.forEach(ch => {
          if (["teacher", "mentor", "expert"].includes(ch.role)) trainedTeachers += 1;
          if (ch.role === "student") involvedStudents += 1;
        });
      }
    }

    const connectedSchools = countConnectedOwnedSchools(player.id);
    const zoneSize = getConnectedZone(player.id).size;

    const total =
      player.resources.impact +
      developedSchools * 2 +
      connectedSchools * 2 +
      connectedCities.size * 3 +
      finishedProjects * 3 +
      trainedTeachers * 2 +
      involvedStudents +
      regionalImpact +
      Math.floor(zoneSize / 5);

    return { total, developedSchools, connectedSchools, connectedCities: connectedCities.size, finishedProjects, trainedTeachers, involvedStudents, regionalImpact, zoneSize };
  }

  function checkWinCondition() {
    if (!state || state.gameOver) return false;

    const ranking = state.players.map(player => ({ player, score: calculateScore(player) })).sort((a, b) => b.score.total - a.score.total);
    const winnerByImpact = ranking.find(item => item.score.total >= state.targetImpact);
    const reachedRoundLimit = state.round > state.maxRounds;

    if (!winnerByImpact && !reachedRoundLimit) return false;

    const winner = winnerByImpact || ranking[0];
    state.gameOver = true;
    setStatus(`Joc terminat! Câștigă ${winner.player.name} cu ${winner.score.total} puncte.`);
    showVictoryScreen(winner);
    showCard({ category: "Final de joc", icon: "🏆", title: `${winner.player.name} câștigă`, text: `Scor final: ${winner.score.total}. Școli: ${winner.score.developedSchools}, orașe: ${winner.score.connectedCities}, activități/proiecte: ${winner.score.finishedProjects}.` });
    return true;
  }

  function renderPlayers() {
    if (!state) {
      ui.playersBox.textContent = "—";
      return;
    }

    ui.playersBox.innerHTML = state.players.map((p, index) => {
      const score = calculateScore(p);
      const school = p.school ? `(${p.school.x}, ${p.school.y})` : "nealeasă";
      return `
        <div class="player-card ${index === state.currentPlayer ? "active" : ""} ${!p.school ? "waiting-school" : ""}">
          <div class="player-name"><span class="dot" style="background:${p.color}"></span>${p.name}</div><div class="faction-badge">${p.faction.name}</div>
          <div>Școală de bază: <strong>${school}</strong></div>
          <div>Școli controlate: ${(p.controlledSchools || []).length} · Token extindere: ${p.expansionTokens}</div>
          <div>Scor educațional: <strong>${score.total}</strong></div>
          <div>Zonă conectată: ${score.zoneSize} tile-uri · Școli conectate: ${score.connectedSchools}</div>
          <div>💡 ${p.resources.innovation} · 🧰 ${p.resources.equipment} · 🤝 ${p.resources.collaboration} · ⭐ ${p.resources.impact}</div>
          <div class="production-line">Producție/tură: 💡${p.production.innovation} · 🧰${p.production.equipment} · 🤝${p.production.collaboration} · ⭐${p.production.impact}</div>
          ${index === state.currentPlayer ? '<span class="badge">Tura curentă</span>' : ""}
        </div>
      `;
    }).join("");
  }

  function renderScore() {
    if (!state) {
      ui.scoreBox.textContent = "—";
      return;
    }

    const ranking = state.players.map(player => ({ player, score: calculateScore(player) })).sort((a, b) => b.score.total - a.score.total);

    ui.scoreBox.innerHTML = `
      <div class="win-condition">Țintă: ⭐ ${state.targetImpact} puncte sau ${state.maxRounds} runde.</div>
      ${ranking.map((item, index) => `
        <div class="score-row ${index === 0 ? "leader" : ""}">
          <span><strong>${index + 1}. ${item.player.name}</strong></span>
          <span class="score-pill">${item.score.total}</span>
        </div>
        <div class="score-detail">școli ${item.score.developedSchools} · orașe ${item.score.connectedCities} · activități/proiecte ${item.score.finishedProjects} · profesori ${item.score.trainedTeachers} · elevi ${item.score.involvedStudents}</div>
      `).join("")}
    `;
  }

  function renderGlobalEvent() {
    if (!state?.globalEvent) {
      ui.globalEventBox.textContent = "Niciun eveniment activ.";
      return;
    }

    const e = state.globalEvent;
    ui.globalEventBox.innerHTML = `
      <div class="card-title">${e.icon} ${e.title}</div>
      <div>${e.text}</div>
      <div class="badge">Activ până la finalul rundei ${e.expiresRound}</div>
    `;
  }

  function renderTileInfo() {
    if (!state?.selectedCell) {
      ui.tileInfo.textContent = "Nimic selectat.";
      return;
    }

    const { x, y } = state.selectedCell;
    const tile = state.map[y][x];

    if (!tile) {
      ui.tileInfo.innerHTML = `Poziție liberă: (${x}, ${y})`;
      return;
    }

    const def = tileTypes[tile.type];
    const owner = tile.owner ? `Jucător ${tile.owner}` : "—";

    let html = `
      <div class="card-title">${def.icon} ${def.label}</div>
      <div>Poziție: (${x}, ${y})</div>
      <div>Owner: ${owner}</div>
      <div>Cost construire: ${formatCost(def.cost)}</div>
      <div>Producție/tură: ${formatCost(def.produces)}</div>
    `;

    if (tile.isBaseSchool) html += `<div><span class="badge">Școală de bază</span></div>`;
    if (tile.isExpandedSchool) html += `<div><span class="badge">Școală extinsă</span></div>`;
    if (tile.cityName) html += `<div>Oraș: ${tile.cityName}</div>`;
    if (tile.specialization) html += `<div>Specializare: ${tile.specialization}</div>`;
    if (tile.bonus) html += `<div>Bonus: ${tile.bonus}</div>`;
    if (tile.slots) html += `<div style="margin-top:8px">${tile.slots.map(s => `<div>${s}</div>`).join("")}</div>`;
    if (tile.upgradeIcons?.length) html += `<div class="school-upgrades">${tile.upgradeIcons.map(i => `<span class="upgrade-mini">${i}</span>`).join("")}</div>`;
    if (tile.characters?.length) html += `<div style="margin-top:8px"><strong>Personaje:</strong>${tile.characters.map(c => `<div>${c.icon} ${c.title} — Jucător ${c.owner}</div>`).join("")}</div>`;
    if (tile.activityMarks?.length) html += `<div style="margin-top:8px"><strong>Activități:</strong>${tile.activityMarks.map(a => `<div>✅ ${a}</div>`).join("")}</div>`;
    if (tile.activated) html += `<div style="margin-top:8px"><span class="badge">Activat prin carte</span></div>`;

    ui.tileInfo.innerHTML = html;
  }


  function checkMissions() {
    if (!state || state.gameOver) return;

    state.activeMissions.forEach(mission => {
      if (!mission.completedBy) {
        const p = currentPlayer();

        if (mission.check(p)) {
          mission.completedBy = p.name;
          p.resources.impact += mission.reward;

          showCard({
            category: "Misiune Îndeplinită!",
            icon: "🏆",
            title: mission.title,
            text: `${p.name} a finalizat obiectivul și primește ⭐ +${mission.reward}.`
          });

          triggerConfetti("normal");
          setStatus(`${p.name} a îndeplinit Obiectivul Național: ${mission.title}!`);
        }
      }
    });
  }

  function executeBankTrade() {
    if (!isMyTurn()) return alert("Așteaptă! Nu este rândul tău.");
    if (!ui.bankGet || !ui.bankZone) return;
    const p = currentPlayer();
    const totalRes = p.resources.innovation + p.resources.equipment + p.resources.collaboration;

    if (totalRes < 3) {
      setStatus("Nu ai 3 resurse pentru schimb!");
      return;
    }

    let costToPay = p.faction?.bonusType === "bank_2_1" ? 2 : 3;

    while (costToPay > 0) {
      let maxRes = "innovation";

      if (p.resources.equipment > p.resources[maxRes]) maxRes = "equipment";
      if (p.resources.collaboration > p.resources[maxRes]) maxRes = "collaboration";

      p.resources[maxRes]--;
      costToPay--;
    }

    const getRes = ui.bankGet.value;
    p.resources[getRes]++;

    ui.bankZone.style.display = "none";

    spawnFloatingText("Schimb reușit!", "#FFD166", window.innerWidth / 2, 160);

    setStatus(`Schimb realizat. Ai primit 1 ${ui.bankGet.options[ui.bankGet.selectedIndex].text}.`);

    checkMissions();
    renderAll();
  }

  function renderMissions() {
    if (!ui.missionsBox) return;
    if (!state || !state.activeMissions) {
      ui.missionsBox.textContent = "—";
      return;
    }

    ui.missionsBox.innerHTML = state.activeMissions.map(m => `
      <div class="mission-card ${m.completedBy ? 'completed' : ''}">
        <div class="mission-reward">⭐ ${m.reward}</div>
        <div class="mission-title">${m.title}</div>
        <div>${m.desc}</div>
        ${m.completedBy ? `<div style="margin-top:6px; color: var(--cyan); font-weight:bold;">Completat de: ${m.completedBy}</div>` : ''}
      </div>
    `).join("");
  }


  function renderFactionInfo() {
    if (!ui.factionInfoBox || !state) return;
    const p = currentPlayer();
    if (!p || !p.faction) {
      ui.factionInfoBox.textContent = "—";
      return;
    }

    ui.factionInfoBox.innerHTML = `
      <div class="faction-info-name">${escapeHtml(p.faction.name)}</div>
      <div class="faction-info-power">${escapeHtml(p.faction.power)}</div>
      <div>${escapeHtml(p.faction.desc)}</div>
      <div class="badge">Jucător curent: ${escapeHtml(p.name)}</div>
    `;
  }

  function renderAll() {
    updateCanvasSize();
    draw();
    updateTurnInfo();
    renderPlayers();
    renderFactionInfo();
    renderScore();
    renderGlobalEvent();
    renderCurrentCard();
    renderTileInfo();
    if (typeof renderMissions === "function") renderMissions();

    if (isMyTurn()) syncToCloud();
    renderMissions();
  }

  function updateCanvasSize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(300, Math.floor(rect.width * dpr));
    canvas.height = Math.max(300, Math.floor(rect.height * dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw() {
    if (!state) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);

    ctx.save();
    ctx.translate(camera.x, camera.y);
    ctx.scale(camera.zoom, camera.zoom);
    drawGrid();
    drawConnectedZones();
    drawTiles();
    drawFog();
    drawPlacementPreview();
    drawHoverHighlight();
    ctx.restore();
  }


  function drawFog() {
    if (!state || !state.discovered) return;

    ctx.save();

    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {

        if (!state.discovered[y][x]) {
          const px = x * TILE_SIZE;
          const py = y * TILE_SIZE;

          ctx.fillStyle = "rgba(12,22,30,0.85)";
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

          ctx.fillStyle = "rgba(255,255,255,0.05)";
          ctx.font = "bold 16px Arial";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText("?", px + TILE_SIZE / 2, py + TILE_SIZE / 2);
        }
      }
    }

    ctx.restore();
  }

  function drawHoverHighlight() {
    if (!hoverCell || !inside(hoverCell.x, hoverCell.y)) return;
    if (state.discovered && !state.discovered[hoverCell.y][hoverCell.x]) return;
    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.fillRect(hoverCell.x * TILE_SIZE, hoverCell.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    ctx.lineWidth = 2;
    ctx.strokeRect(hoverCell.x * TILE_SIZE + 1, hoverCell.y * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    ctx.restore();
  }

  function drawGrid() {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;
        ctx.fillStyle = (x + y) % 2 === 0 ? "rgba(255,255,255,0.035)" : "rgba(255,255,255,0.02)";
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.strokeStyle = "rgba(255,255,255,0.10)";
        ctx.lineWidth = 1;
        ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  function drawConnectedZones() {
    state.players.forEach(player => {
      ctx.save();
      ctx.fillStyle = hexToRgba(player.color, 0.11);
      getConnectedZone(player.id).forEach(key => {
        const [x, y] = key.split(",").map(Number);
        ctx.fillRect(x * TILE_SIZE + 2, y * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      });
      ctx.restore();
    });
  }

  function hexToRgba(hex, alpha) {
    const clean = hex.replace("#", "");
    const bigint = parseInt(clean, 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function drawTiles() {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const tile = state.map[y][x];
        if (tile && (!state.discovered || state.discovered[y][x])) drawOneTile(x, y, tile);
      }
    }

    state.players.forEach(p => {
      if (p.school) drawPlayerMarker(p);
    });

    if (state.selectedCell) {
      ctx.save();
      ctx.strokeStyle = "#10ECD2";
      ctx.lineWidth = 4;
      ctx.strokeRect(state.selectedCell.x * TILE_SIZE + 2, state.selectedCell.y * TILE_SIZE + 2, TILE_SIZE - 4, TILE_SIZE - 4);
      ctx.restore();
    }
  }

  function drawOneTile(x, y, tile) {
    const def = tileTypes[tile.type];
    const px = x * TILE_SIZE + 3;
    const py = y * TILE_SIZE + 3;
    const size = TILE_SIZE - 6;

    ctx.save();
    roundRect(px, py, size, size, 9);
    ctx.fillStyle = def.color;
    ctx.fill();
    ctx.strokeStyle = tile.owner ? getOwnerColor(tile.owner) : "rgba(255,255,255,0.45)";
    ctx.lineWidth = tile.owner ? 4 : 1.5;
    ctx.stroke();

    ctx.fillStyle = def.text;
    ctx.font = "20px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(def.icon, px + size / 2, py + size / 2 - 2);

    if (tile.type === "school") {
      ctx.fillStyle = "rgba(0,0,0,0.24)";
      for (let i = 0; i < 6; i++) {
        ctx.beginPath();
        ctx.arc(px + 8 + i * 5.2, py + size - 8, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (tile.isBaseSchool || tile.isExpandedSchool) {
      ctx.fillStyle = tile.isBaseSchool ? "rgba(16,236,210,0.95)" : "rgba(255,209,102,0.95)";
      ctx.font = "bold 9px Arial";
      ctx.fillText(tile.isBaseSchool ? "BASE" : "EXT", px + size / 2, py + 8);
    }

    if (tile.activated) {
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.font = "bold 10px Arial";
      ctx.fillText("✓", px + size - 8, py + 9);
    }

    if (tile.upgradeIcons?.length) {
      ctx.font = "10px Arial";
      tile.upgradeIcons.slice(0,3).forEach((icon, idx) => {
        ctx.fillText(icon, px + 10 + idx * 10, py + size - 8);
      });
    }

    if (tile.characters?.length) {
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.beginPath();
      ctx.arc(px + 9, py + 9, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "11px Arial";
      ctx.fillText(tile.characters[0].icon, px + 9, py + 10);
    }

    ctx.restore();
  }

  function drawPlayerMarker(player) {
    const x = player.school.x * TILE_SIZE + TILE_SIZE - 9;
    const y = player.school.y * TILE_SIZE + 9;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fillStyle = player.color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#111";
    ctx.stroke();
    ctx.fillStyle = "#111";
    ctx.font = "bold 9px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(player.id, x, y + 0.5);
    ctx.restore();
  }

  function drawPlacementPreview() {
    if (!state.currentTile || state.phase !== "play") return;

    ctx.save();
    ctx.fillStyle = "rgba(16,236,210,0.13)";
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (!state.map[y][x] && isValidPlacement({ x, y })) {
          ctx.fillRect(x * TILE_SIZE + 4, y * TILE_SIZE + 4, TILE_SIZE - 8, TILE_SIZE - 8);
        }
      }
    }
    ctx.restore();
  }

  function getOwnerColor(ownerId) {
    return state.players.find(p => p.id === ownerId)?.color || "rgba(255,255,255,0.45)";
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  function screenToCell(screenX, screenY) {
    return {
      x: Math.floor((screenX - camera.x) / camera.zoom / TILE_SIZE),
      y: Math.floor((screenY - camera.y) / camera.zoom / TILE_SIZE)
    };
  }

  function centerMap() {
    const rect = canvas.parentElement.getBoundingClientRect();
    const mapW = GRID_SIZE * TILE_SIZE;
    const mapH = GRID_SIZE * TILE_SIZE;
    camera.zoom = Math.min(rect.width / mapW, rect.height / mapH) * 0.92;
    camera.zoom = Math.max(0.45, Math.min(1.1, camera.zoom));
    camera.x = (rect.width - mapW * camera.zoom) / 2;
    camera.y = (rect.height - mapH * camera.zoom) / 2;
    draw();
  }

  function saveGame() {
    if (!state) return;
    localStorage.setItem("clasaViitoruluiRebuild", JSON.stringify(state));
    setStatus("Jocul a fost salvat local.");
  }

  function normalizeLoadedState() {
    state.players.forEach(p => {
      p.controlledSchools = p.controlledSchools || (p.school ? [p.school] : []);
      p.expansionTokens = p.expansionTokens || 0;
      p.faction = p.faction || factions[(p.id - 1) % factions.length];
      p.upgrades = p.upgrades || [];
      p.resources = { innovation: 0, equipment: 0, collaboration: 0, impact: 0, ...(p.resources || {}) };
      p.production = { innovation: 1, equipment: 1, collaboration: 1, impact: 0, ...(p.production || {}) };
    });

    state.cardHistory = state.cardHistory || [];
    state.currentCardDisplay = state.currentCardDisplay || null;
    state.pendingAction = state.pendingAction || null;
    state.pendingCharacter = state.pendingCharacter || null;
    state.tileDeck = state.tileDeck?.length ? state.tileDeck : shuffle(tileDeckTemplate);
    state.actionDeck = state.actionDeck?.length ? state.actionDeck : shuffle(actionDeckTemplate);
    state.characterDeck = state.characterDeck?.length ? state.characterDeck : shuffle(characterDeckTemplate);
    state.eventDeck = state.eventDeck?.length ? state.eventDeck : shuffle(eventDeckTemplate);
    state.activeMissions = state.activeMissions || shuffle([...publicMissionsDatabase]).slice(0, 3).map(m => ({ ...m, completedBy: null }));
    state.discovered = state.discovered || Array.from({ length: GRID_SIZE }, () => Array.from({ length: GRID_SIZE }, () => true));
  }

  function loadGame() {
    const raw = localStorage.getItem("clasaViitoruluiRebuild");
    if (!raw) return setStatus("Nu există joc salvat.");

    try {
      state = JSON.parse(raw);
      normalizeLoadedState();
      setStatus("Jocul salvat a fost încărcat.");
      renderAll();
    } catch (error) {
      console.error(error);
      setStatus("Eroare la încărcarea jocului.");
    }
  }

  function resetGame() {
    localStorage.removeItem("clasaViitoruluiRebuild");
    newGame();
  }

  function bindEvents() {

    const multiplayerStartBtn = document.getElementById("startGameBtn");
    if (multiplayerStartBtn) {
      multiplayerStartBtn.addEventListener("click", () => {
        const startScreen = document.getElementById("startScreen");
        if (!startScreen) return;

        startScreen.style.transition = "opacity 0.5s ease";
        startScreen.style.opacity = "0";

        setTimeout(() => {
          startScreen.style.display = "none";
          triggerConfetti("normal");
        }, 500);
      });
    }



    const createRoomBtn = document.getElementById("createRoomBtn");
    if (createRoomBtn) {
      createRoomBtn.addEventListener("click", () => {
        roomCode = Math.random().toString(36).substring(2, 6).toUpperCase();

        localPlayerId = 1;
        isMultiplayer = true;

        document.getElementById("lobbyScreen").style.display = "none";

        newGame();

        if (db) {
          db.ref("rooms/" + roomCode + "/joinedPlayers").set(1);
        }

        syncToCloud();
        listenToCloud();

        alert("Camera creată! Codul este: " + roomCode);
      });
    }

    const joinRoomBtn = document.getElementById("joinRoomBtn");
    if (joinRoomBtn) {
      joinRoomBtn.addEventListener("click", () => {

        const code = document.getElementById("roomCodeInput")
          .value
          .toUpperCase();

        if (code.length !== 4) {
          return alert("Cod invalid!");
        }

        const status = document.getElementById("lobbyStatus");
        if (status) status.textContent = "Se conectează...";

        if (!db) {
          return alert("Firebase indisponibil.");
        }

        db.ref("rooms/" + code).once("value", snapshot => {

          if (!snapshot.exists() || !snapshot.val().state) {
            if (status) status.textContent = "Camera nu a fost găsită!";
            return;
          }

          roomCode = code;
          isMultiplayer = true;

          const data = snapshot.val();

          localPlayerId = (data.joinedPlayers || 1) + 1;

          db.ref("rooms/" + roomCode + "/joinedPlayers")
            .set(localPlayerId);

          document.getElementById("lobbyScreen").style.display = "none";

          listenToCloud();

          alert("Te-ai conectat! Ești Jucătorul " + localPlayerId);
        });
      });
    }

    ui.newGameBtn.addEventListener("click", newGame);
    ui.drawTileBtn.addEventListener("click", startTileDraft);
    ui.drawActionBtn.addEventListener("click", () => drawGenericCard("action"));
    ui.drawCharacterBtn.addEventListener("click", () => drawGenericCard("character"));
    ui.drawEventBtn.addEventListener("click", () => drawGenericCard("event"));
    ui.endTurnBtn.addEventListener("click", endTurn);
    ui.saveBtn.addEventListener("click", saveGame);
    ui.loadBtn.addEventListener("click", loadGame);
    ui.resetBtn.addEventListener("click", resetGame);
    ui.zoomInBtn.addEventListener("click", () => { camera.zoom = Math.min(2, camera.zoom * 1.15); draw(); });
    ui.zoomOutBtn.addEventListener("click", () => { camera.zoom = Math.max(0.35, camera.zoom / 1.15); draw(); });
    ui.centerBtn.addEventListener("click", centerMap);

    if (ui.openBankBtn && ui.bankZone) {
      ui.openBankBtn.addEventListener("click", () => {
        ui.bankZone.style.display = ui.bankZone.style.display === "none" ? "block" : "none";
      });
    }

    if (ui.openUpgradeBtn) {
      ui.openUpgradeBtn.addEventListener("click", openUpgradeModal);
    }

    if (ui.execBankBtn) {
      ui.execBankBtn.addEventListener("click", executeBankTrade);
    }

    if (ui.closeUpgradeModal) {
      ui.closeUpgradeModal.addEventListener("click", () => {
        if (ui.upgradeModal) ui.upgradeModal.style.display = "none";
      });
    }

    window.addEventListener("click", (event) => {
      if (event.target === ui.upgradeModal) ui.upgradeModal.style.display = "none";
    });

    canvas.addEventListener("mousedown", (event) => {
      if (event.button !== 0) return;
      dragging = true;
      dragStart = { x: event.clientX, y: event.clientY };
      cameraStart = { x: camera.x, y: camera.y };
    });


    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const worldX = (mouseX - camera.x) / camera.zoom;
      const worldY = (mouseY - camera.y) / camera.zoom;

      const zoomFactor = 1.15;
      let newZoom = camera.zoom;

      if (e.deltaY < 0) {
        newZoom = Math.min(2.5, camera.zoom * zoomFactor);
      } else {
        newZoom = Math.max(0.35, camera.zoom / zoomFactor);
      }

      camera.zoom = newZoom;
      camera.x = mouseX - worldX * camera.zoom;
      camera.y = mouseY - worldY * camera.zoom;

      draw();
      updateTooltip(e);
    }, { passive: false });

    canvas.addEventListener("click", handleCanvasClick);

    window.addEventListener("mousemove", (event) => {
      if (dragging) {
        const dx = event.clientX - dragStart.x;
        const dy = event.clientY - dragStart.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) {
          camera.x = cameraStart.x + dx;
          camera.y = cameraStart.y + dy;
          draw();
        }
      } else {
        updateTooltip(event);
      }
    });

    window.addEventListener("mouseup", () => {
      dragging = false;
    });

    canvas.addEventListener("mouseleave", () => {
      hoverCell = null;
      if (ui.mapTooltip) ui.mapTooltip.style.display = "none";
      draw();
    });

    canvas.addEventListener("touchstart", (event) => {
      if (event.touches.length !== 1) return;
      dragging = true;
      dragStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
      cameraStart = { x: camera.x, y: camera.y };
    }, { passive: false });

    window.addEventListener("touchmove", (event) => {
      if (!dragging || event.touches.length !== 1) return;
      event.preventDefault();
      const dx = event.touches[0].clientX - dragStart.x;
      const dy = event.touches[0].clientY - dragStart.y;
      camera.x = cameraStart.x + dx;
      camera.y = cameraStart.y + dy;
      draw();
    }, { passive: false });

    window.addEventListener("touchend", () => {
      dragging = false;
      hoverCell = null;
      if (ui.mapTooltip) ui.mapTooltip.style.display = "none";
      draw();
    });

    window.addEventListener("resize", renderAll);
  }


  function ensureModalDom() {
    if (!document.getElementById("upgradeModal")) {
      document.body.insertAdjacentHTML("beforeend", `
        <div id="upgradeModal" class="modal">
          <div class="modal-content">
            <span id="closeUpgradeModal" class="close-modal">&times;</span>
            <h2>🏫 Dezvoltare Școală de Bază</h2>
            <p>Investește resurse pentru a crește producția permanentă a școlii tale.</p>
            <div id="upgradeList" class="upgrade-grid"></div>
          </div>
        </div>
      `);
    }

    if (!document.getElementById("endGameModal")) {
      document.body.insertAdjacentHTML("beforeend", `
        <div id="endGameModal" class="modal">
          <div class="modal-content victory-content">
            <h1 id="victoryTitle">🏆 VICTORIE!</h1>
            <div id="winnerPodium"></div>
            <div id="finalStats"></div>
            <button onclick="location.reload()" class="btn primary full">Joc Nou</button>
          </div>
        </div>
      `);
    }

    ui.upgradeModal = document.getElementById("upgradeModal");
    ui.closeUpgradeModal = document.getElementById("closeUpgradeModal");
    ui.upgradeList = document.getElementById("upgradeList");
    ui.endGameModal = document.getElementById("endGameModal");
    ui.winnerPodium = document.getElementById("winnerPodium");
    ui.finalStats = document.getElementById("finalStats");
  }

  function boot() {
    ensureModalDom();
    initPlayerSelect();
    bindEvents();
    newGame();
    setStatus("Motorul jocului este încărcat. Alege școlile pentru jucători.");
  }

  boot();
})();
