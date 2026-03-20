import { useState } from "react";

const STAGES = ["New", "Contacted", "Replied", "Closed"];
const STAGE_COLORS = { New: "#00d4ff", Contacted: "#f59e0b", Replied: "#a78bfa", Closed: "#10b981" };

function generatePitchTemplate(lead) {
  const site = (() => { try { return new URL(lead.sourceUrl).hostname.replace('www.',''); } catch { return 'the news site'; }})();
  return `Subject: More placements like your feature on ${site}?

Hi ${lead.brand} Marketing Team,

I came across your recent feature in "${lead.sourceArticle}" on ${site} — great placement for the "${lead.anchor}" keyword.

I help brands like yours secure similar sponsored article placements on 50+ high-authority news and blog sites, driving consistent referral traffic and strong backlinks.

If you're looking to scale what's already working for you, I'd love to share some options that fit your niche.

Would you be open to a quick chat this week?

Best regards,
[Your Name]
[Your Website]`;
}

const sc = (s) => STAGE_COLORS[s] || "#00d4ff";

export default function App() {
  const [view, setView] = useState("scanner");
  const [url, setUrl] = useState("");
  const [scanning, setScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState("");
  const [error, setError] = useState("");
  const [leads, setLeads] = useState([]);
  const [selected, setSelected] = useState(null);
  const [pitch, setPitch] = useState("");
  const [copied, setCopied] = useState(false);

  const runScan = async () => {
    if (!url.trim() || scanning) return;
    setScanning(true);
    setError("");
    setLeads([]);
    setSelected(null);
    setPitch("");
    setScanStatus("Connecting to subfolder...");

    try {
      setScanStatus("Fetching article links from subfolder...");
      const res = await fetch("/api/crawl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subfolderUrl: url.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Check the URL and try again.");
        setScanning(false);
        setScanStatus("");
        return;
      }

      if (data.leads.length === 0) {
        setError(data.message || "No leads found. The subfolder may require JavaScript to load, or has no outbound body links.");
        setScanning(false);
        setScanStatus("");
        return;
      }

      setScanStatus(`✅ Done! Scanned ${data.articlesScanned} articles, found ${data.totalLeads} leads.`);
      setLeads(data.leads);
      setTimeout(() => setView("leads"), 1000);
    } catch (e) {
      setError("Network error. Please try again.");
    }
    setScanning(false);
  };

  const updateStage = (id, stage) => {
    setLeads((prev) => prev.map((x) => x.id === id ? { ...x, stage } : x));
    if (selected?.id === id) setSelected((s) => ({ ...s, stage }));
  };

  const selectLead = (l) => {
    setSelected(l);
    setPitch(l.pitch || generatePitchTemplate(l));
  };

  const copyPitch = () => {
    navigator.clipboard.writeText(pitch);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#080c10", fontFamily: "'IBM Plex Mono', monospace", color: "#c9d1d9" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=Syne:wght@700;800&display=swap');
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes spin{to{transform:rotate(360deg)}}
        .blink{animation:blink 1.3s infinite}
        .spin{animation:spin 1s linear infinite;display:inline-block}
        .lc{background:#0d1117;border:1px solid #1a2332;border-radius:6px;padding:14px;margin-bottom:9px;cursor:pointer;transition:all .2s}
        .lc:hover{border-color:#00d4ff28;background:#0e1318}
        .lca{border-color:#00d4ff55!important;background:#00d4ff07!important}
        .nb{background:none;border:1px solid transparent;cursor:pointer;padding:7px 16px;border-radius:4px;font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:500;letter-spacing:1px;text-transform:uppercase;transition:all .2s;color:#4a5568}
        .nb:hover{color:#7a8a9a}
        .nba{background:#00d4ff12!important;color:#00d4ff!important;border-color:#00d4ff30!important}
        .exb{background:none;border:1px solid #1a2332;color:#4a5568;padding:4px 10px;border-radius:3px;font-size:10px;cursor:pointer;font-family:'IBM Plex Mono',monospace;transition:all .2s}
        .exb:hover{color:#7a8a9a;border-color:#2a3a4a}
        textarea{resize:vertical}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:#1a2332;border-radius:2px}
      `}</style>

      {/* HEADER */}
      <div style={{ borderBottom: "1px solid #1a2332", padding: "14px 24px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#080c10" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#00d4ff", boxShadow: "0 0 8px #00d4ff" }} className="blink" />
          <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, color: "#fff", letterSpacing: 2 }}>
            PAIDPOST<span style={{ color: "#00d4ff" }}>SPY</span>
          </span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {[["scanner", "⬡ Scanner"], ["leads", `◈ Leads${leads.length ? ` (${leads.length})` : ""}`], ["pipeline", "◎ Pipeline"]].map(([id, label]) => (
            <button key={id} className={`nb ${view === id ? "nba" : ""}`} onClick={() => setView(id)}>{label}</button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>

        {/* SCANNER */}
        {view === "scanner" && (
          <div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, color: "#fff", marginBottom: 8 }}>Scan Paid Article Subfolder</div>
            <div style={{ color: "#4a5568", fontSize: 12, lineHeight: 1.7, marginBottom: 28 }}>
              Paste the subfolder URL where a news site publishes sponsored/paid content.<br />
              The tool crawls every article and extracts brands with outbound body links — those are your leads.
            </div>

            <div style={{ background: "#0d1117", border: "1px solid #1a2332", borderRadius: 8, padding: 24, marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: "#4a5568", letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Target Subfolder URL</div>
              <div style={{ display: "flex", gap: 12 }}>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && runScan()}
                  disabled={scanning}
                  placeholder="e.g. https://newsx.com/sponsored/"
                  style={{ flex: 1, background: "#080c10", border: "1px solid #1a2332", borderRadius: 4, color: "#c9d1d9", padding: "11px 14px", fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, outline: "none" }}
                />
                <button
                  onClick={runScan}
                  disabled={scanning || !url.trim()}
                  style={{ background: "linear-gradient(135deg,#00d4ff18,#0066ff18)", border: "1px solid #00d4ff50", color: "#00d4ff", padding: "11px 28px", borderRadius: 4, fontFamily: "'IBM Plex Mono',monospace", fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", cursor: scanning || !url.trim() ? "not-allowed" : "pointer", opacity: scanning || !url.trim() ? 0.5 : 1, whiteSpace: "nowrap" }}
                >
                  {scanning ? <><span className="spin">◌</span> Scanning...</> : "Run Scan →"}
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                {[
                  "https://newsx.com/brand-studio/",
                  "https://tribuneindia.com/partner-content/",
                  "https://www.financialexpress.com/brandwagon/"
                ].map((ex) => (
                  <button key={ex} className="exb" onClick={() => setUrl(ex)}>{ex.replace("https://", "").replace("http://", "")}</button>
                ))}
              </div>
            </div>

            {/* Status / Error */}
            {scanning && scanStatus && (
              <div style={{ background: "#0d1117", border: "1px solid #1a2332", borderRadius: 8, padding: 20, fontSize: 12, color: "#00d4ff" }}>
                <span className="blink">▋</span> {scanStatus}
              </div>
            )}
            {!scanning && scanStatus && !error && (
              <div style={{ background: "#10b98112", border: "1px solid #10b98130", borderRadius: 8, padding: 16, fontSize: 12, color: "#10b981" }}>
                {scanStatus}
              </div>
            )}
            {error && (
              <div style={{ background: "#ef444412", border: "1px solid #ef444430", borderRadius: 8, padding: 16, fontSize: 12, color: "#ef4444" }}>
                ⚠ {error}
              </div>
            )}
          </div>
        )}

        {/* LEADS */}
        {view === "leads" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 20 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, color: "#fff" }}>Extracted Leads</span>
                <span style={{ fontSize: 11, color: "#4a5568" }}>{leads.length} brands</span>
              </div>
              {leads.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px", color: "#4a5568", fontSize: 13 }}>No leads yet. Run a scan first.</div>
              ) : leads.map((l) => (
                <div key={l.id} className={`lc ${selected?.id === l.id ? "lca" : ""}`} onClick={() => selectLead(l)}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, color: "#fff" }}>{l.brand}</div>
                      <div style={{ fontSize: 11, color: "#4a5568", marginTop: 2 }}>{l.domain}</div>
                    </div>
                    <span style={{ background: `${sc(l.stage)}15`, color: sc(l.stage), border: `1px solid ${sc(l.stage)}30`, padding: "2px 8px", borderRadius: 3, fontSize: 10, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", whiteSpace: "nowrap" }}>{l.stage}</span>
                  </div>
                  <div style={{ fontSize: 10, color: "#2a3a4a", borderTop: "1px solid #1a2332", paddingTop: 7 }}>
                    {l.sourceArticle?.length > 55 ? l.sourceArticle.slice(0, 55) + "…" : l.sourceArticle}
                  </div>
                </div>
              ))}
            </div>

            {/* DETAIL */}
            <div>
              {!selected ? (
                <div style={{ background: "#0d1117", border: "1px dashed #1a2332", borderRadius: 8, padding: 50, textAlign: "center", color: "#2a3a4a", fontSize: 13 }}>
                  ← Select a lead to view details &amp; pitch
                </div>
              ) : (
                <div style={{ background: "#0d1117", border: "1px solid #1a2332", borderRadius: 8, padding: 22 }}>
                  <div style={{ fontSize: 11, color: "#4a5568", letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Lead Details</div>
                  {[
                    ["Brand", selected.brand],
                    ["Website", selected.domain],
                    ["Anchor Used", `"${selected.anchor}"`],
                    ["Featured In", selected.sourceArticle],
                    ["Date", selected.date],
                    ["Contact Role", selected.contactRole],
                    ["Likely Emails", selected.contactEmails?.join(", ")],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: "flex", gap: 12, marginBottom: 8, fontSize: 12 }}>
                      <span style={{ color: "#2a3a4a", minWidth: 110, flexShrink: 0 }}>{k}</span>
                      <span style={{ color: "#c9d1d9", wordBreak: "break-all" }}>{v}</span>
                    </div>
                  ))}

                  <div style={{ borderTop: "1px solid #1a2332", margin: "16px 0" }} />
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                    <span style={{ fontSize: 11, color: "#4a5568" }}>Pipeline Stage:</span>
                    <select value={selected.stage} onChange={(e) => updateStage(selected.id, e.target.value)}
                      style={{ background: "#080c10", border: "1px solid #1a2332", color: "#c9d1d9", padding: "5px 9px", borderRadius: 4, fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, cursor: "pointer", outline: "none" }}>
                      {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>

                  <div style={{ borderTop: "1px solid #1a2332", margin: "16px 0" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <span style={{ fontSize: 11, color: "#4a5568", letterSpacing: 2, textTransform: "uppercase" }}>Outreach Pitch</span>
                    <button onClick={copyPitch}
                      style={{ background: "#10b98118", border: "1px solid #10b98138", color: "#10b981", padding: "7px 15px", borderRadius: 4, fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, cursor: "pointer" }}>
                      {copied ? "✓ Copied!" : "⎘ Copy"}
                    </button>
                  </div>
                  <textarea
                    value={pitch}
                    onChange={(e) => setPitch(e.target.value)}
                    rows={12}
                    style={{ width: "100%", background: "#080c10", border: "1px solid #1a2332", borderRadius: 4, color: "#c9d1d9", padding: 14, fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, lineHeight: 1.8, outline: "none" }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* PIPELINE */}
        {view === "pipeline" && (
          <div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 6 }}>Outreach Pipeline</div>
            <p style={{ color: "#4a5568", fontSize: 12, marginBottom: 24 }}>Track where each lead is in your outreach process.</p>
            {leads.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "#4a5568", fontSize: 13 }}>No leads yet. Run a scan to populate your pipeline.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14 }}>
                {STAGES.map((stage) => {
                  const col = leads.filter((l) => l.stage === stage);
                  const c = sc(stage);
                  return (
                    <div key={stage} style={{ background: "#0d1117", border: "1px solid #1a2332", borderRadius: 6, padding: 16, minHeight: 180 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: c }}>{stage}</span>
                        <span style={{ background: `${c}15`, color: c, border: `1px solid ${c}30`, padding: "2px 8px", borderRadius: 10, fontSize: 11 }}>{col.length}</span>
                      </div>
                      {col.length === 0 ? <div style={{ fontSize: 11, color: "#2a3a4a" }}>Empty</div> : col.map((l) => (
                        <div key={l.id} style={{ background: "#080c10", border: "1px solid #1a2332", borderRadius: 4, padding: "10px 12px", marginBottom: 8, cursor: "pointer" }}
                          onClick={() => { setSelected(l); setPitch(l.pitch || generatePitchTemplate(l)); setView("leads"); }}>
                          <div style={{ fontWeight: 600, color: "#fff", fontSize: 12, marginBottom: 3 }}>{l.brand}</div>
                          <div style={{ fontSize: 10, color: "#4a5568" }}>{l.domain}</div>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
