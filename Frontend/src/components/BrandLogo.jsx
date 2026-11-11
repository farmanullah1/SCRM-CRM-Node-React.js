import React from "react";

/**
 * SCRM Brand Logo Component
 * High-performance inline SVG representation matching the Electric Obsidian design system.
 * 
 * @param {'mark' | 'wordmark' | 'horizontal' | 'stacked'} variant
 * @param {'dark' | 'light'} theme
 * @param {number | string} size
 * @param {boolean} showTagline
 * @param {string} className
 */
export default function BrandLogo({
  variant = "horizontal",
  theme = "dark",
  size = 36,
  showTagline = true,
  taglineText = "SOVEREIGN CRM",
  className = "",
  style = {}
}) {
  const isLight = theme === "light";
  const numSize = typeof size === "number" ? size : parseInt(size, 10) || 36;
  
  // Mark SVG Symbol
  const renderMark = (markSize) => (
    <svg
      width={markSize}
      height={markSize}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block", flexShrink: 0 }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`markBg-${theme}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={isLight ? "#F8F8F2" : "#181818"} />
          <stop offset="50%" stopColor={isLight ? "#EFEFE4" : "#242514"} />
          <stop offset="100%" stopColor={isLight ? "#E4E4D8" : "#121212"} />
        </linearGradient>
        <linearGradient id={`accentGrad-${theme}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={isLight ? "#4F5101" : "#FAFF69"} />
          <stop offset="100%" stopColor={isLight ? "#303018" : "#F0FF60"} />
        </linearGradient>
      </defs>

      {/* Rounded Frame */}
      <rect
        x="2"
        y="2"
        width="44"
        height="44"
        rx="10"
        fill={`url(#markBg-${theme})`}
        stroke={isLight ? "#D4D4C8" : "#414141"}
        strokeWidth="1.2"
      />
      <rect
        x="4"
        y="4"
        width="40"
        height="40"
        rx="8"
        stroke={isLight ? "#C0C0B0" : "#4F5101"}
        strokeWidth="0.8"
        opacity="0.6"
      />

      {/* Stylized 'S' Connected Circuit Ribbon */}
      <path
        d="M34 14 C34 10.5 30 8.5 24 8.5 C16.5 8.5 13 12.5 13 17 C13 22.5 18 24 24 25.5 C30 27 35 28.5 35 34 C35 39.5 30.5 42.5 24 42.5 C16 42.5 12 38.5 12 34"
        stroke={`url(#accentGrad-${theme})`}
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Relationship Interconnect Nodes */}
      <circle
        cx="34"
        cy="14"
        r="3"
        fill={isLight ? "#1F2014" : "#FFFFFF"}
        stroke={isLight ? "#F8F8F2" : "#181818"}
        strokeWidth="1.5"
      />
      <circle
        cx="24"
        cy="25.5"
        r="2.5"
        fill={isLight ? "#303018" : "#F0FF60"}
        stroke={isLight ? "#F8F8F2" : "#181818"}
        strokeWidth="1.2"
      />
      <circle
        cx="12"
        cy="34"
        r="3"
        fill={isLight ? "#4F5101" : "#FAFF69"}
        stroke={isLight ? "#F8F8F2" : "#181818"}
        strokeWidth="1.5"
      />
    </svg>
  );

  // Standalone Mark
  if (variant === "mark") {
    return (
      <div
        className={`scrm-brand-mark ${className}`}
        style={{ display: "inline-flex", alignItems: "center", ...style }}
        title="SCRM - Small Customer Relationship Management"
      >
        {renderMark(numSize)}
      </div>
    );
  }

  // Standalone Wordmark
  if (variant === "wordmark") {
    const fontSize = numSize * 0.7;
    return (
      <div
        className={`scrm-brand-wordmark ${className}`}
        style={{ display: "inline-flex", flexDirection: "column", ...style }}
      >
        <span
          style={{
            fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
            fontWeight: 900,
            fontSize: `${fontSize}px`,
            lineHeight: 1,
            letterSpacing: "0.06em",
            color: isLight ? "#151515" : "#FFFFFF"
          }}
        >
          S<span style={{ color: isLight ? "#4F5101" : "#F0FF60" }}>CRM</span>
        </span>
        {showTagline && (
          <span
            style={{
              fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
              fontWeight: 700,
              fontSize: `${Math.max(fontSize * 0.28, 9)}px`,
              letterSpacing: "0.22em",
              color: isLight ? "#484848" : "#DFDFDF",
              opacity: 0.85,
              marginTop: "3px"
            }}
          >
            {taglineText}
          </span>
        )}
      </div>
    );
  }

  // Stacked Layout
  if (variant === "stacked") {
    return (
      <div
        className={`scrm-brand-stacked ${className}`}
        style={{
          display: "inline-flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px",
          ...style
        }}
      >
        {renderMark(numSize)}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
              fontWeight: 900,
              fontSize: `${numSize * 0.55}px`,
              lineHeight: 1,
              letterSpacing: "0.06em",
              color: isLight ? "#151515" : "#FFFFFF"
            }}
          >
            S<span style={{ color: isLight ? "#4F5101" : "#F0FF60" }}>CRM</span>
          </div>
          {showTagline && (
            <div
              style={{
                fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
                fontWeight: 700,
                fontSize: `${Math.max(numSize * 0.22, 9)}px`,
                letterSpacing: "0.22em",
                color: isLight ? "#484848" : "#DFDFDF",
                opacity: 0.85,
                marginTop: "3px"
              }}
            >
              {taglineText}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default: Horizontal Lockup
  return (
    <div
      className={`scrm-brand-lockup ${className}`}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: `${Math.max(numSize * 0.28, 10)}px`,
        textDecoration: "none",
        ...style
      }}
    >
      {renderMark(numSize)}
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div
          style={{
            fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
            fontWeight: 900,
            fontSize: `${numSize * 0.62}px`,
            lineHeight: 1,
            letterSpacing: "0.06em",
            color: isLight ? "#151515" : "#FFFFFF"
          }}
        >
          S<span style={{ color: isLight ? "#4F5101" : "#F0FF60" }}>CRM</span>
        </div>
        {showTagline && (
          <div
            style={{
              fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
              fontWeight: 700,
              fontSize: `${Math.max(numSize * 0.24, 9)}px`,
              letterSpacing: "0.2em",
              color: isLight ? "#484848" : "#DFDFDF",
              opacity: 0.85,
              marginTop: "2px"
            }}
          >
            {taglineText}
          </div>
        )}
      </div>
    </div>
  );
}

