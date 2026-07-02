import { useState, useEffect } from "react";

export default function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  if (!offline) return null;

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9998,
      background: "var(--danger)", color: "white",
      textAlign: "center", padding: "8px 16px", fontSize: "13px",
      fontWeight: 500, backdropFilter: "blur(8px)"
    }}>
      No internet connection. Data may not save until you're back online.
    </div>
  );
}
