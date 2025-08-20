import React from "react";
import styles from "../styles";

function Select({ label, value, options, onChange }) {
  const [open, setOpen] = React.useState(false);
  const boxRef = React.useRef(null);
  React.useEffect(() => {
    const onDoc = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div style={{ position: "relative" }} ref={boxRef}>
      {label && <label style={{ display: "block", marginBottom: 6, color: "#111827" }}>{label}</label>}
      <button type="button" style={styles.selectBtn} onClick={() => setOpen(o => !o)}>{value}</button>
      {open && (
        <div style={styles.dropdown} role="listbox">
          {options.map((opt) => {
            const active = opt === value;
            return (
              <div key={opt} role="option" aria-selected={active}
                   onClick={() => { onChange(opt); setOpen(false); }}
                   style={active ? styles.dropdownItemActive : styles.dropdownItem}>
                {opt}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Filters({ filterCat, setFilterCat, filterDiff, setFilterDiff }) {
  return (
    <section style={{ ...styles.card, marginBottom: 16 }}>
      <div style={styles.h2}>Filters</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Select
          label="Category"
          value={filterCat === "all" ? "All" : filterCat[0].toUpperCase() + filterCat.slice(1)}
          options={["All","Noun","Verb","Adjective","Adverb","Expression"]}
          onChange={(val) => setFilterCat(val.toLowerCase())}
        />
        <Select
          label="Difficulty"
          value={filterDiff === "all" ? "All" : filterDiff[0].toUpperCase() + filterDiff.slice(1)}
          options={["All","Easy","Medium","Hard"]}
          onChange={(val) => setFilterDiff(val.toLowerCase())}
        />
      </div>
    </section>
  );
}