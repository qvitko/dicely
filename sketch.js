      // --- Constants and Configuration ---

const CONFIG = {
  diceCount: 16,
  maxColors: 4,
  gridWidth: 4,
  dieSizePlay: 60,
  dieSizeScore: 40,
  dieSpacing: 8,
  scorePileRowLength: 8,
  scorePileDieOffset: { x: 45, y: 45 },
  scorePileStart: { x: 22.5, y: 50 },
  diceColors: [
    "white",
    "pink",
    "red",
    "orange",
    "yellow",
    "green",
    "blue",
    "purple",
    "black",
  ],
  abilities: {
    white: "WHITE: When picked, select two dice in play and swap their values.",
    pink:
      "PINK: When picked, select a die in play and reroll all dice of that color in play.",
    red: "RED: When picked, double the score added from this die.",
    orange:
      "ORANGE: When picked, select a die in play and copy this die’s value onto it.",
    yellow:
      "YELLOW: When picked, select a die in play and add +1 to its value.",
    green:
      "GREEN: When picked, immediately pick all remaining dice of this color in play.",
    blue:
      "BLUE: When picked, select a die in play; it cannot be picked or rolled until after your next roll phase.",
    purple:
      "PURPLE: When picked, select a non-purple die in your score pile and return it to play; it cannot be picked until it's rerolled.",
    black:
      "BLACK: When picked, select a die in your score pile and reroll its value.",
  },
  scoreMap: { 6: 0, 5: 1, 4: 2, 3: 3, 2: 4, 1: 5 },
  redScoreMap: { 6: 0, 5: 2, 4: 4, 3: 6, 2: 8, 1: 10 },
};

const UI = {
  rollButton: {
    x: 110,
    y: 540,
    width: 70,
    height: 40,
    color: [75, 100, 150],
    label: "ROLL",
  },
  pickButton: {
    x: 220,
    y: 540,
    width: 70,
    height: 40,
    color: [75, 100, 150],
    label: "PICK",
  },
  restartButton: {
    x: 140,
    y: 540,
    width: 120,
    height: 40,
    color: [75, 100, 150],
    label: "RESTART",
  },
  newGameButton: {
    // New button definition
    x: 140,
    y: 490, // Position above the Restart button
    width: 120,
    height: 40,
    color: [75, 100, 150],
    label: "NEW GAME",
  },
  startButton: {
    x: 150,
    y: 540,
    width: 100,
    height: 40,
    color: [75, 100, 150],
    label: "START",
  },
  randomSeedButton: {
    x: 100,
    y: 420,
    width: 200,
    height: 40,
    color: [75, 100, 150],
    label: "Random Seed",
  },
  inputSeedButton: {
    x: 100,
    y: 470,
    width: 200,
    height: 40,
    color: [75, 100, 150],
    label: "Enter Seed",
  },
  seedInput: { x: 100, y: 380, width: 180, height: 40 },
};

// --- Game State ---

const gameState = {
  score: 0,
  playPile: [],
  scorePile: [],
  selectedDie: null,
  hasPicked: false,
  seed: "",
  seededRandom: null,
  gameOver: false,
  gameStarted: false,
  abilityInProgress: false,
  abilityType: null,
  abilityTargets: { target1: null, target2: null },
  lockedByBlue: [], // Changed to an array
  animations: [],
  returnedByPurple: [],
  pendingAbilities: [],
  rollCounter: 0,
  inputtingSeed: false,
  enteredSeed: "",
  selectedSeedOption: "random",
  playPileGrid: [], // Track occupied grid positions
};

// --- Utility Functions ---
const utils = {
  generateSeed: () =>
    Array.from({ length: 8 }, () =>
      "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".charAt(
        Math.floor(Math.random() * 36)
      )
    ).join(""),

  seededRNG: (seed) => {
    let x = 0;
    for (let i = 0; i < seed.length; i++) {
      x = (x + seed.charCodeAt(i)) % 2147483647;
    }
    return function () {
      x = (x * 16807) % 2147483647;
      return (x % 1000) / 1000;
    };
  },

  randomDieValue: (rng) => Math.floor(rng() * 6) + 1,
  randomDieColor: (rng) =>
    CONFIG.diceColors[Math.floor(rng() * CONFIG.diceColors.length)],
  isMouseOverRect: (rect) =>
    mouseX > rect.x &&
    mouseX < rect.x + rect.width &&
    mouseY > rect.y &&
    mouseY < rect.y + rect.height,
  getPlayPileGridPosition: (x, y) => {
    const totalGridWidth =
      CONFIG.gridWidth * CONFIG.dieSizePlay +
      (CONFIG.gridWidth - 1) * CONFIG.dieSpacing;
    const startX = (width - totalGridWidth) / 2;
    const startY = 260;

    const col = Math.floor(
      (x - startX) / (CONFIG.dieSizePlay + CONFIG.dieSpacing)
    );
    const row = Math.floor(
      (y - startY) / (CONFIG.dieSizePlay + CONFIG.dieSpacing)
    );

    return { row, col };
  },
};

// --- Button Class ---
class Button {
  constructor(config, action) {
    this.x = config.x;
    this.y = config.y;
    this.width = config.width;
    this.height = config.height;
    this.color = config.color;
    this.label = config.label;
    this.action = action;
    this.enabled = true;
    this.selected = false;
  }

  draw() {
    const isHovered = utils.isMouseOverRect(this);

    // Draw outline if selected
    strokeWeight(this.selected ? 3 : 0);
    stroke(255); // White outline if selected

    // Change color on hover or if disabled
    fill(
      !this.enabled
        ? [150] // Disabled color
        : isHovered
        ? this.color[1] || this.color[0] // Hover color
        : this.color[0] // Normal color
    );
    rect(this.x, this.y, this.width, this.height, 10);

    noStroke();
    fill(255);
    textSize(20);
    textAlign(CENTER, CENTER);
    text(this.label, this.x + this.width / 2, this.y + this.height / 2);
    textAlign(LEFT, BASELINE); // Reset alignment
  }

  handleClick() {
    if (utils.isMouseOverRect(this) && this.enabled && this.action) {
      this.action();
    }
  }
}

// --- Button Instances ---
let rollButton;
let pickButton;
let restartButton;
let newGameButton;
let startButton;
let randomSeedButton;
let inputSeedButton;
let seedInput; // p5.js input element

// --- Initialization and Setup ---

function setup() {
  let canvas = createCanvas(400, 600);
  textFont("Courier New");
  canvas.touchStarted(touchHandler);
  canvas.mousePressed(touchHandler);

  // Initialize buttons using the Button class
  rollButton = new Button(UI.rollButton, rollDice);
  pickButton = new Button(UI.pickButton, pickDice);
  restartButton = new Button(UI.restartButton, restartGame);
  newGameButton = new Button(UI.newGameButton, newGame);
  startButton = new Button(UI.startButton, () =>
    startGame(gameState.selectedSeedOption)
  );
  randomSeedButton = new Button(UI.randomSeedButton, selectRandomSeed);
  inputSeedButton = new Button(UI.inputSeedButton, selectInputSeed);

  //Create the input box, but don't show yet.
  seedInput = createInput("");
  seedInput.position(UI.seedInput.x, UI.seedInput.y);
  seedInput.size(UI.seedInput.width, UI.seedInput.height);
  seedInput.input(onSeedInputChange); //Bind the input event
  seedInput.hide(); // Hide initially

  // Initialize random seed button as selected
  randomSeedButton.selected = true;
  // Initialize playPileGrid
  resetPlayPileGrid();

  updateButtonStates();
}

function onSeedInputChange() {
  gameState.enteredSeed = this.value().toUpperCase(); //Store in gameState
}

function selectRandomSeed() {
  gameState.selectedSeedOption = "random";
  randomSeedButton.selected = true;
  inputSeedButton.selected = false;
  gameState.inputtingSeed = false; // Ensure not in input mode
  seedInput.hide(); //Hide input box
  updateButtonStates();
}

function selectInputSeed() {
  gameState.selectedSeedOption = "input";
  inputSeedButton.selected = true;
  randomSeedButton.selected = false;
  gameState.inputtingSeed = true;
  seedInput.show();
  seedInput.value(""); // Clear the input
  gameState.enteredSeed = ""; // Clear previous entry.
  updateButtonStates();
}
function resetPlayPileGrid() {
  gameState.playPileGrid = Array(CONFIG.gridWidth)
    .fill(null)
    .map(() => Array(CONFIG.gridWidth).fill(false));
}

function initializeDice(rng) {
  gameState.playPile = [];
  resetPlayPileGrid(); // Reset the grid
  const colorCounts = {};
  CONFIG.diceColors.forEach((color) => (colorCounts[color] = 0));

  const totalGridWidth =
    CONFIG.gridWidth * CONFIG.dieSizePlay +
    (CONFIG.gridWidth - 1) * CONFIG.dieSpacing;
  const startX = (width - totalGridWidth) / 2;
  const startY = 260;

  while (gameState.playPile.length < CONFIG.diceCount) {
    const dieColor = utils.randomDieColor(rng);
    if (colorCounts[dieColor] < CONFIG.maxColors) {
      const dieValue = utils.randomDieValue(rng);
      let position = findEmptyGridPosition();
      if (!position) continue;

      const x =
        startX + position.col * (CONFIG.dieSizePlay + CONFIG.dieSpacing);
      const y =
        startY + position.row * (CONFIG.dieSizePlay + CONFIG.dieSpacing);

      gameState.playPile.push(
        new Die(x, y, CONFIG.dieSizePlay, dieValue, dieColor)
      );
      gameState.playPileGrid[position.row][position.col] = true; // Mark position as occupied.

      colorCounts[dieColor]++;
    }
  }
  gameState.gameOver = false;
  updateButtonStates();
}

function findEmptyGridPosition() {
  for (let row = 0; row < CONFIG.gridWidth; row++) {
    for (let col = 0; col < CONFIG.gridWidth; col++) {
      if (!gameState.playPileGrid[row][col]) {
        return { row, col };
      }
    }
  }
  return null; // No empty position found.  Shouldn't happen in normal gameplay
}

// --- Drawing Functions ---

function draw() {
  background(50);

  if (!gameState.gameStarted) {
    drawTitleScreen();
  } else {
    drawUI();
    drawDice();
    updateAnimations();

    if (!gameState.gameOver) {
      rollButton.draw();
      pickButton.draw();
    } else {
      drawGameOverScreen();
    }
  }
}

function drawTitleScreen() {
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(48);
  text("Dice Game", 200, 100);
  textSize(18);
  text(
    "Roll dice, pick the highest values, and use dice abilites to score the least points possible.",
    50,
    200,
    300
  );
  textSize(14);
  text("6 = 0, 5 = 1, 4 = 2, 3 = 3, 2 = 4, 1 = 5", 25, 280, 350);
  textAlign(LEFT, BASELINE); // Reset alignment
  randomSeedButton.draw();
  inputSeedButton.draw();
  startButton.draw();

  if (gameState.inputtingSeed) {
    //The seedInput element is handled by p5.js and drawn automatically
    fill(255);
    textSize(16);
    text("Enter Seed (8 chars):", UI.seedInput.x, UI.seedInput.y - 30);
  }
}

function drawGameOverScreen() {
  textSize(48);
  fill(255);
  textAlign(CENTER, CENTER);
  text("Good Game!", 200, 200);

  textSize(24);
  text(`Score: ${gameState.score}`, 200, 300);
  text(`Seed: ${gameState.seed}`, 200, 340);
  textAlign(LEFT, BASELINE); // Reset alignment

  newGameButton.draw();
  restartButton.draw();

  // Fireworks display for score 0
  if (gameState.score === 0) {
    if (random(1) < 0.07) {
      fireworks.push(new Firework(random(width), height));
    }

    for (let i = fireworks.length - 1; i >= 0; i--) {
      fireworks[i].update();
      fireworks[i].show();
      if (fireworks[i].done()) {
        fireworks.splice(i, 1);
      }
    }
  }
}

function drawUI() {
  noStroke();
  fill(75);
  rect(20, 150, 360, 100, 10);
  textSize(15);
  fill(255);
  text(`Score: ${gameState.score}`, 30, 30);
  text(`Seed: ${gameState.seed}`, 250, 30);

  if (gameState.selectedDie) {
    text(CONFIG.abilities[gameState.selectedDie.col], 40, 165, 310, 120);
  }
}

function drawDice() {
  gameState.playPile.forEach((die) => die.display());
  gameState.scorePile.forEach((die, i) => {
    const rowIndex = Math.floor(i / CONFIG.scorePileRowLength);
    const col = i % CONFIG.scorePileRowLength;

    die.x = CONFIG.scorePileStart.x + col * CONFIG.scorePileDieOffset.x;
    die.y = CONFIG.scorePileStart.y + rowIndex * CONFIG.scorePileDieOffset.y;
    die.s = CONFIG.dieSizeScore;

    die.display();
  });
}

function updateAnimations() {
  for (let i = gameState.animations.length - 1; i >= 0; i--) {
    gameState.animations[i].update();
    gameState.animations[i].draw();
    if (gameState.animations[i].isFinished()) {
      gameState.animations.splice(i, 1);
    }
  }
}

// --- Input Handling ---
function touchHandler() {
  if (!gameState.gameStarted) {
    // Title screen input handling
    randomSeedButton.handleClick();
    inputSeedButton.handleClick();
    startButton.handleClick();
  } else {
    // Game screen input handling
    if (!gameState.gameOver) {
      rollButton.handleClick();
      pickButton.handleClick();
    } else {
      restartButton.handleClick();
      newGameButton.handleClick();
    }

    const clickedDie = getClickedDie(mouseX, mouseY);
    if (gameState.abilityInProgress) {
      handleAbilityClick(clickedDie);
    } else if (
      clickedDie &&
      gameState.playPile.includes(clickedDie) &&
      !clickedDie.locked
    ) {
      gameState.selectedDie = clickedDie;
    }
  }
  updateButtonStates();
}

function getClickedDie(x, y) {
  // Check score pile first if relevant ability is in progress
  if (
    gameState.abilityInProgress &&
    (gameState.abilityType === "black" || gameState.abilityType === "purple")
  ) {
    const scorePileDie = gameState.scorePile.find((die) => die.contains(x, y));
    if (scorePileDie) return scorePileDie;
  }
  // Always check play pile
  return gameState.playPile.find((die) => die.contains(x, y));
}

// --- Game Logic ---
function startGame(seedOption) {
  if (seedOption === "random") {
    gameState.seed = utils.generateSeed();
  } else {
    if (
      gameState.enteredSeed.length === 8 &&
      /^[A-Z0-9]+$/.test(gameState.enteredSeed)
    ) {
      gameState.seed = gameState.enteredSeed;
    } else {
      gameState.seed = utils.generateSeed();
      alert("Invalid seed. Using a random seed.");
    }
  }

  gameState.gameStarted = true;
  gameState.inputtingSeed = false;
  seedInput.hide();
  restartGame();
}

function newGame() {
  gameState.gameStarted = false; // Return to the title screen
  gameState.gameOver = false; // Ensure game over state is cleared
  gameState.score = 0; // Reset other game state variables as needed
  gameState.playPile = [];
  gameState.scorePile = [];
  resetPlayPileGrid();
  resetFireworks(); // Add this
  updateButtonStates();
}

function rollDice() {
  if (gameState.hasPicked) {
    const rollRng = utils.seededRNG(gameState.seed + gameState.rollCounter);
    gameState.rollCounter++;

    gameState.playPile.forEach((die) => {
      if (!gameState.lockedByBlue.includes(die)) {
        const newRollValue = utils.randomDieValue(rollRng);
        gameState.animations.push(
          new RollAnimation(die, die.value, newRollValue, rollRng)
        );
        die.value = newRollValue; // Immediately set the value.
        die.locked = false; // Unlock all dice after rolling
      }
    });
    //Clear out the returnedByPurple flag
    gameState.returnedByPurple.forEach((die) => {
      die.returnedByPurple = false;
    });
    gameState.returnedByPurple = []; // Clear returnedByPurple array after rolling
    unlockBlueDice(); // Unlock *all* blue dice
    gameState.hasPicked = false;
    updateButtonStates();
  }
}

// Unlock all dice locked by blue
function unlockBlueDice() {
  gameState.lockedByBlue.forEach((die) => (die.locked = false));
  gameState.lockedByBlue = [];
}

function pickDice() {
  if (
    gameState.selectedDie &&
    gameState.playPile.includes(gameState.selectedDie) &&
    !gameState.selectedDie.locked
  ) {
    gameState.pendingAbilities.push(gameState.selectedDie.col);
    startAbility(gameState.selectedDie);
  }
}

function startAbility(pickedDie) {
  moveDieToScorePile(pickedDie);

  const currentAbilityType = pickedDie.col;
  if (!canActivateAbility(currentAbilityType)) {
    console.log(`${currentAbilityType} ability fizzled: Not enough targets.`);
    gameState.pendingAbilities.shift(); // Remove the fizzled ability
    checkPendingAbilities(); // Check for other pending abilities
    return;
  }

  switch (currentAbilityType) {
    case "white":
    case "pink":
    case "yellow":
    case "blue":
    case "purple":
    case "black":
    case "orange":
      gameState.abilityInProgress = true;
      gameState.abilityType = currentAbilityType;
      gameState.abilityTargets = { target1: null, target2: null };
      break;
    case "red":
      pickedDie.redBonus = true; // Apply red bonus immediately
      gameState.pendingAbilities.shift(); // Remove "red" from the pending list
      checkPendingAbilities(); // Proceed to next ability or end turn
      return; // Red doesn't require further handling
    case "green":
      // Green is handled by moveDieToScorePile, which handles all green dice
      gameState.selectedDie = null; // Green already moved, so clear selection
      gameState.pendingAbilities.shift(); // Remove 'green'
      checkPendingAbilities(); // Check next
      return;
    default:
      gameState.abilityInProgress = false;
      gameState.pendingAbilities.shift();
      checkPendingAbilities(); // Check next
  }
  updateButtonStates();
}

function canActivateAbility(abilityType) {
  switch (abilityType) {
    case "white":
      return gameState.playPile.length >= 2;
    case "pink":
    case "yellow":
    case "blue":
    case "orange":
      return gameState.playPile.length >= 1;
    case "purple":
      return gameState.scorePile.some((die) => die.col !== "purple");
    case "black":
      return gameState.scorePile.length >= 1;
    default:
      return true; // Red, Green always activate
  }
}

function handleAbilityClick(clickedDie) {
  if (!clickedDie || !gameState.abilityInProgress) return;

  switch (gameState.abilityType) {
    case "white":
      handleWhiteAbility(clickedDie);
      break;
    case "pink":
      handlePinkAbility(clickedDie);
      break;
    case "yellow":
      handleYellowAbility(clickedDie);
      break;
    case "blue":
      handleBlueAbility(clickedDie);
      break;
    case "purple":
      handlePurpleAbility(clickedDie);
      break;
    case "black":
      handleBlackAbility(clickedDie);
      break;
    case "orange":
      handleOrangeAbility(clickedDie);
      break;
  }
}

function handleWhiteAbility(clickedDie) {
  if (!gameState.abilityTargets.target1) {
    if (gameState.playPile.includes(clickedDie)) {
      gameState.abilityTargets.target1 = clickedDie;
    }
  } else if (
    !gameState.abilityTargets.target2 &&
    clickedDie !== gameState.abilityTargets.target1
  ) {
    if (gameState.playPile.includes(clickedDie)) {
      gameState.abilityTargets.target2 = clickedDie;
      gameState.animations.push(
        new SwapAnimation(
          gameState.abilityTargets.target1,
          gameState.abilityTargets.target2
        )
      );

      const tempValue = gameState.abilityTargets.target1.value;
      gameState.abilityTargets.target1.value =
        gameState.abilityTargets.target2.value;
      gameState.abilityTargets.target2.value = tempValue;

      calculateScore();
      gameState.abilityInProgress = false;
      gameState.pendingAbilities.shift();
      gameState.abilityTargets = { target1: null, target2: null };
      checkPendingAbilities();
    }
  }
  updateButtonStates();
}

function handlePinkAbility(clickedDie) {
  if (gameState.playPile.includes(clickedDie)) {
    const colorToReroll = clickedDie.col;
    const pinkRng = utils.seededRNG(gameState.seed + gameState.rollCounter);
    gameState.rollCounter++;

    gameState.playPile
      .filter((die) => die.col === colorToReroll)
      .forEach((die) => {
        const newRollValue = utils.randomDieValue(pinkRng);
        gameState.animations.push(
          new RollAnimation(die, die.value, newRollValue, pinkRng)
        );
        die.value = newRollValue; //Immediately update
      });
    gameState.abilityInProgress = false;
    gameState.pendingAbilities.shift();
    checkPendingAbilities();
    updateButtonStates();
  }
}

function handleYellowAbility(clickedDie) {
  if (!gameState.abilityTargets.target1) {
    if (gameState.playPile.includes(clickedDie)) {
      gameState.abilityTargets.target1 = clickedDie;
      const startValue = clickedDie.value;
      const newValue = Math.min(startValue + 1, 6);
      gameState.animations.push(
        new ValueChangeAnimation(clickedDie, startValue, newValue)
      );
      clickedDie.value = newValue; // Update value immediately
      calculateScore();
      gameState.abilityInProgress = false;
      gameState.pendingAbilities.shift();
      gameState.abilityTargets.target1 = null;
      checkPendingAbilities();
    }
  }
  updateButtonStates();
}

function handleBlueAbility(clickedDie) {
  if (!gameState.abilityTargets.target1) {
    if (gameState.playPile.includes(clickedDie)) {
      gameState.abilityTargets.target1 = clickedDie;
      gameState.abilityTargets.target1.locked = true;
      gameState.lockedByBlue.push(gameState.abilityTargets.target1); // Add to the array
      gameState.abilityInProgress = false;
      gameState.pendingAbilities.shift();
      gameState.abilityTargets.target1 = null;
      checkPendingAbilities();
    }
  }
  updateButtonStates();
}

function handlePurpleAbility(clickedDie) {
  if (
    !gameState.abilityTargets.target1 &&
    clickedDie &&
    clickedDie.col !== "purple" &&
    gameState.scorePile.includes(clickedDie)
  ) {
    gameState.abilityTargets.target1 = clickedDie;
    // Remove from score pile immediately.
    gameState.scorePile.splice(gameState.scorePile.indexOf(clickedDie), 1);

    // Find an open position
    let position = findEmptyGridPosition();
    if (position) {
      const totalGridWidth =
        CONFIG.gridWidth * CONFIG.dieSizePlay +
        (CONFIG.gridWidth - 1) * CONFIG.dieSpacing;
      const startX = (width - totalGridWidth) / 2;
      const startY = 260;
      const targetX =
        startX + position.col * (CONFIG.dieSizePlay + CONFIG.dieSpacing);
      const targetY =
        startY + position.row * (CONFIG.dieSizePlay + CONFIG.dieSpacing);

      //Place back in playPile.
      clickedDie.x = targetX; // Place it directly
      clickedDie.y = targetY;
      clickedDie.s = CONFIG.dieSizePlay;
      gameState.playPile.push(clickedDie);
      gameState.playPileGrid[position.row][position.col] = true; // Mark the position as occupied.
      clickedDie.locked = true; // Lock after returning.
      clickedDie.returnedByPurple = true; // NEW: Set the flag
      gameState.returnedByPurple.push(clickedDie); //Keep track of returned dice
    }
    calculateScore();
    gameState.abilityInProgress = false;
    gameState.pendingAbilities.shift();
    gameState.abilityTargets.target1 = null;
    checkPendingAbilities();
  } else if (gameState.abilityTargets.target1) {
    // Already handled a valid target.
    gameState.abilityInProgress = false;
    gameState.pendingAbilities.shift();
    checkPendingAbilities();
  } else if (!gameState.scorePile.some((die) => die.col !== "purple")) {
    // No non-purple dice to return
    console.log("Purple ability fizzled: No non-purple dice in score pile.");
    gameState.abilityInProgress = false;
    gameState.pendingAbilities.shift(); // Remove the fizzled ability
    checkPendingAbilities();
  }
  updateButtonStates();
}

function handleBlackAbility(clickedDie) {
  if (!gameState.abilityTargets.target1) {
    if (gameState.scorePile.includes(clickedDie)) {
      gameState.abilityTargets.target1 = clickedDie;
      const startValue = clickedDie.value;
      const blackRng = utils.seededRNG(gameState.seed + gameState.rollCounter);
      gameState.rollCounter++;
      const newValue = utils.randomDieValue(blackRng);

      gameState.animations.push(
        new RollAnimation(clickedDie, startValue, newValue, blackRng)
      );
      clickedDie.value = newValue; // Set immediately
      calculateScore();
      gameState.abilityInProgress = false;
      gameState.pendingAbilities.shift();
      gameState.abilityTargets.target1 = null;
      checkPendingAbilities();
    }
  }
  updateButtonStates();
}

function handleOrangeAbility(clickedDie) {
  if (
    !gameState.abilityTargets.target1 &&
    gameState.playPile.includes(clickedDie)
  ) {
    gameState.abilityTargets.target1 = clickedDie;
    // Find an orange die in the score pile to copy the value from
    const orangeDie = gameState.scorePile.find((die) => die.col === "orange");
    if (orangeDie) {
      gameState.abilityTargets.target1.value = orangeDie.value;
    }
    calculateScore();
    gameState.abilityInProgress = false;
    gameState.pendingAbilities.shift(); // Remove 'orange'
    gameState.abilityTargets.target1 = null;
    checkPendingAbilities(); // Check the next pending ability
  }
  updateButtonStates();
}

function checkPendingAbilities() {
  if (gameState.pendingAbilities.length > 0) {
    gameState.abilityType = gameState.pendingAbilities[0];

    if (gameState.abilityType === "green") {
      // Special handling for green, as it might need re-triggering
      const greenDie = gameState.scorePile.find((die) => die.col === "green");
      if (greenDie) {
        startAbility(greenDie); // Re-trigger green ability logic
      } else {
        gameState.pendingAbilities.shift(); // No more greens, move on
        checkPendingAbilities(); // Recursively check
      }
    } else {
      // Find the *last* die of the pending ability type in score pile
      const nextDie = gameState.scorePile
        .slice()
        .reverse()
        .find((die) => die.col === gameState.abilityType);
      if (nextDie) {
        startAbility(nextDie); // Restart the ability for the next die
      } else {
        gameState.pendingAbilities.shift(); // No die of this type, move to next
        checkPendingAbilities(); // Recursively check next ability
      }
    }
  } else if (gameState.playPile.length === 0) {
    gameState.gameOver = true;
  }
  updateButtonStates();
}

function moveDieToScorePile(die) {
  if (gameState.lockedByBlue.includes(die)) {
    console.log("This die is locked by blue and cannot be moved yet!");
    return;
  }

  if (die.col === "green") {
    handleGreenAbility(); //Dedicated Green Ability function
  } else if (gameState.playPile.includes(die)) {
    // Regular die move
    const scorePileIndex = gameState.scorePile.length;
    // Remove from playPile *before* adding to scorePile
    gameState.playPile.splice(gameState.playPile.indexOf(die), 1);

    // Find and clear the die's position in the grid
    let gridPos = utils.getPlayPileGridPosition(die.x, die.y);

    if (
      gridPos.row >= 0 &&
      gridPos.row < CONFIG.gridWidth &&
      gridPos.col >= 0 &&
      gridPos.col < CONFIG.gridWidth
    ) {
      gameState.playPileGrid[gridPos.row][gridPos.col] = false; // Clear old position
    }

    gameState.animations.push(
      new MoveAnimation(
        die,
        die.x,
        die.y,
        scorePileIndex,
        false,
        CONFIG.dieSizeScore
      )
    );

    // Calculate score based on whether it's a red die or not.
    const dieScore =
      die.col === "red"
        ? CONFIG.redScoreMap[die.value]
        : CONFIG.scoreMap[die.value];
    gameState.animations.push(
      new ScoreAnimation(dieScore, die.x + die.s / 2, die.y + die.s / 2)
    );
    gameState.scorePile.push(die);
    calculateScore();
    gameState.hasPicked = true;
    gameState.selectedDie = null;
  }
  updateButtonStates();
}

function handleGreenAbility() {
  // Filter out locked green dice
  const unlockedGreenDice = gameState.playPile.filter(
    (greenDie) => greenDie.col === "green" && !greenDie.locked
  );

  unlockedGreenDice.forEach((greenDie) => {
    const scorePileIndex = gameState.scorePile.length;
    gameState.animations.push(
      new MoveAnimation(
        greenDie,
        greenDie.x,
        greenDie.y,
        scorePileIndex,
        false,
        CONFIG.dieSizeScore
      )
    );
    let greenDieScore = CONFIG.scoreMap[greenDie.value];

    gameState.animations.push(
      new ScoreAnimation(
        greenDieScore,
        greenDie.x + greenDie.s / 2,
        greenDie.y + greenDie.s / 2
      )
    );

    gameState.scorePile.push(greenDie);
    // Find and clear the die's position in the grid
    let gridPos = utils.getPlayPileGridPosition(greenDie.x, greenDie.y);
    if (
      gridPos.row >= 0 &&
      gridPos.row < CONFIG.gridWidth &&
      gridPos.col >= 0 &&
      gridPos.col < CONFIG.gridWidth
    ) {
      gameState.playPileGrid[gridPos.row][gridPos.col] = false; // Clear old position
    }
  });

  // Only remove the *unlocked* green dice from playPile
  gameState.playPile = gameState.playPile.filter(
    (die) => die.col !== "green" || die.locked
  );

  calculateScore();
  gameState.hasPicked = true;
  gameState.selectedDie = null;
}

function calculateScore() {
  gameState.score = gameState.scorePile.reduce((total, die) => {
    const dieScore =
      die.col === "red"
        ? CONFIG.redScoreMap[die.value]
        : CONFIG.scoreMap[die.value];
    return total + dieScore;
  }, 0);
}

function restartGame() {
  resetPlayPileGrid();
  Object.assign(gameState, {
    score: 0,
    playPile: [],
    scorePile: [],
    selectedDie: null,
    hasPicked: false,
    gameOver: false,
    gameStarted: true,
    abilityInProgress: false,
    abilityType: null,
    abilityTargets: { target1: null, target2: null },
    lockedByBlue: [],
    animations: [],
    returnedByPurple: [],
    pendingAbilities: [],
    rollCounter: 0, // Reset roll counter
  });
  resetFireworks(); // Add this to clear the fireworks.
  gameState.seededRandom = utils.seededRNG(gameState.seed); //Re-initialize
  initializeDice(gameState.seededRandom);
  updateButtonStates();
}

// --- Update Button States ---

function updateButtonStates() {
  rollButton.enabled =
    gameState.hasPicked &&
    !gameState.abilityInProgress &&
    gameState.gameStarted;
  pickButton.enabled =
    gameState.selectedDie !== null &&
    !gameState.abilityInProgress &&
    gameState.gameStarted;
  startButton.enabled = true;
  randomSeedButton.enabled = true;
  inputSeedButton.enabled = true;
  newGameButton.enabled = gameState.gameOver; // Enable only on Game Over
  restartButton.enabled = gameState.gameOver;
}

// --- Die and Animation Classes ---

class Die {
  constructor(x, y, s, value, col) {
    this.x = x;
    this.y = y;
    this.s = s;
    this.value = value;
    this.col = col;
    this.locked = false;
    this.redBonus = false; // For red die's doubled score
    this.returnedByPurple = false; // NEW: Track if returned by purple
  }

  display() {
    this.drawOutline(); // Draw outline *before* filling the die
    fill(this.col); // Remove the grey fill
    rect(this.x, this.y, this.s, this.s, 10);
    noStroke();
    fill(["white", "pink", "orange", "yellow"].includes(this.col) ? 0 : 255);
    this.drawPips();
  }

  drawOutline() {
    // Check for purple return *first*
    if (this.returnedByPurple) {
      strokeWeight(5);
      stroke("magenta");
    }
    // Then check for blue lock
    else if (gameState.lockedByBlue.includes(this)) {
      strokeWeight(5);
      stroke("cyan"); // Cyan outline for blue-locked
    }
    // Highlight selected die or targets of abilities, *but only if not already outlined*
    else if (
      gameState.selectedDie === this ||
      gameState.abilityTargets.target1 === this ||
      gameState.abilityTargets.target2 === this
    ) {
      strokeWeight(5);
      stroke("brown");
    } else {
      strokeWeight(0); // No outline if none of the above
    }
  }

  drawPips() {
    const pipSize = this.s / 5;
    const offset = this.s / 4;
    const center = this.s / 2;
    const pipColor = ["white", "pink", "orange", "yellow"].includes(this.col)
      ? 0
      : 255;
    fill(pipColor);

    const positions = {
      1: [[center, center]],
      2: [
        [offset, offset],
        [this.s - offset, this.s - offset],
      ],
      3: [
        [offset, offset],
        [center, center],
        [this.s - offset, this.s - offset],
      ],
      4: [
        [offset, offset],
        [this.s - offset, offset],
        [offset, this.s - offset],
        [this.s - offset, this.s - offset],
      ],
      5: [
        [offset, offset],
        [this.s - offset, offset],
        [center, center],
        [offset, this.s - offset],
        [this.s - offset, this.s - offset],
      ],
      6: [
        [offset, offset],
        [this.s - offset, offset],
        [offset, center],
        [this.s - offset, center],
        [offset, this.s - offset],
        [this.s - offset, this.s - offset],
      ],
    };

    for (const pos of positions[this.value]) {
      ellipse(this.x + pos[0], this.y + pos[1], pipSize, pipSize);
    }
  }
  contains(mx, my) {
    return (
      mx > this.x && mx < this.x + this.s && my > this.y && my < this.y + this.s
    );
  }
}

class Animation {
  constructor() {
    this.finished = false;
  }
  isFinished() {
    return this.finished;
  }
  update() {}
  draw() {}
}

class MoveAnimation extends Animation {
  constructor(die, startX, startY, targetIndex, isReturning, targetDieSize) {
    super();
    this.die = die;
    this.startX = startX;
    this.startY = startY;
    this.isReturning = isReturning;
    this.targetDieSize = targetDieSize;
    const rowWidth =
      CONFIG.gridWidth * CONFIG.dieSizePlay +
      (CONFIG.gridWidth - 1) * CONFIG.dieSpacing;
    const startXPlay = (width - rowWidth) / 2;
    const startYPlay = 260;

    if (isReturning) {
      this.endX =
        startXPlay +
        (targetIndex % CONFIG.gridWidth) *
          (CONFIG.dieSizePlay + CONFIG.dieSpacing);
      this.endY =
        startYPlay +
        Math.floor(targetIndex / CONFIG.gridWidth) *
          (CONFIG.dieSizePlay + CONFIG.dieSpacing);
    } else {
      const rowIndex = Math.floor(targetIndex / CONFIG.scorePileRowLength);
      const col = targetIndex % CONFIG.scorePileRowLength;
      this.endX = CONFIG.scorePileStart.x + col * CONFIG.scorePileDieOffset.x;
      this.endY =
        CONFIG.scorePileStart.y + rowIndex * CONFIG.scorePileDieOffset.y;
    }
    this.speed = 5;
  }

  update() {
    const dx = this.endX - this.die.x;
    const dy = this.endY - this.die.y;

    if (Math.abs(dx) < this.speed && Math.abs(dy) < this.speed) {
      this.die.x = this.endX;
      this.die.y = this.endY;
      this.finished = true;
      this.die.s = this.targetDieSize; // Set size after move
    } else {
      this.die.x += Math.sign(dx) * Math.min(Math.abs(dx), this.speed);
      this.die.y += Math.sign(dy) * Math.min(Math.abs(dy), this.speed);
    }
  }
}

class RollAnimation extends Animation {
  constructor(die, startValue, endValue, rng) {
    super();
    this.die = die;
    this.startValue = startValue;
    this.endValue = endValue;
    this.rng = rng;
    this.duration = 10; //  shorter duration
    this.timer = 0;
    this.tempValues = [];
    //Pre-generate the scramble values.
    for (let i = 0; i < this.duration; i++) {
      this.tempValues.push(utils.randomDieValue(this.rng));
    }
  }

  update() {
    if (this.timer < this.duration) {
      this.die.value = this.tempValues[this.timer];
      this.timer++;
    } else {
      this.die.value = this.endValue;
      this.finished = true;
    }
  }

  draw() {
    if (this.timer < this.duration) {
      noFill();
      stroke("grey"); //Visual cue
      rect(this.die.x, this.die.y, this.die.s, this.die.s, 10);
    }
  }
}

class SwapAnimation extends Animation {
  constructor(die1, die2) {
    super();
    this.die1 = die1;
    this.die2 = die2;
    this.duration = 30;
    this.timer = 0;
  }

  update() {
    if (++this.timer >= this.duration) {
      this.finished = true;
    }
  }

  draw() {
    stroke("yellow");
    strokeWeight(5);
    noFill();
    rect(this.die1.x, this.die1.y, this.die1.s, this.die1.s, 10);
    rect(this.die2.x, this.die2.y, this.die2.s, this.die2.s, 10);
  }
}

class ValueChangeAnimation extends Animation {
  constructor(die, startValue, endValue) {
    super();
    this.die = die;
    this.startValue = startValue;
    this.endValue = endValue;
    this.duration = 30; // Animation frames
    this.timer = 0;
  }

  update() {
    if (++this.timer >= this.duration) {
      this.finished = true;
    }
  }

  draw() {
    stroke("lime"); // Visual cue for value change
    strokeWeight(5);
    noFill();
    rect(this.die.x, this.die.y, this.die.s, this.die.s, 10);
  }
}

class ScoreAnimation extends Animation {
  constructor(value, x, y, color) {
    super();
    this.value = value;
    this.x = x;
    this.y = y;
    this.opacity = 255;
    this.lifespan = 80;
    this.fontSize = 20; // Initial font size
    this.color = color; // Store the die color
  }

  update() {
    this.y -= 1;
    this.opacity -= 255 / this.lifespan;
    this.fontSize += 0.5; // Increase font size
    this.finished = this.opacity <= 0;
  }

  draw() {
    textSize(this.fontSize);
    fill(255, this.opacity);
    text(`+${this.value}`, this.x - this.fontSize * 0.6, this.y);
  }
}

//---Fireworks---
class Firework {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.firework = new Particle(this.x, this.y, true);
    this.exploded = false;
    this.particles = [];
  }

  update() {
    if (!this.exploded) {
      this.firework.applyForce(createVector(0, 0.2));
      this.firework.update();

      if (this.firework.vel.y >= 0) {
        this.exploded = true;
        this.explode();
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].applyForce(createVector(0, 0.2));
      this.particles[i].update();
      if (this.particles[i].done()) {
        this.particles.splice(i, 1);
      }
    }
  }
  explode() {
    for (let i = 0; i < 100; i++) {
      const p = new Particle(this.firework.pos.x, this.firework.pos.y, false);
      this.particles.push(p);
    }
  }

  done() {
    return this.exploded && this.particles.length === 0;
  }

  show() {
    if (!this.exploded) {
      this.firework.show();
    }

    for (let particle of this.particles) {
      particle.show();
    }
  }
}
class Particle {
  constructor(x, y, firework) {
    this.pos = createVector(x, y);
    this.firework = firework;
    this.lifespan = 255;
    if (this.firework) {
      this.vel = createVector(0, random(-12, -8));
    } else {
      this.vel = p5.Vector.random2D();
      this.vel.mult(random(2, 10));
    }
    this.acc = createVector(0, 0);
  }

  applyForce(force) {
    this.acc.add(force);
  }
  update() {
    if (!this.firework) {
      this.vel.mult(0.9);
      this.lifespan -= 4;
    }
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.acc.mult(0); // Reset acceleration
  }

  done() {
    return this.lifespan < 0;
  }

  show() {
    if (!this.firework) {
      strokeWeight(2);
      stroke(255, this.lifespan);
    } else {
      strokeWeight(4);
      stroke(255);
    }
    point(this.pos.x, this.pos.y);
  }
}

let fireworks = [];

function resetFireworks() {
  fireworks = [];
}
