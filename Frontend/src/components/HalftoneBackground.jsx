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
      radius: 220, // Radial influence zone R ~ 180px - 250px
      maxShift: 24, // Maximum displacement shift in pixels
      active: false
    };

    // Grid configuration
    const spacing = 24; // Pixel gap between dots
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
            currentRadius: 1.4,
            currentAlpha: 0.18
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

    // Render loop
    const render = () => {
      // Smooth lerp mouse tracking
      mouse.x += (mouse.targetX - mouse.x) * 0.15;
      mouse.y += (mouse.targetY - mouse.y) * 0.15;

      // Clear with deep obsidian black
      ctx.fillStyle = "#05090C";
      ctx.fillRect(0, 0, width, height);

      // Render dots
      const count = dots.length;
      for (let i = 0; i < count; i++) {
        const dot = dots[i];

        const dx = dot.originX - mouse.x;
        const dy = dot.originY - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let targetX = dot.originX;
        let targetY = dot.originY;
        let targetRadius = 1.4;
        let targetAlpha = 0.18;

        if (dist < mouse.radius && mouse.active) {
          // Normalized proximity factor (1 at center, 0 at border)
          const factor = 1 - dist / mouse.radius;
          const quadFactor = factor * factor;

          // Radial displacement away from cursor (bulge/lens distortion)
          const angle = Math.atan2(dy, dx);
          const shift = quadFactor * mouse.maxShift;

          targetX = dot.originX + Math.cos(angle) * shift;
          targetY = dot.originY + Math.sin(angle) * shift;

          // Scaling: 1.4px -> 3.8px
          targetRadius = 1.4 + quadFactor * 2.6;

          // Opacity transition: 0.18 -> 0.95
          targetAlpha = 0.18 + quadFactor * 0.77;
        }

        // Spring lerp physics for organic response
        dot.currentX += (targetX - dot.currentX) * 0.12;
        dot.currentY += (targetY - dot.currentY) * 0.12;
        dot.currentRadius += (targetRadius - dot.currentRadius) * 0.12;
        dot.currentAlpha += (targetAlpha - dot.currentAlpha) * 0.12;

        // Draw dot with dynamic cyan color and opacity
        ctx.beginPath();
        ctx.arc(dot.currentX, dot.currentY, dot.currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 217, 255, ${dot.currentAlpha})`;
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
