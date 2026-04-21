import { useState, useCallback } from "react";
import {
  COMPILER_URL,
  INITIAL_FILES,
  type CompileError,
  type CompileSuccess,
  type CompileFailure,
  type BuildStatus,
  type ExplorerEntry,
  type StudioToastInput,
} from "../types";

interface UseCairoCompilerProps {
  activeSourceFile: ExplorerEntry | null;
  buildStatus: BuildStatus;
  setBuildStatus: React.Dispatch<React.SetStateAction<BuildStatus>>;
  buildOutputsByFile: Record<string, CompileSuccess>;
  setBuildOutputsByFile: React.Dispatch<React.SetStateAction<Record<string, CompileSuccess>>>;
  addLog: (log: string) => void;
  pushToast: (toast: StudioToastInput) => void;
  setActiveBottomTab: (tab: string) => void;
  setFiles: React.Dispatch<React.SetStateAction<typeof INITIAL_FILES>>;
  onBuildSuccess?: () => void;
}

export function useCairoCompiler({
  activeSourceFile,
  buildStatus,
  setBuildStatus,
  buildOutputsByFile,
  setBuildOutputsByFile,
  addLog,
  pushToast,
  setActiveBottomTab,
  setFiles,
  onBuildSuccess,
}: UseCairoCompilerProps) {
  const [errors, setErrors] = useState<CompileError[]>([]);
  const [compilerOutput, setCompilerOutput] = useState("");
  const [isAiFixing, setIsAiFixing] = useState<string | null>(null);
  const [aiFixSuggestion, setAiFixSuggestion] = useState<{
    index: number;
    fix: { line: number; newContent: string; description?: string };
  } | null>(null);

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
        pushToast({
          tone: "error",
          title: "Build failed",
          description: `${json.errors?.length || 1} compiler issue${json.errors?.length === 1 ? "" : "s"} found in ${activeSourceFile.filename}.`,
        });
      } else {
        setBuildStatus("success");
        setBuildOutputsByFile((prev) => ({
          ...prev,
          [activeSourceFile.id]: json as CompileSuccess,
        }));
        appendCompilerOutput(json.logs);
        addLog("Build successful! Sierra and ABI generated.");
        onBuildSuccess?.();
        pushToast({
          tone: "success",
          title: "Build complete",
          description: `${activeSourceFile.filename} compiled successfully and artifacts are ready.`,
        });
      }
    } catch (e) {
      setBuildStatus("error");
      setErrors([
        { message: e instanceof Error ? e.message : "Network error", line: 0, col: 0 },
      ]);
      addLog("Build failed: Network or server error.");
      pushToast({
        tone: "error",
        title: "Build request failed",
        description:
          "The compiler could not be reached. Check the compiler service and try again.",
      });
    }
  }, [buildStatus, activeSourceFile, addLog, setActiveBottomTab, appendCompilerOutput, pushToast, onBuildSuccess]);

  const handleAiFix = useCallback(
    async (error: CompileError, index: number) => {
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
          pushToast({
            tone: "info",
            title: "AI suggestion ready",
            description: `A proposed fix is available for line ${error.line}.`,
          });
        } else {
          addLog(`AI: ${data.error || "No specific fix found."}`);
        }
      } catch {
        addLog("AI Fixing failed: Network or server error.");
      } finally {
        setIsAiFixing(null);
      }
    },
    [activeSourceFile, addLog, isAiFixing, pushToast]
  );

  const applyAiFix = useCallback(
    (fix: { line: number; newContent: string }) => {
      if (!fix || !activeSourceFile || !fix.newContent) return;
      const lines = activeSourceFile.source.split("\n");
      lines[fix.line - 1] = fix.newContent;
      const newSource = lines.join("\n");
      setFiles((prev: typeof INITIAL_FILES) =>
        prev.map((f: typeof INITIAL_FILES[0]) => (f.id === activeSourceFile.id ? { ...f, source: newSource } : f))
      );
      setAiFixSuggestion(null);
      addLog("AI Fix applied! Recompiling...");
      pushToast({
        tone: "success",
        title: "AI fix applied",
        description:
          "The suggested change was written to the editor and a rebuild is starting.",
      });
      setTimeout(() => handleBuild(), 100);
    },
    [activeSourceFile, addLog, handleBuild, pushToast, setFiles]
  );

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
