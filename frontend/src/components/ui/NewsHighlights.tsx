/**
 * NewsHighlights.tsx — Labour & skilling news feed component.
 *
 * Two variants:
 *   - "card" (default): vertical list for Overview/Home page, with "View all" drawer
 *   - "ticker": scrolling marquee strip below header
 *
 * Features:
 *   - Keyword chips from backend `tags` field
 *   - Source badge, relative time
 *   - "Sample" badge when source === "synthetic"
 *   - Skeleton loader, empty state, error state with retry
 *   - Ticker respects prefers-reduced-motion (no auto-scroll)
 *   - All links: target="_blank" rel="noopener noreferrer"
 */
import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ExternalLink, Newspaper, RefreshCw, Pause, Play, ChevronRight, X, Search } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNews } from "../../hooks/useApi";
import { mockNews } from "../../mocks/data";
import type { NewsItem, NewsResponse } from "../../types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  const m = Math.floor(diff / 60000);
  if (m < 2) return "just now";
  if (h < 1) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function SourceBadge({ source }: { source: "live" | "cached" | "synthetic" }) {
  if (source === "live") return null;
  return (
    <span style={{
      display: "inline-block", fontSize: 9, fontWeight: 700, padding: "2px 6px",
      borderRadius: 3, background: "#fef6ee", color: "#e67e22",
      border: "1px solid #fcd8b0", textTransform: "uppercase", letterSpacing: "0.04em",
    }}>
      Sample
    </span>
  );
}

function TagChip({ tag }: { tag: string }) {
  return (
    <span style={{
      display: "inline-block", fontSize: 9, padding: "2px 7px", borderRadius: 20,
      background: "var(--color-primary-bg, #eaf0fb)", color: "var(--color-primary, #154590)",
      border: "1px solid var(--color-primary-light, #9ab3e0)", fontWeight: 600, lineHeight: 1.4,
    }}>
      {tag}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div style={{ padding: "10px 0", borderBottom: "1px solid var(--color-border)" }}>
      {[80, 60, 40].map((w, i) => (
        <div key={i} style={{
          height: i === 0 ? 14 : 10, width: `${w}%`, borderRadius: 4,
          background: "var(--color-border)", marginBottom: 6, animation: "pulse 1.4s ease infinite",
        }} />
      ))}
    </div>
  );
}

// ── News Card Item ─────────────────────────────────────────────────────────────

function NewsCardItem({ item }: { item: NewsItem }) {
  return (
    <div style={{ padding: "10px 0", borderBottom: "1px solid var(--color-border)" }}>
      <a
        href={item.url === "#" ? undefined : item.url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Read more: ${item.title}`}
        style={{
          display: "-webkit-box" as React.CSSProperties["display"],
          fontSize: 12, fontWeight: 600,
          color: "var(--color-text-primary)", textDecoration: "none", lineHeight: 1.45,
          overflow: "hidden", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
          marginBottom: 4,
        }}
      >
        {item.title}
      </a>
      <div style={{ fontSize: 10, color: "var(--color-text-muted)", marginBottom: 5, display: "flex", gap: 8, alignItems: "center" }}>
        <span style={{ fontWeight: 600 }}>{item.source_name}</span>
        <span>·</span>
        <span>{relativeTime(item.published_at)}</span>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {item.tags.slice(0, 3).map(t => <TagChip key={t} tag={t} />)}
        {item.url !== "#" && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Read more about: ${item.title}`}
            style={{
              display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10,
              color: "var(--color-primary)", textDecoration: "none", fontWeight: 600, marginLeft: "auto",
            }}
          >
            Read more <ExternalLink size={9} />
          </a>
        )}
      </div>
    </div>
  );
}

// ── Full News Drawer / Page ────────────────────────────────────────────────────

function NewsDrawer({ isOpen, onClose, items, source }: {
  isOpen: boolean; onClose: () => void; items: NewsItem[]; source: string;
}) {
  const [q, setQ] = useState("");
  const filtered = q
    ? items.filter(i => i.title.toLowerCase().includes(q.toLowerCase()) || i.summary.toLowerCase().includes(q.toLowerCase()))
    : items;

  if (!isOpen) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000, display: "flex", justifyContent: "flex-end",
    }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.35)" }} />
      <div style={{
        position: "relative", width: "min(480px, 100vw)", background: "var(--color-surface)",
        display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,0.15)",
        zIndex: 1,
      }}>
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Newspaper size={16} color="var(--color-primary)" />
            <span style={{ fontWeight: 700, fontSize: 14 }}>News Highlights</span>
            <SourceBadge source={source as "live" | "cached" | "synthetic"} />
          </div>
          <button onClick={onClose} aria-label="Close news drawer" style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        {/* Search */}
        <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--color-border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: 6, padding: "6px 10px" }}>
            <Search size={13} color="var(--color-text-muted)" />
            <input
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Search headlines…"
              style={{ border: "none", background: "transparent", outline: "none", fontSize: 12, flex: 1, color: "var(--color-text-primary)" }}
            />
          </div>
        </div>
        {/* Items */}
        <div style={{ flex: 1, overflowY: "auto", padding: "0 20px" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center", color: "var(--color-text-muted)", fontSize: 12 }}>
              No matching news items found.
            </div>
          ) : (
            filtered.map(item => <NewsCardItem key={item.id} item={item} />)
          )}
        </div>
        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: "1px solid var(--color-border)", fontSize: 10, color: "var(--color-text-muted)" }}>
          Source: {source} | Filtered for labour & skilling
        </div>
      </div>
    </div>
  );
}

// ── Card Variant ──────────────────────────────────────────────────────────────

function NewsCard({ data, isLoading, isError, refetch, limit = 6 }: {
  data?: NewsResponse; isLoading: boolean; isError: boolean; refetch: () => void; limit?: number;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const items = data?.items ?? mockNews.items;
  const source = data?.source ?? "synthetic";

  return (
    <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-md)", boxShadow: "var(--shadow-sm)" }}>
      {/* Header */}
      <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Newspaper size={14} color="var(--color-primary)" />
          <span style={{ fontWeight: 700, fontSize: 13 }}>News Highlights</span>
          <SourceBadge source={source} />
        </div>
        <button
          onClick={() => refetch()}
          aria-label="Refresh news"
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", padding: 4 }}
        >
          <RefreshCw size={12} />
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: "0 16px" }}>
        {isLoading && [1, 2, 3].map(i => <SkeletonCard key={i} />)}
        {isError && (
          <div style={{ padding: 16, textAlign: "center", fontSize: 12, color: "var(--color-text-muted)" }}>
            News unavailable.{" "}
            <button onClick={() => refetch()} style={{ color: "var(--color-primary)", background: "none", border: "none", cursor: "pointer", fontSize: 12 }}>Retry</button>
          </div>
        )}
        {!isLoading && !isError && items.slice(0, limit).map(item => <NewsCardItem key={item.id} item={item} />)}
      </div>

      {/* Footer */}
      <div style={{ padding: "10px 16px", borderTop: "1px solid var(--color-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, color: "var(--color-text-muted)" }}>
          Source: {source === "live" ? data?.provider : "Sample data"} · Filtered for labour & skilling
        </span>
        <button
          onClick={() => setDrawerOpen(true)}
          style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: "var(--color-primary)", fontSize: 11, fontWeight: 600 }}
          aria-label="View all news"
        >
          View all <ChevronRight size={12} />
        </button>
      </div>

      <NewsDrawer isOpen={drawerOpen} onClose={() => setDrawerOpen(false)} items={items} source={source} />
    </div>
  );
}

// ── Ticker Variant ────────────────────────────────────────────────────────────

function NewsTicker({ data, isLoading }: { data?: NewsResponse; isLoading: boolean }) {
  const [paused, setPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const items = data?.items ?? mockNews.items;
  const tickerItems = [...items, ...items]; // duplicate for seamless loop

  useEffect(() => {
    if (prefersReduced || paused || isLoading || !trackRef.current) return;
    const el = trackRef.current;
    let pos = 0;
    const speed = 0.4;
    let raf: number;
    const half = el.scrollWidth / 2;
    const tick = () => {
      pos += speed;
      if (pos >= half) pos = 0;
      el.style.transform = `translateX(-${pos}px)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, isLoading, prefersReduced, items.length]);

  return (
    <div
      style={{
        background: "var(--color-primary, #154590)", color: "#fff", height: 30,
        display: "flex", alignItems: "center", overflow: "hidden", position: "relative",
      }}
      role="marquee"
      aria-label="Latest labour & skilling news"
    >
      {/* Label */}
      <div style={{
        flexShrink: 0, padding: "0 12px", fontSize: 10, fontWeight: 700,
        background: "rgba(0,0,0,0.25)", height: "100%", display: "flex",
        alignItems: "center", gap: 6, letterSpacing: "0.04em", whiteSpace: "nowrap",
      }}>
        <Newspaper size={11} /> LATEST
      </div>

      {/* Scrolling track */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {isLoading ? (
          <span style={{ fontSize: 11, opacity: 0.7, padding: "0 16px" }}>Loading news…</span>
        ) : (
          <div ref={trackRef} style={{ display: "flex", gap: "48px", whiteSpace: "nowrap", willChange: "transform" }}>
            {tickerItems.map((item, i) => (
              <a
                key={`${item.id}-${i}`}
                href={item.url === "#" ? undefined : item.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={item.title}
                style={{ color: "#fff", textDecoration: "none", fontSize: 11, flexShrink: 0 }}
              >
                <span style={{ opacity: 0.6, marginRight: 8 }}>▸</span>{item.title}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Pause/Play control */}
      <button
        onClick={() => setPaused(p => !p)}
        aria-label={paused ? "Play news ticker" : "Pause news ticker"}
        style={{
          flexShrink: 0, background: "none", border: "none", color: "#fff",
          cursor: "pointer", padding: "0 10px", height: "100%", opacity: 0.8,
        }}
      >
        {paused ? <Play size={12} /> : <Pause size={12} />}
      </button>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

interface NewsHighlightsProps {
  variant?: "card" | "ticker";
  limit?: number;
}

export default function NewsHighlights({ variant = "card", limit = 6 }: NewsHighlightsProps) {
  const { isLoggedIn } = useAuth();
  const { data, isLoading, isError, refetch } = useNews({ limit: 12 }, isLoggedIn);

  if (variant === "ticker") {
    return <NewsTicker data={data} isLoading={isLoading} />;
  }

  return <NewsCard data={data} isLoading={isLoading} isError={isError} refetch={refetch} limit={limit} />;
}
