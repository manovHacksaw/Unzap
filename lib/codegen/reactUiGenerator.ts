import type { AbiEntry } from "@/app/studio/contract-lab/types";

function toPascal(s: string): string {
  return s.replace(/(^|_)([a-z])/g, (_, __, c) => c.toUpperCase());
}

function toCamel(s: string): string {
  const p = toPascal(s);
  return p.charAt(0).toLowerCase() + p.slice(1);
}

function shortType(t: string): string {
  return t.split("::").pop()?.replace(/<.*>$/, "") ?? t;
}

export function buildReadSection(fn: AbiEntry, contractName: string): string {
  const pascal = toPascal(contractName);
  const hook = `use${pascal}${toPascal(fn.name)}`;
  const hasParams = !!fn.inputs?.length;

  const stateDecls = hasParams
    ? fn.inputs!
        .map((i) => `  const [${toCamel(i.name)}, set${toPascal(i.name)}] = useState("");`)
        .join("\n")
    : "";

  const hookCall = hasParams ? fn.inputs!.map((i) => toCamel(i.name)).join(", ") : "";

  const logSetup = `
  const userFetchRef = useRef(false);
  const prevLoadingRef = useRef(false);

  const handleRefetch = useCallback(() => {
    userFetchRef.current = true;
    log({ type: "call", text: "${fn.name}(${fn.inputs?.map((i) => `\${${toCamel(i.name)}}`).join(", ") ?? ""})" });
    refetch();
  }, [refetch, ${hasParams ? fn.inputs!.map((i) => toCamel(i.name)).join(", ") + ", " : ""}log]);

  useEffect(() => {
    if (!userFetchRef.current) return;
    if (prevLoadingRef.current && !loading) {
      userFetchRef.current = false;
      if (data !== null && data !== undefined) {
        log({ type: "result", text: String(data) });
      }
      if (error) log({ type: "error", text: error });
    }
    prevLoadingRef.current = loading;
  }, [loading, data, error]);`;

  const paramsJsx = hasParams
    ? `
        <div className="flex gap-2 flex-wrap mt-4">
${fn.inputs!
  .map(
    (i) => `          <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
            <label className="font-mono text-[10px] uppercase tracking-widest text-zinc-600 font-bold ml-1">
              ${i.name} <span className="text-zinc-800 italic">(${shortType(i.type)})</span>
            </label>
            <input
              value={${toCamel(i.name)}}
              onChange={(e) => set${toPascal(i.name)}(e.target.value)}
              placeholder="Value"
              onKeyDown={(e) => e.key === "Enter" && handleRefetch()}
              className="bg-black/40 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-mono text-zinc-300 outline-none focus:border-orange-500/30 transition-all"
            />
          </div>`
  )
  .join("\n")}
          <button 
            onClick={handleRefetch} 
            className="self-end mb-0 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 h-[42px] px-4 rounded-xl text-xs font-bold uppercase tracking-widest"
          >
            Run
          </button>
        </div>`
    : "";

  return `
function ${toPascal(fn.name)}Row() {
  const log = useLog();
${stateDecls ? stateDecls + "\n" : ""}  const { data, loading, error, refetch } = ${hook}(${hookCall});
${logSetup}

  return (
    <div className="bg-zinc-900/40 border-b border-zinc-800/50 p-6 last:border-0 hover:bg-zinc-900/60 transition-colors group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.2)]" />
          <span className="font-mono text-sm font-bold text-zinc-200 group-hover:text-white transition-colors">${fn.name}</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500/60 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">view</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            {!loading && data !== null && data !== undefined && (
              <span className="font-mono text-[13px] text-emerald-500 font-medium max-w-[200px] truncate">
                {String(data)}
              </span>
            )}
            {loading && <span className="text-xs text-zinc-600 animate-pulse">Querying...</span>}
            {error && <span className="text-[10px] font-mono text-red-500" title={error}>Error</span>}
          </div>
          <button 
            onClick={handleRefetch} 
            className="text-zinc-600 hover:text-white transition-colors p-1"
            title="Refresh"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
          </button>
        </div>
      </div>
${paramsJsx}
    </div>
  );
}`;
}

export function buildWriteSection(fn: AbiEntry, contractName: string): string {
  const pascal = toPascal(contractName);
  const hook = `use${pascal}${toPascal(fn.name)}`;

  const stateDecls = fn.inputs?.length
    ? fn.inputs.map((i) => `  const [${toCamel(i.name)}, set${toPascal(i.name)}] = useState("");`).join("\n")
    : "";

  const executeArgs = fn.inputs?.length ? fn.inputs.map((i) => toCamel(i.name)).join(", ") : "";
  const logCallText = fn.inputs?.length ? `${fn.name}(\${[${fn.inputs.map((i) => toCamel(i.name)).join(", ")}].join(", ")})` : `${fn.name}()`;

  const logSetup = `
  const prevStatusRef = useRef(status);
  useEffect(() => {
    if (prevStatusRef.current === status) return;
    prevStatusRef.current = status;
    if (status === "success" && txHash) log({ type: "tx", text: txHash });
    if (status === "error" && error) log({ type: "error", text: error });
  }, [status, txHash, error]);

  const handleExecute = useCallback(() => {
    log({ type: "call", text: \`${logCallText}\` });
    execute(${executeArgs});
  }, [execute, ${fn.inputs?.length ? fn.inputs.map((i) => toCamel(i.name)).join(", ") + ", " : ""}log]);`;

  const paramsJsx = fn.inputs?.length
    ? `
        <div className="flex gap-2 flex-wrap items-end mt-4">
${fn.inputs
  .map(
    (i) => `          <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
            <label className="font-mono text-[10px] uppercase tracking-widest text-zinc-600 font-bold ml-1">
              ${i.name} <span className="text-zinc-800 italic">(${shortType(i.type)})</span>
            </label>
            <input
              value={${toCamel(i.name)}}
              onChange={(e) => set${toPascal(i.name)}(e.target.value)}
              placeholder="Value"
              onKeyDown={(e) => e.key === "Enter" && !isDisabled && handleExecute()}
              className="bg-black/40 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-mono text-zinc-300 outline-none focus:border-orange-500/30 transition-all"
            />
          </div>`
  )
  .join("\n")}
          <div className="relative group/exec">
            <button
              onClick={handleExecute}
              disabled={isDisabled}
              className="bg-orange-600 hover:bg-orange-500 text-white h-[42px] px-6 rounded-xl text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-20 disabled:grayscale shadow-lg shadow-orange-900/10 flex items-center gap-2"
            >
              {isPending ? <span className="animate-pulse">...</span> : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg> Execute</>}
            </button>
            {!address && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-zinc-800 text-[10px] text-white rounded-lg opacity-0 pointer-events-none group-hover/exec:opacity-100 transition-opacity whitespace-nowrap border border-zinc-700 font-bold uppercase tracking-widest">
                Connect wallet to execute
              </div>
            )}
          </div>
        </div>`
    : `
        <div className="mt-4 relative group/exec">
          <button
            onClick={handleExecute}
            disabled={isDisabled}
            className="bg-orange-600 hover:bg-orange-500 text-white h-[42px] px-6 rounded-xl text-xs font-bold uppercase tracking-widest transition-all disabled:opacity-20 disabled:grayscale shadow-lg shadow-orange-900/10 flex items-center gap-2"
          >
            {isPending ? <span className="animate-pulse">...</span> : <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5"><line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/></svg> Execute</>}
          </button>
          {!address && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-zinc-800 text-[10px] text-white rounded-lg opacity-0 pointer-events-none group-hover/exec:opacity-100 transition-opacity whitespace-nowrap border border-zinc-700 font-bold uppercase tracking-widest">
                Connect wallet to execute
              </div>
            )}
        </div>`;

  return `
function ${toPascal(fn.name)}Row() {
  const log = useLog();
  const { execute, status, txHash, error, reset } = ${hook}();
  const { address } = useWallet();
${stateDecls ? stateDecls + "\n" : ""}
  const isPending = status === "pending";
  const isDisabled = !address || isPending;
${logSetup}

  return (
    <div className="bg-zinc-900/40 border-b border-zinc-800/50 p-6 last:border-0 hover:bg-zinc-900/60 transition-colors group">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-orange-500/40 shadow-[0_0_8px_rgba(249,115,22,0.2)]" />
          <span className="font-mono text-sm font-bold text-zinc-200 group-hover:text-white transition-colors">${fn.name}</span>
          <span className="text-[10px] font-black uppercase tracking-widest text-orange-500/60 bg-orange-500/5 px-2 py-0.5 rounded border border-orange-500/10">external</span>
        </div>
        
        <div className="flex items-center gap-4">
          {txHash && (
            <div className="flex items-center gap-2">
              <span className="w-1 h-1 rounded-full bg-orange-500 animate-ping" />
              <span className="font-mono text-[11px] text-orange-500 tracking-tighter">
                {txHash.slice(0, 10)}…{txHash.slice(-6)}
              </span>
              <button 
                onClick={reset} 
                className="text-zinc-600 hover:text-white transition-colors p-1"
                title="Reset"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
          )}
          {error && !txHash && (
            <span className="text-[10px] font-mono text-red-500 font-bold uppercase tracking-tighter" title={error}>
              Failed
            </span>
          )}
        </div>
      </div>
${paramsJsx}
    </div>
  );
}`;
}
