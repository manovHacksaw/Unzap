import { useState, useMemo, useCallback, type MouseEvent as ReactMouseEvent } from "react";
import {
  INITIAL_FILES,
  type ExplorerEntry,
  type CompileSuccess,
  type ExplorerContextMenuState,
  type IDESettings,
  type StudioToastInput,
} from "../types";
import { getLiveDiagnostics, getSearchMatches, highlightCairo } from "../utils";
import { CONTRACT_TEMPLATES, type ContractTemplate } from "../templates";

interface UseFileExplorerProps {
  files: typeof INITIAL_FILES;
  setFiles: React.Dispatch<React.SetStateAction<typeof INITIAL_FILES>>;
  activeFileId: string;
  setActiveFileId: React.Dispatch<React.SetStateAction<string>>;
  buildOutputsByFile: Record<string, CompileSuccess>;
  settings: IDESettings;
  addLog: (log: string) => void;
  pushToast: (toast: StudioToastInput) => void;
}

export function useFileExplorer({
  files,
  setFiles,
  activeFileId,
  setActiveFileId,
  buildOutputsByFile,
  settings,
  addLog,
  pushToast,
}: UseFileExplorerProps) {
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [contextMenu, setContextMenu] = useState<ExplorerContextMenuState | null>(null);
  const [codeSearchQuery, setCodeSearchQuery] = useState("");

  // --- Derived file lists ---
  const sourceFiles = useMemo<ExplorerEntry[]>(
    () => files.map((file) => ({ ...file, kind: "source" as const })),
    [files]
  );

  const artifactFiles = useMemo<ExplorerEntry[]>(() => {
    return files.flatMap((file) => {
      const buildOutput = buildOutputsByFile[file.id];
      if (!buildOutput) return [];
      const artifactBaseName = file.filename.replace(/\.cairo$/, "");
      return [
        {
          id: `artifact-${file.id}-abi`,
          filename: `${artifactBaseName}.abi.json`,
          source: JSON.stringify(buildOutput.abi, null, 2),
          readonly: true,
          kind: "artifact" as const,
          sourceFileId: file.id,
        },
        {
          id: `artifact-${file.id}-sierra`,
          filename: `${artifactBaseName}.sierra.json`,
          source: JSON.stringify(buildOutput.sierra, null, 2),
          readonly: true,
          kind: "artifact" as const,
          sourceFileId: file.id,
        },
        {
          id: `artifact-${file.id}-casm`,
          filename: `${artifactBaseName}.casm.json`,
          source: JSON.stringify(buildOutput.casm, null, 2),
          readonly: true,
          kind: "artifact" as const,
          sourceFileId: file.id,
        },
      ];
    });
  }, [buildOutputsByFile, files]);

  const explorerFiles = useMemo<ExplorerEntry[]>(
    () => [...sourceFiles, ...artifactFiles],
    [artifactFiles, sourceFiles]
  );

  const activeFile = useMemo(
    () => explorerFiles.find((f) => f.id === activeFileId) || explorerFiles[0],
    [activeFileId, explorerFiles]
  );

  const activeSourceFileId = activeFile?.kind === "artifact"
    ? activeFile.sourceFileId ?? null
    : activeFile?.id ?? null;

  const activeBuildData = activeSourceFileId
    ? buildOutputsByFile[activeSourceFileId] ?? null
    : null;

  const activeSourceFile = useMemo(
    () =>
      activeSourceFileId
        ? sourceFiles.find((file) => file.id === activeSourceFileId) ?? null
        : null,
    [activeSourceFileId, sourceFiles]
  );

  const contextMenuFile = useMemo(
    () => explorerFiles.find((f) => f.id === contextMenu?.fileId) ?? null,
    [contextMenu?.fileId, explorerFiles]
  );

  // --- Derived source properties ---
  const currentSource = activeFile?.source || "";
  const highlightedSource = useMemo(
    () => highlightCairo(currentSource, settings.theme),
    [currentSource, settings.theme]
  );
  const liveDiagnostics = useMemo(() => getLiveDiagnostics(currentSource), [currentSource]);
  const problemCount = useMemo(() => liveDiagnostics.length, [liveDiagnostics]);
  const codeSearchMatches = useMemo(
    () => getSearchMatches(currentSource, codeSearchQuery),
    [codeSearchQuery, currentSource]
  );

  // --- Handlers ---
  const getUniqueFilename = useCallback(
    (name: string) => {
      let base = name;
      let ext = "";
      const lastDot = name.lastIndexOf(".");
      if (lastDot !== -1) {
        base = name.slice(0, lastDot);
        ext = name.slice(lastDot);
      }
      let finalName = name;
      let counter = 1;
      while (files.some((f) => f.filename === finalName)) {
        finalName = `${base} (${counter})${ext}`;
        counter++;
      }
      return finalName;
    },
    [files]
  );

  const updateSource = useCallback(
    (val: string) => {
      if (activeFile?.readonly) return;
      setFiles((prev) =>
        prev.map((f) => (f.id === activeFileId ? { ...f, source: val } : f))
      );
    },
    [activeFile?.readonly, activeFileId]
  );

  const createFile = useCallback(() => {
    const newId = `file-${Date.now()}`;
    const name = getUniqueFilename("untitled.cairo");
    const newFile = { id: newId, filename: name, source: "// New Cairo Contract\n" };
    setFiles((prev) => [...prev, newFile]);
    setActiveFileId(newId);
    setEditingFileId(newId);
    setRenameValue(name);
  }, [getUniqueFilename]);

  const deleteFile = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (files.length <= 1) return;
      const newFiles = files.filter((f) => f.id !== id);
      setFiles(newFiles);
      if (activeFileId === id) setActiveFileId(newFiles[0].id);
    },
    [activeFileId, files]
  );

  const startRename = useCallback((e: React.MouseEvent, file: ExplorerEntry) => {
    e.stopPropagation();
    setEditingFileId(file.id);
    setRenameValue(file.filename);
  }, []);

  const confirmRename = useCallback(() => {
    if (!editingFileId) return;
    setFiles((prev) =>
      prev.map((f) => (f.id === editingFileId ? { ...f, filename: renameValue } : f))
    );
    setEditingFileId(null);
  }, [editingFileId, renameValue]);

  const openContextMenu = useCallback(
    (e: ReactMouseEvent, fileId: string | null = null) => {
      e.preventDefault();
      e.stopPropagation();
      if (fileId) setActiveFileId(fileId);
      setContextMenu({ x: e.clientX, y: e.clientY, fileId });
    },
    []
  );

  const handleLoadTemplate = useCallback(
    (template: ContractTemplate) => {
      const newId = `template-${template.id}-${Date.now()}`;
      const uniqueName = getUniqueFilename(template.filename);
      const newFile = {
        id: newId,
        filename: uniqueName,
        source: template.sourceCode,
      };
      setFiles((prev) => [...prev, newFile]);
      setActiveFileId(newId);
      addLog(`[system] Loaded template: ${template.name}`);
      pushToast({
        tone: "success",
        title: `Template loaded: ${template.name}`,
        description: `New file "${uniqueName}" created from template.`,
      });
    },
    [addLog, getUniqueFilename, pushToast]
  );

  return {
    files,
    setFiles,
    activeFileId,
    setActiveFileId,
    activeFile,
    activeSourceFile,
    activeSourceFileId,
    activeBuildData,
    explorerFiles,
    sourceFiles,
    artifactFiles,
    currentSource,
    highlightedSource,
    liveDiagnostics,
    problemCount,
    codeSearchQuery,
    setCodeSearchQuery: setCodeSearchQuery,
    codeSearchMatches,
    contextMenuFile,
    updateSource,
    createFile,
    deleteFile,
    editingFileId,
    setEditingFileId,
    renameValue,
    setRenameValue,
    startRename,
    confirmRename,
    contextMenu,
    setContextMenu,
    openContextMenu,
    handleLoadTemplate,
    getUniqueFilename,
  };
}
