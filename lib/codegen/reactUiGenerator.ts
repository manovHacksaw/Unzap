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
        {/* param inputs */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
${fn.inputs!
  .map(
    (i) => `          <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1, minWidth: "120px" }}>
            <label style={{ fontFamily: "ui-monospace, monospace", fontSize: "10px", color: "#52525b", letterSpacing: "0.06em" }}>
              ${i.name}&nbsp;<span style={{ color: "#3f3f46" }}>${shortType(i.type)}</span>
            </label>
            <input
              value={${toCamel(i.name)}}
              onChange={(e) => set${toPascal(i.name)}(e.target.value)}
              placeholder="${i.name}"
              onKeyDown={(e) => e.key === "Enter" && handleRefetch()}
              style={inputStyle}
            />
          </div>`
  )
  .join("\n")}
          <button onClick={handleRefetch} style={{ ...ghostBtnStyle, alignSelf: "flex-end", marginBottom: "0" }}>
            run
          </button>
        </div>`
    : "";

  return `
function ${toPascal(fn.name)}Row() {
  const log = useLog();
  const { data, loading, error, refetch } = ${hook}(${hookCall});
${stateDecls ? stateDecls + "\n" : ""}${logSetup}

  return (
    <div style={rowStyle}>
      {/* row header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={fnNameStyle}>${fn.name}</span>
        <span style={readBadgeStyle}>view</span>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "8px" }}>
          {!loading && data !== null && data !== undefined && (
            <span style={{ fontFamily: "ui-monospace, monospace", fontSize: "11px", color: "#a1a1aa", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {String(data)}
            </span>
          )}
          {loading && <span style={{ fontSize: "11px", color: "#3f3f46" }}>…</span>}
          {error && <span style={{ fontFamily: "ui-monospace, monospace", fontSize: "10px", color: "#f87171" }} title={error}>error</span>}
          <button onClick={handleRefetch} style={refreshBtnStyle} title="Refresh">
            ↻
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
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "flex-end", marginTop: "10px" }}>
${fn.inputs
  .map(
    (i) => `          <div style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1, minWidth: "120px" }}>
            <label style={{ fontFamily: "ui-monospace, monospace", fontSize: "10px", color: "#52525b", letterSpacing: "0.06em" }}>
              ${i.name}&nbsp;<span style={{ color: "#3f3f46" }}>${shortType(i.type)}</span>
            </label>
            <input
              value={${toCamel(i.name)}}
              onChange={(e) => set${toPascal(i.name)}(e.target.value)}
              placeholder="${i.name}"
              onKeyDown={(e) => e.key === "Enter" && !isDisabled && handleExecute()}
              style={inputStyle}
            />
          </div>`
  )
  .join("\n")}
          <div style={{ position: "relative" }} className="exec-wrap">
            <button
              onClick={handleExecute}
              disabled={isDisabled}
              style={{ ...execBtnStyle, opacity: isDisabled ? 0.35 : 1, cursor: isDisabled ? "not-allowed" : "pointer" }}
            >
              {isPending ? "…" : "↗ execute"}
            </button>
            {!address && <div className="exec-tooltip">connect wallet to execute</div>}
          </div>
        </div>`
    : `
        <div style={{ marginTop: "10px", position: "relative" }} className="exec-wrap">
          <button
            onClick={handleExecute}
            disabled={isDisabled}
            style={{ ...execBtnStyle, opacity: isDisabled ? 0.35 : 1, cursor: isDisabled ? "not-allowed" : "pointer" }}
          >
            {isPending ? "…" : "↗ execute"}
          </button>
          {!address && <div className="exec-tooltip">connect wallet to execute</div>}
        </div>`;

  return `
function ${toPascal(fn.name)}Row() {
  const log = useLog();
  const { execute, status, txHash, error, reset } = ${hook}();
  const { address } = useStarkzap();
${stateDecls ? stateDecls + "\n" : ""}
  const isPending = status === "pending";
  const isDisabled = !address || isPending;
${logSetup}

  return (
    <div style={rowStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={fnNameStyle}>${fn.name}</span>
        <span style={writeBadgeStyle}>external</span>
        {txHash && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: "#4ade80" }} />
            <span style={{ fontFamily: "ui-monospace, monospace", fontSize: "10px", color: "#4ade8099", maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis" }}>
              {txHash.slice(0, 18)}…
            </span>
            <button onClick={reset} style={{ fontFamily: "ui-monospace, monospace", fontSize: "10px", color: "#3f3f46", background: "none", border: "none", cursor: "pointer", padding: "0" }}>
              ✕
            </button>
          </div>
        )}
        {error && !txHash && (
          <span style={{ marginLeft: "auto", fontFamily: "ui-monospace, monospace", fontSize: "10px", color: "#f87171" }} title={error}>
            error
          </span>
        )}
      </div>
${paramsJsx}
    </div>
  );
}`;
}
