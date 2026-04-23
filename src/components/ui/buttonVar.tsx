import * as React from "react";
import { tv, type VariantProps } from "tailwind-variants";

const buttonVariants = tv({
  slots: {
    // BASE: Container + sombra do chão
    base: "group relative bg-transparent border-none p-0 m-0",
    
    // TOP: Face frontal (usa position relative pra ficar sobre o bottom)
    top: "relative z-10 flex items-center justify-center rounded-[7mm] transition-transform duration-200 overflow-hidden group-active:translate-y-[10px]",
    
    // BOTTOM: Camada lateral 3D
    bottom: "absolute rounded-[7mm]",
    
    // SHADOW: Sombra do chão (novo slot)
    shadow: "absolute rounded-[7mm] -z-10",
    
    text: "font-semibold pointer-events-none",
  },
  variants: {
    variant: {
      blue: {
        top: "bg-gradient-to-tr from-blue-600 via-blue-200 to-blue-600",
        bottom: "bg-gradient-to-tr from-blue-600 via-blue-400 to-blue-600",
        shadow: "bg-[rgb(140,140,140)]",
        text: "text-gray-900",
      },
      cream: {
        top: "bg-gradient-to-tr from-amber-600 via-amber-200 to-amber-600",
        bottom: "bg-gradient-to-tr from-amber-600 via-amber-400 to-amber-600",
        shadow: "bg-[rgb(140,140,140)]",
        text: "text-[rgb(36,38,34)]",
      },
      red: {
        top: "bg-gradient-to-tr from-red-600 via-red-300 to-red-600",
        bottom: "bg-gradient-to-tr from-red-800 via-red-600 to-red-800",
        shadow: "bg-[rgb(140,140,140)]",
        text: "text-white",
      },
      green: {
        top: "bg-gradient-to-tr from-green-600 via-green-300 to-green-600",
        bottom: "bg-gradient-to-tr from-green-800 via-green-600 to-green-800",
        shadow: "bg-[rgb(140,140,140)]",
        text: "text-white",
      },
    },
    size: {
      default: {
        text: "text-md",
      },
      sm: {
        text: "text-sm",
      },
      lg: {
        text: "text-lg",
      },
    },
  },
  defaultVariants: {
    variant: "blue",
    size: "default",
  },
});

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const ButtonVar = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size, className, children, style, ...props }, ref) => {
    const { base, top, bottom, shadow, text } = buttonVariants({ variant, size });

    return (
      <button
        ref={ref}
        type="button"
        className={base({ className })}
        style={{
          width: "120px",
          height: "40px",
          ...style,
        }}
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
            style={{
              position: "absolute",
              width: "15px",
              height: "100%",
              background: "rgba(0,250,250,0.1)",
              transform: "skewX(-30deg)",
              left: "-20px",
              transition: "left 250ms",
            }}
            className="group-active:!left-[calc(100%+20px)]"
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
          {/* Pino esquerdo */}
          <div
            style={{
              position: "absolute",
              width: "2px",
              height: "9px",
              background: "rgb(36,38,34)",
              bottom: 0,
              left: "15%",
            }}
          />
          {/* Pino direito */}
          <div
            style={{
              position: "absolute",
              width: "2px",
              height: "9px",
              background: "rgb(36,38,34)",
              bottom: 0,
              left: "85%",
            }}
          />
        </div>
      </button>
    );
  }
);

ButtonVar.displayName = "ButtonVar";
