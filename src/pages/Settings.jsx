// src/pages/Settings.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const row = { display: 'grid', gap: 8, margin: '12px 0' };
const label = { fontWeight: 700, color: '#0f172a' };
const input = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #cbd5e1',
  borderRadius: 10,
  outline: 'none',
};

const AVAILABLE_PAIRS = ['ɪ vs iː', 'θ vs ð', 'æ vs e', 'ʊ vs uː', 'r vs l', 'f vs v', 'k vs g'];

export default function Settings() {
  const navigate = useNavigate();

  // load from localStorage
  const [targetSounds, setTargetSounds] = React.useState(() => {
    try {
      return JSON.parse(localStorage.getItem('targetSounds') || '[]');
    } catch {
      return [];
    }
  });
  const [enableSR, setEnableSR] = React.useState(() => localStorage.getItem('enableSR') === '1');
  const [pictureOnly, setPictureOnly] = React.useState(
    () => localStorage.getItem('pictureOnly') === '1',
  );
  const [targetLang, setTargetLang] = React.useState(
    () => localStorage.getItem('targetLang') || 'ru',
  );
  const [autoTranslateEnabled, setAutoTranslateEnabled] = React.useState(
    () => localStorage.getItem('autoTranslateEnabled') === '1',
  );

  const saveSettings = () => {
    localStorage.setItem('targetSounds', JSON.stringify(targetSounds));
    localStorage.setItem('enableSR', enableSR ? '1' : '0');
    localStorage.setItem('pictureOnly', pictureOnly ? '1' : '0');
    localStorage.setItem('targetLang', targetLang);
    localStorage.setItem('autoTranslateEnabled', autoTranslateEnabled ? '1' : '0');

    // redirect to trainer after saving
    navigate('/trainer');
  };

  const togglePair = (pair) => {
    setTargetSounds((prev) =>
      prev.includes(pair) ? prev.filter((p) => p !== pair) : [...prev, pair],
    );
  };

  return (
    <section style={{ maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>Settings</h1>

      <div style={row}>
        <label style={label}>Target sounds (Minimal Pairs)</label>
        {AVAILABLE_PAIRS.map((pair) => (
          <label key={pair} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="checkbox"
              checked={targetSounds.includes(pair)}
              onChange={() => togglePair(pair)}
            />
            {pair}
          </label>
        ))}
        <small style={{ color: '#6b7280' }}>
          Selected: {targetSounds.length ? targetSounds.join(' • ') : 'none'}
        </small>
      </div>

      <div style={row}>
        <label style={label}>
          <input
            type="checkbox"
            checked={enableSR}
            onChange={(e) => setEnableSR(e.target.checked)}
          />{' '}
          Enable Speech Recognition
        </label>
      </div>

      <div style={row}>
        <label style={label}>
          <input
            type="checkbox"
            checked={pictureOnly}
            onChange={(e) => setPictureOnly(e.target.checked)}
          />{' '}
          Picture-only flashcards
        </label>
      </div>

      <div style={row}>
        <label style={label}>Translation language</label>
        <select style={input} value={targetLang} onChange={(e) => setTargetLang(e.target.value)}>
          <option value="ru">Russian</option>
          <option value="es">Spanish</option>
          <option value="de">German</option>
          <option value="fr">French</option>
        </select>
      </div>

      <div style={row}>
        <label style={label}>
          <input
            type="checkbox"
            checked={autoTranslateEnabled}
            onChange={(e) => setAutoTranslateEnabled(e.target.checked)}
          />{' '}
          Auto-translate new words
        </label>
      </div>

      <hr style={{ margin: '20px 0' }} />

      <button
        onClick={saveSettings}
        style={{
          padding: '10px 16px',
          background: '#6366f1',
          color: '#fff',
          borderRadius: 10,
          border: 'none',
        }}>
        💾 Save & Go to Trainer
      </button>
    </section>
  );
}
