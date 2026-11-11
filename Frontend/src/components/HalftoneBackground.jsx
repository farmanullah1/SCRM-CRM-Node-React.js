import React, { useEffect, useRef } from "react";

export default function HalftoneBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let animationFrameId;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Mouse coordinates (interpolated with spring lerp for fluid tracking)
    const mouse = {
      x: -2000,
      y: -2000,
      targetX: -2000,
      targetY: -2000,
      radius: 260, // Wider radial influence zone
      maxShift: 24, // 3D displacement shift
      active: false
    };

    // Click/Touch Ripple wave tracking
    const ripples = [];

    // Grid configuration:
    // Spacing = 6.5px -> Higher dots per inch! (over ~55,000 to 75,000 dots on HD/4K)
    // Base radius = 1.6px (visibly larger, sharper, and more substantial than prior 0.9px)
    const spacing = 6.5;
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

          // Electric Obsidian Palette distribution:
          // Canvas base #181818, with warm-olive (#303018) and mid-grey (#484848) bands
          const isWarmBand = (r + c) % 6 === 0;
          const isMidGrey = (r * 2 + c) % 8 === 0;
          
          let baseR = 38;
          let baseG = 38;
          let baseB = 38;

          if (isWarmBand) {
            baseR = 56;
            baseG = 56;
            baseB = 28;
          } else if (isMidGrey) {
            baseR = 68;
            baseG = 68;
            baseB = 68;
          }

          dots.push({
            originX,
            originY,
            currentX: originX,
            currentY: originY,
            baseRadius: 1.55,
            currentRadius: 1.55,
            phase: (c * 0.14 + r * 0.14) % (Math.PI * 2),
            baseR,
            baseG,
            baseB,
            currentR: baseR,
            currentG: baseG,
            currentB: baseB,
            currentAlpha: 0.42
          });
        }
      }
    };

    initDots();

    // Event listeners
    const handlePointerMove = (e) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.active = true;
    };

    const handlePointerDown = (e) => {
      ripples.push({
        x: e.clientX,
        y: e.clientY,
        radius: 0,
        maxRadius: 320,
        speed: 12,
        strength: 1.0
      });
      if (ripples.length > 5) ripples.shift();
    };

    const handleMouseLeave = () => {
      mouse.targetX = -2000;
      mouse.targetY = -2000;
      mouse.active = false;
    };

    const handleResize = () => {
      initDots();
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("mouseleave", handleMouseLeave, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });

    let time = 0;

    // Render loop (60+ FPS high-performance drawing)
    const render = () => {
      time += 0.024;

      // Smooth lerp mouse tracking
      mouse.x += (mouse.targetX - mouse.x) * 0.16;
      mouse.y += (mouse.targetY - mouse.y) * 0.16;

      // Update active ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        const rp = ripples[i];
        rp.radius += rp.speed;
        rp.strength *= 0.94;
        if (rp.radius > rp.maxRadius || rp.strength < 0.05) {
          ripples.splice(i, 1);
        }
      }

      // Base Canvas Dominance: #181818 confirmed canvas color
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

        // Harmonic organic breathing pulse
        const pulse = Math.sin(time + dot.phase) * 0.28;
        let targetRadius = dot.baseRadius + pulse;
        let targetR = dot.baseR;
        let targetG = dot.baseG;
        let targetB = dot.baseB;
        let targetAlpha = 0.40;

        // Interactive Mouse Lens & Hover Effect
        if (dist < mouse.radius && mouse.active) {
          const factor = 1 - dist / mouse.radius;
          const quadFactor = factor * factor;

          // 3D Spherical lens deformation
          const angle = Math.atan2(dy, dx);
          const shift = quadFactor * mouse.maxShift;

          targetX = dot.originX + Math.cos(angle) * shift;
          targetY = dot.originY + Math.sin(angle) * shift;

          // Dynamic Scaling on hover: 1.55px -> 4.4px
          targetRadius = dot.baseRadius + quadFactor * 2.85;

          // Color Transition on Hover:
          // Shifts to electric yellow #F0FF60 (240, 255, 96) and #FAFF69 (250, 255, 105)
          targetR = dot.baseR + quadFactor * (245 - dot.baseR);
          targetG = dot.baseG + quadFactor * (255 - dot.baseG);
          targetB = dot.baseB + quadFactor * (100 - dot.baseB);
          targetAlpha = 0.40 + quadFactor * 0.60;
        }

        // Ripple wave influence
        if (ripples.length > 0) {
          for (let j = 0; j < ripples.length; j++) {
            const rp = ripples[j];
            const rdx = dot.originX - rp.x;
            const rdy = dot.originY - rp.y;
            const rDist = Math.sqrt(rdx * rdx + rdy * rdy);
            const waveDiff = Math.abs(rDist - rp.radius);
            if (waveDiff < 36) {
              const waveFactor = (1 - waveDiff / 36) * rp.strength;
              targetRadius += waveFactor * 1.8;
              targetR += waveFactor * (240 - targetR);
              targetG += waveFactor * (255 - targetG);
              targetB += waveFactor * (96 - targetB);
              targetAlpha = Math.min(1.0, targetAlpha + waveFactor * 0.5);
            }
          }
        }

        // Spring lerp physics
        dot.currentX += (targetX - dot.currentX) * 0.16;
        dot.currentY += (targetY - dot.currentY) * 0.16;
        dot.currentRadius += (targetRadius - dot.currentRadius) * 0.16;
        dot.currentR += (targetR - dot.currentR) * 0.16;
        dot.currentG += (targetG - dot.currentG) * 0.16;
        dot.currentB += (targetB - dot.currentB) * 0.16;
        dot.currentAlpha += (targetAlpha - dot.currentAlpha) * 0.16;

        // Draw individual dot
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
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
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
