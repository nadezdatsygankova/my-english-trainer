import React, { useEffect, useRef, useState } from "react";
import InlineTranslator from "./InlineTranslator";

const timeToSeconds = (t) => {
  // "MM:SS" or "HH:MM:SS"
  const parts = t.split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
};

export default function PodcastPlayer({
  src,
  title = "Podcast",
  transcript = [],
  targetLang = "ru",
  onAddWord, // (entry) => void
}) {
  const audioRef = useRef(null);
  const [currentTime, setCurrentTime] = useState(0);

  // Inline translator state
  const [popWord, setPopWord] = useState(null);     // token text
  const [anchorRect, setAnchorRect] = useState(null); // DOMRect for positioning
  const [showPop, setShowPop] = useState(false);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setCurrentTime(el.currentTime || 0);
    el.addEventListener("timeupdate", onTime);
    return () => el.removeEventListener("timeupdate", onTime);
  }, []);

  const seekTo = (t) => {
    const s = timeToSeconds(t);
    if (audioRef.current) {
      audioRef.current.currentTime = s;
      audioRef.current.play?.();
    }
  };

  // current active line index for mild highlighting
  let activeIdx = -1;
  const numbered = transcript.map((ln, i) => {
    const next = transcript[i + 1];
    const start = timeToSeconds(ln.time || "0:00");
    const end = next ? timeToSeconds(next.time || "0:00") : Number.MAX_SAFE_INTEGER;
    const active = currentTime >= start && currentTime < end;
    if (active) activeIdx = i;
    return { ...ln, i, active };
  });

  // tokenizer that preserves punctuation “word,” “word.” etc.
  const tokenize = (text) => {
    // split by spaces but keep each raw token (we’ll clean in the translator)
    return text.split(/(\s+)/);
  };

  const onWordClick = (e, rawToken) => {
    const rect = e.target.getBoundingClientRect();
    setAnchorRect(rect);
    setPopWord(rawToken);
    setShowPop(true);
  };

  return (
    <section style={{ padding: 16, background: "#fff", border: "1px solid #eef2f7", borderRadius: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
        <audio ref={audioRef} src={src} controls style={{ flex: 1 }} />
        <div style={{ fontWeight: 800, color: "#0f172a" }}>{title}</div>
      </div>

      <div style={{ maxHeight: 440, overflow: "auto", paddingRight: 8 }}>
        {numbered.map((ln) => (
          <div
            key={ln.i}
            style={{
              padding: "10px 8px",
              marginBottom: 6,
              borderRadius: 10,
              background: ln.active ? "#f1f5f9" : "transparent",
              border: ln.active ? "1px solid #e2e8f0" : "1px solid transparent",
            }}
          >
            <div
              onClick={() => seekTo(ln.time)}
              style={{ cursor: "pointer", fontSize: 12, color: "#64748b", marginBottom: 4 }}
              title="Click to seek"
            >
              {ln.time} • {ln.speaker || "Speaker"}
            </div>

            <div style={{ lineHeight: 1.6, color: "#0f172a", fontSize: 16 }}>
              {tokenize(ln.text).map((tok, j) => {
                // keep whitespace as-is
                if (/^\s+$/.test(tok)) return <span key={j}>{tok}</span>;
                return (
                  <span
                    key={j}
                    onClick={(e) => onWordClick(e, tok)}
                    style={{
                      padding: "0 2px",
                      borderRadius: 4,
                      cursor: "pointer",
                      transition: "background 120ms",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#eef2ff")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    title="Click for translation"
                  >
                    {tok}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {showPop && popWord && (
        <InlineTranslator
          token={popWord}
          targetLang={targetLang}
          anchorRect={anchorRect}
          onAdd={(entry) => {
            onAddWord?.(entry);
            setShowPop(false);
          }}
          onClose={() => setShowPop(false)}
        />
      )}
    </section>
  );
}