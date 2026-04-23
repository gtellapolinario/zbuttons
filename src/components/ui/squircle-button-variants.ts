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
export type ButtonSize = keyof typeof SIZE_CONFIG;
export const BUTTON_VARIANTS = Object.keys(VARIANT_COLORS) as ButtonVariant[];
