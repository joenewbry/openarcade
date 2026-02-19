import { Game } from '../engine/core.js';

export function createGame() {
  const canvas = document.getElementById('game');
  const W = 600, H = 500;
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');

  // ===== QUESTIONS (60, same as index.html) =====
  const questions = [
    // SCIENCE (8)
    { q: "What planet is known as the Red Planet?", a: ["Mars", "Venus", "Jupiter", "Saturn"], c: 0, cat: "Science" },
    { q: "What is the chemical symbol for gold?", a: ["Au", "Ag", "Fe", "Cu"], c: 0, cat: "Science" },
    { q: "How many bones are in the adult human body?", a: ["206", "186", "226", "196"], c: 0, cat: "Science" },
    { q: "What gas do plants absorb from the atmosphere?", a: ["Carbon dioxide", "Oxygen", "Nitrogen", "Hydrogen"], c: 0, cat: "Science" },
    { q: "What is the speed of light in km/s (approx)?", a: ["300,000", "150,000", "500,000", "1,000,000"], c: 0, cat: "Science" },
    { q: "What is the hardest natural substance on Earth?", a: ["Diamond", "Quartz", "Topaz", "Sapphire"], c: 0, cat: "Science" },
    { q: "What organ in the body produces insulin?", a: ["Pancreas", "Liver", "Kidney", "Stomach"], c: 0, cat: "Science" },
    { q: "What is the most abundant gas in Earth's atmosphere?", a: ["Nitrogen", "Oxygen", "Carbon dioxide", "Argon"], c: 0, cat: "Science" },
    // HISTORY (8)
    { q: "In what year did World War II end?", a: ["1945", "1944", "1946", "1943"], c: 0, cat: "History" },
    { q: "Who was the first President of the United States?", a: ["George Washington", "John Adams", "Thomas Jefferson", "Ben Franklin"], c: 0, cat: "History" },
    { q: "The Great Wall was primarily built against whom?", a: ["Mongol invaders", "Japanese", "Koreans", "Russians"], c: 0, cat: "History" },
    { q: "What ancient wonder was in Alexandria, Egypt?", a: ["The Lighthouse", "The Colossus", "Hanging Gardens", "Temple of Artemis"], c: 0, cat: "History" },
    { q: "Which empire was ruled by Genghis Khan?", a: ["Mongol Empire", "Ottoman Empire", "Roman Empire", "Persian Empire"], c: 0, cat: "History" },
    { q: "In what year did the Titanic sink?", a: ["1912", "1905", "1918", "1920"], c: 0, cat: "History" },
    { q: "Who painted the Mona Lisa?", a: ["Leonardo da Vinci", "Michelangelo", "Raphael", "Donatello"], c: 0, cat: "History" },
    { q: "What year did the Berlin Wall fall?", a: ["1989", "1991", "1985", "1990"], c: 0, cat: "History" },
    // GEOGRAPHY (8)
    { q: "What is the largest continent by area?", a: ["Asia", "Africa", "North America", "Europe"], c: 0, cat: "Geography" },
    { q: "What is the longest river in the world?", a: ["Nile", "Amazon", "Mississippi", "Yangtze"], c: 0, cat: "Geography" },
    { q: "Which country has the most time zones?", a: ["France", "Russia", "USA", "China"], c: 0, cat: "Geography" },
    { q: "What is the capital of Australia?", a: ["Canberra", "Sydney", "Melbourne", "Brisbane"], c: 0, cat: "Geography" },
    { q: "What is the smallest country in the world?", a: ["Vatican City", "Monaco", "San Marino", "Liechtenstein"], c: 0, cat: "Geography" },
    { q: "Which desert is the largest hot desert?", a: ["Sahara", "Gobi", "Kalahari", "Arabian"], c: 0, cat: "Geography" },
    { q: "What ocean is the deepest?", a: ["Pacific", "Atlantic", "Indian", "Arctic"], c: 0, cat: "Geography" },
    { q: "Mount Everest is on the border of which two countries?", a: ["Nepal & China", "India & China", "Nepal & India", "Pakistan & China"], c: 0, cat: "Geography" },
    // POP CULTURE (7)
    { q: "What band performed 'Bohemian Rhapsody'?", a: ["Queen", "The Beatles", "Led Zeppelin", "Pink Floyd"], c: 0, cat: "Pop Culture" },
    { q: "What is the highest-grossing film of all time?", a: ["Avatar", "Avengers: Endgame", "Titanic", "Star Wars"], c: 0, cat: "Pop Culture" },
    { q: "Who wrote the Harry Potter series?", a: ["J.K. Rowling", "J.R.R. Tolkien", "Stephen King", "Roald Dahl"], c: 0, cat: "Pop Culture" },
    { q: "What year was the first iPhone released?", a: ["2007", "2005", "2008", "2010"], c: 0, cat: "Pop Culture" },
    { q: "What TV show featured Walter White?", a: ["Breaking Bad", "The Wire", "Lost", "Dexter"], c: 0, cat: "Pop Culture" },
    { q: "Which superhero is also known as Diana Prince?", a: ["Wonder Woman", "Black Widow", "Supergirl", "Batgirl"], c: 0, cat: "Pop Culture" },
    { q: "Who directed Jurassic Park?", a: ["Steven Spielberg", "James Cameron", "George Lucas", "Ridley Scott"], c: 0, cat: "Pop Culture" },
    // SPORTS (7)
    { q: "How many players per side on a soccer field?", a: ["11", "10", "12", "9"], c: 0, cat: "Sports" },
    { q: "What sport is played at Wimbledon?", a: ["Tennis", "Cricket", "Golf", "Polo"], c: 0, cat: "Sports" },
    { q: "How many rings are on the Olympic flag?", a: ["5", "4", "6", "7"], c: 0, cat: "Sports" },
    { q: "What country invented the sport of cricket?", a: ["England", "India", "Australia", "South Africa"], c: 0, cat: "Sports" },
    { q: "In basketball, how many points is a free throw?", a: ["1", "2", "3", "Half a point"], c: 0, cat: "Sports" },
    { q: "What is the marathon distance in miles (approx)?", a: ["26.2", "24.0", "28.5", "30.0"], c: 0, cat: "Sports" },
    { q: "Which country has won the most FIFA World Cups?", a: ["Brazil", "Germany", "Italy", "Argentina"], c: 0, cat: "Sports" },
    // MATH (7)
    { q: "What is Pi to two decimal places?", a: ["3.14", "3.16", "3.12", "3.18"], c: 0, cat: "Math" },
    { q: "What is the square root of 144?", a: ["12", "14", "11", "13"], c: 0, cat: "Math" },
    { q: "How many sides does a hexagon have?", a: ["6", "5", "7", "8"], c: 0, cat: "Math" },
    { q: "What is 17 multiplied by 13?", a: ["221", "231", "211", "219"], c: 0, cat: "Math" },
    { q: "What is a triangle with all equal sides called?", a: ["Equilateral", "Isosceles", "Scalene", "Right"], c: 0, cat: "Math" },
    { q: "What is 2 to the power of 10?", a: ["1024", "1000", "512", "2048"], c: 0, cat: "Math" },
    { q: "How many degrees are in a circle?", a: ["360", "180", "270", "400"], c: 0, cat: "Math" },
    // NATURE (7)
    { q: "What is the largest mammal on Earth?", a: ["Blue whale", "Elephant", "Giraffe", "Hippopotamus"], c: 0, cat: "Nature" },
    { q: "How many hearts does an octopus have?", a: ["3", "2", "1", "4"], c: 0, cat: "Nature" },
    { q: "What is the fastest land animal?", a: ["Cheetah", "Lion", "Gazelle", "Horse"], c: 0, cat: "Nature" },
    { q: "What type of animal is a Komodo dragon?", a: ["Lizard", "Snake", "Crocodile", "Turtle"], c: 0, cat: "Nature" },
    { q: "What is the tallest type of grass?", a: ["Bamboo", "Sugarcane", "Wheat", "Corn"], c: 0, cat: "Nature" },
    { q: "What animal has the longest known lifespan?", a: ["Greenland shark", "Giant tortoise", "Elephant", "Bowhead whale"], c: 0, cat: "Nature" },
    { q: "Which bird can fly backwards?", a: ["Hummingbird", "Kingfisher", "Sparrow", "Swift"], c: 0, cat: "Nature" },
    // TECHNOLOGY (8)
    { q: "What does 'HTTP' stand for?", a: ["HyperText Transfer Protocol", "High Tech Transfer Process", "HyperText Transmission Program", "High Transfer Text Protocol"], c: 0, cat: "Technology" },
    { q: "Who co-founded Apple with Steve Jobs?", a: ["Steve Wozniak", "Bill Gates", "Tim Cook", "Larry Page"], c: 0, cat: "Technology" },
    { q: "What programming language is named after coffee?", a: ["Java", "Python", "Ruby", "Rust"], c: 0, cat: "Technology" },
    { q: "In what decade was the internet invented?", a: ["1960s", "1970s", "1980s", "1990s"], c: 0, cat: "Technology" },
    { q: "What does 'CPU' stand for?", a: ["Central Processing Unit", "Computer Personal Unit", "Central Program Utility", "Core Processing Unit"], c: 0, cat: "Technology" },
    { q: "What company created Android?", a: ["Google", "Apple", "Microsoft", "Samsung"], c: 0, cat: "Technology" },
    { q: "How many bits are in a byte?", a: ["8", "4", "16", "32"], c: 0, cat: "Technology" },
    { q: "What does 'RAM' stand for?", a: ["Random Access Memory", "Read Access Memory", "Rapid Action Memory", "Run Application Memory"], c: 0, cat: "Technology" },
  ];

  // ===== AI CONFIG =====
  const aiNames = ["NEXUS", "CIPHER", "BLAZE", "ECHO", "NOVA", "PHANTOM", "VORTEX"];
  const aiAccuracies = [0.90, 0.80, 0.72, 0.65, 0.55, 0.45, 0.40];
  const aiColors = ["#4af", "#f90", "#0f0", "#ff0", "#f44", "#a0f", "#0ff"];

  // ===== STATE =====
  let score = 0;
  let bestScore = parseInt(localStorage.getItem('triviaRoyaleBest') || '0');
  let players = [];
  let currentRound = 0;
  const totalRounds = 25;
  let currentQuestion = null;
  let questionPool = [];
  let timerMax = 15;
  let timerStart = 0;
  let phase = 'idle'; // idle | question | reveal | gameOver
  let playerAnswer = -1;
  let aiAnswers = [];
  let revealTime = 0;
  let eliminatedThisRound = [];
  let hoverChoice = -1;
  let particles = [];
  let shakeAmount = 0;
  let flashAlpha = 0;
  let flashColor = '#ffffff';
  let pendingReveal = false;
  let nextRoundTimeout = null;

  const CHOICE_X = 50, CHOICE_W = 500, CHOICE_H = 36;
  const CHOICE_Y0 = 262, CHOICE_GAP = 44;
  const choiceBoxes = [];
  for (let i = 0; i < 4; i++) {
    choiceBoxes.push({ x: CHOICE_X, y: CHOICE_Y0 + i * CHOICE_GAP, w: CHOICE_W, h: CHOICE_H });
  }

  const catColors = {
    "Science": "#4af", "History": "#f90", "Geography": "#0f0", "Pop Culture": "#f0a",
    "Sports": "#ff0", "Math": "#a0f", "Nature": "#0d8", "Technology": "#0ff"
  };

  // ===== HELPERS =====

  // Convert a shorthand color string to 6-digit hex components {r, g, b}
  function colorToRGB(col) {
    const hex = col.replace('#', '');
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0], 16) * 17,
        g: parseInt(hex[1], 16) * 17,
        b: parseInt(hex[2], 16) * 17,
      };
    }
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
    };
  }

  // Build an #rrggbbaa string from a base color string + alpha (0-1)
  function withAlpha(col, alpha) {
    const { r, g, b } = colorToRGB(col);
    const a = Math.max(0, Math.min(255, Math.floor(alpha * 255))).toString(16).padStart(2, '0');
    return '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0') + a;
  }

  // Approximate word wrap (Courier New ~0.6 * fontSize per char)
  function wrapText(str, maxW, fontSize) {
    const words = str.split(' ');
    const lines = [];
    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      if (test.length * fontSize * 0.6 > maxW) {
        if (cur) lines.push(cur);
        cur = w;
      } else {
        cur = test;
      }
    }
    if (cur) lines.push(cur);
    return lines;
  }

  // ===== PARTICLES =====
  function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 4;
      particles.push({
        x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        life: 1, decay: 0.01 + Math.random() * 0.03, color, size: 2 + Math.random() * 4,
      });
    }
  }

  function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.life -= p.decay;
      if (p.life <= 0) particles.splice(i, 1);
    }
  }

  function drawParticles(renderer) {
    for (const p of particles) {
      renderer.setGlow(p.color, 0.5);
      renderer.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size, withAlpha(p.color, p.life));
    }
    renderer.setGlow(null);
  }

  // ===== AVATARS =====
  const avatarShapes = ['circle', 'diamond', 'square', 'triangle', 'star', 'cross', 'hex', 'shield'];

  function drawAvatar(renderer, x, y, player, idx, size) {
    const s = size, hs = s / 2;
    const shape = avatarShapes[idx % avatarShapes.length];
    const alpha = player.eliminated ? 0.25 : 1;
    const col = withAlpha(player.color, alpha);

    if (!player.eliminated) renderer.setGlow(player.color, 0.6);

    switch (shape) {
      case 'circle':
        renderer.fillCircle(x, y, hs, col);
        break;
      case 'diamond':
        renderer.fillPoly([
          { x: x,      y: y - hs },
          { x: x + hs, y: y      },
          { x: x,      y: y + hs },
          { x: x - hs, y: y      },
        ], col);
        break;
      case 'square':
        renderer.fillRect(x - hs, y - hs, s, s, col);
        break;
      case 'triangle':
        renderer.fillPoly([
          { x: x,      y: y - hs },
          { x: x + hs, y: y + hs },
          { x: x - hs, y: y + hs },
        ], col);
        break;
      case 'star': {
        const pts = [];
        for (let i = 0; i < 10; i++) {
          const r = i % 2 === 0 ? hs : hs * 0.45;
          const a = (Math.PI * i) / 5 - Math.PI / 2;
          pts.push({ x: x + Math.cos(a) * r, y: y + Math.sin(a) * r });
        }
        renderer.fillPoly(pts, col);
        break;
      }
      case 'cross': {
        const t = s / 4;
        renderer.fillRect(x - t, y - hs, t * 2, s, col);
        renderer.fillRect(x - hs, y - t, s, t * 2, col);
        break;
      }
      case 'hex': {
        const pts = [];
        for (let i = 0; i < 6; i++) {
          const a = Math.PI / 3 * i - Math.PI / 6;
          pts.push({ x: x + Math.cos(a) * hs, y: y + Math.sin(a) * hs });
        }
        renderer.fillPoly(pts, col);
        break;
      }
      case 'shield':
        renderer.fillPoly([
          { x: x - hs, y: y - s / 3 },
          { x: x + hs, y: y - s / 3 },
          { x: x + hs, y: y + s / 6 },
          { x: x,      y: y + hs    },
          { x: x - hs, y: y + s / 6 },
        ], col);
        break;
    }

    renderer.setGlow(null);
  }

  // ===== PLAYER SLOT POSITIONS =====
  function slotX(i) {
    const col = i < 4 ? i : (i - 4);
    return 22 + col * 148;
  }
  function slotY(i) { return i < 4 ? 4 : H - 40; }

  function drawPlayerSlots(renderer, text) {
    for (let i = 0; i < players.length; i++) {
      const p = players[i];
      const sx = slotX(i), sy = slotY(i);

      // Avatar
      drawAvatar(renderer, sx + 12, sy + 14, p, i, 18);

      // Name
      const nameCol = p.eliminated ? '#444444' : p.color;
      if (!p.eliminated) renderer.setGlow(p.color, 0.4);
      text.drawText(p.isHuman ? 'YOU' : p.name, sx + 26, sy + 4, 10, nameCol, 'left');
      renderer.setGlow(null);

      // Hearts
      for (let h = 0; h < 3; h++) {
        text.drawText('\u2665', sx + 26 + h * 12, sy + 16, 10, h < p.lives ? '#f44444' : '#2a2a2a', 'left');
      }

      // Mini score
      text.drawText(p.score + 'pt', sx + 65, sy + 16, 9, p.eliminated ? '#333333' : '#777777', 'left');

      // Elimination cross
      if (p.eliminated) {
        renderer.drawLine(sx + 2,  sy + 3,  sx + 22, sy + 25, '#ff000088', 2.5);
        renderer.drawLine(sx + 22, sy + 3,  sx + 2,  sy + 25, '#ff000088', 2.5);
      }

      // Answer indicator during reveal
      if (phase === 'reveal') {
        const ans = p.isHuman ? playerAnswer : (aiAnswers[i - 1] ? aiAnswers[i - 1].choice : -1);
        if (!p.eliminated || eliminatedThisRound.includes(p)) {
          if (ans >= 0) {
            const correct = ans === currentQuestion.c;
            const icol = correct ? '#00ff00' : '#ff0000';
            renderer.setGlow(icol, 0.7);
            text.drawText(correct ? '\u2713' : '\u2717', sx + 1, sy + 8, 13, icol, 'left');
            renderer.setGlow(null);
          } else {
            // Timeout
            text.drawText('T', sx + 1, sy + 8, 11, '#ff0000', 'left');
          }
        }
      }
    }
  }

  // ===== GAME LOGIC =====
  function initGame() {
    score = 0;
    if (scoreEl) scoreEl.textContent = '0';
    currentRound = 0;
    playerAnswer = -1;
    phase = 'idle';
    particles = [];
    eliminatedThisRound = [];
    if (nextRoundTimeout) { clearTimeout(nextRoundTimeout); nextRoundTimeout = null; }

    questionPool = [...questions];
    for (let i = questionPool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [questionPool[i], questionPool[j]] = [questionPool[j], questionPool[i]];
    }

    players = [{
      name: "YOU", lives: 3, score: 0, isHuman: true, color: "#f0a",
      accuracy: 1, eliminated: false, eliminatedRound: -1, answerTime: 0,
    }];
    for (let i = 0; i < 7; i++) {
      players.push({
        name: aiNames[i], lives: 3, score: 0, isHuman: false, color: aiColors[i],
        accuracy: aiAccuracies[i], eliminated: false, eliminatedRound: -1, answerTime: 0,
      });
    }

    startRound();
  }

  function countAlive() { return players.filter(p => !p.eliminated).length; }

  function startRound() {
    if (currentRound >= totalRounds || countAlive() <= 1) { endGame(); return; }

    currentQuestion = questionPool[currentRound % questionPool.length];
    playerAnswer = -1;
    aiAnswers = [];
    eliminatedThisRound = [];
    timerStart = Date.now();
    phase = 'question';
    pendingReveal = false;
    currentRound++;

    for (let i = 0; i < 7; i++) {
      const p = players[i + 1];
      if (p.eliminated) { aiAnswers.push({ choice: -1, time: 0 }); continue; }
      const correct = Math.random() < p.accuracy;
      let choice;
      if (correct) {
        choice = currentQuestion.c;
      } else {
        const wrongs = [0, 1, 2, 3].filter(x => x !== currentQuestion.c);
        choice = wrongs[Math.floor(Math.random() * wrongs.length)];
      }
      const t = 2 + (1 - p.accuracy) * 8 + Math.random() * 3;
      aiAnswers.push({ choice, time: Math.min(t, timerMax - 0.5) });
    }
  }

  function submitAnswer(choice) {
    if (phase !== 'question' || playerAnswer !== -1 || players[0].eliminated) return;
    playerAnswer = choice;
    players[0].answerTime = (Date.now() - timerStart) / 1000;
  }

  function revealAnswers() {
    if (phase !== 'question') return;
    phase = 'reveal';
    revealTime = Date.now();

    const correctIdx = currentQuestion.c;

    if (!players[0].eliminated) {
      if (playerAnswer === correctIdx) {
        const timeBonus = Math.max(0, Math.floor((timerMax - players[0].answerTime) * 10));
        players[0].score += 100 + timeBonus;
        score = players[0].score;
        if (scoreEl) scoreEl.textContent = score;
        spawnParticles(300, 230, '#0f0', 25);
        flashAlpha = 0.15; flashColor = '#00ff00';
      } else {
        players[0].lives--;
        shakeAmount = 12;
        flashAlpha = 0.35; flashColor = '#ff0000';
        if (players[0].lives <= 0) {
          players[0].eliminated = true;
          players[0].eliminatedRound = currentRound;
          eliminatedThisRound.push(players[0]);
          spawnParticles(slotX(0) + 12, slotY(0) + 14, '#f00', 40);
        }
      }
    }

    for (let i = 0; i < 7; i++) {
      const p = players[i + 1];
      if (p.eliminated) continue;
      const ai = aiAnswers[i];
      if (ai.choice === correctIdx) {
        const timeBonus = Math.max(0, Math.floor((timerMax - ai.time) * 10));
        p.score += 100 + timeBonus;
      } else {
        p.lives--;
        if (p.lives <= 0) {
          p.eliminated = true;
          p.eliminatedRound = currentRound;
          eliminatedThisRound.push(p);
          spawnParticles(slotX(i + 1) + 12, slotY(i + 1) + 14, '#f00', 30);
        }
      }
    }

    const alive = countAlive();
    const delay = eliminatedThisRound.length > 0 ? 3000 : 2200;
    if (alive <= 1 || currentRound >= totalRounds) {
      nextRoundTimeout = setTimeout(() => endGame(), delay);
    } else {
      nextRoundTimeout = setTimeout(() => startRound(), delay);
    }
  }

  function endGame() {
    phase = 'gameOver';

    for (const p of players) {
      if (!p.eliminated) p.score += 500;
    }
    score = players[0].score;
    if (scoreEl) scoreEl.textContent = score;

    if (score > bestScore) {
      bestScore = score;
      if (bestEl) bestEl.textContent = bestScore;
      localStorage.setItem('triviaRoyaleBest', String(bestScore));
    }

    const alive = players.filter(p => !p.eliminated);
    let winner;
    if (alive.length === 1) winner = alive[0];
    else if (alive.length > 1) winner = alive.sort((a, b) => b.score - a.score)[0];
    else winner = [...players].sort((a, b) => b.eliminatedRound - a.eliminatedRound)[0];

    game.setState('over');
    if (winner.isHuman) {
      game.showOverlay('VICTORY ROYALE!', 'You won with ' + score + ' points! Click to play again.');
      spawnParticles(W / 2, H / 2, '#f0a', 60);
      spawnParticles(W / 2, H / 2, '#ff0', 40);
    } else {
      game.showOverlay('ELIMINATED', winner.name + ' wins! Your score: ' + score + '. Click to play again.');
    }
  }

  // ===== DRAW FUNCTIONS =====

  function drawTimerBar(renderer, text) {
    const elapsed = (Date.now() - timerStart) / 1000;
    const timer = Math.max(0, timerMax - elapsed);
    const pct = timer / timerMax;

    const barX = 50, barY = 50, barW = 480, barH = 8;
    renderer.fillRect(barX, barY, barW, barH, '#181830');

    const col = pct > 0.5 ? '#00ff00' : pct > 0.25 ? '#ffff00' : '#ff0000';
    renderer.setGlow(col, pct < 0.25 ? 0.9 : 0.4);
    renderer.fillRect(barX, barY, barW * pct, barH, col);
    renderer.setGlow(null);

    // Pulsing urgency overlay when timer is critical
    if (pct < 0.25 && phase === 'question') {
      const pulse = 0.08 + 0.06 * Math.sin(Date.now() / 100);
      renderer.fillRect(0, 0, W, H, withAlpha('#ff0000', pulse));
    }

    text.drawText(Math.ceil(timer) + 's', barX + barW + 48, barY - 2, 13, col, 'left');
  }

  function drawQuestionText(renderer, text) {
    if (!currentQuestion) return;
    const catCol = catColors[currentQuestion.cat] || '#f0a';

    renderer.setGlow(catCol, 0.6);
    text.drawText(
      '[ ' + currentQuestion.cat.toUpperCase() + ' ]   Round ' + currentRound + '/' + totalRounds,
      W / 2, 68, 11, catCol, 'center'
    );
    renderer.setGlow(null);

    const lines = wrapText(currentQuestion.q, W - 120, 16);
    for (let i = 0; i < lines.length; i++) {
      text.drawText(lines[i], W / 2, 98 + i * 22, 16, '#ffffff', 'center');
    }

    const alive = countAlive();
    text.drawText(
      alive + ' player' + (alive !== 1 ? 's' : '') + ' remaining',
      W / 2, 98 + lines.length * 22 + 16, 11, '#666666', 'center'
    );
  }

  function drawChoices(renderer, text) {
    if (!currentQuestion) return;
    const correctIdx = currentQuestion.c;
    const labels = ['A', 'B', 'C', 'D'];

    for (let i = 0; i < 4; i++) {
      const box = choiceBoxes[i];
      let bg, border, txt;

      if (phase === 'reveal') {
        if (i === correctIdx) {
          bg = '#0a3a0a'; border = '#00ff00'; txt = '#00ff00';
        } else if (i === playerAnswer && i !== correctIdx) {
          bg = '#3a0a0a'; border = '#ff0000'; txt = '#ff4444';
        } else {
          bg = '#141425'; border = '#282840'; txt = '#444444';
        }
      } else if (phase === 'question') {
        if (i === playerAnswer) {
          bg = '#2a1a3a'; border = '#ff00aa'; txt = '#ff00aa';
        } else if (i === hoverChoice && playerAnswer === -1) {
          bg = '#222244'; border = '#888888'; txt = '#ffffff';
        } else {
          bg = '#1c1c38'; border = '#3a3a5a'; txt = '#dddddd';
        }
      } else {
        bg = '#1c1c38'; border = '#3a3a5a'; txt = '#dddddd';
      }

      const glow =
        (phase === 'reveal' && (i === correctIdx || (i === playerAnswer && i !== correctIdx))) ||
        (phase === 'question' && i === playerAnswer);
      if (glow) renderer.setGlow(border, 0.8);
      renderer.fillRect(box.x, box.y, box.w, box.h, bg);
      if (glow) renderer.setGlow(null);

      // Border outline via strokePoly
      renderer.strokePoly([
        { x: box.x,           y: box.y           },
        { x: box.x + box.w,   y: box.y           },
        { x: box.x + box.w,   y: box.y + box.h   },
        { x: box.x,           y: box.y + box.h   },
      ], border, 2, true);

      // Label badge (filled rect + text)
      renderer.fillRect(box.x, box.y, 30, box.h, border);
      text.drawText(labels[i], box.x + 15, box.y + box.h / 2 - 6, 15, bg, 'center');

      // Answer text
      text.drawText(currentQuestion.a[i], box.x + 42, box.y + box.h / 2 - 6, 14, txt, 'left');
    }
  }

  function drawEliminationBanner(renderer, text) {
    if (eliminatedThisRound.length === 0 || phase !== 'reveal') return;
    const elapsed = (Date.now() - revealTime) / 1000;
    if (elapsed < 0.6 || elapsed > 2.6) return;

    const alpha = elapsed < 1.0
      ? (elapsed - 0.6) / 0.4
      : Math.max(0, 1 - (elapsed - 2.0) / 0.6);

    renderer.fillRect(0, 208, W, 44, withAlpha('#500000', alpha * 0.9));

    const names = eliminatedThisRound.map(p => p.isHuman ? 'YOU' : p.name).join(', ');
    renderer.setGlow('#ff0000', 0.8);
    text.drawText('\u2620 ELIMINATED: ' + names + ' \u2620', W / 2, 222, 20, withAlpha('#ff4444', alpha), 'center');
    renderer.setGlow(null);
  }

  function drawFinalStandings(renderer, text) {
    renderer.setGlow('#ff00aa', 0.8);
    text.drawText('FINAL STANDINGS', W / 2, 62, 22, '#ff00aa', 'center');
    renderer.setGlow(null);

    const sorted = [...players].sort((a, b) => {
      if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
      if (!a.eliminated && !b.eliminated) return b.score - a.score;
      return b.eliminatedRound - a.eliminatedRound;
    });

    const medalColors = ['#ffdd00', '#cccccc', '#cc8844'];

    for (let i = 0; i < sorted.length; i++) {
      const p = sorted[i];
      const y = 92 + i * 36;
      const rank = i + 1;

      const rankCol = rank <= 3 ? medalColors[rank - 1] : '#555555';
      if (rank <= 3) renderer.setGlow(rankCol, 0.6);
      text.drawText('#' + rank, 80, y, 15, rankCol, 'left');
      renderer.setGlow(null);

      const pidx = players.indexOf(p);
      drawAvatar(renderer, 128, y + 5, p, pidx, 14);

      const nCol = p.eliminated ? '#555555' : p.color;
      if (p.isHuman && !p.eliminated) renderer.setGlow(p.color, 0.6);
      text.drawText(p.isHuman ? 'YOU' : p.name, 148, y, 14, nCol, 'left');
      renderer.setGlow(null);

      text.drawText(p.score + ' pts', 410, y, 14, p.eliminated ? '#444444' : '#ffffff', 'right');

      if (p.eliminated) {
        text.drawText('OUT R' + p.eliminatedRound, 510, y, 11, '#ff4444', 'right');
      } else {
        renderer.setGlow('#00ff00', 0.5);
        text.drawText('SURVIVED', 510, y, 11, '#00ff00', 'right');
        renderer.setGlow(null);
      }
    }
  }

  function drawScreenFx(renderer) {
    if (shakeAmount > 0) { shakeAmount *= 0.88; if (shakeAmount < 0.5) shakeAmount = 0; }
    if (flashAlpha > 0) {
      renderer.fillRect(0, 0, W, H, withAlpha(flashColor, flashAlpha));
      flashAlpha *= 0.9;
      if (flashAlpha < 0.01) flashAlpha = 0;
    }
  }

  // ===== GAME ENGINE =====
  const game = new Game('game');
  game.setScoreFn(() => score);

  game.onInit = () => {
    if (bestEl) bestEl.textContent = bestScore;
    game.showOverlay('TRIVIA ROYALE', 'Click to Start - Battle Royale Trivia! Last one standing wins.');
    game.setState('waiting');

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (W / rect.width);
      const my = (e.clientY - rect.top) * (H / rect.height);
      hoverChoice = -1;
      if (phase !== 'question' || playerAnswer !== -1) return;
      for (let i = 0; i < 4; i++) {
        const b = choiceBoxes[i];
        if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) { hoverChoice = i; break; }
      }
    });

    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left) * (W / rect.width);
      const my = (e.clientY - rect.top) * (H / rect.height);

      if (game.state === 'waiting' || game.state === 'over') {
        game.setState('playing');
        phase = 'idle';
        initGame();
        return;
      }
      if (phase === 'question') {
        for (let i = 0; i < 4; i++) {
          const b = choiceBoxes[i];
          if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) { submitAnswer(i); break; }
        }
      }
    });
  };

  game.onUpdate = (dt) => {
    if (game.state !== 'playing') return;
    if (phase === 'question') {
      updateParticles();
      const elapsed = (Date.now() - timerStart) / 1000;
      const timer = Math.max(0, timerMax - elapsed);
      if (timer <= 0 && !pendingReveal) {
        pendingReveal = true;
        revealAnswers();
      }
    } else if (phase === 'reveal' || phase === 'gameOver') {
      updateParticles();
    }
  };

  game.onDraw = (renderer, text) => {
    // Background fill (renderer.begin() already cleared but we overdraw for consistency)
    renderer.fillRect(0, 0, W, H, '#1a1a2e');

    // Simple vignette: stacked semi-transparent dark rects near edges
    for (let ring = 0; ring < 5; ring++) {
      const m = ring * 16;
      const a = 0.07 - ring * 0.012;
      if (a <= 0) break;
      const ca = withAlpha('#000000', a);
      renderer.fillRect(m, m,         W - m * 2, 16,         ca); // top
      renderer.fillRect(m, H - m - 16, W - m * 2, 16,         ca); // bottom
      renderer.fillRect(m, m,         16,         H - m * 2, ca); // left
      renderer.fillRect(W - m - 16, m, 16,         H - m * 2, ca); // right
    }

    if (phase === 'question' || phase === 'reveal') {
      // Divider lines between player slots and main area
      renderer.drawLine(0, 42,     W, 42,     '#252545', 1);
      renderer.drawLine(0, H - 42, W, H - 42, '#252545', 1);

      drawPlayerSlots(renderer, text);
      drawTimerBar(renderer, text);
      drawQuestionText(renderer, text);
      drawChoices(renderer, text);
      drawEliminationBanner(renderer, text);
      drawParticles(renderer);
      drawScreenFx(renderer);
    } else if (phase === 'gameOver') {
      drawPlayerSlots(renderer, text);
      drawFinalStandings(renderer, text);
      drawParticles(renderer);
    }
  };

  game.start();
  return game;
}
