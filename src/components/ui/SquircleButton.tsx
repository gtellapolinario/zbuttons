/**
 * SquircleButton
 * sugestão de fonte: npm install @fontsource-variable/ibm-plex-sans
 * no index.css adicione: @import '@fontsource-variable/ibm-plex-sans/wght.css';
 * 
 * @theme inline {
 *   --font-sans: 'IBM Plex Sans Variable', sans-serif;
 * }
 * 
 * Botão SVG 3D com forma squircle, efeito de profundidade e suporte a ícones Lucide.
 *
 * @example Basic
 * ```tsx
 * import { Rocket } from "lucide-react"
 * import { SquircleButton } from "@/components/ui/SquircleButton"
 *
 * <SquircleButton variant="blue" label="Launch" icon={Rocket} />
 * ```
 *
 * @example Sizes
 * ```tsx
 * <SquircleButton variant="teal"   size="tiny"    label="Tiny"    icon={Zap} />
 * <SquircleButton variant="teal"   size="default" label="Default" icon={Zap} />
 * <SquircleButton variant="teal"   size="large"   label="Large"   icon={Zap} />
 * <SquircleButton variant="orange" size="full"    label="Full Width" icon={Zap} />
 * <SquircleButton variant="blue"   size="square"  icon={Zap} />
 * <SquircleButton variant="blue"   size="floating" icon={Rocket} onClick={fn} />
 * ```
 *
 * @example Palette iteration
 * ```tsx
 * import { BUTTON_VARIANTS } from "@/components/ui/squircle-button-variants"
 *
 * {BUTTON_VARIANTS.map((v) => (
 *   <SquircleButton key={v} variant={v} size="palette" label={v} icon={Palette} />
 * ))}
 * ```
 *
 * Props:
 * - `variant`  — cor do botão: blue | green | red | orange | yellow | teal | pink | purple | slate | amber | white
 * - `size`     — tamanho/modo: tiny(h30) | default(h44) | large(h60) | palette(h44) | square(h44,icon-only) | full(h44,fullWidth) | floating(h64,fixed)
 * - `label`    — texto exibido em caixa alta (ignorado em square/floating)
 * - `icon`     — componente LucideIcon
 * - `onClick`  — callback de clique
 * - `className`— classes extras no wrapper
 */

// components/SquircleButton.tsx
import { useRef, useState, useEffect, useId, useCallback } from "react";
import type { LucideIcon } from "lucide-react";
import { VARIANT_COLORS, SIZE_CONFIG } from "./squircle-button-variants";
import type { ButtonVariant, ButtonSize } from "./squircle-button-variants";


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

export interface SquircleButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  label?: string;
  icon?: LucideIcon;
  onClick?: () => void;
  className?: string;
}

export function SquircleButton({
  variant = "blue",
  size = "default",
  label = "",
  icon: Icon,
  onClick,
  className = "",
}: SquircleButtonProps) {
  const { height, square, floating, fullWidth } = SIZE_CONFIG[size];

  const uid = useId().replace(/:/g, "");
  const [pressed, setPressed] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [btnW, setBtnW] = useState(0);

  const p = pressed ? 1 : 0;
  const [hb, hd] = VARIANT_COLORS[variant];
  const isWhite = variant === "white";
  const scale = height / 40;
  const upperLabel = label.toUpperCase();

  const computeW = useCallback((containerW?: number) => {
    if (fullWidth && containerW) return containerW / scale - 10;
    CTX.font = "900 15px system-ui";
    return square ? 48 : Math.ceil((CTX.measureText(upperLabel).width + (Icon ? 100 : 80)) * 1.1);
  }, [fullWidth, scale, square, upperLabel, Icon]);

  useEffect(() => {
    if (!fullWidth || !wrapperRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      setBtnW(computeW(entry.contentRect.width));
    });
    ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, [fullWidth, computeW]);

  const resolvedBtnW = fullWidth ? btnW : computeW();

  if (!resolvedBtnW) return (
    <div ref={wrapperRef} style={{ height: `${60 * scale}px` }} />
  );

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
  const iconSize = Math.round((square ? 22 : 18) * scale);

  return (
    <div
      ref={wrapperRef}
      className={[
        "relative select-none cursor-pointer [-webkit-tap-highlight-color:transparent]",
        fullWidth ? "block w-full" : "inline-block",
        className,
      ].join(" ")}
      style={{
        width: fullWidth ? undefined : `${(w + 10) * scale}px`,
        height: `${60 * scale}px`,
      }}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      onClick={onClick}
    >
      <svg
        viewBox={`0 0 ${w + 10} 60`}
        preserveAspectRatio="none"
        className="w-full h-full overflow-visible"
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

        <path d={squirclePath(w, 40, 18, 5, baseY)} fill={colorMix(hd, 60, "black")} filter={`url(#b${uid})`} />
        <path d={squirclePath(w, 40, 18, 5, baseY)} fill={colorMix(hd, 80, "black")} stroke="rgba(151 160 177 / 0.7)" strokeWidth={1} />
        {Array.from({ length: sideCount }).map((_, k) => (
          <path key={k} d={squirclePath(w, 40, 18, 5, faceY + 1 + k)} fill={`url(#g${uid})`} />
        ))}
        <path
          d={squirclePath(w, 40, 18, 5, faceY)}
          fill={isWhite ? "#fff" : `#${hb}`}
          stroke={isWhite ? "#DBE3EE" : hi}
          strokeWidth={1.5}
        />
      </svg>

      {/* conteúdo: ícone + label */}
      <div
        className={[
          "absolute inset-x-0 flex items-center justify-center pointer-events-none",
          isWhite ? "text-blue-500" : "text-white",
        ].join(" ")}
        style={{
          top: `${faceY * scale}px`,
          height: `${40 * scale}px`,
          gap: `${6 * scale}px`,
        }}
      >
        {Icon && <Icon size={iconSize} strokeWidth={2.5} />}
        {!square && upperLabel && (
          <span
            className="font-black tracking-[1px] font-sans leading-none"
            style={{ fontSize: `${14 * scale}px` }}
          >
            {upperLabel}
          </span>
        )}
      </div>
    </div>
  );
}
