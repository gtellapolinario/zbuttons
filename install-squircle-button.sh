#!/usr/bin/env bash
# install-squircle-button.sh
# Instala SquircleButton + ButtonVar em qualquer projeto shadcn/React+Tailwind
# Uso: bash install-squircle-button.sh [destino]
# Exemplo: bash install-squircle-button.sh ../meu-projeto

set -e

DEST=${1:-.}
UI_DIR="$DEST/src/components/ui"

# ── Validação ────────────────────────────────────────────────────────────────
if [ ! -f "$DEST/package.json" ]; then
  echo "❌ package.json não encontrado em '$DEST'. Aponte para a raiz do projeto."
  exit 1
fi

mkdir -p "$UI_DIR"

# ── Detecta package manager ──────────────────────────────────────────────────
if [ -f "$DEST/bun.lockb" ]; then
  PM="bun add"
elif [ -f "$DEST/pnpm-lock.yaml" ]; then
  PM="pnpm add"
elif [ -f "$DEST/yarn.lock" ]; then
  PM="yarn add"
else
  PM="npm install"
fi

# ── Dependências ─────────────────────────────────────────────────────────────
echo "📦 Instalando dependências..."
(cd "$DEST" && $PM lucide-react class-variance-authority tailwind-variants)

# ── squircle-button-variants.ts ──────────────────────────────────────────────
echo "📝 Criando squircle-button-variants.ts..."
cat > "$UI_DIR/squircle-button-variants.ts" << 'VARIANTS_EOF'
import { cva } from "class-variance-authority";

export const VARIANT_COLORS = {
  blue:   ["3b82f6", "1d4ed8"],
  green:  ["22c55e", "15803d"],
  red:    ["ef4444", "b91c1c"],
  orange: ["ff6a00", "cc5500"],
  yellow: ["ffc800", "cca000"],
  teal:   ["14b8a6", "0f766e"],
  pink:   ["db3b7c", "b02e64"],
  purple: ["9356d4", "6b3fa1"],
  slate:  ["334155", "1e293b"],
  amber:  ["ffbf00", "cc9900"],
  white:  ["ffffff", "d3e2ef"],
} as const;

export const SIZE_CONFIG = {
  palette:  { height: 44, square: false, floating: false, fullWidth: false },
  square:   { height: 44, square: true,  floating: false, fullWidth: false },
  tiny:     { height: 30, square: false, floating: false, fullWidth: false },
  default:  { height: 44, square: false, floating: false, fullWidth: false },
  large:    { height: 60, square: false, floating: false, fullWidth: false },
  full:     { height: 44, square: false, floating: false, fullWidth: true  },
  floating: { height: 64, square: true,  floating: true,  fullWidth: false },
} as const;

export const squircleButtonVariants = cva("", {
  variants: {
    variant: {
      blue: "", green: "", red: "", orange: "", yellow: "",
      teal: "", pink: "", purple: "", slate: "", amber: "", white: "",
    },
    size: {
      palette: "", square: "", tiny: "", default: "", large: "", full: "", floating: "",
    },
  },
  defaultVariants: { variant: "blue", size: "default" },
});

export type ButtonVariant = keyof typeof VARIANT_COLORS;
export type ButtonSize    = keyof typeof SIZE_CONFIG;
export const BUTTON_VARIANTS = Object.keys(VARIANT_COLORS) as ButtonVariant[];
VARIANTS_EOF

# ── SquircleButton.tsx ───────────────────────────────────────────────────────
echo "📝 Criando SquircleButton.tsx..."
cat > "$UI_DIR/SquircleButton.tsx" << 'COMPONENT_EOF'
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
 * <SquircleButton variant="teal"   size="tiny"     label="Tiny"      icon={Zap} />
 * <SquircleButton variant="teal"   size="default"  label="Default"   icon={Zap} />
 * <SquircleButton variant="teal"   size="large"    label="Large"     icon={Zap} />
 * <SquircleButton variant="orange" size="full"     label="Full Width" icon={Zap} />
 * <SquircleButton variant="blue"   size="square"   icon={Zap} />
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
 * - `variant`  — cor: blue | green | red | orange | yellow | teal | pink | purple | slate | amber | white
 * - `size`     — modo: tiny(h30) | default(h44) | large(h60) | palette(h44) | square(h44,icon-only) | full(h44,fullWidth) | floating(h64,fixed)
 * - `label`    — texto em caixa alta (ignorado em square/floating)
 * - `icon`     — componente LucideIcon
 * - `onClick`  — callback de clique
 * - `className`— classes extras no wrapper
 */

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
        <path d={squirclePath(w, 40, 18, 5, baseY)} fill={colorMix(hd, 80, "black")} stroke="rgba(151,160,177,0.7)" strokeWidth={1} />
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
COMPONENT_EOF

# ── ButtonVar.tsx ─────────────────────────────────────────────────────────────
echo "📝 Criando ButtonVar.tsx..."
cat > "$UI_DIR/ButtonVar.tsx" << 'BUTTONVAR_EOF'
/**
 * ButtonVar
 * Botão 3D com face frontal, camada lateral e sombra — baseado em tailwind-variants (tv).
 *
 * @example
 * ```tsx
 * import { ButtonVar } from "@/components/ui/ButtonVar"
 *
 * <ButtonVar variant="blue" size="default">Click Me!</ButtonVar>
 * <ButtonVar variant="cream" size="sm">Small</ButtonVar>
 * <ButtonVar variant="red"   size="lg">Large</ButtonVar>
 * ```
 *
 * Props:
 * - `variant` — blue | cream | red | green
 * - `size`    — default | sm | lg
 * - Aceita todos os atributos de <button>
 */

import * as React from "react";
import { tv, type VariantProps } from "tailwind-variants";

const buttonVariants = tv({
  slots: {
    base:   "group relative bg-transparent border-none p-0 m-0",
    top:    "relative z-10 flex items-center justify-center rounded-[7mm] transition-transform duration-200 overflow-hidden group-active:translate-y-[10px]",
    bottom: "absolute rounded-[7mm]",
    shadow: "absolute rounded-[7mm] -z-10",
    text:   "font-semibold pointer-events-none",
  },
  variants: {
    variant: {
      blue: {
        top:    "bg-gradient-to-tr from-blue-600 via-blue-200 to-blue-600",
        bottom: "bg-gradient-to-tr from-blue-600 via-blue-400 to-blue-600",
        shadow: "bg-[rgb(140,140,140)]",
        text:   "text-gray-900",
      },
      cream: {
        top:    "bg-gradient-to-tr from-amber-600 via-amber-200 to-amber-600",
        bottom: "bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-600",
        shadow: "bg-[rgb(140,140,140)]",
        text:   "text-[rgb(36,38,34)]",
      },
      red: {
        top:    "bg-gradient-to-tr from-red-600 via-red-300 to-red-600",
        bottom: "bg-gradient-to-tr from-red-800 via-red-600 to-red-800",
        shadow: "bg-[rgb(140,140,140)]",
        text:   "text-white",
      },
      green: {
        top:    "bg-gradient-to-tr from-green-600 via-green-300 to-green-600",
        bottom: "bg-gradient-to-tr from-green-800 via-green-600 to-green-800",
        shadow: "bg-[rgb(140,140,140)]",
        text:   "text-white",
      },
    },
    size: {
      default: { text: "text-md" },
      sm:      { text: "text-sm" },
      lg:      { text: "text-lg" },
    },
  },
  defaultVariants: {
    variant: "blue",
    size: "default",
  },
});

export interface ButtonVarProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const ButtonVar = React.forwardRef<HTMLButtonElement, ButtonVarProps>(
  ({ variant, size, className, children, style, ...props }, ref) => {
    const { base, top, bottom, shadow, text } = buttonVariants({ variant, size });

    return (
      <button
        ref={ref}
        type="button"
        className={base({ className })}
        style={{ width: "120px", height: "40px", ...style }}
        {...props}
      >
        {/* Sombra do chão */}
        <div
          className={shadow()}
          style={{
            width: "calc(100% + 2px)",
            height: "100%",
            top: "14px",
            left: "-1px",
            outline: "2px solid rgb(36,38,34)",
          }}
        />

        {/* Face frontal */}
        <div
          className={top()}
          style={{
            width: "100%",
            height: "100%",
            outline: "2px solid rgb(36,38,34)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            position: "relative",
          }}
        >
          <span className={text()}>{children ?? "Click Me!"}</span>

          {/* Brilho animado */}
          <div
            className="group-active:!left-[calc(100%+20px)]"
            style={{
              position: "absolute",
              width: "15px",
              height: "100%",
              background: "rgba(0,250,250,0.1)",
              transform: "skewX(-30deg)",
              left: "-20px",
              transition: "left 250ms",
            }}
          />
        </div>

        {/* Camada lateral 3D */}
        <div
          className={bottom()}
          style={{
            width: "100%",
            height: "100%",
            top: "10px",
            left: 0,
            zIndex: -1,
            outline: "2px solid rgb(36,38,34)",
            boxShadow: "0 15px 40px rgba(0,0,0,0.4)",
          }}
        >
          <div style={{ position: "absolute", width: "2px", height: "9px", background: "rgb(36,38,34)", bottom: 0, left: "15%" }} />
          <div style={{ position: "absolute", width: "2px", height: "9px", background: "rgb(36,38,34)", bottom: 0, left: "85%" }} />
        </div>
      </button>
    );
  }
);

ButtonVar.displayName = "ButtonVar";
BUTTONVAR_EOF

# ── Resumo ───────────────────────────────────────────────────────────────────
echo ""
echo "✅ Componentes instalados em $UI_DIR"
echo ""
echo "Arquivos criados:"
echo "  $UI_DIR/SquircleButton.tsx"
echo "  $UI_DIR/squircle-button-variants.ts"
echo "  $UI_DIR/ButtonVar.tsx"
echo ""
echo "Uso — SquircleButton:"
echo "  import { SquircleButton } from '@/components/ui/SquircleButton'"
echo "  import { BUTTON_VARIANTS } from '@/components/ui/squircle-button-variants'"
echo ""
echo "Uso — ButtonVar:"
echo "  import { ButtonVar } from '@/components/ui/ButtonVar'"
echo "  <ButtonVar variant=\"blue\" size=\"default\">Click Me!</ButtonVar>"
echo ""
echo "Opcional — fonte IBM Plex Sans:"
echo "  $PM @fontsource-variable/ibm-plex-sans"
echo "  // index.css:"
echo "  @import '@fontsource-variable/ibm-plex-sans/wght.css';"
echo "  // @theme inline { --font-sans: 'IBM Plex Sans Variable', sans-serif; }"
