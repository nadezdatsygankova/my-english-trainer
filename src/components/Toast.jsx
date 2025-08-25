import React from "react";

const ToastCtx = React.createContext({ push: () => {} });

export function ToastProvider({ children }) {
  const [items, setItems] = React.useState([]);

  const push = (text, type = "info", ms = 2500) => {
    const id = Math.random().toString(36).slice(2);
    setItems((list) => [...list, { id, text, type }]);
    setTimeout(() => {
      setItems((list) => list.filter((x) => x.id !== id));
    }, ms);
  };

  const styles = {
    error: { background: "#fee2e2", color: "#7f1d1d" },
    success: { background: "#dcfce7", color: "#14532d" },
    info: { background: "#e0e7ff", color: "#1e3a8a" },
  };

  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      <div
        style={{
          position: "fixed",
          right: 16,
          bottom: 16,
          display: "grid",
          gap: 8,
          zIndex: 10000,
        }}
      >
        {items.map((i) => (
          <div
            key={i.id}
            style={{
              ...(styles[i.type] || styles.info),
              padding: "10px 12px",
              borderRadius: 10,
              boxShadow: "0 8px 24px rgba(0,0,0,.12)",
              maxWidth: 360,
            }}
          >
            {i.text}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  return React.useContext(ToastCtx);
}