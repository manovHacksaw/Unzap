"use client";

import { memo, useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { rust } from "@codemirror/lang-rust";
import { oneDark } from "@codemirror/theme-one-dark";
import { EditorView, keymap } from "@codemirror/view";
import { 
  defaultKeymap, 
  historyKeymap, 
  indentWithTab 
} from "@codemirror/commands";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";
import { useCursor } from "../context/CursorContext";

interface EditorProps {
  value: string;
  onChange: (val: string) => void;
  onCursorChange?: (line: number, col: number) => void;
  readOnly: boolean;
  settings: {
    theme: string;
    lineWrapping: boolean;
    showLineNumbers: boolean;
  };
  onBuild: () => void;
}

// Custom IDE Theme
const studioTheme = EditorView.theme({
  "&": {
    fontSize: "13px",
    backgroundColor: "transparent",
  },
  ".cm-content": {
    fontFamily: 'var(--font-geist-mono), ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    padding: "20px 0",
  },
  ".cm-gutters": {
    backgroundColor: "transparent",
    border: "none",
    color: "#404040",
    fontSize: "11px",
    paddingLeft: "10px",
  },
  ".cm-activeLine": {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  ".cm-activeLineGutter": {
    backgroundColor: "transparent",
    color: "#a3a3a3",
  },
  ".cm-cursor": {
    borderLeftColor: "#f59e0b",
  },
}, { dark: true });

const studioHighlight = syntaxHighlighting(HighlightStyle.define([
  { tag: t.keyword, color: "#f59e0b", fontWeight: "bold" },
  { tag: t.comment, color: "#525252", fontStyle: "italic" },
  { tag: t.string, color: "#10b981" },
  { tag: t.function(t.variableName), color: "#60a5fa" },
  { tag: t.typeName, color: "#818cf8" },
  { tag: t.number, color: "#f472b6" },
  { tag: t.operator, color: "#a3a3a3" },
]));

export const Editor = memo(function Editor({
  value,
  onChange,
  onCursorChange,
  readOnly,
  settings,
  onBuild,
}: EditorProps) {
  const { setCursor } = useCursor();
  
  const extensions = useMemo(() => [
    rust(),
    oneDark,
    settings.lineWrapping ? EditorView.lineWrapping : [],
    studioTheme,
    studioHighlight,
    keymap.of([
      ...defaultKeymap,
      ...historyKeymap,
      indentWithTab,
      {
        key: "Mod-s",
        run: () => {
          onBuild();
          return true;
        },
      },
    ]),
  ], [settings.lineWrapping, onBuild]);

  return (
    <CodeMirror
      value={value}
      height="100%"
      theme="dark"
      extensions={extensions}
      onChange={onChange}
      onUpdate={(v) => {
        if (v.docChanged || v.selectionSet) {
          const state = v.state;
          const pos = state.selection.main.head;
          const line = state.doc.lineAt(pos);
          const l = line.number;
          const c = pos - line.from + 1;
          setCursor(l, c);
          if (onCursorChange) onCursorChange(l, c);
        }
      }}
      basicSetup={{
        lineNumbers: settings.showLineNumbers,
        foldGutter: true,
        dropCursor: true,
        allowMultipleSelections: true,
        indentOnInput: true,
      }}
      readOnly={readOnly}
      className="h-full focus:outline-none"
    />
  );
});
