
// ============================================================
//  Nova - app.js  (Simple plain JavaScript - no React needed)
// ============================================================

// ── PUT YOUR ANTHROPIC API KEY HERE ──────────────────────────
var API_KEY = "YOUR_ANTHROPIC_API_KEY_HERE";

// ── CURRENT USER DATA ─────────────────────────────────────────
var currentUser  = null;
var chatMessages = [];
var voiceOn      = true;

// ── SHOW AND HIDE PAGES ───────────────────────────────────────
function showPage(pageId) {
  document.getElementById("loginPage").style.display = "none";
  document.getElementById("mainPage").style.display  = "none";
  document.getElementById(pageId).style.display      = pageId === "loginPage" ? "flex" : "block";
}

// ── LOGIN / REGISTER TABS ─────────────────────────────────────
function switchTab(tab) {
  document.getElementById("currentTab").value = tab;

  if (tab === "login") {
    document.getElementById("loginTab").className    = "tab active";
    document.getElementById("registerTab").className = "tab";
    document.getElementById("authBtn").textContent   = "Sign In";
  } else {
    document.getElementById("loginTab").className    = "tab";
    document.getElementById("registerTab").className = "tab active";
    document.getElementById("authBtn").textContent   = "Register";
  }

  document.getElementById("authMsg").textContent = "";
}

// ── DO LOGIN OR REGISTER ──────────────────────────────────────
function doAuth() {
  var username = document.getElementById("usernameInput").value.trim();
  var password = document.getElementById("passwordInput").value.trim();
  var tab      = document.getElementById("currentTab").value;

  if (!username || !password) {
    document.getElementById("authMsg").textContent = "Please fill all fields";
    return;
  }

  var users = JSON.parse(localStorage.getItem("nova_users") || "{}");

  if (tab === "register") {
    if (users[username]) {
      document.getElementById("authMsg").textContent = "Username already taken";
      return;
    }
    users[username] = { password: password, messages: [] };
    localStorage.setItem("nova_users", JSON.stringify(users));
    document.getElementById("authMsg").textContent = "Account created! Signing in...";
  }

  if (!users[username]) {
    document.getElementById("authMsg").textContent = "User not found";
    return;
  }
  if (users[username].password !== password) {
    document.getElementById("authMsg").textContent = "Wrong password";
    return;
  }

  currentUser  = username;
  chatMessages = users[username].messages || [];

  document.getElementById("welcomeText").textContent = "Hi, " + username;
  loadChatHistory();
  showPage("mainPage");
}

// ── SIGN OUT ──────────────────────────────────────────────────
function signOut() {
  currentUser  = null;
  chatMessages = [];
  document.getElementById("chatBox").innerHTML       = "";
  document.getElementById("usernameInput").value     = "";
  document.getElementById("passwordInput").value     = "";
  showPage("loginPage");
}

// ── SWITCH MAIN TABS ──────────────────────────────────────────
function switchMainTab(tab) {
  document.getElementById("chatSection").style.display  = "none";
  document.getElementById("drawSection").style.display  = "none";
  document.getElementById("stormSection").style.display = "none";

  document.getElementById("tabChat").className  = "main-tab";
  document.getElementById("tabDraw").className  = "main-tab";
  document.getElementById("tabStorm").className = "main-tab";

  document.getElementById(tab + "Section").style.display        = "block";
  document.getElementById("tab" + tab.charAt(0).toUpperCase() + tab.slice(1)).className = "main-tab active";
}

// ── SEND MESSAGE TO NOVA ──────────────────────────────────────
function sendMessage() {
  var input = document.getElementById("chatInput").value.trim();
  if (!input) return;

  document.getElementById("chatInput").value = "";
  addBubble("You", input, "user");
  chatMessages.push({ role: "user", content: input });
  document.getElementById("novaStatus").textContent = "Nova is thinking...";

  fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type":      "application/json",
      "x-api-key":         API_KEY,
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model:      "claude-haiku-4-5-20251001",
      max_tokens: 200,
      system:     "You are Nova, a warm friendly AI companion. Keep replies short, max 2 sentences. Be calm and supportive.",
      messages:   chatMessages
    })
  })
  .then(function(response) { return response.json(); })
  .then(function(data) {
    var reply = data.content[0].text;
    chatMessages.push({ role: "assistant", content: reply });

    var users = JSON.parse(localStorage.getItem("nova_users") || "{}");
    if (users[currentUser]) {
      users[currentUser].messages = chatMessages.slice(-50);
      localStorage.setItem("nova_users", JSON.stringify(users));
    }

    addBubble("Nova", reply, "nova");
    document.getElementById("novaStatus").textContent = "Nova is here for you";
    speakText(reply);
  })
  .catch(function() {
    addBubble("Nova", "Sorry, something went wrong. Try again!", "nova");
    document.getElementById("novaStatus").textContent = "Nova is here for you";
  });
}

// ── ADD CHAT BUBBLE ───────────────────────────────────────────
function addBubble(name, text, type) {
  var box    = document.getElementById("chatBox");
  var wrap   = document.createElement("div");
  var label  = document.createElement("div");
  var bubble = document.createElement("div");

  wrap.style.textAlign    = type === "user" ? "right" : "left";
  wrap.style.marginBottom = "12px";

  label.textContent    = name;
  label.style.fontSize = "10px";
  label.style.opacity  = "0.45";
  label.style.marginBottom = "3px";

  bubble.textContent      = text;
  bubble.style.display    = "inline-block";
  bubble.style.padding    = "10px 14px";
  bubble.style.borderRadius = "16px";
  bubble.style.maxWidth   = "80%";
  bubble.style.fontSize   = "14px";
  bubble.style.lineHeight = "1.5";
  bubble.style.color      = "white";

  if (type === "user") {
    bubble.style.background = "linear-gradient(135deg, #7F77DD, #1D9E75)";
  } else {
    bubble.style.background = "rgba(255,255,255,0.08)";
    bubble.style.border     = "1px solid rgba(255,255,255,0.08)";
  }

  wrap.appendChild(label);
  wrap.appendChild(bubble);
  box.appendChild(wrap);
  box.scrollTop = box.scrollHeight;
}

// ── LOAD CHAT HISTORY ─────────────────────────────────────────
function loadChatHistory() {
  document.getElementById("chatBox").innerHTML = "";
  for (var i = 0; i < chatMessages.length; i++) {
    var m = chatMessages[i];
    addBubble(m.role === "user" ? "You" : "Nova", m.content, m.role === "user" ? "user" : "nova");
  }
}

// ── QUICK SEND ────────────────────────────────────────────────
function quickSend(text) {
  document.getElementById("chatInput").value = text;
  sendMessage();
}

// ── ENTER KEY ─────────────────────────────────────────────────
function checkEnter(event) {
  if (event.key === "Enter") sendMessage();
}

// ── VOICE ─────────────────────────────────────────────────────
function toggleVoice() {
  voiceOn = !voiceOn;
  document.getElementById("voiceBtn").textContent = voiceOn ? "Voice ON" : "Voice OFF";
}

function speakText(text) {
  if (!voiceOn) return;
  var u   = new SpeechSynthesisUtterance(text);
  u.rate  = 0.95;
  u.pitch = 1.05;
  window.speechSynthesis.speak(u);
}

// ── DRAW CANVAS ───────────────────────────────────────────────
var isDrawing = false;
var drawColor = "#ffffff";
var drawSize  = 6;
var lastX     = 0;
var lastY     = 0;

function setupCanvas() {
  var canvas = document.getElementById("drawCanvas");
  var ctx    = canvas.getContext("2d");

  canvas.width  = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;
  ctx.fillStyle = "#111111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  canvas.onmousedown = function(e) {
    isDrawing = true;
    var r = canvas.getBoundingClientRect();
    lastX = e.clientX - r.left;
    lastY = e.clientY - r.top;
  };

  canvas.onmousemove = function(e) {
    if (!isDrawing) return;
    var r = canvas.getBoundingClientRect();
    var x = e.clientX - r.left;
    var y = e.clientY - r.top;
    ctx.beginPath();
    ctx.strokeStyle = drawColor;
    ctx.lineWidth   = drawSize;
    ctx.lineCap     = "round";
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastX = x;
    lastY = y;
  };

  canvas.onmouseup   = function() { isDrawing = false; };
  canvas.onmouseleave= function() { isDrawing = false; };

  canvas.ontouchstart = function(e) {
    e.preventDefault();
    isDrawing = true;
    var r = canvas.getBoundingClientRect();
    lastX = e.touches[0].clientX - r.left;
    lastY = e.touches[0].clientY - r.top;
  };

  canvas.ontouchmove = function(e) {
    e.preventDefault();
    if (!isDrawing) return;
    var r = canvas.getBoundingClientRect();
    var x = e.touches[0].clientX - r.left;
    var y = e.touches[0].clientY - r.top;
    ctx.beginPath();
    ctx.strokeStyle = drawColor;
    ctx.lineWidth   = drawSize;
    ctx.lineCap     = "round";
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastX = x;
    lastY = y;
  };

  canvas.ontouchend = function() { isDrawing = false; };
}

function setColor(c) { drawColor = c; }

function setSize(v) {
  drawSize = v;
  document.getElementById("sizeLabel").textContent = v + "px";
}

function clearCanvas() {
  var canvas = document.getElementById("drawCanvas");
  var ctx    = canvas.getContext("2d");
  ctx.fillStyle = "#111111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function saveDrawing() {
  var canvas = document.getElementById("drawCanvas");
  var a      = document.createElement("a");
  a.href     = canvas.toDataURL("image/png");
  a.download = "nova-art.png";
  a.click();
}

// ── STORM / RAIN ──────────────────────────────────────────────
var audioCtx     = null;
var rainSource   = null;
var rainGain     = null;
var stormOn      = false;
var stormAnim    = null;
var rainDrops    = [];

function toggleStorm() {
  if (stormOn) {
    stopStorm();
  } else {
    startStorm();
  }
}

function startStorm() {
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  rainGain = audioCtx.createGain();
  rainGain.gain.value = 0.7;
  rainGain.connect(audioCtx.destination);

  var size   = audioCtx.sampleRate * 3;
  var buffer = audioCtx.createBuffer(1, size, audioCtx.sampleRate);
  var data   = buffer.getChannelData(0);
  for (var i = 0; i < size; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  var filter           = audioCtx.createBiquadFilter();
  filter.type          = "bandpass";
  filter.frequency.value = 1000;
  filter.Q.value       = 0.5;

  rainSource        = audioCtx.createBufferSource();
  rainSource.buffer = buffer;
  rainSource.loop   = true;
  rainSource.connect(filter);
  filter.connect(rainGain);
  rainSource.start();

  stormOn = true;
  document.getElementById("stormBtn").textContent = "⏸ Stop Storm";

  startRainDraw();
}

function stopStorm() {
  if (rainSource) { rainSource.stop(); rainSource = null; }
  if (audioCtx)  { audioCtx.close();  audioCtx  = null; }
  stormOn = false;
  document.getElementById("stormBtn").textContent = "⛈ Start Storm";
  if (stormAnim) { cancelAnimationFrame(stormAnim); stormAnim = null; }
  drawEmptyForest();
}

function setRainVolume(val) {
  if (rainGain) rainGain.gain.value = parseFloat(val);
  document.getElementById("rainVolLabel").textContent = Math.round(val * 100) + "%";
}

// ── RAIN CANVAS DRAWING ───────────────────────────────────────
function startRainDraw() {
  var canvas = document.getElementById("stormCanvas");
  canvas.width  = canvas.offsetWidth;
  canvas.height = canvas.offsetHeight;

  rainDrops = [];
  for (var i = 0; i < 300; i++) {
    rainDrops.push({
      x:     Math.random() * canvas.width,
      y:     Math.random() * canvas.height,
      speed: 5 + Math.random() * 8,
      len:   10 + Math.random() * 15,
      op:    0.2 + Math.random() * 0.5
    });
  }

  drawFrame();
}

function drawFrame() {
  var canvas = document.getElementById("stormCanvas");
  var ctx    = canvas.getContext("2d");
  var W      = canvas.width;
  var H      = canvas.height;

  ctx.clearRect(0, 0, W, H);

  // Sky
  ctx.fillStyle = "#050f05";
  ctx.fillRect(0, 0, W, H);

  // Trees
  var positions = [0.05, 0.18, 0.32, 0.50, 0.65, 0.80, 0.93];
  for (var t = 0; t < positions.length; t++) {
    var x = W * positions[t];
    var baseY = H * 0.75;

    // Trunk
    ctx.fillStyle = "#2a1a0a";
    ctx.fillRect(x - 7, baseY - H * 0.28, 14, H * 0.28);

    // Bottom leaves
    ctx.fillStyle = "#0d3a0d";
    ctx.beginPath();
    ctx.moveTo(x, baseY - H * 0.55);
    ctx.lineTo(x - 50, baseY - H * 0.26);
    ctx.lineTo(x + 50, baseY - H * 0.26);
    ctx.fill();

    // Middle leaves
    ctx.fillStyle = "#0f4a0f";
    ctx.beginPath();
    ctx.moveTo(x, baseY - H * 0.70);
    ctx.lineTo(x - 38, baseY - H * 0.50);
    ctx.lineTo(x + 38, baseY - H * 0.50);
    ctx.fill();

    // Top leaves
    ctx.fillStyle = "#126612";
    ctx.beginPath();
    ctx.moveTo(x, baseY - H * 0.82);
    ctx.lineTo(x - 24, baseY - H * 0.65);
    ctx.lineTo(x + 24, baseY - H * 0.65);
    ctx.fill();
  }

  // Ground
  ctx.fillStyle = "#0a1a08";
  ctx.fillRect(0, H * 0.75, W, H * 0.25);

  // Mist
  var mist = ctx.createLinearGradient(0, H * 0.65, 0, H * 0.78);
  mist.addColorStop(0, "rgba(150,200,150,0)");
  mist.addColorStop(0.5, "rgba(150,200,150,0.06)");
  mist.addColorStop(1, "rgba(150,200,150,0)");
  ctx.fillStyle = mist;
  ctx.fillRect(0, H * 0.65, W, H * 0.13);

  // Rain drops
  for (var i = 0; i < rainDrops.length; i++) {
    var d = rainDrops[i];
    ctx.strokeStyle = "rgba(180,220,255," + d.op + ")";
    ctx.lineWidth   = 0.8;
    ctx.beginPath();
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x + 1, d.y + d.len);
    ctx.stroke();

    d.y += d.speed;
    if (d.y > H) {
      d.y = -20;
      d.x = Math.random() * W;
    }
  }

  stormAnim = requestAnimationFrame(drawFrame);
}

function drawEmptyForest() {
  var canvas = document.getElementById("stormCanvas");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  ctx.fillStyle = "#050f05";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// ── START EVERYTHING WHEN PAGE LOADS ─────────────────────────
window.onload = function() {
  showPage("loginPage");
  setupCanvas();
  drawEmptyForest();
};
const responses = {
  stress: [
    "I hear you… things feel heavy right now. Take a slow breath with me.",
    "It's okay to feel overwhelmed. You're not alone in this.",
    "Let's slow things down. One small step at a time."
  ],
  sad: [
    "I'm here with you. You don’t have to go through this alone.",
    "It’s okay to feel this way sometimes. It will pass.",
    "Tell me more… I’m listening."
  ],
  motivation: [
    "You’ve come this far — don’t stop now.",
    "Small progress is still progress.",
    "You are capable of more than you think."
  ],
  default: [
    "That’s interesting… tell me more.",
    "I understand. Go on.",
    "I’m here for you."
  ]
};
function detectMood(text) {
  text = text.toLowerCase();

  if (text.includes("stress") || text.includes("tired") || text.includes("pressure")) {
    return "stress";
  }

  if (text.includes("sad") || text.includes("lonely") || text.includes("cry")) {
    return "sad";
  }

  if (text.includes("motivate") || text.includes("goal") || text.includes("success")) {
    return "motivation";
  }

  return "default";
}
function getAIResponse(userText) {
  const mood = detectMood(userText);
  const list = responses[mood];
  return list[Math.floor(Math.random() * list.length)];
}
function speak(text) {
  const speech = new SpeechSynthesisUtterance(text);
  speech.rate = 1;
  speech.pitch = 1;
  speech.lang = "en-US";
  window.speechSynthesis.speak(speech);
}
function handleUserInput(text) {
  const reply = getAIResponse(text);

  console.log("User:", text);
  console.log("AI:", reply);

  speak(reply);
}
function handleUserInput(text) {
  setTimeout(() => {
    const reply = getAIResponse(text);
    speak(reply);
  }, 1000 + Math.random() * 2000);
}
speech.rate = 0.9; // calm
speech.rate = 1.2; // energetic
