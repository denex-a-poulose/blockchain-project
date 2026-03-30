import { useAuth } from "../contexts/AuthContext";
import { useTenant } from "../contexts/TenantContext";
import { useNavigate } from "react-router-dom";
import TenantSwitcher from "../components/TenantSwitcher";
import TenantDashboard from "./TenantDashboard";

export default function Landing() {
  const { currentUser, logout } = useAuth();
  const { tenants, currentTenant, loading } = useTenant();
  const navigate = useNavigate();

  async function handleLogout() {
    try {
      await logout();
      navigate("/login");
    } catch {
      console.error("Failed to log out");
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-lg font-semibold tracking-tight text-[var(--color-text)]">
              Dashboard
            </span>
            <TenantSwitcher />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[var(--color-text-muted)] hidden sm:inline">
              {currentUser?.email}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer px-3 py-1.5 rounded-lg hover:bg-[var(--color-surface-alt)]"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 py-8 px-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
          </div>
        ) : tenants.length === 0 ? (
          /* No tenants — prompt to create */
          <div className="flex items-center justify-center h-64">
            <div className="text-center max-w-sm">
              <div className="w-14 h-14 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-6 h-6 text-[var(--color-text-muted)]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">
                No organizations yet
              </h2>
              <p className="text-sm text-[var(--color-text-muted)] mb-5">
                Create an organization to get started with your blockchain project.
              </p>
              <button
                onClick={() => navigate("/create-tenant")}
                className="btn-primary w-auto inline-flex items-center gap-2 px-5"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create organization
              </button>
            </div>
          </div>
        ) : currentTenant ? (
          /* Tenant dashboard */
          <TenantDashboard />
        ) : null}
      </main>
    </div>
  );
}
