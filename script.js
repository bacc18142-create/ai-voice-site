// ============================================================
//  Nova — AI Companion  |  app.js
//  Requires: React 18, styles.css
//  API: Anthropic /v1/messages (key handled server-side)
// ============================================================

const { useState, useRef, useEffect } = React;

// ── CONSTANTS ────────────────────────────────────────────────
const ANTHROPIC_API = "https://api.anthropic.com/v1/messages";
const MODEL         = "claude-sonnet-4-20250514";

const SYSTEM_PROMPT = `You are Nova — a warm, friendly AI companion.
Max 2 sentences. Natural, calm, supportive. No bullet points.`;

const QUICK_REPLIES = [
  { label: "Stressed 😤",   text: "I'm feeling really stressed" },
  { label: "Lonely 💙",     text: "I'm feeling lonely today" },
  { label: "Can't focus 🌀",text: "I can't focus at all" },
  { label: "Anxious 😟",    text: "I'm anxious right now" },
  { label: "Happy 😊",      text: "I'm feeling great today!" },
  { label: "Just talk 💬",  text: "I just need someone to talk to" },
];

const PALETTE = [
  "#E24B4A","#E87C3E","#F5C518","#8BC34A","#1D9E75","#2196F3",
  "#7F77DD","#E91E8C","#FF6B9D","#00BCD4","#FF9800","#9C27B0",
  "#fff","#ddd","#aaa","#777","#444","#222","#111","#000",
];

// ── STORAGE HELPERS ──────────────────────────────────────────
// Uses window.storage (Anthropic artifact persistent storage).
// Replace with localStorage / your own backend if hosting externally.

async function loadUsers() {
  try {
    const r = await window.storage.get("nova_users");
    return r ? JSON.parse(r.value) : {};
  } catch { return {}; }
}

async function saveUser(username, password) {
  try {
    const users = await loadUsers();
    if (users[username]) return { ok: false, msg: "Username already taken" };
    users[username] = { password, created: Date.now(), messages: [], drawings: [] };
    await window.storage.set("nova_users", JSON.stringify(users));
    return { ok: true };
  } catch (e) { return { ok: false, msg: "Storage error" }; }
}

async function loginUser(username, password) {
  const users = await loadUsers();
  if (!users[username]) return { ok: false, msg: "User not found" };
  if (users[username].password !== password) return { ok: false, msg: "Wrong password" };
  return { ok: true, data: users[username] };
}

async function saveMessages(username, messages) {
  try {
    const users = await loadUsers();
    if (!users[username]) return;
    users[username].messages = messages.slice(-60);
    await window.storage.set("nova_users", JSON.stringify(users));
  } catch {}
}

async function saveDrawing(username, dataUrl) {
  try {
    const users = await loadUsers();
    if (!users[username]) return;
    const drawings = users[username].drawings || [];
    drawings.push({ url: dataUrl, time: Date.now() });
    users[username].drawings = drawings.slice(-10);
    await window.storage.set("nova_users", JSON.stringify(users));
  } catch {}
}

// ── AVATAR SVG ───────────────────────────────────────────────
function Avatar({ speaking, size = 90 }) {
  const [mouth, setMouth] = useState(false);
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (!speaking) { setMouth(false); return; }
    const t = setInterval(() => setMouth(m => !m), 130);
    return () => clearInterval(t);
  }, [speaking]);

  useEffect(() => {
    const t = setInterval(() => {
      setBlink(true);
      setTimeout(() => setBlink(false), 120);
    }, 3200);
    return () => clearInterval(t);
  }, []);

  return (
    <svg viewBox="0 0 200 200" width={size} height={size} style={{ display: "block", margin: "0 auto" }}>
      <ellipse cx="100" cy="100" rx="60" ry="68" fill="#f5c9a0"/>
      <ellipse cx="100" cy="46"  rx="60" ry="26" fill="#3d2b1f"/>
      <ellipse cx="42"  cy="78"  rx="13" ry="28" fill="#3d2b1f"/>
      <ellipse cx="158" cy="78"  rx="13" ry="28" fill="#3d2b1f"/>
      <ellipse cx="76"  cy="97"  rx="10" ry={blink ? 1 : 11} fill="#2c1a0e"/>
      <ellipse cx="124" cy="97"  rx="10" ry={blink ? 1 : 11} fill="#2c1a0e"/>
      <circle  cx="79"  cy="94"  r="2.5" fill="#fff" opacity="0.55"/>
      <circle  cx="127" cy="94"  r="2.5" fill="#fff" opacity="0.55"/>
      {speaking && mouth
        ? <ellipse cx="100" cy="136" rx="13" ry="8" fill="#3d1a10"/>
        : <path d="M87 134 Q100 143 113 134" stroke="#c9956e" strokeWidth="2.5" fill="none" strokeLinecap="round"/>}
      <ellipse cx="66"  cy="116" rx="11" ry="6" fill="#e8907a" opacity="0.22"/>
      <ellipse cx="134" cy="116" rx="11" ry="6" fill="#e8907a" opacity="0.22"/>
    </svg>
  );
}

// ── AUTH SCREEN ───────────────────────────────────────────────
function AuthScreen({ onLogin }) {
  const [mode,     setMode]     = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [msg,      setMsg]      = useState("");
  const [loading,  setLoading]  = useState(false);

  async function submit() {
    if (!username.trim() || !password.trim()) { setMsg("Please fill all fields"); return; }
    setLoading(true); setMsg("");

    if (mode === "register") {
      const r = await saveUser(username.trim(), password);
      if (r.ok) {
        setMsg("Account created! Logging in…");
        setTimeout(() => onLogin(username.trim(), []), 800);
      } else setMsg(r.msg);
    } else {
      const r = await loginUser(username.trim(), password);
      if (r.ok) onLogin(username.trim(), r.data.messages || []);
      else setMsg(r.msg);
    }
    setLoading(false);
  }

  return (
    <div className="auth-screen">
      {/* Background orbs */}
      <div className="orb orb-1"/>
      <div className="orb orb-2"/>
      <div className="orb orb-3"/>

      <div className="auth-card">
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div className="auth-logo-ring">
            <Avatar size={60}/>
          </div>
          <h1 className="auth-title">Nova</h1>
          <p className="auth-subtitle">Your AI Companion · Draw · Storm</p>
        </div>

        {/* Card */}
        <div className="auth-box">
          {/* Mode tabs */}
          <div className="auth-tabs">
            {["login", "register"].map(m => (
              <button key={m} className={`auth-tab${mode === m ? " active" : ""}`}
                onClick={() => { setMode(m); setMsg(""); }}>
                {m === "login" ? "Sign In" : "Register"}
              </button>
            ))}
          </div>

          {/* Fields */}
          <div className="auth-field">
            <label>👤 Username</label>
            <input type="text" value={username} placeholder="Enter username"
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()}/>
          </div>
          <div className="auth-field">
            <label>🔒 Password</label>
            <input type="password" value={password} placeholder="Enter password"
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submit()}/>
          </div>

          {msg && (
            <p className={msg.includes("created") ? "auth-msg-ok" : "auth-msg-error"}>{msg}</p>
          )}

          <button className="auth-btn" onClick={submit} disabled={loading}>
            {loading ? "Please wait…" : mode === "login" ? "Sign In ✨" : "Create Account 🚀"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── DRAW SECTION ─────────────────────────────────────────────
function DrawSection({ username }) {
  const canvasRef = useRef(null);
  const [color, setColor] = useState("#fff");
  const [size,  setSize]  = useState(8);
  const [tool,  setTool]  = useState("pen");
  const [shape, setShape] = useState("free");
  const [fill,  setFill]  = useState(false);
  const [bg,    setBg]    = useState("#111");
  const [saved, setSaved] = useState(false);
  const drawing  = useRef(false);
  const last     = useRef(null);
  const startPt  = useRef(null);
  const snapshot = useRef(null);

  useEffect(() => {
    const c = canvasRef.current;
    c.width = c.offsetWidth; c.height = c.offsetHeight;
    const ctx = c.getContext("2d");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height);
  }, []);

  function pos(e) {
    const c = canvasRef.current, r = c.getBoundingClientRect();
    const s = e.touches ? e.touches[0] : e;
    return [s.clientX - r.left, s.clientY - r.top];
  }

  function startDraw(e) {
    e.preventDefault();
    const c = canvasRef.current, ctx = c.getContext("2d");
    drawing.current = true;
    const p = pos(e); startPt.current = p; last.current = p;
    snapshot.current = ctx.getImageData(0, 0, c.width, c.height);
  }

  function doDraw(e) {
    if (!drawing.current) return; e.preventDefault();
    const c = canvasRef.current, ctx = c.getContext("2d");
    const [x, y]   = pos(e);
    const [sx, sy] = startPt.current;

    if (shape === "free" || tool === "eraser") {
      ctx.globalCompositeOperation = tool === "eraser" ? "destination-out" : "source-over";
      ctx.strokeStyle = color;
      ctx.lineWidth   = tool === "eraser" ? size * 4 : size;
      ctx.lineCap = "round"; ctx.lineJoin = "round";
      ctx.beginPath();
      if (last.current) ctx.moveTo(...last.current);
      ctx.lineTo(x, y); ctx.stroke(); last.current = [x, y];
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.putImageData(snapshot.current, 0, 0);
      ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = size;
      ctx.beginPath();
      if (shape === "rect") {
        fill ? ctx.fillRect(sx, sy, x - sx, y - sy) : ctx.strokeRect(sx, sy, x - sx, y - sy);
      } else if (shape === "circle") {
        const rx = Math.abs(x - sx) / 2, ry = Math.abs(y - sy) / 2;
        ctx.ellipse(sx + (x - sx) / 2, sy + (y - sy) / 2, rx, ry, 0, 0, Math.PI * 2);
        fill ? ctx.fill() : ctx.stroke();
      } else if (shape === "line") {
        ctx.moveTo(sx, sy); ctx.lineTo(x, y); ctx.stroke();
      } else if (shape === "triangle") {
        ctx.moveTo(sx + (x - sx) / 2, sy);
        ctx.lineTo(x, y); ctx.lineTo(sx, y); ctx.closePath();
        fill ? ctx.fill() : ctx.stroke();
      }
    }
  }

  function endDraw() { drawing.current = false; last.current = null; }

  function clearCanvas() {
    const c = canvasRef.current, ctx = c.getContext("2d");
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height);
  }

  function changeBg(b) {
    setBg(b);
    const c = canvasRef.current, ctx = c.getContext("2d");
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = b; ctx.fillRect(0, 0, c.width, c.height);
    ctx.globalCompositeOperation = "source-over";
  }

  function download() {
    const c = canvasRef.current, a = document.createElement("a");
    a.href = c.toDataURL("image/png"); a.download = "nova-art.png"; a.click();
  }

  async function saveToCloud() {
    const dataUrl = canvasRef.current.toDataURL("image/png");
    await saveDrawing(username, dataUrl);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  const shapes = [
    { id: "free",     label: "✏️" },
    { id: "line",     label: "╱"  },
    { id: "rect",     label: "▭"  },
    { id: "circle",   label: "◯"  },
    { id: "triangle", label: "△"  },
  ];

  return (
    <div>
      <div className="draw-toolbar">
        {/* Colors */}
        <div className="toolbar-row">
          <span className="toolbar-label">Color</span>
          {PALETTE.map(c => (
            <div key={c} className={`color-dot${color === c ? " active" : ""}`}
              style={{ background: c }} onClick={() => setColor(c)}/>
          ))}
          <input type="color" value={color} onChange={e => setColor(e.target.value)}
            style={{ width: 28, height: 28, borderRadius: "50%", border: "1.5px solid rgba(255,255,255,0.2)", cursor: "pointer", padding: 0 }}/>
        </div>

        {/* Shapes */}
        <div className="toolbar-row">
          <span className="toolbar-label">Shape</span>
          {shapes.map(s => (
            <button key={s.id} className={`shape-btn${shape === s.id && tool !== "eraser" ? " active" : ""}`}
              onClick={() => { setShape(s.id); setTool("pen"); }}>{s.label}</button>
          ))}
          <button className={`eraser-btn${tool === "eraser" ? " active" : ""}`}
            onClick={() => setTool("eraser")}>🧹</button>
          <label style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", display: "flex", alignItems: "center", gap: 4 }}>
            <input type="checkbox" checked={fill} onChange={e => setFill(e.target.checked)}/> Fill
          </label>
          <span className="toolbar-label" style={{ marginLeft: 4 }}>Size</span>
          <input type="range" min={1} max={40} value={size} onChange={e => setSize(+e.target.value)} style={{ width: 80 }}/>
          <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>{size}px</span>
        </div>

        {/* BG + actions */}
        <div className="toolbar-row">
          <span className="toolbar-label">BG</span>
          {["#111","#fff","#1a2a1a","#0a0a2a","#1a0a0a"].map(b => (
            <div key={b} className={`bg-dot${bg === b ? " active" : ""}`}
              style={{ background: b }} onClick={() => changeBg(b)}/>
          ))}
          <div style={{ flex: 1 }}/>
          <button className="draw-action-btn clear"    onClick={clearCanvas}>🗑️ Clear</button>
          <button className="draw-action-btn download" onClick={download}>💾 Download</button>
          <button className="draw-action-btn save-cloud" onClick={saveToCloud}>
            {saved ? "✅ Saved!" : "☁️ Save"}
          </button>
        </div>
      </div>

      <canvas ref={canvasRef} className="draw-canvas"
        onMouseDown={startDraw} onMouseMove={doDraw} onMouseUp={endDraw} onMouseLeave={endDraw}
        onTouchStart={startDraw} onTouchMove={doDraw} onTouchEnd={endDraw}/>
    </div>
  );
}

// ── STORM RAINFOREST ─────────────────────────────────────────
function RainforestSection() {
  const canvasRef       = useRef(null);
  const audioCtxRef     = useRef(null);
  const rainGainRef     = useRef(null);
  const thunderGainRef  = useRef(null);
  const animRef         = useRef(null);
  const flashRef        = useRef(0);
  const nextThunderRef  = useRef(null);

  const [playing,     setPlaying]     = useState(false);
  const [rainVol,     setRainVol]     = useState(0.75);
  const [thunderVol,  setThunderVol]  = useState(0.85);

  // ── Audio engine ──────────────────────────────────────────
  function buildAudio(ctx) {
    const master = ctx.createGain(); master.gain.value = 1; master.connect(ctx.destination);

    // Rain
    const rainMaster = ctx.createGain(); rainMaster.gain.value = rainVol; rainMaster.connect(master);
    rainGainRef.current = rainMaster;

    function noiseLayer(freq, q, gainVal, pan) {
      const buf = ctx.createBuffer(2, ctx.sampleRate * 4, ctx.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch); let l = 0;
        for (let i = 0; i < d.length; i++) {
          l = (l + 0.02 * (Math.random() * 2 - 1)) / 1.02;
          d[i] = l * 20 + (Math.random() * 2 - 1) * 0.5;
        }
      }
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const p   = ctx.createStereoPanner(); p.pan.value = pan;
      const bp  = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = freq; bp.Q.value = q;
      const hp  = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = freq * 0.4;
      const g   = ctx.createGain(); g.gain.value = gainVal;
      src.connect(bp); bp.connect(hp); hp.connect(p); p.connect(g); g.connect(rainMaster);
      src.start(ctx.currentTime + Math.random() * 0.3);
    }
    noiseLayer(180,  1.8, 0.55,  0);
    noiseLayer(900,  0.7, 0.80, -0.2);
    noiseLayer(1400, 0.5, 0.65,  0.3);
    noiseLayer(3200, 0.35,0.30, -0.4);
    noiseLayer(5500, 0.25,0.18,  0.4);
    noiseLayer(420,  2.0, 0.40,  0.1);

    const lfo  = ctx.createOscillator(); lfo.frequency.value = 0.06;
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.12;
    lfo.connect(lfoG); lfoG.connect(rainMaster.gain); lfo.start();

    // Thunder
    const thunderMaster = ctx.createGain(); thunderMaster.gain.value = thunderVol; thunderMaster.connect(master);
    thunderGainRef.current = thunderMaster;

    function triggerThunder() {
      if (!audioCtxRef.current) return;
      const c = audioCtxRef.current, when = c.currentTime, dur = 3.5 + Math.random() * 3;

      // Initial crack
      const crackBuf = c.createBuffer(1, c.sampleRate * 0.18, c.sampleRate);
      const cd = crackBuf.getChannelData(0);
      for (let i = 0; i < cd.length; i++) cd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (c.sampleRate * 0.04));
      const crack = c.createBufferSource(); crack.buffer = crackBuf;
      const cf = c.createBiquadFilter(); cf.type = "lowpass"; cf.frequency.value = 800;
      const cg = c.createGain(); cg.gain.value = 2.2;
      crack.connect(cf); cf.connect(cg); cg.connect(thunderMaster); crack.start(when);

      // Rolling rumble
      const rBuf = c.createBuffer(2, c.sampleRate * dur, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = rBuf.getChannelData(ch); let s = 0;
        for (let i = 0; i < d.length; i++) {
          s = s * 0.998 + (Math.random() * 2 - 1) * 0.002;
          d[i] = s * 60 * Math.exp(-i / (c.sampleRate * (dur * 0.38)));
        }
      }
      const rumble = c.createBufferSource(); rumble.buffer = rBuf;
      const rf  = c.createBiquadFilter(); rf.type  = "lowpass";  rf.frequency.value = 280; rf.Q.value = 0.5;
      const rf2 = c.createBiquadFilter(); rf2.type = "highpass"; rf2.frequency.value = 30;
      const rg  = c.createGain(); rg.gain.value = 1.8;
      const convBuf = c.createBuffer(2, c.sampleRate * 2.5, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = convBuf.getChannelData(ch);
        for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 1.5);
      }
      const conv  = c.createConvolver(); conv.buffer = convBuf;
      const convG = c.createGain(); convG.value = 0.6;
      rumble.connect(rf); rf.connect(rf2); rf2.connect(rg); rg.connect(thunderMaster);
      rf2.connect(conv); conv.connect(convG); convG.connect(thunderMaster);
      rumble.start(when + 0.05);

      // Flash visual
      flashRef.current = 1;
      setTimeout(() => { flashRef.current = 0.5; }, 80);
      setTimeout(() => { flashRef.current = 0;   }, 220);

      nextThunderRef.current = setTimeout(triggerThunder, 9000 + Math.random() * 20000);
    }
    nextThunderRef.current = setTimeout(triggerThunder, 2500 + Math.random() * 5000);
  }

  function toggleStorm() {
    if (playing) {
      clearTimeout(nextThunderRef.current);
      audioCtxRef.current?.close();
      audioCtxRef.current = rainGainRef.current = thunderGainRef.current = null;
      setPlaying(false);
    } else {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      audioCtxRef.current = ctx; buildAudio(ctx); setPlaying(true);
    }
  }

  useEffect(() => { if (rainGainRef.current)    rainGainRef.current.gain.value    = rainVol;    }, [rainVol]);
  useEffect(() => { if (thunderGainRef.current) thunderGainRef.current.gain.value = thunderVol; }, [thunderVol]);
  useEffect(() => () => { clearTimeout(nextThunderRef.current); audioCtxRef.current?.close(); cancelAnimationFrame(animRef.current); }, []);

  // ── Canvas scene ─────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const W = canvas.width = canvas.offsetWidth, H = canvas.height = canvas.offsetHeight;
    const ctx = canvas.getContext("2d");
    let t = 0, stormFlash = 0;

    const drops = Array.from({ length: 900 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      len: 10 + Math.random() * 22, speed: 9 + Math.random() * 10,
      op: 0.2 + Math.random() * 0.55, wind: 2.5 + Math.random() * 2,
    }));

    const ripples = [];
    const ripInt = setInterval(() => {
      for (let i = 0; i < 4; i++)
        ripples.push({ x: Math.random() * W, y: H * 0.7 + Math.random() * H * 0.3, r: 0, max: 6 + Math.random() * 16, op: 0.7 });
    }, 40);

    // Scene drawing helpers (same as artifact version)
    function sky() {
      const g = ctx.createLinearGradient(0,0,0,H*0.5);
      g.addColorStop(0,"#050c05"); g.addColorStop(0.5,"#0a130a"); g.addColorStop(1,"#0f1f0f");
      ctx.fillStyle=g; ctx.fillRect(0,0,W,H*0.5);
      for(let i=0;i<6;i++){
        const cx=W*(0.1+i*0.18)+Math.sin(t*0.04+i)*12, cy=H*(0.05+Math.sin(t*0.03+i*0.7)*0.03);
        const cg=ctx.createRadialGradient(cx,cy,0,cx,cy,W*0.14);
        cg.addColorStop(0,"rgba(28,38,28,0.92)"); cg.addColorStop(0.6,"rgba(18,26,18,0.7)"); cg.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=cg; ctx.beginPath(); ctx.ellipse(cx,cy,W*0.14,H*0.08,0,0,Math.PI*2); ctx.fill();
      }
    }
    function ground() {
      const g=ctx.createLinearGradient(0,H*0.68,0,H);
      g.addColorStop(0,"#0a1a08"); g.addColorStop(0.5,"#0d1f0a"); g.addColorStop(1,"#080e06");
      ctx.fillStyle=g; ctx.fillRect(0,H*0.68,W,H*0.32);
      const sh=ctx.createLinearGradient(0,H*0.69,0,H*0.77);
      sh.addColorStop(0,`rgba(80,160,100,${0.06+stormFlash*0.08})`); sh.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle=sh; ctx.fillRect(0,H*0.69,W,H*0.1);
    }
    function tree(x,bY,h,thick,shade) {
      const tg=ctx.createLinearGradient(x-thick,0,x+thick,0);
      tg.addColorStop(0,`hsl(25,28%,${shade-6}%)`); tg.addColorStop(0.45,`hsl(25,28%,${shade+3}%)`); tg.addColorStop(1,`hsl(25,28%,${shade-8}%)`);
      ctx.fillStyle=tg; ctx.beginPath();
      ctx.moveTo(x-thick,bY); ctx.lineTo(x-thick*0.55,bY-h*0.52); ctx.lineTo(x+thick*0.55,bY-h*0.52); ctx.lineTo(x+thick,bY); ctx.fill();
      const sway=Math.sin(t*0.5+x*0.04)*3.5;
      [[0.52,thick*4.2,h*0.3,shade-1],[0.68,thick*3.2,h*0.24,shade+2],[0.82,thick*2.2,h*0.19,shade+6],[0.93,thick*1.3,h*0.13,shade+11]].forEach(([yO,rx,ry,sh2])=>{
        const fy=bY-h*yO;
        const fg=ctx.createRadialGradient(x+sway*0.6,fy,0,x+sway*0.6,fy,rx);
        fg.addColorStop(0,`hsl(122,52%,${sh2}%)`); fg.addColorStop(0.65,`hsl(125,56%,${sh2-2}%)`); fg.addColorStop(1,"rgba(0,0,0,0)");
        ctx.fillStyle=fg; ctx.beginPath(); ctx.ellipse(x+sway*0.6,fy,rx,ry,0,0,Math.PI*2); ctx.fill();
        if(stormFlash>0.2){const hg=ctx.createRadialGradient(x,fy,0,x,fy,rx);hg.addColorStop(0,`rgba(200,230,200,${stormFlash*0.12})`);hg.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=hg;ctx.beginPath();ctx.ellipse(x+sway*0.6,fy,rx,ry,0,0,Math.PI*2);ctx.fill();}
      });
      for(let v=0;v<3;v++){const vx=x-thick+(v*thick);ctx.strokeStyle="rgba(40,110,35,0.45)";ctx.lineWidth=1.2;ctx.beginPath();ctx.moveTo(vx,bY-h*0.52);for(let s=0;s<9;s++)ctx.lineTo(vx+Math.sin(t*0.35+v+s*0.7)*5,bY-h*0.52+s*(h*0.065));ctx.stroke();}
    }
    function fern(x,y,sz){ctx.strokeStyle="rgba(35,160,55,0.5)";ctx.lineWidth=1.1;for(let i=0;i<7;i++){const a=(-0.7+i*0.23)+Math.sin(t*0.55+x*0.02)*0.05;ctx.beginPath();ctx.moveTo(x,y);const ex=x+Math.cos(a)*sz,ey=y+Math.sin(a)*sz*0.65;ctx.quadraticCurveTo(x+Math.cos(a-0.35)*sz*0.5,y+Math.sin(a-0.35)*sz*0.3,ex,ey);for(let l=1;l<=5;l++){const lt=l/6,lx=x+(ex-x)*lt,ly=y+(ey-y)*lt,la=a+Math.PI/2,ls=sz*0.16*(1-lt*0.35);ctx.moveTo(lx,ly);ctx.lineTo(lx+Math.cos(la)*ls,ly+Math.sin(la)*ls);ctx.moveTo(lx,ly);ctx.lineTo(lx-Math.cos(la)*ls,ly-Math.sin(la)*ls);}ctx.stroke();}}
    function rays(){for(let i=0;i<5;i++){const rx=W*(0.15+i*0.18),op=(0.012+Math.sin(t*0.18+i)*0.006)*(1+stormFlash*0.5);const rg=ctx.createLinearGradient(rx,0,rx+35,H*0.72);rg.addColorStop(0,`rgba(160,230,140,${op})`);rg.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=rg;ctx.beginPath();ctx.moveTo(rx-8,0);ctx.lineTo(rx+44,0);ctx.lineTo(rx+78,H*0.72);ctx.lineTo(rx+24,H*0.72);ctx.fill();}}
    function mist(y,op,h2){const g=ctx.createLinearGradient(0,y,0,y+h2);g.addColorStop(0,"rgba(160,210,160,0)");g.addColorStop(0.4,`rgba(160,210,160,${op+stormFlash*0.02})`);g.addColorStop(1,"rgba(160,210,160,0)");ctx.fillStyle=g;ctx.fillRect(0,y,W,h2);}
    function rain(){drops.forEach(d=>{ctx.strokeStyle=`rgba(190,225,255,${d.op*(0.8+stormFlash*0.4)})`;ctx.lineWidth=0.8+stormFlash*0.3;ctx.beginPath();ctx.moveTo(d.x,d.y);ctx.lineTo(d.x+d.wind+stormFlash*1.5,d.y+d.len+stormFlash*5);ctx.stroke();d.y+=d.speed*(1+stormFlash*0.5);d.x+=d.wind*0.6;if(d.y>H){d.y=-20;d.x=Math.random()*W;}});}
    function ripplesD(){for(let i=ripples.length-1;i>=0;i--){const r=ripples[i];ctx.strokeStyle=`rgba(140,210,160,${r.op*(1-r.r/r.max)})`;ctx.lineWidth=0.9;ctx.beginPath();ctx.ellipse(r.x,r.y,r.r,r.r*0.28,0,0,Math.PI*2);ctx.stroke();r.r+=0.5;r.op-=0.012;if(r.r>r.max)ripples.splice(i,1);}}
    function fireflies(){for(let i=0;i<8;i++){const fx=W*0.08+(i*W*0.12)+Math.sin(t*0.28+i*1.4)*18,fy=H*0.38+Math.sin(t*0.45+i*0.95)*48,fop=Math.max(0,0.35+Math.sin(t*1.8+i)*0.4)*(1-stormFlash*0.7);if(fop<0.05)return;ctx.fillStyle=`rgba(210,255,80,${fop})`;ctx.beginPath();ctx.arc(fx,fy,1.8,0,Math.PI*2);ctx.fill();const fg=ctx.createRadialGradient(fx,fy,0,fx,fy,10);fg.addColorStop(0,`rgba(210,255,80,${fop*0.3})`);fg.addColorStop(1,"rgba(0,0,0,0)");ctx.fillStyle=fg;ctx.beginPath();ctx.arc(fx,fy,10,0,Math.PI*2);ctx.fill();}}
    function lightning(){if(stormFlash<0.15)return;ctx.fillStyle=`rgba(200,230,255,${stormFlash*0.22})`;ctx.fillRect(0,0,W,H);if(stormFlash>0.5){const bx=W*(0.2+Math.random()*0.6);ctx.strokeStyle=`rgba(240,255,255,${stormFlash*0.95})`;ctx.lineWidth=1.5+stormFlash;ctx.shadowColor="#aaddff";ctx.shadowBlur=18*stormFlash;ctx.beginPath();ctx.moveTo(bx,0);let lx=bx,ly=0;while(ly<H*0.62){ly+=18+Math.random()*22;lx+=(Math.random()-0.5)*30;ctx.lineTo(lx,ly);}ctx.stroke();ctx.shadowBlur=0;}}

    const trees=[
      {x:W*0.04,h:H*0.85,thick:14,shade:11},{x:W*0.17,h:H*0.78,thick:11,shade:13},
      {x:W*0.31,h:H*0.92,thick:16,shade:10},{x:W*0.47,h:H*0.72,thick:10,shade:15},
      {x:W*0.61,h:H*0.90,thick:15,shade:10},{x:W*0.76,h:H*0.79,thick:12,shade:12},
      {x:W*0.91,h:H*0.86,thick:14,shade:11},{x:W*0.11,h:H*0.62,thick:8, shade:17},
      {x:W*0.54,h:H*0.60,thick:7, shade:18},{x:W*0.84,h:H*0.64,thick:9, shade:16},
    ];
    const ferns2 = Array.from({length:22},(_,i)=>({x:(i*W/22)+Math.random()*25,y:H*0.71+Math.random()*H*0.1,size:26+Math.random()*34}));

    function frame() {
      t += 0.016;
      stormFlash = flashRef.current > 0 ? flashRef.current : Math.max(0, stormFlash - 0.08);
      ctx.clearRect(0,0,W,H);
      sky(); rays();
      trees.filter((_,i)=>i>=7).forEach(tr=>tree(tr.x,H*0.72,tr.h*0.68,tr.thick*0.7,tr.shade-4));
      mist(H*0.36,0.045,H*0.14);
      trees.filter((_,i)=>i>=4&&i<7).forEach(tr=>tree(tr.x,H*0.72,tr.h,tr.thick,tr.shade));
      mist(H*0.50,0.06,H*0.12);
      trees.filter((_,i)=>i<4).forEach(tr=>tree(tr.x,H*0.72,tr.h,tr.thick,tr.shade));
      ground(); ferns2.forEach(f=>fern(f.x,f.y,f.size));
      mist(H*0.65,0.08,H*0.07); ripplesD(); rain(); fireflies(); lightning();
      const v=ctx.createRadialGradient(W/2,H/2,H*0.28,W/2,H/2,H*0.9);
      v.addColorStop(0,"rgba(0,0,0,0)"); v.addColorStop(1,"rgba(0,0,0,0.78)");
      ctx.fillStyle=v; ctx.fillRect(0,0,W,H);
      animRef.current = requestAnimationFrame(frame);
    }
    frame();
    return () => { cancelAnimationFrame(animRef.current); clearInterval(ripInt); };
  }, []);

  return (
    <div>
      <div className="storm-canvas-wrap">
        <canvas ref={canvasRef} className="storm-canvas"/>
        <div className="storm-badge">⛈ RAINFOREST STORM · LIVE</div>
        {playing && (
          <div className="storm-waveform">
            {Array.from({length:11},(_,i)=>(
              <div key={i} className="waveform-bar" style={{ animationDelay: `${i*0.07}s` }}/>
            ))}
          </div>
        )}
      </div>

      <div className="storm-controls">
        <div style={{ display:"flex", gap:10, marginBottom:14, flexWrap:"wrap", alignItems:"center" }}>
          <button className={`storm-play-btn ${playing ? "playing" : "stopped"}`} onClick={toggleStorm}>
            {playing ? "⏸  Stop Storm" : "⛈  Start Storm"}
          </button>
          {!playing && <span className="storm-hint">Press to enter the rainforest…</span>}
        </div>
        {playing && <>
          <div className="volume-row">
            <div className="volume-label-row">
              <span className="volume-label rain">🌧 Rain Intensity</span>
              <span className="volume-pct">{Math.round(rainVol*100)}%</span>
            </div>
            <input type="range" min={0} max={1} step={0.02} value={rainVol}
              onChange={e => setRainVol(+e.target.value)} style={{ width:"100%", accentColor:"#88ccff" }}/>
          </div>
          <div className="volume-row">
            <div className="volume-label-row">
              <span className="volume-label thunder">⚡ Thunder Power</span>
              <span className="volume-pct">{Math.round(thunderVol*100)}%</span>
            </div>
            <input type="range" min={0} max={1} step={0.02} value={thunderVol}
              onChange={e => setThunderVol(+e.target.value)} style={{ width:"100%", accentColor:"#ffdd66" }}/>
          </div>
        </>}
      </div>
      <p className="storm-footer">Close your eyes · breathe slowly · let the storm wash it all away 🌿⚡</p>
    </div>
  );
}

// ── CHAT SECTION ─────────────────────────────────────────────
function ChatSection({ user, messages, setMessages, novaText, setNovaText }) {
  const [input,      setInput]      = useState("");
  const [loading,    setLoading]    = useState(false);
  const [speaking,   setSpeaking]   = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages]);
  useEffect(() => () => window.speechSynthesis?.cancel(), []);
  useEffect(() => { if (user && messages.length > 0) saveMessages(user, messages); }, [messages]);

  function speak(text) {
    if (!ttsEnabled) return;
    window.speechSynthesis?.cancel();
    const u = new SpeechSynthesisUtterance(text); u.rate = 0.95; u.pitch = 1.05;
    const v = window.speechSynthesis.getVoices();
    const p = v.find(x => x.name.includes("Samantha") || x.name.includes("Karen") || x.name.includes("Google UK English Female"));
    if (p) u.voice = p;
    u.onstart = () => setSpeaking(true); u.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
  }

  async function sendMessage(text) {
    if (!text.trim() || loading) return;
    const userMsg = { role:"user", text };
    const next    = [...messages, userMsg];
    setMessages(next); setInput(""); setLoading(true);
    window.speechSynthesis?.cancel(); setSpeaking(false);
    try {
      const res = await fetch(ANTHROPIC_API, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: MODEL, max_tokens: 1000, system: SYSTEM_PROMPT,
          messages: next.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text })) })
      });
      const data  = await res.json();
      const reply = data.content?.map(b => b.text || "").join("") || "I'm right here with you.";
      setMessages(prev => [...prev, { role:"assistant", text:reply }]);
      setNovaText(reply); speak(reply);
    } catch {
      const fb = "I'm still here with you.";
      setMessages(prev => [...prev, { role:"assistant", text:fb }]); setNovaText(fb);
    }
    setLoading(false);
  }

  return (
    <>
      <div className="nova-panel">
        <div className="nova-avatar-ring"><Avatar speaking={speaking} size={80}/></div>
        <p className="nova-name">Nova</p>
        <div className="nova-bubble">
          {loading ? <span style={{color:"#a8a4ff"}}>Nova is thinking…</span> : novaText}
        </div>
        <button className="voice-toggle-btn" onClick={() => setTtsEnabled(x => !x)}>
          {ttsEnabled ? "🔊 Voice on" : "🔇 Voice off"}
        </button>
      </div>

      <div className="quick-btns">
        {QUICK_REPLIES.map(q => (
          <button key={q.label} className="quick-btn" disabled={loading}
            onClick={() => sendMessage(q.text)}>{q.label}</button>
        ))}
      </div>

      {messages.length > 0 && (
        <div className="chat-history">
          {messages.map((m, i) => (
            <div key={i} className={m.role === "user" ? "msg-user" : "msg-nova"}>
              <div className={`msg-bubble ${m.role}`}>
                <span className="msg-sender">{m.role === "user" ? "You" : "Nova"}</span>
                {m.text}
              </div>
            </div>
          ))}
          <div ref={bottomRef}/>
        </div>
      )}

      <div className="chat-input-row">
        <input className="chat-input" value={input} placeholder="Talk to Nova…"
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && sendMessage(input)}/>
        <button className="send-btn" disabled={loading || !input.trim()}
          onClick={() => sendMessage(input)}>Send</button>
      </div>
      <p className="disclaimer">Not a therapist · For real distress, talk to a trusted person 💙</p>
    </>
  );
}

// ── ROOT APP ─────────────────────────────────────────────────
function App() {
  const [user,     setUser]     = useState(null);
  const [tab,      setTab]      = useState("chat");
  const [messages, setMessages] = useState([]);
  const [novaText, setNovaText] = useState("Hey! I'm Nova. How are you feeling today?");

  function onLogin(username, msgs) {
    setUser(username); setMessages(msgs);
    if (msgs.length > 0) setNovaText("Welcome back! How are you feeling today?");
  }

  if (!user) return <AuthScreen onLogin={onLogin}/>;

  const tabs = [
    { id:"chat",   label:"💬 Chat"  },
    { id:"draw",   label:"🎨 Draw"  },
    { id:"forest", label:"⛈ Storm" },
  ];

  return (
    <div className="app-bg">
      {/* Background orbs */}
      <div className="orb orb-1"/>
      <div className="orb orb-2"/>
      <div className="orb orb-3"/>
      <div className="orb orb-4"/>

      <div className="app-container">
        {/* Header */}
        <div className="app-header">
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div className="app-header-logo">✨</div>
            <div>
              <p className="app-header-name">Nova</p>
              <p className="app-header-sub">Welcome, {user} 👋</p>
            </div>
          </div>
          <button className="signout-btn" onClick={() => setUser(null)}>Sign Out</button>
        </div>

        {/* Tabs */}
        <div className="tab-bar">
          {tabs.map(t => (
            <button key={t.id} className={`tab-btn${tab === t.id ? " active" : ""}`}
              onClick={() => setTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {/* Panels */}
        {tab === "chat"   && <ChatSection user={user} messages={messages} setMessages={setMessages} novaText={novaText} setNovaText={setNovaText}/>}
        {tab === "draw"   && <DrawSection username={user}/>}
        {tab === "forest" && <RainforestSection/>}
      </div>
    </div>
  );
}

// ── MOUNT ────────────────────────────────────────────────────
const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App/>);