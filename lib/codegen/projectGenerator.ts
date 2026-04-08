/**
 * Orchestrates full Next.js project generation from a contract ABI.
 * Returns a flat map of { filepath: content } ready for ZIP assembly.
 *
 * Separation of concerns:
 *   - hookGenerator  → hooks file (reads + writes + StarkzapProvider)
 *   - templates/nextjs → everything else (package.json, layout, page, ContractUI, README)
 *   - THIS FILE      → composes them into a single output map
 */

import { generateHooksFile, type GenerateHooksInput } from "./hookGenerator";
import {
  generatePackageJson,
  generatePostcssConfig,
  generateGlobalsCss,
  generateEnvExample,
  generateTsConfig,
  generateContractLib,
  generateLayout,
  generatePage,
  generateLogsPanel,
  generateContractUI,
  generateReadme,
} from "./templates/nextjs";

// ── types ──────────────────────────────────────────────────────────────────────

export interface ProjectFiles {
  /** Flat map: relative file path → file content */
  files: Record<string, string>;
  /** Detected function names for display in UI */
  functions: {
    reads: string[];
    writes: string[];
  };
  /** The hooks filename for display (e.g. "useMyContract.ts") */
  hooksFilename: string;
}

// ── main export ────────────────────────────────────────────────────────────────

export function generateProject(input: GenerateHooksInput): ProjectFiles {
  const { contractName, contractAddress, classHash, network, abi, parsed } = input;

  const pascal =
    contractName.charAt(0).toUpperCase() +
    contractName.slice(1).replace(/_([a-z])/g, (_, c) => c.toUpperCase());

  const hooksCode = generateHooksFile(input);
  const hooksFilename = `use${pascal}.ts`;

  const files: Record<string, string> = {
    // Project config
    "package.json": generatePackageJson(contractName),
    "tsconfig.json": generateTsConfig(),
    "postcss.config.mjs": generatePostcssConfig(),
    ".env.example": generateEnvExample(contractAddress, network),

    // Contract constants + ABI
    "lib/contract.ts": generateContractLib(contractAddress, classHash, network, abi),

    // Next.js app shell
    "app/globals.css": generateGlobalsCss(),
    "app/layout.tsx": generateLayout(contractName),
    "app/page.tsx": generatePage(contractName, network, contractAddress),

    // ABI-driven components
    "components/LogsPanel.tsx": generateLogsPanel(),
    "components/ContractUI.tsx": generateContractUI(contractName, parsed),

    // Generated hooks (the main deliverable)
    [`hooks/${hooksFilename}`]: hooksCode,

    // Docs
    "README.md": generateReadme(contractName, contractAddress, classHash, network, parsed),
  };

  return {
    files,
    hooksFilename,
    functions: {
      reads: parsed.reads.map((f) => f.name),
      writes: parsed.writes.map((f) => f.name),
    },
  };
}
