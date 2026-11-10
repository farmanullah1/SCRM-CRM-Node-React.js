import { Fragment, useEffect, useRef } from "react";
import "./Portfolio.css";

/* Headline lines are hard-wrapped so the mask-reveal lands on deliberate
   measures instead of wherever the browser happens to break the sentence. */
const HEADLINE = [
  ["Designing", "intelligent"],
  ["electrical", "systems", "and"],
  ["innovative", "electronics"],
  ["solutions", "with", "precision"],
  ["and", "sustainability"]
];

const KEY_WORD = "sustainability";

const STACK = [
  "Power Electronics",
  "PCB Design",
  "Embedded C",
  "Control Systems",
  "React",
  "Three.js",
  "Performance"
];

/* 0.28s base + 60ms stagger per word, resolved once at module load so the
   reveal order stays pure across re-renders. */
const HEADLINE_LINES = (() => {
  let cursor = 0;
  return HEADLINE.map((line) =>
    line.map((word) => {
      const delay = Number((0.28 + cursor * 0.06).toFixed(2));
      cursor += 1;
      return { word, delay, isKey: word === KEY_WORD };
    })
  );
})();

export default function Portfolio() {
  const rootRef = useRef(null);

  /* Pointer parallax for the engineering grid + glow. Written as CSS custom
     properties and rAF-throttled so the browser composites instead of
     re-laying-out on every mousemove. */
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return undefined;

    let frame = 0;
    let x = 0;
    let y = 0;

    const apply = () => {
      frame = 0;
      el.style.setProperty("--px", x.toFixed(3));
      el.style.setProperty("--py", y.toFixed(3));
    };

    const onMove = (event) => {
      x = (event.clientX / window.innerWidth) * 2 - 1;
      y = (event.clientY / window.innerHeight) * 2 - 1;
      if (!frame) frame = requestAnimationFrame(apply);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="hero-canvas" ref={rootRef}>
      {/* ---------- Background layers ---------- */}
      <div className="hero-bg" aria-hidden="true">
        <div className="hero-glow-wrap">
          <div className="hero-glow" />
        </div>
        <div className="hero-halo" />
        <div className="hero-grid" />
        <div className="hero-grid hero-grid--drift" />
        <div className="hero-frame" />
        <div className="hero-vignette" />
      </div>

      {/* ---------- Top spec strip ---------- */}
      <header className="hero-meta">
        <div className="hero-meta-left">
          <span className="hero-meta-tick" aria-hidden="true" />
          EEE / Fluid Engineering
        </div>
        <div className="hero-meta-right">
          <span>Portfolio — 2026</span>
          <span className="hero-meta-dot" aria-hidden="true" />
          <span>Sys. Stable</span>
        </div>
      </header>

      {/* ---------- Hero stack ---------- */}
      <main className="hero-inner">
        <div className="hero-stack">
          <p className="hero-badge reveal" style={{ "--d": "0.1s" }}>
            <span className="hero-badge-dot" aria-hidden="true" />
            Available for New Projects
          </p>

          <h1 className="hero-title">
            {HEADLINE_LINES.map((line, lineIndex) => (
              <span className="hero-line" key={lineIndex}>
                {line.map(({ word, delay, isKey }, wordIndex) => (
                  <Fragment key={`${lineIndex}-${word}`}>
                    {wordIndex > 0 ? " " : null}
                    <span className="hero-word" style={{ "--d": `${delay}s` }}>
                      <span className={`hero-word-inner${isKey ? " hero-key" : ""}`}>{word}</span>
                    </span>
                  </Fragment>
                ))}
              </span>
            ))}
          </h1>

          <p className="hero-subhead reveal" style={{ "--d": "1.18s" }}>
            <span className="hero-subhead-bar" aria-hidden="true" />
            Multidisciplinary developer bridging fine arts and computer science.
          </p>

          <div className="hero-actions reveal" style={{ "--d": "1.32s" }}>
            <button type="button" className="cta-primary">
              <span>View Selected Work</span>
              <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true" focusable="false">
                <path
                  d="M1 8h13M9 3l5 5-5 5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="square"
                />
              </svg>
            </button>

            <button type="button" className="cta-secondary">
              <span>Read Philosophy</span>
            </button>
          </div>

          <ul className="hero-stack-list reveal" style={{ "--d": "1.46s" }}>
            {STACK.map((item, index) => (
              <li key={item}>
                {index > 0 ? (
                  <span className="hero-stack-sep" aria-hidden="true">
                    ·
                  </span>
                ) : null}
                {item}
              </li>
            ))}
          </ul>
        </div>
      </main>

      {/* ---------- Scroll cue ---------- */}
      <footer className="hero-foot">
        <div className="hero-scroll reveal" style={{ "--d": "1.65s" }} aria-hidden="true">
          <span className="hero-scroll-label">Scroll</span>
          <span className="hero-scroll-rail">
            <span className="hero-scroll-pip" />
          </span>
        </div>
      </footer>
    </div>
  );
}
