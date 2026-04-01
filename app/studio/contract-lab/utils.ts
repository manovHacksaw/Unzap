import type { CompileError, LiveDiagnostic, SearchMatch } from "./types";

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

export function classifyToken(token: string, theme: "amber" | "emerald" | "azure" | "mono" = "amber") {
  const isMono = theme === "mono";
  if (token.startsWith("//")) return "text-neutral-600";

  if (isMono) {
    if (token.startsWith("#[")) return "text-white opacity-80 underline decoration-neutral-700";
    if (token.startsWith("'") || token.startsWith("\"")) return "text-neutral-200 font-bold";
    if (/^(fn|trait|mod|struct|impl|use|let|ref|const|enum|match|if|else|assert|return|of|self)$/.test(token)) {
      return "text-white font-black underline decoration-white/20";
    }
    if (/^(felt252|u64|u128|u256|bool|ContractState|ContractAddress|Map)$/.test(token)) {
      return "text-neutral-300 font-bold italic";
    }
    if (/^\d/.test(token)) return "text-neutral-400";
    return "text-neutral-400";
  }

  const themeMap = {
    amber: { attr: "text-amber-400", kw: "text-amber-300", type: "text-sky-300", str: "text-emerald-400" },
    emerald: { attr: "text-emerald-400", kw: "text-emerald-300", type: "text-neutral-100", str: "text-sky-300" },
    azure: { attr: "text-sky-400", kw: "text-sky-300", type: "text-emerald-300", str: "text-fuchsia-400" },
  };

  const colors = themeMap[theme as keyof typeof themeMap] || themeMap.amber;

  if (token.startsWith("#[")) return colors.attr;
  if (token.startsWith("'") || token.startsWith("\"")) return colors.str;
  if (/^(fn|trait|mod|struct|impl|use|let|ref|const|enum|match|if|else|assert|return|of|self)$/.test(token)) {
    return colors.kw;
  }
  if (/^(felt252|u64|u128|u256|bool|ContractState|ContractAddress|Map)$/.test(token)) {
    return colors.type;
  }
  if (/^\d/.test(token)) return "text-fuchsia-300";
  if (/^[A-Z][A-Za-z0-9_]*$/.test(token)) return "text-neutral-100";
  if (/^[{}[\]();,.<>:+\-*/=&!@]+$/.test(token)) return "text-neutral-500";
  return "text-neutral-300";
}

export function highlightCairo(source: string, theme: "amber" | "emerald" | "azure" | "mono" = "amber") {
  const tokenRegex =
    /(\/\/.*$|#\[[^\]]*\]|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|\b(?:fn|trait|mod|struct|impl|use|let|ref|const|enum|match|if|else|assert|return|of|self)\b|\b(?:felt252|u64|u128|u256|bool|ContractState|ContractAddress|Map)\b|\b\d+(?:_\d+)*\b|[A-Z][A-Za-z0-9_]*|[{}[\]();,.<>:+\-*/=&!@]+)/gm;

  let cursor = 0;
  let html = "";
  for (const match of source.matchAll(tokenRegex)) {
    const index = match.index ?? 0;
    const token = match[0];
    html += escapeHtml(source.slice(cursor, index));
    html += `<span class="${classifyToken(token, theme)}">${escapeHtml(token)}</span>`;
    cursor = index + token.length;
  }
  html += escapeHtml(source.slice(cursor));
  return `${html}${source.endsWith("\n") ? " " : ""}`;
}

export function getLiveDiagnostics(source: string): LiveDiagnostic[] {
  const diagnostics: LiveDiagnostic[] = [];
  const lines = source.split("\n");
  const stack: Array<{ symbol: string; line: number; col: number }> = [];
  const openToClose: Record<string, string> = { "(": ")", "{": "}", "[": "]" };
  const closeToOpen: Record<string, string> = { ")": "(", "}": "{", "]": "[" };

  lines.forEach((line, lineIndex) => {
    const lineNumber = lineIndex + 1;

    if (line.trim().startsWith("#[") && !line.trim().endsWith("]")) {
      diagnostics.push({
        message: "Attribute looks incomplete. Did you forget the closing ']'?",
        line: lineNumber,
        col: Math.max(line.length, 1),
        severity: "warning",
      });
    }

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char in openToClose) stack.push({ symbol: char, line: lineNumber, col: i + 1 });
      if (char in closeToOpen) {
        const previous = stack.pop();
        if (!previous || previous.symbol !== closeToOpen[char]) {
          diagnostics.push({
            message: `Unexpected '${char}'`,
            line: lineNumber,
            col: i + 1,
            severity: "warning",
          });
        }
      }
    }

    if (/\t/.test(line)) {
      diagnostics.push({
        message: "Tab indentation can make Cairo formatting inconsistent. Prefer spaces.",
        line: lineNumber,
        col: line.indexOf("\t") + 1,
        severity: "hint",
      });
    }

    if (/\s+$/.test(line) && line.trim()) {
      diagnostics.push({
        message: "Trailing whitespace",
        line: lineNumber,
        col: line.length,
        severity: "hint",
      });
    }
  });

  while (stack.length > 0) {
    const item = stack.pop();
    if (!item) break;
    diagnostics.push({
      message: `Missing '${openToClose[item.symbol]}' to close '${item.symbol}'`,
      line: item.line,
      col: item.col,
      severity: "warning",
    });
  }

  if (!source.includes("#[starknet::contract]")) {
    diagnostics.push({
      message: "Missing #[starknet::contract] attribute.",
      line: 1,
      col: 1,
      severity: "hint",
    });
  }

  if (!source.includes("#[storage]")) {
    diagnostics.push({
      message: "No #[storage] block found. Stateful contracts usually define storage.",
      line: 1,
      col: 1,
      severity: "hint",
    });
  }

  return diagnostics;
}

export function getSearchMatches(source: string, query: string): SearchMatch[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  const lines = source.split("\n");
  const matches: SearchMatch[] = [];

  lines.forEach((line, lineIndex) => {
    const haystack = line.toLowerCase();
    let fromIndex = 0;
    while (fromIndex < haystack.length) {
      const hit = haystack.indexOf(normalizedQuery, fromIndex);
      if (hit === -1) break;
      matches.push({
        index: matches.length,
        line: lineIndex + 1,
        col: hit + 1,
        preview: line.trim() || "(blank line)",
      });
      fromIndex = hit + normalizedQuery.length;
    }
  });

  return matches;
}

export function formatProblemsForCopy(errors: CompileError[], liveDiagnostics: LiveDiagnostic[], compilerOutput: string) {
  const sections: string[] = [];

  if (liveDiagnostics.length > 0) {
    sections.push(
      [
        "LIVE EDITOR CHECKS",
        ...liveDiagnostics.map(
          (issue) => `[${issue.severity.toUpperCase()}] Line ${issue.line}:${issue.col} ${issue.message}`
        ),
      ].join("\n")
    );
  }

  if (errors.length > 0) {
    sections.push(
      [
        "COMPILER DIAGNOSTICS",
        ...errors.map((error) => `Line ${error.line}:${error.col} ${error.message}`),
      ].join("\n")
    );
  }

  if (compilerOutput.trim()) {
    sections.push(`FULL COMPILER TRACE\n${compilerOutput.trim()}`);
  }

  return sections.join("\n\n");
}
