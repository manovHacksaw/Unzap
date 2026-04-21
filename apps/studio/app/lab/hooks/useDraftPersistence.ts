import { useState, useEffect, useRef, useCallback } from "react";
import {
  CONTRACT_LAB_DRAFT_KEY,
  CONTRACT_LAB_SETTINGS_KEY,
  CONTRACT_LAB_DRAFT_VERSION,
  INITIAL_FILES,
  DEFAULT_SETTINGS,
  type ContractLabDraft,
  type CompileSuccess,
  type IDESettings,
  type BuildStatus,
} from "../types";

interface UseDraftPersistenceProps {
  files: typeof INITIAL_FILES;
  setFiles: (files: typeof INITIAL_FILES) => void;
  activeFileId: string;
  setActiveFileId: (id: string) => void;
  buildOutputsByFile: Record<string, CompileSuccess>;
  setBuildOutputsByFile: (outputs: Record<string, CompileSuccess>) => void;
  setBuildStatus: (status: BuildStatus) => void;
  addLog: (log: string) => void;
}

export function useDraftPersistence({
  files,
  setFiles,
  activeFileId,
  setActiveFileId,
  buildOutputsByFile,
  setBuildOutputsByFile,
  setBuildStatus,
  addLog,
}: UseDraftPersistenceProps) {
  const [isDraftHydrating, setIsDraftHydrating] = useState(true);
  const draftHydratedRef = useRef(false);

  const [settings, setSettings] = useState<IDESettings>(DEFAULT_SETTINGS);

  const updateSetting = useCallback(<K extends keyof IDESettings>(key: K, value: IDESettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Hydrate draft from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const rawDraft = window.localStorage.getItem(CONTRACT_LAB_DRAFT_KEY);
      if (!rawDraft) {
        draftHydratedRef.current = true;
        setIsDraftHydrating(false);
        return;
      }

      const parsed = JSON.parse(rawDraft) as ContractLabDraft;
      if (
        parsed.version !== CONTRACT_LAB_DRAFT_VERSION ||
        !Array.isArray(parsed.files) ||
        parsed.files.length === 0 ||
        typeof parsed.activeFileId !== "string"
      ) {
        draftHydratedRef.current = true;
        setIsDraftHydrating(false);
        return;
      }

      const validFiles = parsed.files.filter(
        (file): file is (typeof INITIAL_FILES)[number] =>
          !!file &&
          typeof file.id === "string" &&
          typeof file.filename === "string" &&
          typeof file.source === "string"
      );

      if (validFiles.length > 0) {
        setFiles(validFiles);
        setActiveFileId(
          validFiles.some((file) => file.id === parsed.activeFileId)
            ? parsed.activeFileId
            : validFiles[0].id
        );
        const restoredBuildOutputs =
          parsed.buildOutputsByFile && typeof parsed.buildOutputsByFile === "object"
            ? parsed.buildOutputsByFile
            : {};
        setBuildOutputsByFile(restoredBuildOutputs);
        const activeRestoredId = validFiles.some((f) => f.id === parsed.activeFileId)
          ? parsed.activeFileId
          : validFiles[0].id;
        if (restoredBuildOutputs[activeRestoredId]) setBuildStatus("success");
        addLog(`Restored ${validFiles.length} file(s) from local browser draft.`);
      }
    } catch {
      /* Ignore malformed drafts */
    } finally {
      draftHydratedRef.current = true;
      setIsDraftHydrating(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist draft to localStorage on changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!draftHydratedRef.current) return;
    const draft: ContractLabDraft = {
      version: CONTRACT_LAB_DRAFT_VERSION,
      files,
      activeFileId: files.some((file) => file.id === activeFileId) ? activeFileId : files[0].id,
      buildOutputsByFile,
      updatedAt: Date.now(),
    };
    window.localStorage.setItem(CONTRACT_LAB_DRAFT_KEY, JSON.stringify(draft));
  }, [activeFileId, buildOutputsByFile, files]);

  // Hydrate settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CONTRACT_LAB_SETTINGS_KEY);
      if (saved) setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
    } catch {}
  }, []);

  // Persist settings to localStorage on changes
  useEffect(() => {
    localStorage.setItem(CONTRACT_LAB_SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  return { isDraftHydrating, settings, updateSetting };
}
