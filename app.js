// ============================================================
//  Nova app.js - Simple JavaScript
//  Just paste this into your app.js file
// ============================================================

// ── YOUR API KEY (put your Anthropic key here) ───────────────
var API_KEY = "YOUR_ANTHROPIC_API_KEY_HERE";

// ── SAVE USER DATA (uses localStorage - works in any browser) ─
function saveUser(username, password) {
  var users = JSON.parse(localStorage.getItem("nova_users") || "{}");
  if (users[username]) {
    return "Username already taken";
  }
  users[username] = { password: password, messages: [] };
  localStorage.setItem("nova_users", JSON.stringify(users));
  return "ok";
}

function loginUser(username, password) {
  var users = JSON.parse(localStorage.getItem("nova_users") || "{}");
  if (!users[username]) return "User not found";
  if (users[username].password !== password) return "Wrong password";
  return "ok";
}

function getMessages(username) {
  var users = JSON.parse(localStorage.getItem("nova_users") || "{}");
  if (!users[username]) return [];
  return users[username].messages || [];
}

function saveMessages(username, messages) {
  var users = JSON.parse(localStorage.getItem("nova_users") || "{}");
  if (!users[username]) return;
  users[username].messages = messages.slice(-50);
  localStorage.setItem("nova_users", JSON.stringify(users));
}

// ── CURRENT USER ─────────────────────────────────────────────
var currentUser = null;
var chatMessages = [];

// ── SHOW / HIDE PAGES ────────────────────────────────────────
function showPage(pageId) {
  document.getElementById("loginPage").style.display = "none";
  document.getElementById("mainPage").style.display = "none";
  document.getElementById(pageId).style.display = "block";
}

// ── SWITCH LOGIN / REGISTER TABS ─────────────────────────────
function switchTab(tab) {
  if (tab === "login") {
    document.getElementById("loginTab").className = "tab active";
    document.getElementById("registerTab").className = "tab";
    document.getElementById("authBtn").textContent = "Sign In";
  } else {
    document.getElementById("loginTab").className = "tab";
    document.getElementById("registerTab").className = "tab active";
    document.getElementById("authBtn").textContent = "Register";
  }
  document.getElementById("authMsg").textContent = "";
  document.getElementById("currentTab").value = tab;
}

// ── LOGIN OR REGISTER ─────────────────────────────────────────
function doAuth() {
  var username = document.getElementById("usernameInput").value.trim();
  var password = document.getElementById("passwordInput").value.trim();
  var tab      = document.getElementById("currentTab").value;

  if (!username || !password) {
    document.getElementById("authMsg").textContent = "Please fill all fields";
    return;
  }

  if (tab === "register") {
    var result = saveUser(username, password);
    if (result !== "ok") {
      document.getElementById("authMsg").textContent = result;
      return;
    }
    document.getElementById("authMsg").textContent = "Account created!";
  }

  var loginResult = loginUser(username, password);
  if (loginResult !== "ok") {
    document.getElementById("authMsg").textContent = loginResult;
    return;
  }

  currentUser  = username;
  chatMessages = getMessages(username);
  document.getElementById("welcomeText").textContent = "Welcome, " + username;
  loadChatHistory();
  showPage("mainPage");
}

// ── SIGN OUT ──────────────────────────────────────────────────
function signOut() {
  currentUser  = null;
  chatMessages = [];
  showPage("loginPage");
}

// ── SWITCH TABS (Chat / Draw / Storm) ────────────────────────
function switchMainTab(tab) {
  document.getElementById("chatSection").style.display  = "none";
  document.getElementById("drawSection").style.display  = "none";
  document.getElementById("stormSection").style.display = "none";

  document.getElementById("tabChat").className  = "main-tab";
  document.getElementById("tabDraw").className  = "main-tab";
  document.getElementById("tabStorm").className = "main-tab";

  document.getElementById(tab + "Section").style.display = "block";
  document.getElementById("tab" + capitalize(tab)).className = "main-tab active";
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ── SEND MESSAGE TO NOVA ──────────────────────────────────────
async function sendMessage() {
  var input = document.getElementById("chatInput").value.trim();
  if (!input) return;

  document.getElementById("chatInput").value = "";
  addMessageToChat("You", input, "user");

  chatMessages.push({ role: "user", content: input });

  document.getElementById("novaStatus").textContent = "Nova is thinking...";

  try {
    var response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model:      "claude-haiku-4-5-20251001",
        max_tokens: 200,
        system:     "You are Nova, a warm friendly AI companion. Keep replies short — max 2 sentences. Be calm and supportive.",
        messages:   chatMessages
      })
    });

    var data  = await response.json();
    var reply = data.content[0].text;

    chatMessages.push({ role: "assistant", content: reply });
    saveMessages(currentUser, chatMessages);

    addMessageToChat("Nova", reply, "nova");
    document.getElementById("novaStatus").textContent = "Nova is here for you";
    speakText(reply);

  } catch (e) {
    addMessageToChat("Nova", "Sorry, something went wrong. Try again!", "nova");
    document.getElementById("novaStatus").textContent = "Nova is here for you";
  }
}

// ── ADD MESSAGE TO CHAT BOX ───────────────────────────────────
function addMessageToChat(name, text, type) {
  var box = document.getElementById("chatBox");
  var div = document.createElement("div");
  div.style.marginBottom  = "12px";
  div.style.textAlign     = type === "user" ? "right" : "left";

  var bubble = document.createElement("div");
  bubble.textContent = text;
  bubble.style.display    = "inline-block";
  bubble.style.padding    = "10px 14px";
  bubble.style.borderRadius = "16px";
  bubble.style.maxWidth   = "80%";
  bubble.style.fontSize   = "14px";
  bubble.style.background = type === "user" ? "linear-gradient(135deg,#7F77DD,#1D9E75)" : "rgba(255,255,255,0.08)";
  bubble.style.color      = "white";

  var label = document.createElement("div");
  label.textContent  = name;
  label.style.fontSize = "10px";
  label.style.opacity  = "0.5";
  label.style.marginBottom = "3px";

  div.appendChild(label);
  div.appendChild(bubble);
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}

// ── LOAD OLD CHAT MESSAGES ────────────────────────────────────
function loadChatHistory() {
  var box = document.getElementById("chatBox");
  box.innerHTML = "";
  for (var i = 0; i < chatMessages.length; i++) {
    var m    = chatMessages[i];
    var name = m.role === "user" ? "You" : "Nova";
    addMessageToChat(name, m.content, m.role === "user" ? "user" : "nova");
  }
}

// ── SEND ON ENTER KEY ─────────────────────────────────────────
function checkEnter(event) {
  if (event.key === "Enter") sendMessage();
}

// ── QUICK REPLY BUTTONS ───────────────────────────────────────
function quickSend(text) {
  document.getElementById("chatInput").value = text;
  sendMessage();
}

// ── TEXT TO SPEECH ────────────────────────────────────────────
var voiceOn = true;

function toggleVoice() {
  voiceOn = !voiceOn;
  document.getElementById("voiceBtn").textContent = voiceOn ? "Voice ON" : "Voice OFF";
}

function speakText(text) {
  if (!voiceOn) return;
  var u = new SpeechSynthesisUtterance(text);
  u.rate  = 0.95;
  u.pitch = 1.05;
  window.speechSynthesis.speak(u);
}

// ── DRAW CANVAS ───────────────────────────────────────────────
var drawing   = false;
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

  canvas.addEventListener("mousedown", function(e) {
    drawing = true;
    var rect = canvas.getBoundingClientRect();
    lastX = e.clientX - rect.left;
    lastY = e.clientY - rect.top;
  });

  canvas.addEventListener("mousemove", function(e) {
    if (!drawing) return;
    var rect = canvas.getBoundingClientRect();
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;
    ctx.beginPath();
    ctx.strokeStyle = drawColor;
    ctx.lineWidth   = drawSize;
    ctx.lineCap     = "round";
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastX = x;
    lastY = y;
  });

  canvas.addEventListener("mouseup",    function() { drawing = false; });
  canvas.addEventListener("mouseleave", function() { drawing = false; });

  // Touch support for mobile
  canvas.addEventListener("touchstart", function(e) {
    e.preventDefault();
    drawing = true;
    var rect  = canvas.getBoundingClientRect();
    lastX = e.touches[0].clientX - rect.left;
    lastY = e.touches[0].clientY - rect.top;
  });

  canvas.addEventListener("touchmove", function(e) {
    e.preventDefault();
    if (!drawing) return;
    var rect = canvas.getBoundingClientRect();
    var x = e.touches[0].clientX - rect.left;
    var y = e.touches[0].clientY - rect.top;
    ctx.beginPath();
    ctx.strokeStyle = drawColor;
    ctx.lineWidth   = drawSize;
    ctx.lineCap     = "round";
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastX = x;
    lastY = y;
  });

  canvas.addEventListener("touchend", function() { drawing = false; });
}

function setColor(color) {
  drawColor = color;
}

function setSize(val) {
  drawSize = val;
  document.getElementById("sizeLabel").textContent = val + "px";
}

function clearCanvas() {
  var canvas = document.getElementById("drawCanvas");
  var ctx    = canvas.getContext("2d");
  ctx.fillStyle = "#111111";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function saveDrawing() {
  var canvas = document.getElementById("drawCanvas");
  var link   = document.createElement("a");
  link.href     = canvas.toDataURL("image/png");
  link.download = "nova-drawing.png";
  link.click();
}

// ── RAIN SOUND (Web Audio) ────────────────────────────────────
var audioCtx     = null;
var rainSource   = null;
var rainGain     = null;
var stormPlaying = false;

function toggleStorm() {
  if (stormPlaying) {
    stopStorm();
  } else {
    startStorm();
  }
}

function startStorm() {
  audioCtx  = new (window.AudioContext || window.webkitAudioContext)();
  rainGain  = audioCtx.createGain();
  rainGain.gain.value = 0.7;
  rainGain.connect(audioCtx.destination);

  // White noise for rain
  var bufferSize = audioCtx.sampleRate * 3;
  var buffer     = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  var data       = buffer.getChannelData(0);
  for (var i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  rainSource        = audioCtx.createBufferSource();
  rainSource.buffer = buffer;
  rainSource.loop   = true;

  var filter        = audioCtx.createBiquadFilter();
  filter.type       = "bandpass";
  filter.frequency.value = 1000;
  filter.Q.value    = 0.5;

  rainSource.connect(filter);
  filter.connect(rainGain);
  rainSource.start();

  stormPlaying = true;
  document.getElementById("stormBtn").textContent = "Stop Storm";
  startRainAnimation();
}

function stopStorm() {
  if (rainSource) rainSource.stop();
  if (audioCtx)  audioCtx.close();
  rainSource   = null;
  audioCtx     = null;
  stormPlaying = false;
  document.getElementById("stormBtn").textContent = "Start Storm";
  stopRainAnimation();
}

function setRainVolume(val) {
  if (rainGain) rainGain.gain.value = val;
  document.getElementById("rainVolLabel").textContent = Math.round(val * 100) + "%";
}

// ── RAIN ANIMATION (Canvas) ───────────────────────────────────
var rainCanvas = null;
var rainCtx    = null;
var rainAnim   = null;
var rainDrops  = [];

function startRainAnimation() {
  rainCanvas        = document.getElementById("stormCanvas");
  rainCtx           = rainCanvas.getContext("2d");
  rainCanvas.width  = rainCanvas.offsetWidth;
  rainCanvas.height = rainCanvas.offsetHeight;

  rainDrops = [];
  for (var i = 0; i < 300; i++) {
    rainDrops.push({
      x:     Math.random() * rainCanvas.width,
      y:     Math.random() * rainCanvas.height,
      speed: 5 + Math.random() * 8,
      len:   10 + Math.random() * 15,
      op:    0.2 + Math.random() * 0.5
    });
  }

  animateRain();
}

function animateRain() {
  rainCtx.clearRect(0, 0, rainCanvas.width, rainCanvas.height);

  // Dark green background
  rainCtx.fillStyle = "#050f05";
  rainCtx.fillRect(0, 0, rainCanvas.width, rainCanvas.height);

  // Simple trees
  drawSimpleTrees();

  // Rain drops
  for (var i = 0; i < rainDrops.length; i++) {
    var d = rainDrops[i];
    rainCtx.strokeStyle = "rgba(180, 220, 255, " + d.op + ")";
    rainCtx.lineWidth   = 0.8;
    rainCtx.beginPath();
    rainCtx.moveTo(d.x, d.y);
    rainCtx.lineTo(d.x + 1, d.y + d.len);
    rainCtx.stroke();
    d.y += d.speed;
    if (d.y > rainCanvas.height) {
      d.y = -20;
      d.x = Math.random() * rainCanvas.width;
    }
  }

  rainAnim = requestAnimationFrame(animateRain);
}

function drawSimpleTrees() {
  var W = rainCanvas.width;
  var H = rainCanvas.height;

  var treePositions = [0.05, 0.18, 0.32, 0.50, 0.65, 0.80, 0.93];

  for (var t = 0; t < treePositions.length; t++) {
    var x = W * treePositions[t];
    var trunkH = H * 0.35;

    // Trunk
    rainCtx.fillStyle = "#2a1a0a";
    rainCtx.fillRect(x - 8, H - trunkH, 16, trunkH);

    // Leaves (3 triangles stacked)
    rainCtx.fillStyle = "#0d3a0d";
    rainCtx.beginPath();
    rainCtx.moveTo(x, H - trunkH - 80);
    rainCtx.lineTo(x - 55, H - trunkH + 10);
    rainCtx.lineTo(x + 55, H - trunkH + 10);
    rainCtx.fill();

    rainCtx.fillStyle = "#0f4a0f";
    rainCtx.beginPath();
    rainCtx.moveTo(x, H - trunkH - 130);
    rainCtx.lineTo(x - 42, H - trunkH - 50);
    rainCtx.lineTo(x + 42, H - trunkH - 50);
    rainCtx.fill();

    rainCtx.fillStyle = "#126612";
    rainCtx.beginPath();
    rainCtx.moveTo(x, H - trunkH - 175);
    rainCtx.lineTo(x - 28, H - trunkH - 105);
    rainCtx.lineTo(x + 28, H - trunkH - 105);
    rainCtx.fill();
  }

  // Ground
  rainCtx.fillStyle = "#0a1a08";
  rainCtx.fillRect(0, H - H * 0.15, W, H * 0.15);

  // Mist
  var mist = rainCtx.createLinearGradient(0, H * 0.6, 0, H * 0.75);
  mist.addColorStop(0, "rgba(150, 200, 150, 0)");
  mist.addColorStop(0.5, "rgba(150, 200, 150, 0.06)");
  mist.addColorStop(1, "rgba(150, 200, 150, 0)");
  rainCtx.fillStyle = mist;
  rainCtx.fillRect(0, H * 0.6, W, H * 0.15);
}

function stopRainAnimation() {
  if (rainAnim) cancelAnimationFrame(rainAnim);
  if (rainCtx && rainCanvas) {
    rainCtx.clearRect(0, 0, rainCanvas.width, rainCanvas.height);
    rainCtx.fillStyle = "#050f05";
    rainCtx.fillRect(0, 0, rainCanvas.width, rainCanvas.height);
  }
}

// ── START APP WHEN PAGE LOADS ─────────────────────────────────
window.onload = function() {
  showPage("loginPage");
  setupCanvas();
};
