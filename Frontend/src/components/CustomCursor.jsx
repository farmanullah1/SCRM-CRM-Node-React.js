import React, { useEffect, useRef, useState } from "react";

export default function CustomCursor() {
  const cursorRef = useRef(null);
  const dotRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only enable on fine pointer devices (desktops/laptops)
    if (window.matchMedia("(hover: none)").matches) return;

    let mouseX = -100;
    let mouseY = -100;
    let ringX = -100;
    let ringY = -100;
    let rafId = null;

    const onMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!isVisible) setIsVisible(true);

      // Check if target or ancestor is interactive
      const target = e.target;
      const interactiveEl = target.closest(
        'button, a, input, select, textarea, [role="button"], .interactive, .kanban-card, .tab-btn, .metric-card, .clickable'
      );
      setIsHovered(Boolean(interactiveEl));
    };

    const onMouseLeave = () => {
      setIsVisible(false);
    };

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("mouseleave", onMouseLeave);

    const render = () => {
      // Smooth lerp for outer ring
      ringX += (mouseX - ringX) * 0.22;
      ringY += (mouseY - ringY) * 0.22;

      if (cursorRef.current && dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%)`;
        cursorRef.current.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%)`;
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isVisible]);

  return (
    <>
      {/* Outer Spring Ring */}
      <div
        ref={cursorRef}
        className={`custom-cursor-ring ${isHovered ? "is-hovered" : ""} ${isVisible ? "is-visible" : ""}`}
      />
      {/* Dynamic Expanding Dot */}
      <div
        ref={dotRef}
        className={`custom-cursor-dot ${isHovered ? "is-hovered" : ""} ${isVisible ? "is-visible" : ""}`}
      />
    </>
  );
}

