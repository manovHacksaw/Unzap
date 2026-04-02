import { useState, useCallback } from "react";

export function useIdeTerminal() {
  const [terminalLogs, setTerminalLogs] = useState<string[]>(["[system] Starkzap Dev Studio v0.1.0 ready."]);

  const addLog = useCallback((log: string) => {
    const time = new Date().toLocaleTimeString([], { hour12: false });
    setTerminalLogs((prev) => [...prev, `[${time}] ${log}`]);
  }, []);

  const clearLogs = useCallback(() => {
    setTerminalLogs([]);
  }, []);

  return {
    terminalLogs,
    addLog,
    clearLogs,
  };
}
