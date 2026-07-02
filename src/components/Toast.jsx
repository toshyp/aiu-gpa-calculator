import { createContext, useContext, useState, useCallback } from "react";

const ToastContext = createContext();

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "success", duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const toast = useCallback((msg, type) => addToast(msg, type), [addToast]);

  const colors = {
    success: { bg: "rgba(34,197,94,0.15)", border: "rgba(34,197,94,0.3)", text: "#22c55e", icon: "✓" },
    error: { bg: "rgba(239,68,68,0.15)", border: "rgba(239,68,68,0.3)", text: "#ef4444", icon: "✕" },
    info: { bg: "rgba(59,130,246,0.15)", border: "rgba(59,130,246,0.3)", text: "#3b82f6", icon: "ℹ" },
    warning: { bg: "rgba(245,158,11,0.15)", border: "rgba(245,158,11,0.3)", text: "#f59e0b", icon: "⚠" },
  };

  return (
    <ToastContext.Provider value={{ toast, addToast }}>
      {children}
      <div style={{
        position: "fixed", top: "20px", right: "20px", zIndex: 9999,
        display: "flex", flexDirection: "column", gap: "8px", maxWidth: "360px"
      }}>
        {toasts.map(t => {
          const c = colors[t.type] || colors.info;
          return (
            <div key={t.id} style={{
              background: c.bg, border: `1px solid ${c.border}`,
              borderRadius: "12px", padding: "12px 16px",
              color: c.text, fontSize: "14px",
              display: "flex", alignItems: "center", gap: "10px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              backdropFilter: "blur(12px)",
              animation: "slideIn 0.3s ease",
              fontWeight: 500,
            }}>
              <span style={{ fontSize: "16px", fontWeight: 700 }}>{c.icon}</span>
              {t.message}
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </ToastContext.Provider>
  );
}
