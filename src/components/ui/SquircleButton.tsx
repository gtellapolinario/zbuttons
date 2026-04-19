// components/SquircleButton.tsx
import { useRef, useState, useEffect, useId, useCallback } from "react";

const HEXES = "3b82f61d4ed822c55e15803def4444b91c1cff6a00cc5500ffc800cca00014b8a60f766edb3b7cb02e649356d46b3fa13341551e293bffbf00cc9900ffffffd3e2ef".match(/.{6}/g)!;
const COLORS: Record<string, number> = {
  blue:0, green:1, red:2, orange:3, yellow:4,
  teal:5, pink:6, purple:7, slate:8, amber:9, white:10,
};

const CTX = document.createElement("canvas").getContext("2d")!;

const squirclePath = (w: number, h: number, r: number, x: number, y: number): string => {
  let p = "";
  for (let j = 0; j < 4; j++) {
    for (let i = 0; i < 31; i++) {
      const q = ((j + i / 30) * Math.PI) / 2;
      const c = Math.cos(q), s = Math.sin(q);
      p += (j || i ? "L" : "M") +
        (x + (c > 0 ? w - r : r) + Math.sign(c) * Math.pow(Math.abs(c), 0.6) * r) + " " +
        (y + (s > 0 ? h - r : r) + Math.sign(s) * Math.pow(Math.abs(s), 0.6) * r);
    }
  }
  return p + "Z";
};

const colorMix = (hex: string, pct: number, k: string) =>
  `color-mix(in srgb, #${hex} ${pct}%, ${k})`;

export type ButtonColor = keyof typeof COLORS;

interface SquircleButtonProps {
  color?: ButtonColor;
  label?: string;
  icon?: string;
  height?: number;
  square?: boolean;
  floating?: boolean;
  fullWidth?: boolean;
  onClick?: () => void;
  className?: string;
}

export function SquircleButton({
  color = "blue",
  label = "",
  icon = "",
  height = 44,
  square = false,
  floating = false,
  fullWidth = false,
  onClick,
  className = "",
}: SquircleButtonProps) {
  const uid = useId().replace(/:/g, "");
  const [pressed, setPressed] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [btnW, setBtnW] = useState(0);

  const p = pressed ? 1 : 0;
  const idx = COLORS[color] ?? 0;
  const hb = HEXES[idx * 2];
  const hd = HEXES[idx * 2 + 1];
  const isWhite = color === "white";
  const scale = height / 40;
  const upperLabel = label.toUpperCase();

  // Calcula largura inicial via canvas
  const computeW = useCallback((containerW?: number) => {
    if (fullWidth && containerW) return containerW / scale - 10;
    CTX.font = "900 15px system-ui";
    return square ? 48 : Math.ceil((CTX.measureText(upperLabel).width + (icon ? 100 : 80)) * 1.1);
  }, [fullWidth, scale, square, upperLabel, icon]);

  // ResizeObserver para fullWidth
  useEffect(() => {
    if (!fullWidth || !wrapperRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setBtnW(computeW(entry.contentRect.width));
    });
    ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, [fullWidth, computeW]);

  const resolvedBtnW = fullWidth ? btnW : computeW();

  if (!resolvedBtnW) return <div ref={wrapperRef} style={{ height: `${60 * scale}px` }} />;

  const w = resolvedBtnW;
  const faceY = 4 + p * 5;
  const baseY = 12;
  const z = Math.min(0.5, 20 / w);
  const dy = floating ? 24 - p * 12 : 4 - p * 2;
  const std = floating ? 12 - p * 6 : 3 - p * 1.5;
  const op = floating ? 0.15 : 0.3;

  const hi = colorMix(hb, 70, "white");
  const sh = colorMix(hd, 35, "black");
  const sideCount = Math.max(0, baseY - faceY);

  return (
    <div
      ref={wrapperRef}
      className={`inline-block select-none cursor-pointer [-webkit-tap-highlight-color:transparent] ${fullWidth ? "w-full block" : ""} ${className}`}
      style={{
        width: fullWidth ? "100%" : `${(w + 10) * scale}px`,
        height: `${60 * scale}px`,
      }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onClick={onClick}
    >
      <svg
        viewBox={`0 0 ${w + 10} 60`}
        style={{ width: "100%", height: "100%", overflow: "visible" }}
        preserveAspectRatio="none"
      >
        <defs>
          <filter id={`b${uid}`} x="-100%" y="-100%" width="300%" height="300%">
            <feDropShadow dy={dy} stdDeviation={std} floodColor={sh} floodOpacity={op} />
          </filter>
          <linearGradient id={`g${uid}`}>
            <stop offset="0"     stopColor={colorMix(hd, 65, "white")} />
            <stop offset={z}     stopColor={colorMix(hd, 90, "white")} />
            <stop offset={1 - z} stopColor={colorMix(hd, 90, "white")} />
            <stop offset="1"     stopColor={colorMix(hd, 65, "white")} />
          </linearGradient>
        </defs>

        {/* Sombra base */}
        <path d={squirclePath(w, 40, 18, 5, baseY)} fill={colorMix(hd, 60, "black")} filter={`url(#b${uid})`} />
        {/* Lateral */}
        <path d={squirclePath(w, 40, 18, 5, baseY)} fill={colorMix(hd, 80, "black")} stroke={floating ? hi : colorMix(hd, 50, "black")} strokeWidth={1} />
        {/* Face lateral gradiente */}
        {Array.from({ length: sideCount }).map((_, k) => (
          <path key={k} d={squirclePath(w, 40, 18, 5, faceY + 1 + k)} fill={`url(#g${uid})`} />
        ))}
        {/* Face superior */}
        <path
          d={squirclePath(w, 40, 18, 5, faceY)}
          fill={isWhite ? "#fff" : `#${hb}`}
          stroke={isWhite ? "#e2e8f0" : hi}
          strokeWidth={1.5}
        />
        {/* Label */}
        <text
          x={5 + w / 2}
          y={20 + faceY}
          textAnchor="middle"
          dominantBaseline="central"
          fill={isWhite ? "#3b82f6" : "#fff"}
          style={{ pointerEvents: "none", fontWeight: 900 }}
        >
          {icon && (
            <tspan style={{ fontFamily: "Material Icons", fontSize: square ? "26px" : "20px" }} dy={1}>
              {icon}
            </tspan>
          )}
          {!square && (
            <tspan dx={icon ? 8 : 0} dy={0} fontSize={15} style={{ letterSpacing: "1px", fontFamily: "system-ui" }}>
              {upperLabel}
            </tspan>
          )}
        </text>
      </svg>
    </div>
  );
}
