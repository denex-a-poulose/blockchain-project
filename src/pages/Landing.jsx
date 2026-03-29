import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Landing() {
  const { currentUser, logout } = useAuth();
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
          <span className="text-lg font-semibold tracking-tight text-[var(--color-text)]">
            Dashboard
          </span>
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
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-[var(--color-primary)] rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)] mb-2">
            You&apos;re all set!
          </h1>
          <p className="text-[var(--color-text-muted)] text-sm leading-relaxed">
            Welcome,{" "}
            <span className="font-medium text-[var(--color-text)]">
              {currentUser?.displayName || currentUser?.email}
            </span>
            . You&apos;ve successfully signed in. This is your landing page — start building from here.
          </p>
        </div>
      </main>
    </div>
  );
}
