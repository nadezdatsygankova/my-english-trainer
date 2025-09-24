// src/components/WordPopover.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { openInGoogleTranslate } from '../utils/translator';

export default function WordPopover({
  anchorRect,
  word,
  ipa,
  translation,
  status, // "unknown" | "learning" | "known" | "ignored"
  onSetStatus,
  onAdd,
  onAddTranslate,
  onAddIPA,
  autoTranslateEnabled,
  targetLang,
  onClose,
  speak,
}) {
  const boxRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, placement: 'bottom' });

  const button = {
    padding: '8px 12px',
    borderRadius: 10,
    border: '1px solid #cbd5e1',
    background: '#fff',
    cursor: 'pointer',
    textAlign: 'left',
  };

  const chip = (label, active, color, bg) => (
    <button
      type="button"
      key={label}
      onClick={() => onSetStatus(label)}
      style={{
        padding: '5px 10px',
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 700,
        color: active ? color : '#475569',
        background: active ? bg : '#f1f5f9',
        border: '1px solid #e5e7eb',
        cursor: 'pointer',
      }}>
      {label}
    </button>
  );

  // --- smart positioning (flip above if not enough space below) ---
  const recalc = useMemo(() => {
    return () => {
      if (!anchorRect || !boxRef.current) return;

      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const gutter = 8;

      // measure box
      const box = boxRef.current;
      // Temporarily show offscreen to measure size accurately
      box.style.visibility = 'hidden';
      box.style.top = '-9999px';
      box.style.left = '-9999px';
      const boxW = box.offsetWidth || 248;
      const boxH = box.offsetHeight || 240;
      box.style.visibility = '';

      // try below
      const spaceBelow = vh - anchorRect.bottom - gutter;
      let placement = 'bottom';
      let top;

      if (spaceBelow >= boxH) {
        top = Math.round(anchorRect.bottom + gutter);
      } else {
        // flip above
        placement = 'top';
        top = Math.max(gutter, Math.round(anchorRect.top - boxH - gutter));
      }

      // clamp horizontal
      const left = Math.round(Math.min(Math.max(gutter, anchorRect.left), vw - boxW - gutter));

      setPos({ top, left, placement });
    };
  }, [anchorRect]);

  useEffect(() => {
    recalc();
  }, [recalc]);

  useEffect(() => {
    const onWin = () => recalc();
    window.addEventListener('resize', onWin);
    window.addEventListener('scroll', onWin, { passive: true });
    return () => {
      window.removeEventListener('resize', onWin);
      window.removeEventListener('scroll', onWin);
    };
  }, [recalc]);

  if (!anchorRect) return null;

  return (
    <div
      ref={boxRef}
      role="dialog"
      aria-label={`Actions for ${word}`}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        zIndex: 1000,
        width: 248,
        maxHeight: 'min(70vh, 360px)', // ensure it fits
        overflow: 'auto', // scroll inside if needed
        borderRadius: 12,
        background: '#fff',
        boxShadow: '0 14px 38px rgba(15,23,42,.14)',
        border: '1px solid #e5e7eb',
        animation: 'popin 120ms cubic-bezier(.2,.7,.2,1)',
      }}>
      <div
        style={{
          padding: 10,
          borderBottom: '1px solid #e5e7eb',
          position: 'sticky',
          top: 0,
          background: '#fff',
        }}>
        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>
          {pos.placement === 'bottom' ? 'Selected' : 'Selected (flipped ↑)'}
        </div>
        <div style={{ fontWeight: 800, color: '#0f172a', wordBreak: 'break-word' }}>{word}</div>
        {ipa && <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{ipa}</div>}
        {translation && (
          <div style={{ fontSize: 12, color: '#059669', marginTop: 2 }}>{translation}</div>
        )}
      </div>

      {/* Status row */}
      <div style={{ display: 'flex', gap: 6, padding: 10, flexWrap: 'wrap' }}>
        {[
          ['unknown', '#0f172a', '#e2e8f0'],
          ['learning', '#92400e', '#fef3c7'],
          ['known', '#065f46', '#d1fae5'],
          ['ignored', '#475569', '#e5e7eb'],
        ].map(([name, color, bg]) => chip(name, status === name, color, bg))}
      </div>

      {/* Add variants */}
      <div style={{ display: 'grid', gap: 6, padding: '4px 10px 10px' }}>
        <button type="button" onClick={onAdd} style={button}>
          ➕ Add
        </button>
        <button
          type="button"
          onClick={onAddTranslate}
          style={button}
          title={`Translate → ${String(targetLang || '').toUpperCase()}`}>
          🌍 Add + translate
        </button>
        <button
          type="button"
          onClick={onAddIPA}
          style={button}
          title={`Fetch IPA${autoTranslateEnabled ? ' (+ translate)' : ''}`}>
          🔤 Add + IPA{autoTranslateEnabled ? ' (+ translate)' : ''}
        </button>
        <button
          type="button"
          onClick={() => openInGoogleTranslate(word, 'en', targetLang)}
          style={button}>
          🌐 Google Translate
        </button>

        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" onClick={() => speak?.(word)} style={{ ...button, flex: 1 }}>
            🔊 Speak
          </button>
          <button type="button" onClick={onClose} style={{ ...button, flex: 1 }}>
            ✖ Close
          </button>
        </div>
      </div>
    </div>
  );
}
