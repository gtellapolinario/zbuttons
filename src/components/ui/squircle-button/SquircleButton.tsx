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
 * import { Rocket, Zap } from "lucide-react"
 * import { SquircleButton } from "@ui/squircle-button/index"
 *
 * <SquircleButton variant="teal"   size="default"  label="Default"   icon={Zap} />
 * <SquircleButton variant="blue" label="Launch" icon={Rocket} />
 * ```
 */

import { forwardRef } from "react";

import { SquircleButtonContent } from "./SquircleButtonContent";
import { SquircleButtonSvg } from "./SquircleButtonSvg";
import { useSquircleButton } from "./use-squircle-button";
import type { SquircleButtonProps } from "./types";
import { SIZE_CONFIG } from "./variants";

export const SquircleButton = forwardRef<HTMLButtonElement, SquircleButtonProps>(
  (
    {
      variant = "blue",
      size = "default",
      label = "",
      fontWeight = 900,
      icon: Icon,
      className = "",
      disabled = false,
      type = "button",
      iconSize,
      iconStrokeWidth = 2.5,
      onPointerDown,
      onPointerUp,
      onPointerLeave,
      ...props
    },
    ref
  ) => {
    const { height, square, floating, fullWidth } = SIZE_CONFIG[size];
    const upperLabel = label.toUpperCase();

    const { uid, pressed, setPressed, buttonWidth, setRefs } = useSquircleButton({
      label: upperLabel,
      fontWeight,
      hasIcon: Boolean(Icon),
      size,
    });

    const setCombinedRefs = (node: HTMLButtonElement | null) => {
      setRefs(node);
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    };

    if (!buttonWidth) {
      return <div style={{ height: `${60 * (height / 40)}px` }} />;
    }

    const scale = height / 40;
    const pressedOffset = pressed ? 1 : 0;
    const faceY = 4 + pressedOffset * (floating ? 5 : 5);

    return (
      <button
        ref={setCombinedRefs}
        type={type}
        disabled={disabled}
        aria-label={label || props["aria-label"] || undefined}
        title={square && Icon && label ? label : undefined}
        className={[
          "relative appearance-none border-none bg-transparent p-0 m-0 select-none [-webkit-tap-highlight-color:transparent] focus:outline-none",
          disabled ? "opacity-50 cursor-not-allowed grayscale" : "cursor-pointer",
          fullWidth ? "block w-full" : "inline-block",
          className,
        ].join(" ")}
        style={{
          width: fullWidth ? undefined : `${(buttonWidth + 10) * scale}px`,
          height: `${60 * scale}px`,
          ...props.style,
        }}
        onPointerDown={(e) => {
          if (!disabled) setPressed(true);
          onPointerDown?.(e);
        }}
        onPointerUp={(e) => {
          if (!disabled) setPressed(false);
          onPointerUp?.(e);
        }}
        onPointerLeave={(e) => {
          if (!disabled) setPressed(false);
          onPointerLeave?.(e);
        }}
        {...props}
      >
        <SquircleButtonSvg
          width={buttonWidth}
          scale={scale}
          pressed={pressed}
          variant={variant}
          uid={uid}
        />

        <SquircleButtonContent
          label={upperLabel}
          fontWeight={fontWeight}
          icon={Icon}
          iconSize={iconSize}
          iconStrokeWidth={iconStrokeWidth}
          size={size}
          faceY={faceY}
          variant={variant}
        />
      </button>
    );
  }
);

SquircleButton.displayName = "SquircleButton";
