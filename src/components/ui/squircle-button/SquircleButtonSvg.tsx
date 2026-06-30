import { colorMix, getVariantColors, isWhiteVariant, squirclePath } from "./utils";
import type { ButtonVariant } from "./variants";

interface SquircleButtonSvgProps {
  width: number;
  scale: number;
  pressed: boolean;
  variant: ButtonVariant;
  uid: string;
}

export const SquircleButtonSvg = ({
  width,
  scale,
  pressed,
  variant,
  uid,
}: SquircleButtonSvgProps) => {
  const [baseHex, darkHex] = getVariantColors(variant);
  const white = isWhiteVariant(variant);
  const pressedOffset = pressed ? 1 : 0;

  const faceY = 4 + pressedOffset * 5;
  const baseY = 12;
  const z = Math.min(0.5, 20 / width);
  const dy = 4 - pressedOffset * 2;
  const std = 3 - pressedOffset * 1.5;
  const op = 0.3;

  const hi = colorMix(baseHex, 70, "white");
  const sh = colorMix(darkHex, 35, "black");
  const sideCount = Math.max(0, baseY - faceY);

  return (
    <svg
      viewBox={`0 0 ${width + 10} 60`}
      preserveAspectRatio="none"
      className="w-full h-full overflow-visible"
    >
      <defs>
        <filter id={`b${uid}`} x="-100%" y="-100%" width="300%" height="300%">
          <feDropShadow dy={dy} stdDeviation={std} floodColor={sh} floodOpacity={op} />
        </filter>

        <linearGradient id={`g${uid}`}>
          <stop offset="0" stopColor={colorMix(darkHex, 65, "white")} />
          <stop offset={z} stopColor={colorMix(darkHex, 90, "white")} />
          <stop offset={1 - z} stopColor={colorMix(darkHex, 90, "white")} />
          <stop offset="1" stopColor={colorMix(darkHex, 65, "white")} />
        </linearGradient>
      </defs>

      <path
        d={squirclePath(width, 40, 18, 5, baseY)}
        fill={colorMix(darkHex, 60, "black")}
        filter={`url(#b${uid})`}
      />

      <path
        d={squirclePath(width, 40, 18, 5, baseY)}
        fill={colorMix(darkHex, 80, "black")}
        stroke="rgba(151,160,177,0.7)"
        strokeWidth={1}
      />

      {Array.from({ length: sideCount }).map((_, index) => (
        <path
          key={index}
          d={squirclePath(width, 40, 18, 5, faceY + 1 + index)}
          fill={`url(#g${uid})`}
        />
      ))}

      <path
        d={squirclePath(width, 40, 18, 5, faceY)}
        fill={white ? "#fff" : `#${baseHex}`}
        stroke={white ? "#DBE3EE" : hi}
        strokeWidth={1.5}
      />
    </svg>
  );
};
