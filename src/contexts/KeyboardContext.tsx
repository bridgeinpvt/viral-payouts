"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface KeyboardContextType {
  isKeyboardOpen: boolean;
}

const KeyboardContext = createContext<KeyboardContextType>({
  isKeyboardOpen: false,
});

export function KeyboardProvider({ children }: { children: ReactNode }) {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      // On mobile, when keyboard opens, the visual viewport shrinks
      if (window.visualViewport) {
        const isOpen = window.visualViewport.height < window.innerHeight * 0.75;
        setIsKeyboardOpen(isOpen);
      }
    };

    window.visualViewport?.addEventListener("resize", handleResize);
    return () => {
      window.visualViewport?.removeEventListener("resize", handleResize);
    };
  }, []);

  return (
    <KeyboardContext.Provider value={{ isKeyboardOpen }}>
      {children}
    </KeyboardContext.Provider>
  );
}

export function useKeyboard() {
  return useContext(KeyboardContext);
}
