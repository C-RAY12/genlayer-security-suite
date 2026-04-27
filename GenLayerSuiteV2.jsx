import { useState, useCallback, useRef } from "react";

// ─── CSS Injection ────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #080b0f; color: #c9d1d9; font-family: 'JetBrains Mono', monospace; }
  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: #0d1117; }
  ::-webkit-scrollbar-thumb { background: #1e2a38; border-radius: 2px; }
  textarea:focus { outline: none; border-color: #1f6feb !important; box-shadow: 0 0 0 3px rgba(31,111,235,0.12) !important; }
  textarea { resize: vertical; }

  @keyframes rowIn {
    from { opacity: 0; transform: translateX(-6px); background: rgba(31,111,235,0.08); }
    to   { opacity: 1; transform: translateX(0);    background: transparent; }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.2; } }
  @keyframes scanline {
    0%   { top: -2px; }
    100% { top: 100%; }
  }
  @keyframes counterUp {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

// ─── Constants & Data ─────────────────────────────────────────────────────────
const BATCH_PROMPTS = [
  "Check cross-chain liquidity bridge safety",
  "Verify admin withdrawal permission scope",
  "Audit reentrancy guard on vault contract",
  "Validate oracle price feed integrity",
  "Scan flash loan attack surface area",
];

const RISK_KEYWORDS = {
  high: ["withdrawal", "admin", "flash loan", "flash", "drain", "self-destruct", "selfdestruct", "override", "unrestricted"],
  medium: ["oracle", "bridge", "cross-chain", "upgrade", "proxy", "delegate", "external call"],
  low: ["liquidity", "vault", "reentrancy", "guard", "audit", "scan", "verify", "check", "validate"],
};

const JUSTIFICATIONS = {
  APPROVED: [
    "No critical execution paths flagged. Consensus reached.",
    "Static analysis complete. Bytecode signature clean.",
    "Access control patterns validated across all nodes.",
    "No anomalous state mutations detected in simulation.",
    "Formal verification passed. Logic provably correct.",
  ],
  REJECTED: [
    "Unconstrained external call detected at execution depth 3.",
    "Privilege escalation vector identified in role assignments.",
    "Integer underflow in token balance subtraction path.",
    "Unauthorized state write to owner mapping.",
    "Flash loan callback handler lacks reentrancy lock.",
  ],
  MANUAL_REVIEW: [
    "Ambiguous ownership transfer requires human verification.",
    "Oracle dependency introduces off-chain trust assumption.",
    "Upgrade proxy pattern detected — timelock not enforced.",
    "Cross-chain message validation logic is non-standard.",
    "Confidence below threshold — multi-sig review recommended.",
  ],
};

// ─── Core Logic ───────────────────────────────────────────────────────────────
function computeRiskScore(prompt) {
  const lower = prompt.toLowerCase();
  let score = 10;
  RISK_KEYWORDS.high.forEach(k => { if (lower.includes(k)) score += 35; });
  RISK_KEYWORDS.medium.forEach(k => { if (lower.includes(k)) score += 18; });
  RISK_KEYWORDS.low.forEach(k => { if (lower.includes(k)) score += 6; });
  return Math.min(score + Math.floor(Math.random() * 12), 99);
}

function deriveStatus(riskScore) {
  if (riskScore >= 65) return "REJECTED";
  if (riskScore >= 38) return "MANUAL_REVIEW";
  return "APPROVED";
}

function randFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function genValidatorId() {
  const hex = () => Math.floor(Math.random() * 0xffff).toString(16).padStart(4, "0");
  return `0x${hex()}${hex()}`;
}

function genConfidence(status) {
  if (status === "APPROVED")       return (0.82 + Math.random() * 0.17).toFixed(4);
  if (status === "REJECTED")       return (0.70 + Math.random() * 0.25).toFixed(4);
  return (0.45 + Math.random() * 0.30).toFixed(4);
}

function buildDecision(prompt) {
  const risk_score = computeRiskScore(prompt);
  const status = deriveStatus(risk_score);
  return {
    id: `txn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toISOString(),
    prompt: prompt.slice(0, 120),
    status,
    risk_score,
    confidence_interval: parseFloat(genConfidence(status)),
    validator_id: genValidatorId(),
    justification: randFrom(JUSTIFICATIONS[status]),
  };
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── State Engine ─────────────────────────────────────────────────────────────
function useSecurityEngine() {
  const [prompt, setPrompt]   = useState("");
  const [logs, setLogs]       = useState([]);
  const [running, setRunning] = useState(false);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const appendLog = useCallback(entry => setLogs(prev => [entry, ...prev]), []);

  const runSingle = useCallback(async () => {
    if (!prompt.trim() || running) return;
    setRunning(true);
    await sleep(900 + Math.random() * 400);
    appendLog(buildDecision(prompt));
    setRunning(false);
  }, [prompt, running, appendLog]);

  const runBatch = useCallback(async () => {
    if (batchRunning) return;
    setBatchRunning(true);
    setBatchProgress(0);
    for (let i = 0; i < BATCH_PROMPTS.length; i++) {
      await sleep(350 + Math.random() * 250);
      appendLog(buildDecision(BATCH_PROMPTS[i]));
      setBatchProgress(i + 1);
    }
    setBatchRunning(false);
    setBatchProgress(0);
  }, [batchRunning, appendLog]);

  const clearLogs = useCallback(() => setLogs([]), []);

  return { prompt, setPrompt, logs, running, batchRunning, batchProgress, runSingle, runBatch, clearLogs };
}

// ─── Clipboard ────────────────────────────────────────────────────────────────
function useCopy() {
  const [copiedId, setCopiedId] = useState(null);
  const copy = useCallback((id, text) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    });
  }, []);
  return { copiedId, copy };
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = {
    APPROVED:      { bg: "rgba(35,134,54,0.15)",  border: "#238636", color: "#3fb950" },
    REJECTED:      { bg: "rgba(218,54,51,0.15)",  border: "#da3633", color: "#f85149" },
    MANUAL_REVIEW: { bg: "rgba(187,128,9,0.15)",  border: "#9e6a03", color: "#d29922" },
  }[status];
  return (
    <span style={{
      display: "inline-block", fontSize: 9, fontWeight: 700,
      letterSpacing: "0.14em", padding: "2px 7px", borderRadius: 2,
      border: `1px solid ${cfg.border}`, background: cfg.bg, color: cfg.color,
      whiteSpace: "nowrap",
    }}>{status.replace("_", " ")}</span>
  );
}

function RiskBar({ score }) {
  const color = score >= 65 ? "#f85149" : score >= 38 ? "#d29922" : "#3fb950";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 120 }}>
      <div style={{ flex: 1, height: 4, background: "#161b22", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ width: `${score}%`, height: "100%", background: color, borderRadius: 2,
          boxShadow: `0 0 6px ${color}40`, transition: "width 0.4s ease" }} />
      </div>
      <span style={{ fontSize: 11, color, minWidth: 24, textAlign: "right", fontWeight: 600 }}>{score}</span>
    </div>
  );
}

function Header({ logCount }) {
  return (
    <div style={{ borderBottom: "1px solid #1e2a38", padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#f85149", display: "inline-block" }} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#d29922", display: "inline-block" }} />
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#3fb950", display: "inline-block" }} />
        </div>
        <span style={{ fontSize: 12, color: "#6e7681", letterSpacing: "0.08em" }}>genlayer-security-suite</span>
        <span style={{ fontSize: 10, color: "#3d444d", margin: "0 4px" }}>—</span>
        <span style={{ fontSize: 11, color: "#8b949e", letterSpacing: "0.06em" }}>audit@v2.0.0</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#3fb950",
            boxShadow: "0 0 6px #3fb950", animation: "blink 2s ease infinite", display: "inline-block" }} />
          <span style={{ fontSize: 10, color: "#6e7681", letterSpacing: "0.1em" }}>TESTNET LIVE</span>
        </div>
        <span style={{ fontSize: 10, color: "#3d444d" }}>|</span>
        <span style={{ fontSize: 10, color: "#6e7681", letterSpacing: "0.08em" }}>
          {logCount} <span style={{ color: "#3d444d" }}>decisions logged</span>
        </span>
      </div>
    </div>
  );
}

function InputPanel({ prompt, onChange, onSingle, onBatch, running, batchRunning, batchProgress }) {
  return (
    <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e2a38", display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, color: "#3d444d", letterSpacing: "0.16em" }}>
          <span style={{ color: "#1f6feb" }}>$</span> security_audit --prompt
        </span>
        <span style={{ fontSize: 9, color: "#3d444d" }}>{prompt.length} chars</span>
      </div>
      <textarea
        value={prompt}
        onChange={e => onChange(e.target.value)}
        placeholder={"// Describe the smart contract logic to validate...\n// e.g. \"Verify admin withdrawal restriction on multisig vault\""}
        disabled={running || batchRunning}
        rows={4}
        style={{
          width: "100%", background: "#0d1117", border: "1px solid #1e2a38", borderRadius: 4,
          color: "#c9d1d9", fontFamily: "inherit", fontSize: 12, lineHeight: 1.65,
          padding: "10px 13px",
        }}
      />
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <Btn
          onClick={onSingle}
          disabled={!prompt.trim() || running || batchRunning}
          loading={running}
          loadingLabel="Validating..."
          label="▶  Run Validation"
          primary
        />
        <Btn
          onClick={onBatch}
          disabled={running || batchRunning}
          loading={batchRunning}
          loadingLabel={`Batch ${batchProgress}/5`}
          label="⟳  Batch Run 5×"
        />
        {batchRunning && (
          <div style={{ flex: 1, height: 3, background: "#161b22", borderRadius: 2, overflow: "hidden" }}>
            <div style={{
              height: "100%", background: "#1f6feb",
              width: `${(batchProgress / 5) * 100}%`,
              transition: "width 0.3s ease",
              boxShadow: "0 0 8px #1f6feb80",
            }} />
          </div>
        )}
      </div>
    </div>
  );
}

function Btn({ onClick, disabled, loading, loadingLabel, label, primary }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: primary ? (disabled ? "#161b22" : "rgba(31,111,235,0.12)") : "#0d1117",
        border: `1px solid ${primary ? (disabled ? "#1e2a38" : "#1f6feb") : "#1e2a38"}`,
        color: primary ? (disabled ? "#3d444d" : "#58a6ff") : (disabled ? "#3d444d" : "#8b949e"),
        fontFamily: "inherit", fontSize: 11, fontWeight: 600, letterSpacing: "0.1em",
        padding: "7px 14px", borderRadius: 4, cursor: disabled ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
        transition: "all 0.15s",
      }}
    >
      {loading && <span style={{ width: 9, height: 9, border: "1.5px solid #58a6ff44",
        borderTopColor: "#58a6ff", borderRadius: "50%", animation: "spin 0.6s linear infinite", flexShrink: 0 }} />}
      {loading ? loadingLabel : label}
    </button>
  );
}

function LedgerTable({ logs, onClear }) {
  const { copiedId, copy } = useCopy();
  const stats = {
    approved: logs.filter(l => l.status === "APPROVED").length,
    rejected: logs.filter(l => l.status === "REJECTED").length,
    review:   logs.filter(l => l.status === "MANUAL_REVIEW").length,
    avgRisk:  logs.length ? (logs.reduce((s, l) => s + l.risk_score, 0) / logs.length).toFixed(1) : "—",
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Ledger Header */}
      <div style={{
        padding: "10px 20px", borderBottom: "1px solid #1e2a38",
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "#0a0e14", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 10, letterSpacing: "0.18em", color: "#6e7681", textTransform: "uppercase" }}>
            Security Transaction Logs
          </span>
          {logs.length > 0 && (
            <div style={{ display: "flex", gap: 12 }}>
              <Stat label="APPROVED" value={stats.approved} color="#3fb950" />
              <Stat label="REJECTED" value={stats.rejected} color="#f85149" />
              <Stat label="REVIEW"   value={stats.review}   color="#d29922" />
              <Stat label="AVG RISK" value={stats.avgRisk}  color="#8b949e" />
            </div>
          )}
        </div>
        {logs.length > 0 && (
          <button onClick={onClear} style={{
            background: "none", border: "1px solid #1e2a38", color: "#6e7681",
            fontFamily: "inherit", fontSize: 9, letterSpacing: "0.12em",
            padding: "4px 10px", borderRadius: 3, cursor: "pointer",
          }}>CLEAR</button>
        )}
      </div>

      {/* Table */}
      {logs.length === 0 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", gap: 8, color: "#3d444d" }}>
          <span style={{ fontSize: 22 }}>◈</span>
          <span style={{ fontSize: 11, letterSpacing: "0.12em" }}>No transactions yet</span>
          <span style={{ fontSize: 10, color: "#2d333b" }}>Run a validation to generate log entries</span>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
            <thead style={{ position: "sticky", top: 0, background: "#0d1117", zIndex: 2 }}>
              <tr>
                {["TXN ID","TIMESTAMP","PROMPT","STATUS","RISK","CONFIDENCE","VALIDATOR","JUSTIFICATION","PAYLOAD"].map(h => (
                  <Th key={h}>{h}</Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <LogRow key={log.id} log={log} index={i} copiedId={copiedId} onCopy={copy} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function Th({ children }) {
  return (
    <th style={{
      padding: "7px 12px", textAlign: "left", fontSize: 9,
      letterSpacing: "0.16em", color: "#3d444d", fontWeight: 600,
      borderBottom: "1px solid #1e2a38", whiteSpace: "nowrap",
    }}>{children}</th>
  );
}

function Stat({ label, value, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
      <span style={{ fontSize: 9, color: "#3d444d", letterSpacing: "0.12em" }}>{label}</span>
      <span style={{ fontSize: 11, color, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function LogRow({ log, index, copiedId, onCopy }) {
  const payload = JSON.stringify(log, null, 2);
  const isCopied = copiedId === log.id;

  return (
    <tr style={{
      borderBottom: "1px solid #161b22",
      animation: `rowIn 0.35s ease both`,
      animationDelay: `${Math.min(index * 0.03, 0.15)}s`,
    }}>
      <Td mono dim>{log.id}</Td>
      <Td mono dim>{log.timestamp.replace("T", " ").replace("Z", "")}</Td>
      <Td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={log.prompt}>
        {log.prompt}
      </Td>
      <Td><StatusBadge status={log.status} /></Td>
      <Td style={{ minWidth: 130 }}><RiskBar score={log.risk_score} /></Td>
      <Td mono>{log.confidence_interval.toFixed(4)}</Td>
      <Td mono dim>{log.validator_id}</Td>
      <Td style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#6e7681" }} title={log.justification}>
        {log.justification}
      </Td>
      <Td>
        <button
          onClick={() => onCopy(log.id, payload)}
          style={{
            background: isCopied ? "rgba(35,134,54,0.15)" : "none",
            border: `1px solid ${isCopied ? "#238636" : "#1e2a38"}`,
            color: isCopied ? "#3fb950" : "#6e7681",
            fontFamily: "inherit", fontSize: 9, letterSpacing: "0.1em",
            padding: "3px 9px", borderRadius: 3, cursor: "pointer",
            whiteSpace: "nowrap", transition: "all 0.2s",
          }}
        >
          {isCopied ? "✓ COPIED" : "COPY JSON"}
        </button>
      </Td>
    </tr>
  );
}

function Td({ children, mono, dim, style, title }) {
  return (
    <td style={{
      padding: "8px 12px", verticalAlign: "middle",
      fontFamily: mono ? "inherit" : undefined,
      fontSize: mono ? 10 : 11,
      color: dim ? "#484f58" : undefined,
      whiteSpace: "nowrap",
      ...style,
    }} title={title}>
      {children}
    </td>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────
export default function App() {
  const { prompt, setPrompt, logs, running, batchRunning, batchProgress, runSingle, runBatch, clearLogs } = useSecurityEngine();

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div style={{
        height: "100vh", display: "flex", flexDirection: "column",
        background: "#080b0f", overflow: "hidden",
      }}>
        <Header logCount={logs.length} />
        <InputPanel
          prompt={prompt}
          onChange={setPrompt}
          onSingle={runSingle}
          onBatch={runBatch}
          running={running}
          batchRunning={batchRunning}
          batchProgress={batchProgress}
        />
        <LedgerTable logs={logs} onClear={clearLogs} />
      </div>
    </>
  );
}
