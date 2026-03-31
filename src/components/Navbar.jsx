import { useState, useRef, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import TenantSwitcher from "./TenantSwitcher";

export default function Navbar() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleLogout() {
    try {
      await logout();
      navigate("/login");
    } catch {
      console.error("Failed to log out");
    }
  }

  const initial = currentUser?.email?.charAt(0).toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-xl bg-white/70 border-b border-[var(--color-border)] shadow-[0_1px_3px_0_rgba(0,0,0,0.02)] transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-[72px] flex items-center justify-between">

        {/* Left Side: Branding & Switcher */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigate("/")}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[#4f46e5] flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-200">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-[var(--color-text)] hidden sm:block">Blockchain</span>
          </div>

          <div className="h-6 w-px bg-[var(--color-border)] hidden sm:block" />
          <TenantSwitcher />
        </div>

        {/* Right Side: Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2.5 pl-3 pr-1 py-1 rounded-full hover:bg-[var(--color-surface-alt)] border border-transparent hover:border-[var(--color-border)] transition-all cursor-pointer focus:outline-none"
          >
            <div className="flex flex-col items-end hidden md:flex">
              <span className="text-sm font-semibold text-[var(--color-text)] leading-tight">
                {currentUser?.name || currentUser?.email?.split('@')[0]}
              </span>
              <span className="text-[11px] text-[var(--color-text-muted)] font-medium underline decoration-transparent group-hover:decoration-[var(--color-border)]">
                Organization Member
              </span>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-gray-100 to-gray-200 border border-[var(--color-border)] shadow-sm flex items-center justify-center text-[var(--color-text)] font-semibold text-sm hover:ring-2 hover:ring-[var(--color-primary)] hover:ring-offset-2 transition-all">
              {initial}
            </div>
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-3 w-64 bg-white border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden z-50">
              <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface-alt)]/50">
                <p className="text-sm font-semibold text-[var(--color-text)] truncate">{currentUser?.name || "User"}</p>
                <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">{currentUser?.email}</p>
              </div>
              <div className="p-1.5">
                <button
                  onClick={() => { setProfileOpen(false); navigate("/"); }}
                  className="flex items-center w-full px-3 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] rounded-xl transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4 mr-3 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                  Dashboard
                </button>
                <button
                  onClick={() => { setProfileOpen(false); navigate("/create-tenant"); }}
                  className="flex items-center w-full px-3 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-alt)] rounded-xl transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4 mr-3 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                  New Organization
                </button>
              </div>
              <div className="p-1.5 border-t border-[var(--color-border)] bg-[var(--color-surface-alt)]/30">
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full px-3 py-2 text-sm text-[var(--color-error)] hover:bg-[var(--color-error-bg)] rounded-xl transition-colors cursor-pointer font-semibold"
                >
                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
