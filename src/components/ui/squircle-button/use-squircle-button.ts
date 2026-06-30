import { useCallback, useEffect, useId, useRef, useState } from "react";

import { computeButtonWidth } from "./utils";
import { SIZE_CONFIG } from "./variants";
import type { ButtonSize } from "./variants";

interface UseSquircleButtonInput {
  label: string;
  fontWeight: number;
  hasIcon: boolean;
  size: ButtonSize;
}

interface UseSquircleButtonOutput {
  uid: string;
  pressed: boolean;
  setPressed: (value: boolean) => void;
  buttonWidth: number;
  setRefs: (node: HTMLButtonElement | null) => void;
}

export const useSquircleButton = ({
  label,
  fontWeight,
  hasIcon,
  size,
}: UseSquircleButtonInput): UseSquircleButtonOutput => {
  const uid = useId().replace(/:/g, "");
  const [pressed, setPressed] = useState(false);
  const [buttonWidth, setButtonWidth] = useState(0);
  const wrapperRef = useRef<HTMLButtonElement>(null);

  const { height, square, fullWidth } = SIZE_CONFIG[size];
  const scale = height / 40;
  const upperLabel = label.toUpperCase();

  const compute = useCallback(
    (containerWidth?: number) =>
      computeButtonWidth({
        label: upperLabel,
        fontWeight,
        hasIcon,
        size,
        containerWidth,
      }),
    [upperLabel, fontWeight, hasIcon, size]
  );

  useEffect(() => {
    if (!fullWidth || !wrapperRef.current) {
      setButtonWidth(compute());
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      setButtonWidth(compute(entry.contentRect.width));
    });

    observer.observe(wrapperRef.current);
    return () => observer.disconnect();
  }, [fullWidth, compute]);

  const setRefs = useCallback((node: HTMLButtonElement | null) => {
    wrapperRef.current = node;
  }, []);

  return { uid, pressed, setPressed, buttonWidth: buttonWidth || compute(), setRefs };
};
