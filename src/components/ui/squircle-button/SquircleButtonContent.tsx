import type { ComponentType } from "react";

import { isWhiteVariant } from "./utils";
import type { ButtonVariant } from "./variants";
import { SIZE_CONFIG } from "./variants";

interface SquircleButtonContentProps {
  label: string;
  fontWeight: number;
  icon?: ComponentType<any>;
  iconSize?: number;
  iconStrokeWidth?: number;
  size: string;
  faceY: number;
  variant: ButtonVariant;
}

export const SquircleButtonContent = ({
  label,
  fontWeight,
  icon: Icon,
  iconSize,
  iconStrokeWidth,
  size,
  faceY,
  variant,
}: SquircleButtonContentProps) => {
  const { height, square } = SIZE_CONFIG[size as keyof typeof SIZE_CONFIG];
  const scale = height / 40;
  const showIcon = Boolean(Icon);
  const showLabel = Boolean(label && (!square || !Icon));
  const resolvedIconSize = iconSize ?? Math.round((square ? 22 : 18) * scale);
  const white = isWhiteVariant(variant);

  return (
    <div
      className={[
        "absolute inset-x-0 flex items-center justify-center pointer-events-none",
        white ? "text-blue-500" : "text-white",
      ].join(" ")}
      style={{
        top: `${faceY * scale}px`,
        height: `${40 * scale}px`,
        gap: `${6 * scale}px`,
      }}
    >
      {showIcon && Icon && (
        <Icon
          size={resolvedIconSize}
          width={resolvedIconSize}
          height={resolvedIconSize}
          strokeWidth={iconStrokeWidth}
        />
      )}

      {showLabel && (
        <span
          className="tracking-[1px] font-sans leading-none"
          style={{
            fontSize: `${14 * scale}px`,
            fontWeight,
          }}
        >
          {label.toUpperCase()}
        </span>
      )}
    </div>
  );
};
