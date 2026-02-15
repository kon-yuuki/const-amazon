"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";

type ThemeMode = "light" | "dark" | "system";

const THEME_KEY = "const-theme-mode";

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === "system") {
    delete root.dataset.theme;
    return;
  }
  root.dataset.theme = mode;
}

export function ThemeToggle() {
  const [mode, setMode] = useState<ThemeMode>("system");

  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY);
    const nextMode: ThemeMode = saved === "light" || saved === "dark" || saved === "system" ? saved : "system";
    setMode(nextMode);
    applyTheme(nextMode);
  }, []);

  const cycleMode = () => {
    const nextMode: ThemeMode = mode === "system" ? "light" : mode === "light" ? "dark" : "system";
    setMode(nextMode);
    localStorage.setItem(THEME_KEY, nextMode);
    applyTheme(nextMode);
  };

  return (
    <Button variant="outline" size="sm" onClick={cycleMode} title={`テーマ: ${mode}`}>
      {mode === "light" ? <Sun className="h-4 w-4" /> : mode === "dark" ? <Moon className="h-4 w-4" /> : <Monitor className="h-4 w-4" />}
    </Button>
  );
}
