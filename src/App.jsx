import { lazy, Suspense } from "react";
import { useApp } from "./context/AppContext";
import LoginPage from "./pages/LoginPage";
import ErrorBoundary from "./components/ErrorBoundary";
import Spinner from "./components/Spinner";

const Dashboard = lazy(() => import("./pages/Dashboard"));
const AdminPanel = lazy(() => import("./pages/AdminPanel"));

window.addEventListener("error", e => {
  console.error("GLOBAL ERROR:", e.error?.message || e.message, e.error?.stack);
});
window.addEventListener("unhandledrejection", e => {
  console.error("UNHANDLED PROMISE:", e.reason?.message || e.reason);
});

const AppContent = () => {
  const { user } = useApp();

  if (!user) return <LoginPage />;

  return (
    <ErrorBoundary>
      <Suspense fallback={<div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}><Spinner size={36} color="var(--accent)" text="Loading..." /></div>}>
        {user.startsWith("admin_") ? <AdminPanel /> : <Dashboard />}
      </Suspense>
    </ErrorBoundary>
  );
};

export default function App() {
  return <AppContent />;
}
