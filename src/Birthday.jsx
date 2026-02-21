import { useState, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import config from "./config.json";

// ─── Themes ───────────────────────────────────────────────────────────────────
const THEMES = {
  chocolate: {
    cake: "#3b1503",
    topCake: "#6b3012",
    dot: "#c0692a",
    accent: "#a0522d",
    frosting: "#faebd7",
    ganache: "#1a0800",
  },
  blush: {
    cake: "#F48FB1",
    topCake: "#f8bbd0",
    dot: "#F06292",
    accent: "#E91E63",
    frosting: "#FFEEF4",
    ganache: "#c2185b",
  },
  sunshine: {
    cake: "#FFD54F",
    topCake: "#ffe082",
    dot: "#FFB300",
    accent: "#E65100",
    frosting: "#FFFDE7",
    ganache: "#e65100",
  },
  dreamy: {
    cake: "#CE93D8",
    topCake: "#e1bee7",
    dot: "#AB47BC",
    accent: "#6A1B9A",
    frosting: "#F3E5F5",
    ganache: "#4a148c",
  },
  garden: {
    cake: "#80CBC4",
    topCake: "#b2dfdb",
    dot: "#26A69A",
    accent: "#00695C",
    frosting: "#E0F2F1",
    ganache: "#004d40",
  },
};

const CANDLE_COLORS = [
  0xffaaaa, 0xaaffaa, 0xaaaaff, 0xffeeaa, 0xffaaff, 0xaaffff, 0xffccaa,
  0xccaaff,
];

// ─── Happy Birthday melody ────────────────────────────────────────────────────
const MELODY = [
  [261.63, 0.28],
  [0, 0.06],
  [261.63, 0.28],
  [0, 0.06],
  [293.66, 0.56],
  [261.63, 0.56],
  [349.23, 0.56],
  [329.63, 0.96],
  [0, 0.22],
  [261.63, 0.28],
  [0, 0.06],
  [261.63, 0.28],
  [0, 0.06],
  [293.66, 0.56],
  [261.63, 0.56],
  [392.0, 0.56],
  [349.23, 0.96],
  [0, 0.22],
  [261.63, 0.28],
  [0, 0.06],
  [261.63, 0.28],
  [0, 0.06],
  [523.25, 0.56],
  [440.0, 0.56],
  [349.23, 0.56],
  [329.63, 0.56],
  [293.66, 0.76],
  [0, 0.22],
  [466.16, 0.28],
  [0, 0.06],
  [466.16, 0.28],
  [0, 0.06],
  [440.0, 0.56],
  [349.23, 0.56],
  [392.0, 0.56],
  [349.23, 1.15],
];
function playMelody(ctx) {
  let t = ctx.currentTime + 0.05;
  MELODY.forEach(([f, d]) => {
    if (f > 0) {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.connect(g);
      g.connect(ctx.destination);
      osc.type = "triangle";
      osc.frequency.value = f;
      g.gain.setValueAtTime(0.001, t);
      g.gain.linearRampToValueAtTime(0.18, t + 0.025);
      g.gain.exponentialRampToValueAtTime(0.001, t + d * 0.87);
      osc.start(t);
      osc.stop(t + d);
    }
    t += d * 0.92;
  });
  return (t - ctx.currentTime) * 1000;
}

// ─── Candle positions — multi-ring for large counts ───────────────────────────
function getCandlePositions(n) {
  if (n === 0) return [];
  if (n === 1) return [{ x: 0, z: 0 }];

  const ring = (count, r, offset = 0) =>
    Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2 + offset;
      return { x: Math.cos(a) * r, z: Math.sin(a) * r };
    });

  if (n <= 7) return ring(n, n <= 3 ? 0.5 : 0.82);
  if (n <= 13) {
    const outer = Math.ceil(n * 0.65);
    return [
      ...ring(outer, 1.18),
      ...ring(n - outer, 0.56, Math.PI / (n - outer)),
    ];
  }
  // 3 rings: outer 13, middle up to 8, rest in center
  const outerN = 13;
  const middleN = Math.min(8, n - outerN - (n > outerN + 8 ? 1 : 0));
  const centerN = n - outerN - middleN;
  return [
    ...ring(outerN, 1.26),
    ...ring(middleN, 0.68, 0.24),
    ...(centerN === 1 ? [{ x: 0, z: 0 }] : ring(centerN, 0.24)),
  ];
}

function addMesh(group, geo, matOpts, pos) {
  const mat = new THREE.MeshPhongMaterial(matOpts);
  const m = new THREE.Mesh(geo, mat);
  if (pos) m.position.set(...pos);
  group.add(m);
  return m;
}

// ─── Stars ────────────────────────────────────────────────────────────────────
function Stars() {
  const pts = useRef(
    Array.from({ length: 110 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      size: `${0.8 + Math.random() * 2.4}px`,
      dur: `${2 + Math.random() * 4}s`,
      delay: `${Math.random() * 6}s`,
    })),
  );
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        zIndex: 1,
      }}
    >
      <style>{`@keyframes tw{0%,100%{opacity:.08}50%{opacity:.9}}`}</style>
      {pts.current.map((s) => (
        <div
          key={s.id}
          style={{
            position: "absolute",
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            background: "#fff",
            borderRadius: "50%",
            animation: `tw ${s.dur} ${s.delay} ease-in-out infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Confetti ─────────────────────────────────────────────────────────────────
function Confetti() {
  const pts = useRef(
    Array.from({ length: 80 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 2.8}s`,
      dur: `${2.5 + Math.random() * 2.5}s`,
      color: [
        "#FFD700",
        "#FF69B4",
        "#87CEEB",
        "#98FB98",
        "#DDA0DD",
        "#FFA07A",
        "#7FFFD4",
        "#FFB6C1",
      ][i % 8],
      size: `${5 + Math.random() * 8}px`,
      round: Math.random() > 0.5 ? "50%" : "2px",
    })),
  );
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        zIndex: 30,
      }}
    >
      <style>{`@keyframes fall{0%{transform:translateY(-40px) rotate(0deg);opacity:1}100%{transform:translateY(110vh) rotate(740deg);opacity:0}}`}</style>
      {pts.current.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            top: 0,
            left: p.left,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.round,
            animation: `fall ${p.dur} ${p.delay} ease-in infinite`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Celebration ──────────────────────────────────────────────────────────────
function CelebrationOverlay({ name, message, colors, onReset }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background:
          "radial-gradient(ellipse at center,rgba(0,0,0,.5) 0%,rgba(0,0,0,.9) 100%)",
      }}
    >
      <Confetti />
      <style>{`
        @keyframes popIn{0%{transform:scale(.25);opacity:0}70%{transform:scale(1.08)}100%{transform:scale(1);opacity:1}}
        @keyframes fadeUp{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}
        @keyframes glow{0%,100%{text-shadow:0 0 28px rgba(255,215,0,.45),0 2px 8px rgba(0,0,0,.8)}50%{text-shadow:0 0 60px rgba(255,215,0,.9),0 2px 8px rgba(0,0,0,.8)}}
        @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
      `}</style>
      <div
        style={{
          textAlign: "center",
          padding: "0 28px",
          position: "relative",
          zIndex: 31,
          animation: "popIn .7s cubic-bezier(.34,1.56,.64,1) both",
        }}
      >
        <div
          style={{
            fontSize: "clamp(2.2rem,8vw,3.8rem)",
            marginBottom: 8,
            animation: "pulse 1.5s ease-in-out infinite",
          }}
        >
          🎂 ✨ 🎉
        </div>
        <h1
          style={{
            margin: "0 0 4px",
            fontFamily: "Georgia,serif",
            fontStyle: "italic",
            fontSize: "clamp(1.4rem,4.5vw,3rem)",
            color: "#FFD700",
            animation: "glow 2.2s ease-in-out infinite",
          }}
        >
          Happy Birthday,
        </h1>
        <h1
          style={{
            margin: "0 0 20px",
            fontFamily: "Georgia,serif",
            fontWeight: 700,
            fontSize: "clamp(2.4rem,9vw,5.5rem)",
            lineHeight: 1.05,
            color: colors.frosting,
            textShadow: `0 0 40px ${colors.accent}99,0 3px 14px rgba(0,0,0,.95)`,
          }}
        >
          {name}!
        </h1>
        <p
          style={{
            fontFamily: "Georgia,serif",
            fontStyle: "italic",
            fontSize: "clamp(.88rem,2.8vw,1.25rem)",
            color: "rgba(255,255,255,.88)",
            maxWidth: 440,
            margin: "0 auto 36px",
            lineHeight: 1.8,
            animation: "fadeUp .55s .5s both",
          }}
        >
          {message}
        </p>
        <button
          onClick={onReset}
          style={{
            padding: "14px 36px",
            borderRadius: 50,
            background: `linear-gradient(135deg,${colors.accent},${colors.dot})`,
            border: "none",
            color: "white",
            cursor: "pointer",
            fontSize: "clamp(.9rem,2.5vw,1.05rem)",
            fontFamily: "Georgia,serif",
            letterSpacing: ".06em",
            boxShadow: `0 5px 28px ${colors.accent}66`,
            animation: "fadeUp .55s .9s both",
            minWidth: 200,
          }}
        >
          🕯️ Relight the candles
        </button>
      </div>
    </div>
  );
}

// ─── Blow Meter ───────────────────────────────────────────────────────────────
function BlowMeter({ blowLevel, litCount, onStop, accent }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div
        style={{
          color: "rgba(255,215,0,.75)",
          fontSize: "clamp(.82rem,2.5vw,.98rem)",
          marginBottom: 10,
          fontStyle: "italic",
        }}
      >
        🌬️ Blow into your mic &nbsp;·&nbsp; {litCount} candle
        {litCount !== 1 ? "s" : ""} left
      </div>
      {/* Meter */}
      <div
        style={{
          display: "inline-block",
          width: "min(240px,62vw)",
          height: 11,
          background: "rgba(255,255,255,.1)",
          borderRadius: 10,
          overflow: "hidden",
          boxShadow: "inset 0 1px 3px rgba(0,0,0,.4)",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${blowLevel * 100}%`,
            background: `linear-gradient(90deg,${accent},#FFD700)`,
            borderRadius: 10,
            transition: "width .07s ease",
            boxShadow: blowLevel > 0.25 ? `0 0 12px #FFD70088` : "none",
          }}
        />
      </div>
      <div>
        <button
          onClick={onStop}
          style={{
            marginTop: 10,
            background: "none",
            border: "1px solid rgba(255,255,255,.18)",
            color: "rgba(255,255,255,.4)",
            cursor: "pointer",
            padding: "5px 18px",
            borderRadius: 20,
            fontSize: ".78rem",
            fontFamily: "Georgia,serif",
          }}
        >
          cancel
        </button>
      </div>
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function BirthdayApp() {
  const {
    name,
    message,
    candleCount = 6,
    theme: themeKey = "chocolate",
    musicOn: musicDefault = false,
    blowSensitivity = 5,
    celebrationMusicUrl = "",
  } = config;

  const tc = THEMES[themeKey] ?? THEMES.chocolate;

  // ── State
  const [candlesLit, setCandlesLit] = useState(() =>
    Array(candleCount).fill(true),
  );
  const [allBlownOut, setAllBlownOut] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [blowLevel, setBlowLevel] = useState(0);
  const [micPermission, setMicPermission] = useState("idle");
  const [showCelebration, setShowCelebration] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [audioReady, setAudioReady] = useState(false);

  // ── Three.js refs
  const mountRef = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const animIdRef = useRef(null);
  const cakeGroupRef = useRef(null);
  const flamesRef = useRef([]); // outer flame meshes
  const innerRef = useRef([]); // inner flame meshes
  const flameBaseY = useRef([]); // original Y positions

  // ── Blow / candle energy refs (shared with animation loop)
  const blowLevelRef = useRef(0);
  const candleEnergyRef = useRef(Array(candleCount).fill(100)); // 0–100
  const candlesLitRef = useRef(Array(candleCount).fill(true));
  const activeCandleRef = useRef(0); // index of candle currently being drained
  const blownRef = useRef(false);

  // ── Interaction refs
  const draggingRef = useRef(false);
  const prevMouseRef = useRef({ x: 0, y: 0 });

  // ── Blow cooldown ref — prevents chaining candle deaths in one breath
  const blowCooldownRef = useRef(false);
  const cooldownTimer = useRef(null);

  // ── Audio refs - SHARED AudioContext
  const audioCtxRef = useRef(null);
  const streamRef = useRef(null);
  const listenRef = useRef(false);
  const detectRef = useRef(null);
  const melodyTimer = useRef(null);
  const celebrationAudioRef = useRef(null);

  // Keep litRef in sync
  useEffect(() => {
    candlesLitRef.current = candlesLit;
  }, [candlesLit]);
  useEffect(() => {
    blownRef.current = allBlownOut;
  }, [allBlownOut]);
  useEffect(() => {
    listenRef.current = isListening;
  }, [isListening]);

  // Detect mobile on resize
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Initialize AudioContext and resume on first user interaction
  useEffect(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext ||
        window.webkitAudioContext)();
    }

    // Resume AudioContext on first interaction (fixes autoplay policy)
    const resumeAudio = async () => {
      if (audioCtxRef.current?.state === "suspended") {
        await audioCtxRef.current.resume();
        setAudioReady(true);
      }
    };

    // Add listeners for first interaction
    const events = ["click", "touchstart", "keydown"];
    events.forEach((event) => {
      document.addEventListener(event, resumeAudio, { once: true });
    });

    return () => {
      events.forEach((event) => {
        document.removeEventListener(event, resumeAudio);
      });
    };
  }, []);

  // ── Auto music loop (only starts after AudioContext is ready)
  useEffect(() => {
    if (!musicDefault || !audioReady) return;

    const loop = () => {
      if (audioCtxRef.current && audioCtxRef.current.state === "running") {
        melodyTimer.current = setTimeout(
          loop,
          playMelody(audioCtxRef.current) + 700,
        );
      }
    };
    loop();

    return () => {
      clearTimeout(melodyTimer.current);
    };
  }, [musicDefault, audioReady]);

  // ── Play celebration music when candles are blown out
  useEffect(() => {
    if (showCelebration) {
      // Stop birthday melody if playing
      clearTimeout(melodyTimer.current);

      if (celebrationMusicUrl) {
        // Play custom audio file
        const audio = new Audio(celebrationMusicUrl);
        audio.volume = 0.5;
        audio.play().catch((err) => {
          console.log("Celebration audio play failed:", err);
          // Fallback to melody
          if (audioCtxRef.current) {
            playMelody(audioCtxRef.current);
          }
        });
        celebrationAudioRef.current = audio;
      } else {
        // Play default melody once
        if (audioCtxRef.current) {
          playMelody(audioCtxRef.current);
        }
      }
    }

    return () => {
      if (celebrationAudioRef.current) {
        celebrationAudioRef.current.pause();
        celebrationAudioRef.current = null;
      }
    };
  }, [showCelebration, celebrationMusicUrl]);

  // ── Init Three.js renderer + scene + camera
  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;
    const w = el.clientWidth,
      h = el.clientHeight;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    el.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(44, w / h, 0.1, 100);
    // Adjust for portrait vs landscape
    const isPortrait = h > w;
    camera.position.set(0, isPortrait ? 6.5 : 5.5, isPortrait ? 15.5 : 13);
    camera.lookAt(0, 2, 0);
    cameraRef.current = camera;

    scene.add(new THREE.AmbientLight(0xffffff, 0.85));
    const dir = new THREE.DirectionalLight(0xffffff, 0.5);
    dir.position.set(7, 14, 9);
    scene.add(dir);
    const warm = new THREE.PointLight(0xff9933, 1.8, 16);
    warm.position.set(0, 8, 0);
    scene.add(warm);

    // ── Animation loop — reads blowLevelRef live for flame effects
    const animate = () => {
      animIdRef.current = requestAnimationFrame(animate);
      const t = Date.now() * 0.001;
      const blow = blowLevelRef.current;
      const activeIdx = activeCandleRef.current;

      flamesRef.current.forEach((f, i) => {
        if (!f) return;
        const isActive = i === activeIdx && blow > 0.08;
        const energy = candleEnergyRef.current[i] / 100; // 0–1
        const isLow = energy < 0.25 && candlesLitRef.current[i];

        if (!f.visible) return;

        // Base flicker speed — faster when low energy or being blown
        const speed = isActive ? 14 + blow * 22 : isLow ? 12 : 9;
        const noiseX = Math.cos(t * speed + i * 2.3);
        const noiseY = Math.sin(t * speed * 1.1 + i * 1.7);

        // Scale: lean thin & tall when blown, sputter when dying
        const blowThin = isActive ? Math.max(0.25, 1 - blow * 0.62) : 1;
        const blowTall = isActive ? 1 + blow * 1.4 : 1;
        const sputter = isLow ? 0.55 + Math.random() * 0.6 : 1;
        const baseScaleX = (0.62 + noiseX * 0.12) * blowThin * sputter;
        const baseScaleY = (1.5 + noiseY * 0.24) * blowTall * sputter;

        f.scale.set(baseScaleX, baseScaleY, baseScaleX);

        // Lean (Z rotation) into the blow direction
        const leanAmount = isActive ? blow * 0.55 : 0;
        f.rotation.z = leanAmount * Math.sin(t * 8 + i);

        // Move base Y slightly with lean
        if (flameBaseY.current[i] !== undefined) {
          f.position.y = flameBaseY.current[i] + (isActive ? blow * 0.22 : 0);
        }
      });

      // Inner flame — same idea, more subtle
      innerRef.current.forEach((f, i) => {
        if (!f?.visible) return;
        const isActive = i === activeIdx && blow > 0.08;
        const energy = candleEnergyRef.current[i] / 100;
        const isLow = energy < 0.25 && candlesLitRef.current[i];
        const speed = isActive ? 16 + blow * 20 : isLow ? 13 : 10;
        const sputter = isLow ? 0.4 + Math.random() * 0.7 : 1;
        const blowThin = isActive ? Math.max(0.2, 1 - blow * 0.7) : 1;
        const blowTall = isActive ? 1 + blow * 1.0 : 1;

        const sx =
          (0.4 + Math.sin(t * speed + i * 2) * 0.07) * blowThin * sputter;
        const sy =
          (1.25 + Math.cos(t * speed * 1.05 + i * 1.4) * 0.2) *
          blowTall *
          sputter;
        f.scale.set(sx, sy, sx);
        f.rotation.z = isActive ? blow * 0.4 * Math.sin(t * 9 + i) : 0;
        if (flameBaseY.current[i] !== undefined) {
          f.position.y = flameBaseY.current[i] + (isActive ? blow * 0.18 : 0);
        }
      });

      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      const nw = el.clientWidth,
        nh = el.clientHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      // Reposition camera for portrait
      const portrait = nh > nw;
      camera.position.set(0, portrait ? 6.5 : 5.5, portrait ? 15.5 : 13);
      camera.lookAt(0, 2, 0);
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animIdRef.current);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  // ── Build cake (runs once on mount)
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (cakeGroupRef.current) {
      scene.remove(cakeGroupRef.current);
      cakeGroupRef.current.traverse((o) => {
        o.geometry?.dispose();
        (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
          m?.dispose(),
        );
      });
    }
    flamesRef.current = [];
    innerRef.current = [];
    flameBaseY.current = [];

    const group = new THREE.Group();
    cakeGroupRef.current = group;
    group.rotation.y = 0.45;

    const cakeColor = new THREE.Color(tc.cake);
    const dotColor = new THREE.Color(tc.dot);
    const ganacheClr = new THREE.Color(tc.ganache);
    const creamClr = new THREE.Color(tc.frosting);

    // Plate
    addMesh(
      group,
      new THREE.CylinderGeometry(3.1, 3.1, 0.13, 52),
      { color: 0xe8e8e8, shininess: 110 },
      [0, 0, 0],
    );

    // Bottom tier
    addMesh(
      group,
      new THREE.CylinderGeometry(2.5, 2.5, 1.62, 52),
      { color: cakeColor, shininess: 50 },
      [0, 0.94, 0],
    );

    // Ganache drip ring
    const drip = addMesh(
      group,
      new THREE.TorusGeometry(2.5, 0.24, 14, 52),
      { color: ganacheClr, shininess: 130 },
      [0, 1.74, 0],
    );
    drip.rotation.x = Math.PI / 2;

    // Cream separator
    addMesh(
      group,
      new THREE.CylinderGeometry(2.52, 2.52, 0.22, 52),
      { color: creamClr, shininess: 90 },
      [0, 1.81, 0],
    );

    // Top tier — use explicit topCake color (warm, not gray)
    addMesh(
      group,
      new THREE.CylinderGeometry(1.66, 1.66, 1.22, 52),
      { color: new THREE.Color(tc.topCake), shininess: 50 },
      [0, 2.6, 0],
    );

    // Top cream disk
    addMesh(
      group,
      new THREE.CylinderGeometry(1.68, 1.68, 0.22, 52),
      { color: creamClr, shininess: 90 },
      [0, 3.27, 0],
    );

    // Decorative dots — bottom tier
    for (let i = 0; i < 15; i++) {
      const a = (i / 15) * Math.PI * 2;
      addMesh(
        group,
        new THREE.SphereGeometry(0.11, 9, 9),
        { color: dotColor },
        [Math.cos(a) * 2.52, 0.93, Math.sin(a) * 2.52],
      );
    }
    // Decorative dots — top tier
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2;
      addMesh(
        group,
        new THREE.SphereGeometry(0.085, 9, 9),
        { color: dotColor },
        [Math.cos(a) * 1.68, 2.58, Math.sin(a) * 1.68],
      );
    }

    // ── Candles
    const positions = getCandlePositions(candleCount);
    const newFlames = [],
      newInner = [];

    positions.forEach((pos, i) => {
      // Candle body  — bottom at 3.3, height 0.74, center 3.67
      addMesh(
        group,
        new THREE.CylinderGeometry(0.093, 0.093, 0.74, 13),
        { color: CANDLE_COLORS[i % CANDLE_COLORS.length], shininess: 40 },
        [pos.x, 3.67, pos.z],
      );
      // Wick
      addMesh(
        group,
        new THREE.CylinderGeometry(0.014, 0.014, 0.14, 7),
        { color: 0x111111 },
        [pos.x, 4.12, pos.z],
      );

      const flameY = 4.32;

      // Outer flame
      const fm = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 11, 11),
        new THREE.MeshBasicMaterial({
          color: 0xff7700,
          transparent: true,
          opacity: 0.9,
        }),
      );
      fm.scale.set(0.62, 1.55, 0.62);
      fm.position.set(pos.x, flameY, pos.z);
      group.add(fm);
      newFlames.push(fm);

      // Inner flame
      const ifm = new THREE.Mesh(
        new THREE.SphereGeometry(0.082, 9, 9),
        new THREE.MeshBasicMaterial({
          color: 0xffee00,
          transparent: true,
          opacity: 0.97,
        }),
      );
      ifm.scale.set(0.4, 1.28, 0.4);
      ifm.position.set(pos.x, flameY, pos.z);
      group.add(ifm);
      newInner.push(ifm);

      flameBaseY.current.push(flameY);
    });

    flamesRef.current = newFlames;
    innerRef.current = newInner;
    // Init energy
    candleEnergyRef.current = Array(candleCount).fill(100);
    activeCandleRef.current = 0;
    scene.add(group);
  }, [candleCount, tc]);

  // ── Sync flame visibility
  useEffect(() => {
    flamesRef.current.forEach((f, i) => {
      if (f) f.visible = !!candlesLit[i];
    });
    innerRef.current.forEach((f, i) => {
      if (f) f.visible = !!candlesLit[i];
    });
  }, [candlesLit]);

  // ── Drag to rotate
  const onPointerDown = useCallback((e) => {
    draggingRef.current = true;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    prevMouseRef.current = { x, y };
  }, []);

  const onPointerMove = useCallback((e) => {
    if (!draggingRef.current || !cakeGroupRef.current) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    const dx = x - prevMouseRef.current.x;
    const dy = y - prevMouseRef.current.y;
    cakeGroupRef.current.rotation.y += dx * 0.013;
    cakeGroupRef.current.rotation.x = Math.max(
      -0.5,
      Math.min(0.5, cakeGroupRef.current.rotation.x + dy * 0.007),
    );
    prevMouseRef.current = { x, y };
  }, []);

  const onPointerUp = useCallback(() => {
    draggingRef.current = false;
  }, []);

  // ── Mic / blow detection
  const startMic = async () => {
    try {
      // Ensure AudioContext is resumed
      if (audioCtxRef.current?.state === "suspended") {
        await audioCtxRef.current.resume();
        setAudioReady(true);
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Use the shared AudioContext
      const ctx = audioCtxRef.current;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      setMicPermission("granted");
      setIsListening(true);
      listenRef.current = true;

      const buf = new Uint8Array(analyser.frequencyBinCount);

      // Drain rate tuning:
      //   sensitivity 1  → needs ~4-5s hard blow per candle (tough)
      //   sensitivity 5  → needs ~1.2s hard blow per candle (default)
      //   sensitivity 10 → needs ~0.4s hard blow per candle (easy)
      // Energy is 0–100. Drain per frame = level * drainRate.
      // At 60fps + level=1.0: frames_to_die = 100 / drainRate → time = frames / 60
      const drainRate = (blowSensitivity / 5) * 7; // sens=5 → 7/frame → ~100/7/60 ≈ 1.2s

      const loop = () => {
        if (!listenRef.current) return;
        analyser.getByteFrequencyData(buf);
        const avg = buf.reduce((s, v) => s + v, 0) / buf.length;

        // Normalise: background noise ~8-15, soft blow ~25, hard blow ~55+
        const level = Math.max(0, Math.min(1, (avg - 14) / 42));
        blowLevelRef.current = level;
        setBlowLevel(level);

        // Only drain if blowing and not in cooldown between candles
        if (level > 0.1 && !blownRef.current && !blowCooldownRef.current) {
          // Always target the first remaining lit candle
          let activeIdx = -1;
          for (let i = 0; i < candlesLitRef.current.length; i++) {
            if (candlesLitRef.current[i]) {
              activeIdx = i;
              break;
            }
          }
          activeCandleRef.current = activeIdx;

          if (activeIdx >= 0) {
            candleEnergyRef.current[activeIdx] = Math.max(
              0,
              candleEnergyRef.current[activeIdx] - level * drainRate,
            );

            if (candleEnergyRef.current[activeIdx] <= 0) {
              // ── Candle dies
              // Start cooldown: she must briefly pause before next candle drains
              // This forces multiple natural breaths for all candles
              blowCooldownRef.current = true;
              clearTimeout(cooldownTimer.current);
              cooldownTimer.current = setTimeout(() => {
                blowCooldownRef.current = false;
              }, 550); // ~half a second pause required between candles

              setCandlesLit((prev) => {
                const next = [...prev];
                next[activeIdx] = false;
                const remaining = next.filter(Boolean).length;
                if (remaining === 0 && !blownRef.current) {
                  blownRef.current = true;
                  listenRef.current = false;
                  setAllBlownOut(true);
                  setIsListening(false);
                  blowLevelRef.current = 0;
                  setBlowLevel(0);
                  clearTimeout(cooldownTimer.current);
                  setTimeout(() => setShowCelebration(true), 500);
                  streamRef.current?.getTracks().forEach((t) => t.stop());
                }
                return next;
              });
            }
          }
        }

        // Decay blow meter display when not blowing
        if (level < 0.05) {
          blowLevelRef.current = Math.max(0, blowLevelRef.current - 0.05);
        }

        detectRef.current = requestAnimationFrame(loop);
      };
      loop();
    } catch {
      setMicPermission("denied");
    }
  };

  const stopMic = useCallback(() => {
    cancelAnimationFrame(detectRef.current);
    clearTimeout(cooldownTimer.current);
    blowCooldownRef.current = false;
    listenRef.current = false;
    blowLevelRef.current = 0;
    setIsListening(false);
    setBlowLevel(0);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const resetCandles = useCallback(() => {
    blownRef.current = false;
    blowCooldownRef.current = false;
    clearTimeout(cooldownTimer.current);
    setAllBlownOut(false);
    setShowCelebration(false);
    setCandlesLit(Array(candleCount).fill(true));
    candleEnergyRef.current = Array(candleCount).fill(100);
    activeCandleRef.current = 0;
    setBlowLevel(0);
    blowLevelRef.current = 0;
    stopMic();

    // Stop celebration music
    if (celebrationAudioRef.current) {
      celebrationAudioRef.current.pause();
      celebrationAudioRef.current = null;
    }

    // Restart birthday melody if it was on
    if (musicDefault && audioCtxRef.current && audioReady) {
      clearTimeout(melodyTimer.current);
      const loop = () => {
        if (audioCtxRef.current?.state === "running") {
          melodyTimer.current = setTimeout(
            loop,
            playMelody(audioCtxRef.current) + 700,
          );
        }
      };
      loop();
    }
  }, [candleCount, stopMic, musicDefault, audioReady]);

  const litCount = candlesLit.filter(Boolean).length;
  const bottomPad = isMobile
    ? "max(4.5vh, env(safe-area-inset-bottom, 18px))"
    : "6vh";

  return (
    <div
      style={{
        width: "100dvw",
        height: "100dvh",
        overflow: "hidden",
        position: "relative",
        background:
          "linear-gradient(148deg,#060618 0%,#0f0722 55%,#080f22 100%)",
        fontFamily: "Georgia,serif",
      }}
    >
      <Stars />

      {/* 3D canvas — covers full screen */}
      <div
        ref={mountRef}
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 2,
          touchAction: "none",
          cursor: draggingRef.current ? "grabbing" : "grab",
        }}
        onMouseDown={onPointerDown}
        onMouseMove={onPointerMove}
        onMouseUp={onPointerUp}
        onMouseLeave={onPointerUp}
        onTouchStart={(e) => {
          e.preventDefault();
          onPointerDown(e);
        }}
        onTouchMove={(e) => {
          e.preventDefault();
          onPointerMove(e);
        }}
        onTouchEnd={onPointerUp}
      />

      {/* Title */}
      {!showCelebration && (
        <div
          style={{
            position: "absolute",
            top: isMobile ? "3%" : "4%",
            left: 0,
            right: 0,
            textAlign: "center",
            pointerEvents: "none",
            zIndex: 10,
            padding: "0 16px",
          }}
        >
          <style>{`@keyframes nameGlow{0%,100%{opacity:.82}50%{opacity:1}}`}</style>
          <div
            style={{
              fontSize: "clamp(1.1rem,3.5vw,2.5rem)",
              color: "#FFD700",
              fontStyle: "italic",
              textShadow:
                "0 0 26px rgba(255,215,0,.5),0 2px 8px rgba(0,0,0,.85)",
              letterSpacing: ".04em",
              animation: "nameGlow 3s ease-in-out infinite",
            }}
          >
            Happy Birthday My Babyyy,
          </div>
          <div
            style={{
              fontSize: "clamp(1.9rem,6vw,4rem)",
              fontWeight: 700,
              marginTop: 2,
              color: tc.frosting,
              textShadow: `0 0 30px ${tc.accent}99,0 2px 12px rgba(0,0,0,.95)`,
              letterSpacing: ".02em",
              lineHeight: 1.1,
            }}
          >
            {name}!
          </div>
        </div>
      )}

      {/* Bottom controls */}
      {!showCelebration && !allBlownOut && (
        <div
          style={{
            position: "absolute",
            bottom: bottomPad,
            left: 0,
            right: 0,
            textAlign: "center",
            zIndex: 10,
            padding: "0 20px",
          }}
        >
          {!isListening ? (
            <button
              onClick={startMic}
              style={{
                padding: isMobile ? "16px 36px" : "13px 30px",
                borderRadius: 50,
                cursor: "pointer",
                background:
                  micPermission === "denied"
                    ? "rgba(255,50,50,.2)"
                    : `linear-gradient(135deg,${tc.accent},${tc.dot})`,
                border:
                  micPermission === "denied" ? "1px solid #ff5555" : "none",
                color: "white",
                fontSize: isMobile ? "1.05rem" : "1rem",
                fontFamily: "Georgia,serif",
                letterSpacing: ".05em",
                boxShadow:
                  micPermission !== "denied"
                    ? `0 5px 28px ${tc.accent}66`
                    : "none",
                transition: "transform .13s ease, box-shadow .13s ease",
                minWidth: isMobile ? 220 : 200,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "scale(1.045)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "scale(1)";
              }}
            >
              {micPermission === "denied"
                ? "🚫 Mic access denied"
                : "🎤 Blow out the candles!"}
            </button>
          ) : (
            <BlowMeter
              blowLevel={blowLevel}
              litCount={litCount}
              onStop={stopMic}
              accent={tc.accent}
            />
          )}
        </div>
      )}

      {/* Drag hint */}
      {!showCelebration && (
        <div
          style={{
            position: "absolute",
            bottom: isMobile
              ? "calc(env(safe-area-inset-bottom, 8px) + 8px)"
              : 10,
            left: "50%",
            transform: "translateX(-50%)",
            color: "rgba(255,255,255,.18)",
            fontSize: ".66rem",
            pointerEvents: "none",
            fontStyle: "italic",
            letterSpacing: ".12em",
            zIndex: 5,
            whiteSpace: "nowrap",
          }}
        >
          {isMobile ? "drag to spin ↻" : "drag to spin the cake ↻"}
        </div>
      )}

      {showCelebration && (
        <CelebrationOverlay
          name={name}
          message={message}
          colors={tc}
          onReset={resetCandles}
        />
      )}
    </div>
  );
}
