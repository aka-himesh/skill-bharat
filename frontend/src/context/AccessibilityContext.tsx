import React, { createContext, useContext, useEffect, useState } from "react";

type TextSize = "sm" | "md" | "lg";

interface A11yContextValue {
  textSize: TextSize;
  setTextSize: (s: TextSize) => void;
  highContrast: boolean;
  toggleContrast: () => void;
}

const A11yContext = createContext<A11yContextValue>({
  textSize: "md",
  setTextSize: () => {},
  highContrast: false,
  toggleContrast: () => {},
});

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [textSize, setTextSize] = useState<TextSize>("md");
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-textsize", textSize);
  }, [textSize]);

  useEffect(() => {
    document.documentElement.setAttribute("data-contrast", highContrast ? "high" : "normal");
  }, [highContrast]);

  return (
    <A11yContext.Provider value={{ textSize, setTextSize, highContrast, toggleContrast: () => setHighContrast((v) => !v) }}>
      {children}
    </A11yContext.Provider>
  );
}

export const useA11y = () => useContext(A11yContext);
