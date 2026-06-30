import type { ButtonSize, ButtonVariant } from "./variants";
import { SIZE_CONFIG, VARIANT_COLORS } from "./variants";

const CANVAS = document.createElement("canvas");
const CTX = CANVAS.getContext("2d")!;

export const squirclePath = (
  width: number,
  height: number,
  radius: number,
  x: number,
  y: number
): string => {
  let path = "";

  for (let quadrant = 0; quadrant < 4; quadrant++) {
    for (let step = 0; step < 31; step++) {
      const angle = ((quadrant + step / 30) * Math.PI) / 2;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const baseX = cos > 0 ? width - radius : radius;
      const baseY = sin > 0 ? height - radius : radius;
      const offsetX = Math.sign(cos) * Math.pow(Math.abs(cos), 0.6) * radius;
      const offsetY = Math.sign(sin) * Math.pow(Math.abs(sin), 0.6) * radius;
      const command = quadrant || step ? "L" : "M";

      path += `${command}${x + baseX + offsetX} ${y + baseY + offsetY}`;
    }
  }

  return `${path}Z`;
};

export const colorMix = (hex: string, percentage: number, mixer: string): string =>
  `color-mix(in srgb, #${hex} ${percentage}%, ${mixer})`;

interface ComputeWidthInput {
  label: string;
  fontWeight: number;
  hasIcon: boolean;
  size: ButtonSize;
  containerWidth?: number;
}

export const computeButtonWidth = ({
  label,
  fontWeight,
  hasIcon,
  size,
  containerWidth,
}: ComputeWidthInput): number => {
  const { height, square, fullWidth } = SIZE_CONFIG[size];
  const scale = height / 40;

  if (fullWidth && containerWidth) {
    return containerWidth / scale - 10;
  }

  if (square) {
    return 48;
  }

  CTX.font = `${fontWeight} 15px system-ui`;
  const padding = hasIcon ? 72 : 54;

  return Math.ceil((CTX.measureText(label).width + padding) * 1.1);
};

export const getVariantColors = (variant: ButtonVariant): readonly [string, string] =>
  VARIANT_COLORS[variant];

export const isWhiteVariant = (variant: ButtonVariant): boolean => variant === "white";
