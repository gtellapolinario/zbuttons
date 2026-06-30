import type { LucideIcon } from "lucide-react";
import type { ComponentType, ButtonHTMLAttributes } from "react";

import type { ButtonSize, ButtonVariant } from "./variants";

export interface SquircleButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  label?: string;
  fontWeight?: 500 | 600 | 700 | 800 | 900;
  icon?: LucideIcon | ComponentType<any>;
  iconSize?: number;
  iconStrokeWidth?: number;
}

export type { ButtonSize, ButtonVariant };
