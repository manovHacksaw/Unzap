import { useState, useMemo, useCallback } from "react";
import { INITIAL_FILES, type ExplorerEntry, type CompileSuccess, type ExplorerContextMenuState } from "../types";

export function useFileExplorer(buildOutputsByFile: Record<string, CompileSuccess>) {
  const [files, setFiles] = useState(INITIAL_FILES);
  const [activeFileId, setActiveFileId] = useState(INITIAL_FILES[0].id);
  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [contextMenu, setContextMenu] = useState<ExplorerContextMenuState | null>(null);

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
          sourceFileId: file.id 
        },
        { 
          id: `artifact-${file.id}-sierra`, 
          filename: `${artifactBaseName}.sierra.json`, 
          source: JSON.stringify(buildOutput.sierra, null, 2), 
          readonly: true, 
          kind: "artifact" as const, 
          sourceFileId: file.id 
        },
        { 
          id: `artifact-${file.id}-casm`, 
          filename: `${artifactBaseName}.casm.json`, 
          source: JSON.stringify(buildOutput.casm, null, 2), 
          readonly: true, 
          kind: "artifact" as const, 
          sourceFileId: file.id 
        },
      ];
    });
  }, [buildOutputsByFile, files]);

  const explorerFiles = useMemo<ExplorerEntry[]>(() => [...sourceFiles, ...artifactFiles], [artifactFiles, sourceFiles]);
  
  const activeFile = useMemo(() => 
    explorerFiles.find((f) => f.id === activeFileId) || explorerFiles[0], 
  [activeFileId, explorerFiles]);

  const activeSourceFileId = useMemo(() => 
    activeFile?.kind === "artifact" ? activeFile.sourceFileId ?? null : activeFile?.id ?? null,
  [activeFile]);

  const activeSourceFile = useMemo(() => 
    activeSourceFileId ? sourceFiles.find((file) => file.id === activeSourceFileId) ?? null : null,
  [activeSourceFileId, sourceFiles]);

  const updateSource = useCallback((val: string) => {
    if (activeFile?.readonly) return;
    setFiles((prev) => prev.map((f) => (f.id === activeFileId ? { ...f, source: val } : f)));
  }, [activeFile?.readonly, activeFileId]);

  const createFile = useCallback(() => {
    const newId = `file-${Date.now()}`;
    const newFile = { id: newId, filename: "untitled.cairo", source: "// New Cairo Contract\n" };
    setFiles((prev) => [...prev, newFile]);
    setActiveFileId(newId);
    setEditingFileId(newId);
    setRenameValue("untitled.cairo");
    return newId;
  }, []);

  const deleteFile = useCallback((id: string) => {
    setFiles((prev) => {
      if (prev.length <= 1) return prev;
      const newFiles = prev.filter((f) => f.id !== id);
      // If we are deleting the active file, switch to the first one available
      setActiveFileId((current) => current === id ? newFiles[0].id : current);
      return newFiles;
    });
  }, []);

  const startRename = useCallback((file: ExplorerEntry) => {
    setEditingFileId(file.id);
    setRenameValue(file.filename);
  }, []);

  const confirmRename = useCallback(() => {
    if (!editingFileId) return;
    setFiles((prev) => prev.map(f => f.id === editingFileId ? { ...f, filename: renameValue } : f));
    setEditingFileId(null);
  }, [editingFileId, renameValue]);

  return {
    files,
    setFiles,
    activeFileId,
    setActiveFileId,
    activeFile,
    activeSourceFile,
    activeSourceFileId,
    explorerFiles,
    sourceFiles,
    artifactFiles,
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
  };
}
