"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface CursorContextValue {
  cursorLine: number;
  cursorCol: number;
  setCursor: (line: number, col: number) => void;
}

const CursorContext = createContext<CursorContextValue>({
  cursorLine: 1,
  cursorCol: 1,
  setCursor: () => {},
});

export function CursorProvider({ children }: { children: ReactNode }) {
  const [cursor, setCursorState] = useState({ line: 1, col: 1 });

  const setCursor = useCallback((line: number, col: number) => {
    setCursorState((prev) => {
      if (prev.line === line && prev.col === col) return prev;
      return { line, col };
    });
  }, []);

  return (
    <CursorContext.Provider value={{ cursorLine: cursor.line, cursorCol: cursor.col, setCursor }}>
      {children}
    </CursorContext.Provider>
  );
}

export function useCursor() {
  return useContext(CursorContext);
}
