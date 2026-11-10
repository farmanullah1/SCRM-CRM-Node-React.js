import React, { useEffect, useRef } from "react";

export default function HalftoneBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Mouse coordinates (interpolated for ultra-smooth trailing)
    const mouse = {
      x: -1000,
      y: -1000,
      targetX: -1000,
      targetY: -1000,
      radius: 220, // Radial influence zone in px
      maxShift: 20, // Max displacement in px
      active: false
    };

    // Grid configuration: Ultra-dense matrix (9px gap) -> ~30,000+ dots on HD screens
    const spacing = 9;
    let dots = [];

    const initDots = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

      const cols = Math.ceil(width / spacing) + 1;
      const rows = Math.ceil(height / spacing) + 1;

      dots = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const originX = c * spacing;
          const originY = r * spacing;

          // Palette base:
          // Subtle variance across transition bands (#303018 warm-olive & #484848 mid-grey)
          const isWarmBand = (r + c) % 5 === 0;
          const baseR = isWarmBand ? 48 : 36;
          const baseG = isWarmBand ? 48 : 36;
          const baseB = isWarmBand ? 24 : 36;

          dots.push({
            originX,
            originY,
            currentX: originX,
            currentY: originY,
            currentRadius: 0.9,
            phase: (c * 0.12 + r * 0.12) % (Math.PI * 2),
            baseR,
            baseG,
            baseB,
            currentR: baseR,
            currentG: baseG,
            currentB: baseB,
            currentAlpha: 0.35
          });
        }
      }
    };

    initDots();

    // Event listeners
    const handleMouseMove = (e) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.active = true;
    };

    const handleTouchMove = (e) => {
      if (e.touches.length > 0) {
        mouse.targetX = e.touches[0].clientX;
        mouse.targetY = e.touches[0].clientY;
        mouse.active = true;
      }
    };

    const handleMouseLeave = () => {
      mouse.targetX = -1000;
      mouse.targetY = -1000;
      mouse.active = false;
    };

    const handleResize = () => {
      initDots();
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("mouseleave", handleMouseLeave, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });

    let time = 0;

    // Render loop
    const render = () => {
      time += 0.02;

      // Smooth lerp mouse tracking
      mouse.x += (mouse.targetX - mouse.x) * 0.14;
      mouse.y += (mouse.targetY - mouse.y) * 0.14;

      // Base Canvas Dominance: #181818 confirmed at ~63%
      ctx.fillStyle = "#181818";
      ctx.fillRect(0, 0, width, height);

      // Render dense dot field
      const count = dots.length;
      for (let i = 0; i < count; i++) {
        const dot = dots[i];

        const dx = dot.originX - mouse.x;
        const dy = dot.originY - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let targetX = dot.originX;
        let targetY = dot.originY;

        // Subtle ambient harmonic pulse
        const pulse = Math.sin(time + dot.phase) * 0.15;
        let targetRadius = 0.9 + pulse;
        let targetR = dot.baseR;
        let targetG = dot.baseG;
        let targetB = dot.baseB;
        let targetAlpha = 0.32;

        if (dist < mouse.radius && mouse.active) {
          const factor = 1 - dist / mouse.radius;
          const quadFactor = factor * factor;

          // 3D Spherical lens deformation
          const angle = Math.atan2(dy, dx);
          const shift = quadFactor * mouse.maxShift;

          targetX = dot.originX + Math.cos(angle) * shift;
          targetY = dot.originY + Math.sin(angle) * shift;

          // Dynamic Scaling: 0.9px -> 2.8px
          targetRadius = 1.0 + quadFactor * 1.8;

          // Dynamic Color Transition on Hover:
          // Shifts to electric yellow #F0FF60 (240, 255, 96) and #FAFF69 (250, 255, 105)
          targetR = dot.baseR + quadFactor * (240 - dot.baseR);
          targetG = dot.baseG + quadFactor * (255 - dot.baseG);
          targetB = dot.baseB + quadFactor * (96 - dot.baseB);
          targetAlpha = 0.35 + quadFactor * 0.65;
        }

        // Spring lerp physics
        dot.currentX += (targetX - dot.currentX) * 0.14;
        dot.currentY += (targetY - dot.currentY) * 0.14;
        dot.currentRadius += (targetRadius - dot.currentRadius) * 0.14;
        dot.currentR += (targetR - dot.currentR) * 0.14;
        dot.currentG += (targetG - dot.currentG) * 0.14;
        dot.currentB += (targetB - dot.currentB) * 0.14;
        dot.currentAlpha += (targetAlpha - dot.currentAlpha) * 0.14;

        // Draw individual dot
        ctx.beginPath();
        ctx.arc(dot.currentX, dot.currentY, Math.max(0.4, dot.currentRadius), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${Math.round(dot.currentR)}, ${Math.round(dot.currentG)}, ${Math.round(dot.currentB)}, ${dot.currentAlpha})`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <canvas
      id="halftone-canvas"
      ref={canvasRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
        pointerEvents: "none",
        display: "block"
      }}
    />
  );
}
