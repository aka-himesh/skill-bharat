import { useTranslation } from "react-i18next";
import { mockSources } from "../mocks/data";
import { CheckCircle2, XCircle, Clock, Radio, LogIn, RefreshCw } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useExternalSources, useSourcesStatus } from "../hooks/useApi";
import { useNavigate } from "react-router-dom";
import { refreshEshram, refreshNews, testExternalSource } from "../services/api";
import { useState } from "react";

const STATUS_CONFIG: Record<string, { Icon: typeof CheckCircle2; color: string; bg: string; label: string }> = {
  live:        { Icon: CheckCircle2, color: "#138808", bg: "#f0faf4", label: "Live" },
  demo:        { Icon: Clock, color: "#e67e22", bg: "#fef6ee", label: "Demo / Synthetic" },
  synthetic:   { Icon: Clock, color: "#e67e22", bg: "#fef6ee", label: "Demo / Synthetic" },
  unavailable: { Icon: XCircle, color: "#c0392b", bg: "#fdf2f2", label: "Unavailable" },
  pending:     { Icon: Clock, color: "#2980b9", bg: "#eef5fc", label: "Pending Integration" },
  mock:        { Icon: Clock, color: "#7f8c8d", bg: "#f5f5f5", label: "Mock / Stub" },
  cached:      { Icon: CheckCircle2, color: "#2980b9", bg: "#eef5fc", label: "Cached" },
  not_configured: { Icon: Clock, color: "#e67e22", bg: "#fef6ee", label: "Not configured" },
  stale:       { Icon: Clock, color: "#e67e22", bg: "#fef6ee", label: "Stale cache" },
  error:       { Icon: XCircle, color: "#c0392b", bg: "#fdf2f2", label: "Error" },
};

export default function Sources() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();
  const { data: apiSourcesData, isLoading, refetch } = useSourcesStatus(isLoggedIn);
  const { data: externalData, isLoading: externalLoading, refetch: refetchExternal } = useExternalSources(isLoggedIn);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, string>>({});

  const isLive = isLoggedIn && !!apiSourcesData?.sources?.length;

  const handleRefresh = async (type: "eshram" | "news") => {
    setRefreshing(type);
    try {
      if (type === "eshram") await refreshEshram();
      else await refreshNews();
      await refetch();
    } catch { /* ignore */ } finally {
      setRefreshing(null);
    }
  };

  const handleTest = async (source: string) => {
    setTesting(source);
    try {
      const result = await testExternalSource(source);
      setTestResults((current) => ({ ...current, [source]: `${result.message} (${result.latency_ms} ms${result.http_status ? `, HTTP ${result.http_status}` : ""})` }));
      await refetchExternal();
    } catch (error) {
      setTestResults((current) => ({ ...current, [source]: error instanceof Error ? error.message : "Connection test failed." }));
    } finally {
      setTesting(null);
    }
  };

  type DisplaySource = {
    id: string;
    name: string;
    description: string;
    lastIngested: string;
    status: string;
    recordCount: number;
    coverageNote: string;
  };

  let sources: DisplaySource[] = [];
  if (isLive && apiSourcesData?.sources) {
    sources = apiSourcesData.sources.map((s, i) => ({
      id: `src-${i}`,
      name: s.name,
      description: s.description,
      lastIngested: s.last_import ? new Date(s.last_import).toLocaleDateString("en-IN") : "Active",
      status: s.status.toLowerCase(),
      recordCount: s.record_count || 0,
      coverageNote: `${s.coverage || "Regional"} · Adapter: ${s.adapter || "Direct"} · ${s.limitations || ""}`,
    }));
  } else {
    sources = mockSources;
  }

  return (
    <div>
      <div style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)", padding: "14px 0" }}>
        <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "0 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{t("sources.title")}</h1>
              {isLive ? (
                <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, background: "#f0faf4", color: "#138808", border: "1px solid #a8dfc0", borderRadius: 4, padding: "2px 8px", fontWeight: 600 }}>
                  <Radio size={11} className="animate-pulse" /> LIVE TELEMETRY
                </span>
              ) : (
                <span style={{ fontSize: 11, background: "#fef6ee", color: "#e67e22", border: "1px solid #fcd8b0", borderRadius: 4, padding: "2px 8px", fontWeight: 600 }}>
                  DEMO STATUS
                </span>
              )}
            </div>
            <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: 0 }}>{t("sources.subtitle")}</p>
          </div>
          {!isLoggedIn && (
            <button
              onClick={() => navigate("/login")}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", color: "var(--color-primary)", border: "1px solid var(--color-primary)", borderRadius: 4, padding: "6px 12px", cursor: "pointer", fontSize: 12, fontWeight: 600 }}
            >
              <LogIn size={13} /> Login for Live Connector Status
            </button>
          )}
        </div>
      </div>
      <div style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "20px 24px" }}>
        <section aria-labelledby="external-sources-title" style={{ marginBottom: 24 }}>
          <h2 id="external-sources-title" style={{ fontSize: 16, margin: "0 0 8px" }}>External data sources</h2>
          <p style={{ color: "var(--color-text-secondary)", fontSize: 12, margin: "0 0 12px" }}>
            Credentials are managed by the backend. This panel never displays keys.
          </p>
          {!isLoggedIn ? (
            <p style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Log in to view connector status and test connections.</p>
          ) : externalLoading ? (
            <p style={{ color: "var(--color-text-muted)", fontSize: 12 }}>Loading external source status…</p>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12 }}>
              {(externalData?.sources || []).map((source) => {
                const statusKey = source.status.toLowerCase();
                const cfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.unavailable;
                return (
                  <article key={source.source} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                      <strong style={{ fontSize: 13 }}>{source.name}</strong>
                      <span style={{ color: cfg.color, background: cfg.bg, borderRadius: 20, padding: "3px 8px", fontSize: 10, fontWeight: 700 }}>{source.status}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 8 }}>{source.configured ? "Configured" : "Not configured: see README"}</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4 }}>Provenance: {source.provenance}</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4 }}>Last fetched: {source.last_fetched_at ? new Date(source.last_fetched_at).toLocaleString("en-IN") : "Never"}</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 6 }}>{source.message}</div>
                    <button onClick={() => handleTest(source.source)} disabled={!!testing} style={{ marginTop: 10, padding: "5px 10px", fontSize: 11, cursor: testing ? "wait" : "pointer" }}>
                      {testing === source.source ? "Testing…" : "Test connection"}
                    </button>
                    {testResults[source.source] && <div role="status" style={{ fontSize: 11, marginTop: 6 }}>{testResults[source.source]}</div>}
                  </article>
                );
              })}
            </div>
          )}
        </section>
        <div style={{ marginBottom: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
          {Object.entries(STATUS_CONFIG).map(([k, v]) => (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 6, background: v.bg, border: `1px solid ${v.color}40`, borderRadius: 20, padding: "4px 12px", fontSize: 11 }}>
              <v.Icon size={12} color={v.color} /> <span style={{ color: v.color, fontWeight: 700 }}>{v.label}</span>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div style={{ textAlign: "center", padding: 48, color: "var(--color-text-muted)", fontSize: 13 }}>
            Querying connector endpoints...
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {sources.map((src) => {
              const cfg = STATUS_CONFIG[src.status] || STATUS_CONFIG.demo;
              const isEshram = src.name.toLowerCase().includes("eshram") || src.name.toLowerCase().includes("e-shram");
              const isNews = src.name.toLowerCase().includes("news");
              const canRefresh = isLoggedIn && (isEshram || isNews);
              const isRefreshing = refreshing === (isEshram ? "eshram" : "news");
              return (
                <div key={src.id} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", padding: "16px 20px", boxShadow: "var(--shadow-sm)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                      <cfg.Icon size={16} color={cfg.color} />
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--color-text-primary)" }}>{src.name}</span>
                      <span style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}40`, borderRadius: 20, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>{cfg.label}</span>
                      {canRefresh && (
                        <button
                          onClick={() => handleRefresh(isEshram ? "eshram" : "news")}
                          disabled={!!refreshing}
                          aria-label={`Refresh ${isEshram ? "e-Shram" : "news"} data`}
                          style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 10px", fontSize: 11, fontWeight: 600, background: "transparent", border: "1px solid var(--color-primary)", color: "var(--color-primary)", borderRadius: 4, cursor: refreshing ? "wait" : "pointer", opacity: refreshing ? 0.6 : 1 }}
                        >
                          <RefreshCw size={11} style={{ animation: isRefreshing ? "spin 1s linear infinite" : "none" }} />
                          Refresh now
                        </button>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 8px", lineHeight: 1.6 }}>{src.description}</p>
                    <div style={{ fontSize: 11, color: "var(--color-text-muted)", fontStyle: "italic" }}>{src.coverageNote}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "var(--color-text-primary)" }}>{src.recordCount.toLocaleString("en-IN")}</div>
                    <div style={{ fontSize: 10, color: "var(--color-text-muted)", fontWeight: 600, textTransform: "uppercase" }}>Records</div>
                    <div style={{ fontSize: 11, color: "var(--color-text-secondary)", marginTop: 4 }}>Last ingested:<br />{src.lastIngested}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
