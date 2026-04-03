import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { useTenant } from "../contexts/TenantContext";
import { getTenantTokens, createToken } from "../services/tokenService";
import { getTenantWallets } from "../services/walletService";

export default function TokenCreation() {
  const { address, isConnected } = useAccount();
  const { currentTenant } = useTenant();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [wallets, setWallets] = useState([]);
  const [selectedToken, setSelectedToken] = useState(null); // For the modal
  const [form, setForm] = useState({
    name: "",
    symbol: "",
    decimals: "18",
    totalSupply: "",
    description: "",
  });

  const connectedWalletDoc = wallets.find(
    (w) => w.walletAddress.toLowerCase() === address?.toLowerCase() && w.status === "active"
  );

  useEffect(() => {
    if (currentTenant?.id) {
      loadTokens();
      loadWallets();
    }
  }, [currentTenant?.id]);

  async function loadWallets() {
    try {
      const data = await getTenantWallets(currentTenant.id);
      setWallets(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to load wallets for token creation", e);
    }
  }

  async function loadTokens() {
    setLoading(true);
    try {
      const data = await getTenantTokens(currentTenant.id);
      setTokens(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setTokens([]);
    }
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    
    if (!connectedWalletDoc) {
      setMessage({ type: "error", text: "You must connect an active, registered organization wallet to create a token." });
      return;
    }

    if (!form.name.trim() || !form.symbol.trim()) {
      setMessage({ type: "error", text: "Name and symbol are required." });
      return;
    }
    
    setSaving(true);
    try {
      await createToken(currentTenant.id, {
        name: form.name.trim(),
        symbol: form.symbol.trim(),
        decimals: form.decimals,
        totalSupply: form.totalSupply,
        description: form.description,
        walletId: connectedWalletDoc.id,
      });
      setMessage({ type: "success", text: "Token saved to your organization workspace." });
      setForm(f => ({
        ...f,
        name: "",
        symbol: "",
        decimals: "18",
        totalSupply: "",
        description: "",
        // walletId stays the same so they can easily create multiple tokens for the same wallet
      }));
      await loadTokens();
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Failed to create token." });
    }
    setSaving(false);
  }

  if (!currentTenant) return null;

  return (
    <div className="max-w-6xl mx-auto w-full">
      {/* Page header */}
      <header className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--color-primary)]">
            {currentTenant.name}
          </p>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight text-[var(--color-text)]">
            Token workspace
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
            Define token metadata for this organization. Records are stored in your workspace; deploy
            contracts or bridges separately when you are ready.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2.5 shadow-sm">
            <span className="text-2xl font-bold tabular-nums text-[var(--color-text)]">
              {tokens.length}
            </span>
            <span className="text-xs font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
              token{tokens.length === 1 ? "" : "s"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => loadTokens()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] px-3 py-2.5 text-xs font-medium text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-border-hover)] hover:text-[var(--color-text)] disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>
      </header>

      {message.text && (
        <div
          className={`mb-8 rounded-2xl px-4 py-3 text-sm font-medium ${
            message.type === "success" ? "success-banner" : "error-message"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 xl:grid-cols-12 xl:gap-10">
        {/* Create form — left / top */}
        <div className="xl:col-span-5">
          <div className="overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[0_4px_24px_rgba(0,0,0,0.35)]">
            <div className="h-1.5 bg-gradient-to-r from-[var(--color-primary)] via-violet-500/80 to-fuchsia-600/40" />
            <div className="p-6 sm:p-7">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-[var(--color-text)]">Create token</h2>
                <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                  Required fields are marked. Supply is stored as text for large numbers.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-0">
                <section className="space-y-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                    Identity
                  </p>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                      Display name
                    </label>
                    <input
                      className="input-field"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      placeholder="e.g. Polo Reward Token"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                        Symbol
                      </label>
                      <input
                        className="input-field font-mono uppercase"
                        value={form.symbol}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, symbol: e.target.value.toUpperCase() }))
                        }
                        placeholder="PRT"
                        maxLength={12}
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                        Decimals
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={30}
                        className="input-field"
                        value={form.decimals}
                        onChange={(e) => setForm((f) => ({ ...f, decimals: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-[var(--color-text)]">
                      Linked Wallet
                    </label>
                    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4">
                      {!isConnected ? (
                        <p className="text-sm font-medium text-[var(--color-error)]">
                          MetaMask not connected. Please connect your wallet.
                        </p>
                      ) : !connectedWalletDoc ? (
                        <div className="text-sm">
                          <p className="font-semibold text-[var(--color-error)]">Wallet Not Registered</p>
                          <p className="mt-1 text-[var(--color-text-muted)]">
                            The connected address (<span className="font-mono">{address?.slice(0,6)}...{address?.slice(-4)}</span>) is not an active wallet in this organization. 
                            Please register and verify it in the Wallets tab first.
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-success-bg)] text-[var(--color-success-text)] ring-1 ring-[var(--color-success-border)]">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[var(--color-text)]">{connectedWalletDoc.name}</p>
                            <p className="font-mono text-xs text-[var(--color-text-muted)]">
                              {connectedWalletDoc.walletAddress}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                <section className="mt-8 space-y-4 border-t border-[var(--color-border)] pt-8">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                    Supply & notes
                  </p>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                      Total supply
                    </label>
                    <input
                      className="input-field font-mono text-sm"
                      value={form.totalSupply}
                      onChange={(e) => setForm((f) => ({ ...f, totalSupply: e.target.value }))}
                      placeholder="10000000"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-[var(--color-text)]">
                      Description
                    </label>
                    <textarea
                      className="input-field min-h-[88px] resize-y"
                      rows={3}
                      value={form.description}
                      onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                      placeholder="Internal notes, allocation intent, or links…"
                    />
                  </div>
                </section>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] text-[var(--color-text-muted)]">
                    Saved under organization <span className="font-mono text-[var(--color-text)]">{currentTenant.id}</span>
                  </p>
                  <button type="submit" className="btn-primary w-full sm:w-auto sm:min-w-[140px]" disabled={saving || !connectedWalletDoc}>
                    {saving ? "Saving…" : "Save token"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        {/* Library — right / bottom */}
        <div className="xl:col-span-7">
          <div className="flex h-full min-h-[320px] flex-col rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]/80 backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4 sm:px-6">
              <div>
                <h2 className="text-base font-semibold text-[var(--color-text)]">Library</h2>
                <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
                  All definitions for this organization
                </p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {loading ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="animate-pulse rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4"
                    >
                      <div className="h-10 w-10 rounded-full bg-[var(--color-border)]" />
                      <div className="mt-3 h-4 w-3/4 rounded bg-[var(--color-border)]" />
                      <div className="mt-2 h-3 w-1/2 rounded bg-[var(--color-border)]" />
                    </div>
                  ))}
                </div>
              ) : tokens.length === 0 ? (
                <div className="flex min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-alt)]/40 px-6 py-12 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                    <svg
                      className="h-7 w-7 text-[var(--color-text-muted)]"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-[var(--color-text)]">No tokens yet</p>
                  <p className="mt-1 max-w-xs text-xs text-[var(--color-text-muted)]">
                    Use the form to add your first token definition. It will appear here as a card.
                  </p>
                </div>
              ) : (
                <ul className="grid gap-4 sm:grid-cols-2">
                  {tokens.map((t) => (
                    <li key={t.id}>
                      {/* ADD tabIndex=0 / role=button so it's accessible */}
                      <article 
                        onClick={() => setSelectedToken(t)}
                        onKeyDown={(e) => e.key === 'Enter' && setSelectedToken(t)}
                        tabIndex={0}
                        role="button"
                        className="group flex h-full flex-col rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4 cursor-pointer transition-all hover:border-[var(--color-primary)] hover:shadow-[0_4px_20px_var(--color-primary-transparent)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-primary)]/25 to-violet-600/20 text-sm font-bold text-[var(--color-primary)] ring-1 ring-inset ring-[var(--color-primary)]/20"
                            aria-hidden
                          >
                            {(t.symbol || "?").slice(0, 4)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="truncate font-semibold text-[var(--color-text)]">{t.name}</h3>
                            <p className="mt-0.5 font-mono text-xs text-[var(--color-primary)]">{t.symbol}</p>
                          </div>
                        </div>

                        <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-lg bg-[var(--color-surface)] px-2.5 py-2">
                            <dt className="text-[var(--color-text-muted)]">Decimals</dt>
                            <dd className="mt-0.5 font-mono font-medium text-[var(--color-text)]">{t.decimals}</dd>
                          </div>
                          <div className="rounded-lg bg-[var(--color-surface)] px-2.5 py-2">
                            <dt className="text-[var(--color-text-muted)]">Supply</dt>
                            <dd className="mt-0.5 truncate font-mono font-medium text-[var(--color-text)]">
                              {t.totalSupply || "—"}
                            </dd>
                          </div>
                        </dl>

                        <div className="mt-3 border-t border-[var(--color-border)] pt-3">
                          <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">
                            Token ID
                          </p>
                          <p className="mt-1 break-all font-mono text-[11px] leading-snug text-[var(--color-text-muted)]">
                            {t.id}
                          </p>
                        </div>

                        {t.description ? (
                          <p className="mt-3 line-clamp-3 text-xs leading-relaxed text-[var(--color-text-muted)]">
                            {t.description}
                          </p>
                        ) : null}
                      </article>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Token Details Modal */}
      {selectedToken && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSelectedToken(null)}
          />
          
          {/* Modal Content */}
          <div className="relative w-full max-w-lg rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
            {/* Header Gradient */}
            <div className="h-2 bg-gradient-to-r from-[var(--color-primary)] to-fuchsia-500" />
            
            <div className="p-6 sm:p-8">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-primary)]/20 to-violet-500/10 text-xl font-bold text-[var(--color-primary)] ring-1 ring-inset ring-[var(--color-primary)]/30">
                    {(selectedToken.symbol || "?").slice(0, 4)}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-[var(--color-text)]">{selectedToken.name}</h2>
                    <p className="font-mono text-sm text-[var(--color-primary)]">{selectedToken.symbol}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedToken(null)}
                  className="rounded-full bg-[var(--color-surface-alt)] p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-border)] hover:text-[var(--color-text)] transition-colors"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4">
                  <p className="text-xs font-medium text-[var(--color-text-muted)]">Decimals</p>
                  <p className="mt-1 text-base font-semibold font-mono text-[var(--color-text)]">{selectedToken.decimals}</p>
                </div>
                <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4">
                  <p className="text-xs font-medium text-[var(--color-text-muted)]">Total Supply</p>
                  <p className="mt-1 text-base font-semibold font-mono text-[var(--color-text)] truncate" title={selectedToken.totalSupply}>
                    {selectedToken.totalSupply || "—"}
                  </p>
                </div>
               </div>

               <div className="mt-6 space-y-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-4">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Linked Wallet ID</p>
                    <p className="mt-1 font-mono text-sm text-[var(--color-text)] break-all">{selectedToken.walletId || "Unlinked (Legacy Token)"}</p>
                  </div>
                  <div className="border-t border-[var(--color-border)] pt-4">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Token ID (Database)</p>
                    <p className="mt-1 font-mono text-sm text-[var(--color-text)] break-all">{selectedToken.id}</p>
                  </div>
               </div>

               {selectedToken.organization ? (
                  <div className="mt-6 rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
                    <p className="text-[10px] mb-2 font-medium uppercase tracking-wider text-indigo-400">Organization Details</p>
                    <p className="text-sm font-semibold text-[var(--color-text)]">{selectedToken.organization.name}</p>
                    <p className="mt-1 text-xs text-[var(--color-text-muted)] font-mono break-all pt-1">Org ID: {selectedToken.organization.id}</p>
                  </div>
               ) : (
                  <div className="mt-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-alt)] opacity-75 p-4">
                    <p className="text-[10px] mb-2 font-medium uppercase tracking-wider text-[var(--color-text-muted)]">Organization Details</p>
                    <p className="text-xs italic text-[var(--color-text-muted)]">This token was created before organization embedding was enabled.</p>
                  </div>
               )}

               {selectedToken.description && (
                  <div className="mt-6">
                    <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-muted)] mb-2">Description</p>
                    <p className="text-sm leading-relaxed text-[var(--color-text)] whitespace-pre-wrap">
                      {selectedToken.description}
                    </p>
                  </div>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
