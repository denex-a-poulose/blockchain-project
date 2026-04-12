export default function Sidebar({ activeTab, setActiveTab }) {
  const tabs = [
    {
      id: "overview",
      label: "Overview",
      icon: (
        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
      )
    },
    {
      id: "wallets",
      label: "Wallets",
      icon: (
        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
      )
    },
    {
      id: "tokenMarket",
      label: "Token Market",
      icon: (
        <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
      )
    }
  ];

  return (
    <aside className="w-64 border-r border-[var(--color-border)] bg-[var(--color-surface)]/40 backdrop-blur-md min-h-[calc(100vh-72px)] hidden md:block">
      <div className="py-6 px-4 space-y-1.5">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center w-full px-4 py-3 text-sm font-semibold rounded-xl transition-all duration-200 cursor-pointer ${
              activeTab === tab.id
                ? "bg-[#8b5cf6]/15 text-[#8b5cf6] shadow-[inset_0_0_0_1px_rgba(139,92,246,0.3)]"
                : "text-[var(--color-text-muted)] hover:bg-[#161821] hover:text-[var(--color-text)]"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>
    </aside>
  );
}
