import { exec } from "child_process";
import { mkdir, writeFile, readFile, readdir, rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import { promisify } from "util";
import { randomUUID } from "crypto";

const execAsync = promisify(exec);

const PORT = Number(process.env.PORT ?? 3001);
const MAX_SOURCE_BYTES = 50_000; // 50 KB
const COMPILE_TIMEOUT_MS = 60_000; // 60 s

// ── Scarb project template ────────────────────────────────────────────────────

function scarbToml(): string {
  return `[package]
name = "contract"
version = "0.1.0"

[dependencies]
starknet = ">=2.9.2"

[[target.starknet-contract]]
sierra = true
casm = true
`;
}

// ── Error parsing ─────────────────────────────────────────────────────────────

interface CompileError {
  message: string;
  line: number;
  col: number;
}

function stripAnsi(value: string): string {
  return value.replace(/\u001b\[[0-9;]*m/g, "");
}

function parseScarbErrors(stderr: string): CompileError[] {
  const normalized = stripAnsi(stderr);
  const errors: CompileError[] = [];
  const lines = normalized.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const errorMatch = lines[i].match(/^\s*error(?:\[E\d+\])?:\s+(.+)/);
    if (!errorMatch) continue;

    let locMatch: RegExpMatchArray | null = null;
    for (let j = i + 1; j <= Math.min(i + 5, lines.length - 1); j++) {
      locMatch = lines[j].match(/-->\s+.*src\/lib\.cairo:(\d+):(\d+)/);
      if (locMatch) break;
    }

    errors.push({
      message: errorMatch[1].trim(),
      line: locMatch ? parseInt(locMatch[1], 10) : 0,
      col: locMatch ? parseInt(locMatch[2], 10) : 0,
    });
  }

  return errors.length > 0
    ? errors
    : [{ message: normalized.trim() || "Unknown compilation error", line: 0, col: 0 }];
}

function parseFallbackLocation(logs: string): { line: number; col: number } | null {
  const normalized = stripAnsi(logs);
  const match = normalized.match(/-->\s+.*src\/lib\.cairo:(\d+):(\d+)/);
  if (!match) return null;
  return {
    line: parseInt(match[1], 10),
    col: parseInt(match[2], 10),
  };
}

// ── Core compile logic ────────────────────────────────────────────────────────

interface CompileResult {
  sierra: object;
  casm: object;
  abi: object[];
  logs: string;
}

async function compile(source: string): Promise<CompileResult> {
  const id = randomUUID();
  const dir = join(tmpdir(), `unzap-${id}`);

  try {
    // 1. Write isolated Scarb project
    await mkdir(join(dir, "src"), { recursive: true });
    await writeFile(join(dir, "Scarb.toml"), scarbToml());
    await writeFile(join(dir, "src", "lib.cairo"), source);

    // 2. Compile
    const { stdout, stderr } = await execAsync("scarb build", { cwd: dir, timeout: COMPILE_TIMEOUT_MS });
    const logs = stdout + stderr;

    // 3. Read outputs — discover filenames dynamically (Scarb names them after the contract module)
    const dev = join(dir, "target", "dev");
    const devFiles = await readdir(dev);
    const sierraFile = devFiles.find((f) => f.endsWith(".contract_class.json"));
    const casmFile = devFiles.find((f) => f.endsWith(".compiled_contract_class.json"));
    if (!sierraFile || !casmFile) {
      throw { stderr: `Scarb build succeeded but no output files found. Got: ${devFiles.join(", ")}` };
    }
    const sierra = JSON.parse(await readFile(join(dev, sierraFile), "utf8"));
    const casm = JSON.parse(await readFile(join(dev, casmFile), "utf8"));

    // ABI lives inside the Sierra JSON
    return { sierra, casm, abi: (sierra.abi as object[]) ?? [], logs };
  } catch (err: unknown) {
    const stdout = (err as { stdout?: string }).stdout ?? "";
    const stderr = (err as { stderr?: string }).stderr ?? "";
    const errorLogs = stripAnsi(`${stdout}${stderr}`);
    const parsedErrors = parseScarbErrors(stderr || stdout || String(err));
    const fallbackLocation = parseFallbackLocation(errorLogs);
    const enrichedErrors =
      fallbackLocation && parsedErrors.every((item) => item.line === 0 && item.col === 0)
        ? parsedErrors.map((item, index) =>
            index === 0
              ? { ...item, line: fallbackLocation.line, col: fallbackLocation.col }
              : item
          )
        : parsedErrors;
    // If it's a compilation error, re-throw with logs for the handler
    throw {
      errors: enrichedErrors,
      logs: errorLogs || String(err)
    };
  } finally {
    // Always clean up — even on error
    await rm(dir, { recursive: true, force: true });
  }
}

// ── Scarb version (for health check) ─────────────────────────────────────────

async function scarbVersion(): Promise<string> {
  try {
    const { stdout } = await execAsync("scarb --version", { timeout: 5_000 });
    return stdout.trim();
  } catch {
    return "unavailable";
  }
}

// ── CORS headers ──────────────────────────────────────────────────────────────

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin");
  const allowedVar = process.env.ALLOWED_ORIGIN || "";
  
  // High-priority: explicitly allow these
  const internalAllowed = ["https://unzap.xyz", "https://unzap.vercel.app", "http://localhost:3000"];
  
  if (!allowedVar || allowedVar === "*") {
    // If no config, reflect origin if it matches our list, otherwise *
    const allowed = (origin && internalAllowed.includes(origin)) ? origin : "*";
    return {
      "Access-Control-Allow-Origin": allowed,
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Vary": "Origin"
    };
  }

  const allowedOrigins = allowedVar.split(",").map(o => o.trim()).concat(internalAllowed);
  const allowed = (origin && allowedOrigins.includes(origin)) ? origin : allowedOrigins[0];

  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

// ── HTTP server ───────────────────────────────────────────────────────────────

// @ts-expect-error - Bun is a global in the Bun runtime
const server = Bun.serve({
  port: PORT,

  async fetch(req: Request): Promise<Response> {
    const { pathname } = new URL(req.url);
    const headers = getCorsHeaders(req);

    // Preflight
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    // GET /health
    if (pathname === "/health" && req.method === "GET") {
      return Response.json(
        { ok: true, scarb: await scarbVersion() },
        { headers }
      );
    }

    // POST /compile
    if (pathname === "/compile" && req.method === "POST") {
      // Parse body
      let source: string;
      try {
        const body = (await req.json()) as { source?: unknown };
        if (typeof body.source !== "string") throw new Error();
        source = body.source;
      } catch {
        return Response.json(
          { errors: [{ message: "Body must be JSON with a `source` string field", line: 0, col: 0 }] },
          { status: 400, headers }
        );
      }

      // Guard: empty
      if (!source.trim()) {
        return Response.json(
          { errors: [{ message: "source is empty", line: 0, col: 0 }] },
          { status: 400, headers }
        );
      }

      // Guard: too large
      if (Buffer.byteLength(source, "utf8") > MAX_SOURCE_BYTES) {
        return Response.json(
          { errors: [{ message: "Source exceeds 50 KB limit", line: 0, col: 0 }] },
          { status: 413, headers }
        );
      }

      // Compile
      try {
        const result = await compile(source);
        return Response.json(result, { headers });
      } catch (err: unknown) {
        const compilationError = err as { errors: CompileError[]; logs: string };
        return Response.json(
          {
            errors: compilationError.errors || [{ message: String(err), line: 0, col: 0 }],
            logs: compilationError.logs || String(err)
          },
          { status: 422, headers }
        );
      }
    }

    return new Response("Not found", { status: 404, headers });
  },
});

console.log(`[compiler] listening on :${server.port}`);
console.log(`[compiler] scarb → ${await scarbVersion()}`);
