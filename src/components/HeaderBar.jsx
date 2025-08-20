import React from "react";
import styles from "../styles";  

export default function HeaderBar({
  onExport,
  onImport,
  onAddWords,
  onLoadB2,
  onOpenSettings,
  onExportPairs,
  onImportPairs,
}) {
  return (
    <header style={styles.header}>
      <div style={styles.title}>📘 Learn English — Daily Trainer</div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <button style={styles.primary} onClick={onAddWords}>
          ＋ Add words
        </button>
        <button style={styles.ghost} onClick={onExport}>
          Export JSON
        </button>
        <button style={styles.ghost} onClick={onLoadB2}>
          Load B2 Pack
        </button>
        <button style={styles.ghost} onClick={onOpenSettings}>
          Settings
        </button>
        <button style={styles.ghost} onClick={onExportPairs}>
          Export Pairs
        </button>
        <label style={styles.ghostSm}>
          Import Pairs
          <input
            onChange={onImportPairs}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
          />
        </label>
         <label style={styles.primarySm}>
          Import JSON
          <input
            onChange={onImport}
            type="file"
            accept="application/json"
            style={{ display: 'none' }}
          />
        </label>
      </div>
    </header>
  );
}
