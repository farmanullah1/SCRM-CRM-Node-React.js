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
      radius: 200, // Radial influence zone in px
      maxShift: 18, // Max displacement in px
      active: false
    };

    // Grid configuration: High-density matrix (15px gap)
    const spacing = 15;
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
          dots.push({
            originX,
            originY,
            currentX: originX,
            currentY: originY,
            currentRadius: 1.1,
            // Subtle harmonic phase for breathing animation
            phase: (c * 0.15 + r * 0.15) % (Math.PI * 2),
            currentR: 48,
            currentG: 48,
            currentB: 24,
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
      time += 0.025;

      // Smooth lerp mouse tracking
      mouse.x += (mouse.targetX - mouse.x) * 0.15;
      mouse.y += (mouse.targetY - mouse.y) * 0.15;

      // Base background: #181818
      ctx.fillStyle = "#181818";
      ctx.fillRect(0, 0, width, height);

      // Render dense dot matrix
      const count = dots.length;
      for (let i = 0; i < count; i++) {
        const dot = dots[i];

        const dx = dot.originX - mouse.x;
        const dy = dot.originY - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let targetX = dot.originX;
        let targetY = dot.originY;

        // Base idle state with gentle harmonic pulse
        const pulse = Math.sin(time + dot.phase) * 0.2;
        let targetRadius = 1.1 + pulse;
        let targetR = 48; // #303018 tone
        let targetG = 48;
        let targetB = 24;
        let targetAlpha = 0.32;

        if (dist < mouse.radius && mouse.active) {
          // Normalized proximity factor (1 at center, 0 at border)
          const factor = 1 - dist / mouse.radius;
          const quadFactor = factor * factor;

          // Radial displacement away from cursor (bulge / lens field effect)
          const angle = Math.atan2(dy, dx);
          const shift = quadFactor * mouse.maxShift;

          targetX = dot.originX + Math.cos(angle) * shift;
          targetY = dot.originY + Math.sin(angle) * shift;

          // Dot scale expansion on hover: 1.1px -> 3.2px
          targetRadius = 1.2 + quadFactor * 2.2;

          // Transition color dynamically to glowing electric yellow #F0FF60 / #FAFF69 (240, 255, 96)
          targetR = 48 + quadFactor * (240 - 48);
          targetG = 48 + quadFactor * (255 - 48);
          targetB = 24 + quadFactor * (96 - 24);
          targetAlpha = 0.35 + quadFactor * 0.6;
        }

        // Spring lerp physics for organic transition
        dot.currentX += (targetX - dot.currentX) * 0.14;
        dot.currentY += (targetY - dot.currentY) * 0.14;
        dot.currentRadius += (targetRadius - dot.currentRadius) * 0.14;
        dot.currentR += (targetR - dot.currentR) * 0.14;
        dot.currentG += (targetG - dot.currentG) * 0.14;
        dot.currentB += (targetB - dot.currentB) * 0.14;
        dot.currentAlpha += (targetAlpha - dot.currentAlpha) * 0.14;

        // Draw dot
        ctx.beginPath();
        ctx.arc(dot.currentX, dot.currentY, Math.max(0.6, dot.currentRadius), 0, Math.PI * 2);
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
