import React from 'react';

export default function SettingsModal({
  open,
  onClose,
  targetSounds,
  setTargetSounds,
  enableSR,
  setEnableSR,
  pictureOnly,
  setPictureOnly,
  targetLang,
  setTargetLang,
  autoTranslateEnabled,
  setAutoTranslateEnabled,
}) {
  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={onClose}>
      <div
        style={{
          background: 'white',
          borderRadius: 12,
          padding: 24,
          width: '420px',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
        onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Settings</h2>

        {/* Pronunciation */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Pronunciation</div>
          <select
            value={targetSounds}
            onChange={(e) => setTargetSounds(e.target.value)}
            style={{
              padding: 10,
              border: '1px solid #cbd5e1',
              borderRadius: 10,
              width: '100%',
            }}>
            <option value="us">American (US)</option>
            <option value="uk">British (UK)</option>
          </select>
        </div>

        {/* Voice input */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={enableSR}
              onChange={(e) => setEnableSR(e.target.checked)}
            />
            Enable voice input (speech recognition)
          </label>
        </div>

        {/* Picture only flashcards */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <input
              type="checkbox"
              checked={pictureOnly}
              onChange={(e) => setPictureOnly(e.target.checked)}
            />
            Picture-only flashcards
          </label>
        </div>

        {/* Auto-translate target */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Auto-translate target</div>
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            style={{
              padding: 10,
              border: '1px solid #cbd5e1',
              borderRadius: 10,
              width: '100%',
            }}>
            <option value="ru">Russian (ru)</option>
            <option value="uk">Ukrainian (uk)</option>
            <option value="es">Spanish (es)</option>
            <option value="fr">French (fr)</option>
            <option value="de">German (de)</option>
            <option value="pl">Polish (pl)</option>
            <option value="tr">Turkish (tr)</option>
            <option value="ar">Arabic (ar)</option>
            <option value="zh-CN">Chinese (zh-CN)</option>
            <option value="ja">Japanese (ja)</option>
          </select>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 6 }}>
            We’ll auto-fill translations with a free public API when you add a word.
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <input
            type="checkbox"
            checked={autoTranslateEnabled}
            onChange={(e) => setAutoTranslateEnabled(e.target.checked)}
          />
          Auto-translate when translation is blank
        </label>
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            marginTop: 12,
            padding: '10px 16px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600,
          }}>
          Close
        </button>
      </div>
    </div>
  );
}
