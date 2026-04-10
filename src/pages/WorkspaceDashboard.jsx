import { useState, useEffect } from "react";
import { useTenant } from "../contexts/TenantContext";
import { createToken } from "../services/tokenService";
import { getTenantWallets } from "../services/walletService";

export default function WorkspaceDashboard() {
  const { currentTenant } = useTenant();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [wallets, setWallets] = useState([]);
  
  const [form, setForm] = useState({
    name: "",
    symbol: "",
    decimals: "18",
    totalSupply: "",
    description: "",
    walletId: "",
  });

  const activeWallets = wallets.filter((w) => w.status === "active");

  useEffect(() => {
    if (currentTenant?.id) {
      loadWallets();
    }
  }, [currentTenant?.id]);

  useEffect(() => {
    // Auto-select the first active wallet if none is selected
    if (activeWallets.length > 0 && !form.walletId) {
      setForm((f) => ({ ...f, walletId: activeWallets[0].id }));
    }
  }, [wallets, activeWallets.length, form.walletId]);

  async function loadWallets() {
    try {
      const data = await getTenantWallets(currentTenant.id);
      setWallets(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load wallets for token creation", e);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    
    // Strict validations
    const nameStr = form.name.trim();
    const symbolStr = form.symbol.trim();

    if (nameStr.length < 3) {
      setMessage({ type: "error", text: "Display Name must be at least 3 characters long." });
      return;
    }
    
    if (symbolStr.length < 2 || symbolStr.length > 8) {
      setMessage({ type: "error", text: "Symbol must be between 2 and 8 characters long." });
      return;
    }

    if (!form.walletId) {
      setMessage({ type: "error", text: "You must select an active, registered organization wallet." });
      return;
    }
    
    setSaving(true);
    try {
      await createToken(currentTenant.id, {
        name: nameStr,
        symbol: symbolStr,
        decimals: form.decimals,
        totalSupply: form.totalSupply,
        description: form.description,
        walletId: form.walletId,
      });
      setMessage({ type: "success", text: "Token successfully saved to your workspace." });
      setForm(f => ({
        ...f,
        name: "",
        symbol: "",
        decimals: "18",
        totalSupply: "",
        description: "",
      }));
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Failed to create token." });
    }
    setSaving(false);
  }

  if (!currentTenant) return null;

  return (
    <div className="max-w-7xl mx-auto w-full animation-fade-in">
      <header className="mb-4 flex flex-col gap-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]">
          {currentTenant.name} / Workspace
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-text)]">
          Organization Workspace
        </h1>
      </header>

      {message.text && (
        <div
          className={`mb-8 rounded-xl px-4 py-3 text-sm font-medium animate-in slide-in-from-top-2 ${
            message.type === "success" ? "success-banner" : "error-message"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Organization Details Panel */}
        <div className="lg:col-span-4 block">
          <div className="glass-panel overflow-hidden rounded-2xl h-fit flex flex-col relative">
            <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
            <div className="p-5 flex-1">
              <div className="mb-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-[var(--color-primary)]/30 rounded-xl flex items-center justify-center text-[var(--color-primary)] shadow-[0_0_15px_rgba(139,92,246,0.15)] text-lg font-bold">
                  {currentTenant.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[var(--color-text)] tracking-tight">Profile</h2>
                  <p className="text-[10px] text-[var(--color-text-muted)] font-medium uppercase tracking-widest">Read-only</p>
                </div>
              </div>

              <div className="space-y-3">
                 <div className="bg-white/5 rounded-xl p-4 border border-[var(--color-border)]">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Name</p>
                    <p className="text-sm font-semibold text-[var(--color-text)]">{currentTenant.name}</p>
                 </div>
                 <div className="bg-white/5 rounded-xl p-4 border border-[var(--color-border)]">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Organization ID</p>
                    <p className="text-sm font-mono text-[var(--color-text)] break-all">{currentTenant.id}</p>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                   <div className="bg-white/5 rounded-xl p-4 border border-[var(--color-border)]">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Country</p>
                      <p className="text-sm font-semibold text-[var(--color-text)]">{currentTenant.country || "N/A"}</p>
                   </div>
                   <div className="bg-white/5 rounded-xl p-4 border border-[var(--color-border)]">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Currency</p>
                      <p className="text-sm font-semibold text-[var(--color-text)]">{currentTenant.currency || "N/A"}</p>
                   </div>
                 </div>

                 {currentTenant.description && (
                   <div className="bg-white/5 rounded-xl p-4 border border-[var(--color-border)]">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-1">Description</p>
                      <p className="text-sm text-[var(--color-text-muted)] leading-relaxed">{currentTenant.description}</p>
                   </div>
                 )}
              </div>
            </div>
          </div>
        </div>

        {/* Create Token Form Panel */}
        <div className="lg:col-span-8 overflow-hidden rounded-2xl relative">
          <div className="glass-panel h-full flex flex-col relative w-full overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)]" />
            <div className="p-5 overflow-hidden flex-1 flex flex-col">
              <div className="mb-5 flex justify-between items-center shrink-0">
                <h2 className="text-lg font-bold text-[var(--color-text)] tracking-tight">Initialize Token</h2>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-semibold text-[var(--color-text)]">Display Name</label>
                    <input
                      className="input-field"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value.replace(/[^A-Za-z0-9 ]/g, '') }))}
                      placeholder="e.g. Polo Reward Token"
                      required
                    />
                  </div>
                  <div className="space-y-1 md:col-span-1">
                    <label className="text-xs font-semibold text-[var(--color-text)]">Symbol</label>
                    <input
                      className="input-field font-mono uppercase"
                      value={form.symbol}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, symbol: e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase() }))
                      }
                      placeholder="PRT"
                      maxLength={8}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1 md:col-span-1">
                    <label className="text-xs font-semibold text-[var(--color-text)]">Decimals (0-18)</label>
                    <input
                      type="text"
                      className="input-field font-mono"
                      value={form.decimals}
                      onChange={(e) => {
                        const v = e.target.value.replace(/\D/g, '');
                        if (v === '' || (parseInt(v) >= 0 && parseInt(v) <= 18)) {
                          setForm(f => ({ ...f, decimals: v }));
                        }
                      }}
                      required
                    />
                  </div>
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-xs font-semibold text-[var(--color-text)]">Total Supply (Numbers Only)</label>
                    <input
                      className="input-field font-mono text-sm"
                      value={form.totalSupply}
                      onChange={(e) => setForm((f) => ({ ...f, totalSupply: e.target.value.replace(/\D/g, '') }))}
                      placeholder="Leave blank for uncapped"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--color-text)] flex justify-between">
                    <span>Link Authorized Wallet</span>
                    {activeWallets.length === 0 && (
                       <span className="text-[var(--color-error)] text-[10px] uppercase font-bold tracking-widest">No verified wallets</span>
                    )}
                  </label>
                  
                  <div className="relative">
                    <select
                      className="input-field appearance-none cursor-pointer pr-10 bg-black/20 font-semibold text-sm h-[48px]"
                      value={form.walletId}
                      onChange={(e) => setForm((f) => ({ ...f, walletId: e.target.value }))}
                      required
                      disabled={activeWallets.length === 0}
                    >
                      {activeWallets.length === 0 ? (
                        <option value="">Register a wallet in 'Wallets' tab first</option>
                      ) : (
                        activeWallets.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.name || "Unnamed Wallet"} - {w.walletAddress.slice(0,6)}...{w.walletAddress.slice(-4)}
                          </option>
                        ))
                      )}
                    </select>
                    <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-[var(--color-text-muted)]">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-[var(--color-text)]">Description (Max 200 chars)</label>
                  <input
                    className="input-field"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Provide additional metadata or context..."
                    maxLength={200}
                  />
                </div>

                <div className="mt-auto pt-4 flex items-center justify-end border-t border-[var(--color-border)]">
                  <button type="submit" className="btn-primary w-full sm:w-auto px-10 py-3 text-sm tracking-wide" disabled={saving || activeWallets.length === 0}>
                    {saving ? "Processing..." : "Create Token Definition"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
