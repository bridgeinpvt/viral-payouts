"use client";

import { useState, useEffect } from "react";

interface KeyboardClasses {
  form: string;
  modal: string;
  scroll: string;
}

export function useKeyboardAdjustments() {
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
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

  const keyboardClasses: KeyboardClasses = {
    form: isKeyboardOpen ? "pb-4" : "",
    modal: isKeyboardOpen ? "max-h-[50vh] overflow-y-auto" : "",
    scroll: isKeyboardOpen ? "overflow-y-auto" : "",
  };

  return { isKeyboardOpen, keyboardClasses };
}
