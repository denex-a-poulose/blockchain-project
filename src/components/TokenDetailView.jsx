import { useEffect, useState } from "react";
import { useTenant } from "../contexts/TenantContext";
import { getTenantTokens } from "../services/tokenService";

export default function TokenDetailView({ tokenId, initialToken, onBack }) {
  const { currentTenant } = useTenant();
  const [token, setToken] = useState(initialToken || null);
  const [loading, setLoading] = useState(!token);
  const [error, setError] = useState("");

  useEffect(() => {
    // If tokenId changed or initialToken is missing, reload
    if (tokenId && (!token || token.id !== tokenId)) {
      loadToken();
    }
  }, [currentTenant?.id, tokenId]);

  async function loadToken() {
    setLoading(true);
    setError("");
    try {
      const data = await getTenantTokens(currentTenant.id);
      const foundToken = data.find(t => t.id === tokenId);
      if (foundToken) {
        setToken(foundToken);
      } else {
        setError("Token not found in this organization.");
      }
    } catch (e) {
       console.error(e);
       setError("Failed to fetch token details.");
    }
    setLoading(false);
  }

  return (
    <div className="max-w-4xl mx-auto w-full animation-fade-in relative pb-12">
      {onBack && (
        <button 
          onClick={onBack} 
          className="group flex items-center gap-2 text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors mb-8 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full border border-[var(--color-border)] flex items-center justify-center bg-[var(--color-surface)] group-hover:bg-[var(--color-border)] transition-colors">
             <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </div>
          Back to Dashboard
        </button>
      )}

      {loading ? (
        <div className="glass-panel rounded-3xl p-8 animate-pulse text-center">
           <div className="h-6 w-32 bg-white/10 rounded mx-auto mb-4" />
           <p className="text-[var(--color-text-muted)]">Loading details...</p>
        </div>
      ) : error || !token ? (
        <div className="glass-panel rounded-3xl p-12 text-center border-[var(--color-error)]/20">
          <svg className="w-16 h-16 mx-auto text-[var(--color-error)]/50 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          <h2 className="text-xl font-bold text-[var(--color-text)]">{error || "Token not found"}</h2>
          {onBack && <button onClick={onBack} className="mt-6 btn-primary w-auto inline-block">Return Home</button>}
        </div>
      ) : (
        <div className="glass-panel rounded-3xl overflow-hidden relative">
          <div className="h-4 bg-gradient-to-r from-[var(--color-primary)] via-indigo-500 to-[var(--color-secondary)]" />
          
          <div className="p-8 sm:p-10">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] text-3xl font-bold text-white shadow-lg shadow-[var(--color-primary)]/20">
                  {(token.symbol || "?").slice(0, 4)}
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-[var(--color-text)] tracking-tight">{token.name}</h1>
                  <div className="mt-2 flex items-center gap-3">
                     <span className="font-mono text-sm tracking-wider font-semibold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-3 py-1 rounded-lg border border-[var(--color-primary)]/20">
                        {token.symbol}
                     </span>
                     <span className="text-xs text-[var(--color-text-muted)] uppercase tracking-widest font-bold">Token Identity</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="glass-card p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                   <svg className="w-5 h-5 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                   <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Tokenomics</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between items-end border-b border-[var(--color-border)] pb-2">
                    <span className="text-sm text-[var(--color-text-muted)] font-medium">Decimals</span>
                    <span className="text-lg font-mono font-bold text-[var(--color-text)]">{token.decimals}</span>
                  </div>
                  <div className="flex justify-between items-end pb-2">
                    <span className="text-sm text-[var(--color-text-muted)] font-medium">Total Supply</span>
                    <span className="text-lg font-mono font-bold text-[var(--color-text)] drop-shadow-sm">{token.totalSupply || "Uncapped"}</span>
                  </div>
                </div>
              </div>

              <div className="glass-card p-6 rounded-2xl">
                <div className="flex items-center gap-3 mb-4">
                   <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                   <h3 className="text-sm font-bold uppercase tracking-widest text-[var(--color-text-muted)]">Wallet Binding</h3>
                </div>
                {token.walletId ? (
                   <div>
                      <p className="text-xs text-[var(--color-text-muted)] mb-1">Linked Wallet ID</p>
                      <p className="font-mono text-sm font-medium text-emerald-400 break-all">{token.walletId}</p>
                   </div>
                ) : (
                   <div>
                      <p className="text-sm text-[var(--color-warning-text)] flex items-center gap-2 font-medium">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        Unlinked Legacy Token
                      </p>
                   </div>
                )}
                <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-1">Database ID</p>
                    <p className="font-mono text-xs text-[var(--color-text)]/70 break-all">{token.id}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-6 backdrop-blur-sm">
              <div className="flex items-center gap-2 mb-3 text-indigo-400">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                 <p className="text-xs font-bold uppercase tracking-widest">Organization Context</p>
              </div>
              {token.organization ? (
                 <div>
                   <p className="text-base font-bold text-[var(--color-text)] mb-1">{token.organization.name}</p>
                   <p className="text-xs text-[var(--color-text-muted)] font-mono break-all opacity-80">{token.organization.id}</p>
                 </div>
              ) : (
                 <p className="text-sm italic text-[var(--color-text-muted)]">Legacy token: created before nested organization tracking was available.</p>
              )}
            </div>

            {token.description && (
               <div className="mt-8 border-t border-[var(--color-border)] pt-8">
                  <p className="text-sm font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-4">Description & Notes</p>
                  <div className="bg-white/5 rounded-2xl p-6 border border-[var(--color-border)]">
                     <p className="text-sm leading-relaxed text-[var(--color-text)] whitespace-pre-wrap font-medium">
                        {token.description}
                     </p>
                  </div>
               </div>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
}
