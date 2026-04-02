import { useState, useCallback } from "react";
import { COMPILER_URL, type CompileError, type CompileSuccess, type CompileFailure, type BuildStatus, type ExplorerEntry } from "../types";

interface UseCairoCompilerProps {
  activeSourceFile: ExplorerEntry | null;
  addLog: (log: string) => void;
  setActiveBottomTab: (tab: string) => void;
  setFiles: (fn: (prev: any[]) => any[]) => void;
}

export function useCairoCompiler({
  activeSourceFile,
  addLog,
  setActiveBottomTab,
  setFiles,
}: UseCairoCompilerProps) {
  const [buildStatus, setBuildStatus] = useState<BuildStatus>("idle");
  const [buildOutputsByFile, setBuildOutputsByFile] = useState<Record<string, CompileSuccess>>({});
  const [errors, setErrors] = useState<CompileError[]>([]);
  const [compilerOutput, setCompilerOutput] = useState("");
  const [isAiFixing, setIsAiFixing] = useState<string | null>(null);
  const [aiFixSuggestion, setAiFixSuggestion] = useState<{ index: number; fix: { line: number; newContent: string; description?: string } } | null>(null);

  const appendCompilerOutput = useCallback((output: string) => {
    if (!output) return;
    const normalized = output.replace(/\n\n+/g, "\n").trim();
    setCompilerOutput(normalized);
  }, []);

  const handleBuild = useCallback(async () => {
    if (buildStatus === "building" || !activeSourceFile) return;
    setBuildStatus("building");
    setErrors([]);
    setCompilerOutput("");
    addLog(`Starting build for ${activeSourceFile.filename}...`);
    setActiveBottomTab("terminal");

    try {
      const res = await fetch(`${COMPILER_URL}/compile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: activeSourceFile.source }),
      });
      const json = (await res.json()) as CompileSuccess & CompileFailure;

      if (!res.ok || json.errors) {
        setBuildStatus("error");
        setErrors(json.errors ?? []);
        appendCompilerOutput(json.logs ?? "");
        addLog(`Build failed: ${json.errors?.length || 1} error(s) found.`);
        setActiveBottomTab("problems");
      } else {
        setBuildStatus("success");
        setBuildOutputsByFile((prev) => ({ ...prev, [activeSourceFile.id]: json as CompileSuccess }));
        appendCompilerOutput(json.logs);
        addLog(`Build successful! Sierra and ABI generated.`);
      }
    } catch (e) {
      setBuildStatus("error");
      setErrors([{ message: e instanceof Error ? e.message : "Network error", line: 0, col: 0 }]);
      addLog(`Build failed: Network or server error.`);
    }
  }, [buildStatus, activeSourceFile, addLog, setActiveBottomTab, appendCompilerOutput]);

  const handleAiFix = async (error: CompileError, index: number) => {
    if (isAiFixing || !activeSourceFile) return;
    setIsAiFixing(index.toString());
    setAiFixSuggestion(null);
    addLog(`AI is analyzing the error at line ${error.line}...`);
    try {
      const res = await fetch("/api/ai/fix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: activeSourceFile.source, error }),
      });
      const data = await res.json();
      if (data.fix || data.suggestion) {
        setAiFixSuggestion({ index, fix: data.fix || data });
        addLog("AI found a potential fix!");
      } else {
        addLog(`AI: ${data.error || "No specific fix found."}`);
      }
    } catch {
      addLog("AI Fixing failed: Network or server error.");
    } finally {
      setIsAiFixing(null);
    }
  };

  const applyAiFix = useCallback((fix: { line: number, newContent: string }) => {
    if (!fix || !activeSourceFile || !fix.newContent) return;
    const lines = activeSourceFile.source.split("\n");
    lines[fix.line - 1] = fix.newContent;
    const newSource = lines.join("\n");
    setFiles((prev) => prev.map((f) => (f.id === activeSourceFile.id ? { ...f, source: newSource } : f)));
    setAiFixSuggestion(null);
    addLog("AI Fix applied! Recompiling...");
    setTimeout(() => handleBuild(), 100);
  }, [activeSourceFile, addLog, handleBuild, setFiles]);

  return {
    buildStatus,
    setBuildStatus,
    buildOutputsByFile,
    setBuildOutputsByFile,
    errors,
    setErrors,
    compilerOutput,
    setCompilerOutput,
    isAiFixing,
    aiFixSuggestion,
    setAiFixSuggestion,
    handleBuild,
    handleAiFix,
    applyAiFix,
    appendCompilerOutput,
  };
}
