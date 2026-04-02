export default function Sidebar({ activeTab, setActiveTab }) {
  return (
    <aside className="w-64 border-r border-[var(--color-border)] bg-[var(--color-surface)] min-h-[calc(100vh-72px)] hidden md:block">
      <div className="py-6 px-4 space-y-1">
        <button
          onClick={() => setActiveTab("overview")}
          className={`flex items-center w-full px-3 py-2 text-sm font-medium rounded-xl transition-colors ${
            activeTab === "overview"
              ? "bg-[var(--color-surface-alt)] text-[var(--color-text)]"
              : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)] cursor-pointer"
          }`}
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
          Overview
        </button>
        <button
          onClick={() => setActiveTab("wallets")}
          className={`flex items-center w-full px-3 py-2 text-sm font-medium rounded-xl transition-colors ${
            activeTab === "wallets"
              ? "bg-[var(--color-surface-alt)] text-[var(--color-text)]"
              : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)] cursor-pointer"
          }`}
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
          Wallets
        </button>
        <button
          onClick={() => setActiveTab("tokens")}
          className={`flex items-center w-full px-3 py-2 text-sm font-medium rounded-xl transition-colors ${
            activeTab === "tokens"
              ? "bg-[var(--color-surface-alt)] text-[var(--color-text)]"
              : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text)] cursor-pointer"
          }`}
        >
          <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Tokens
        </button>
      </div>
    </aside>
  );
}
