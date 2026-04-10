import { useState, useEffect } from "react";
import { useTenant } from "../contexts/TenantContext";
import { getTenantTokens } from "../services/tokenService";
import { useNavigate } from "react-router-dom";

export default function TokensList() {
  const { currentTenant } = useTenant();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentTenant?.id) {
      loadTokens();
    }
  }, [currentTenant?.id]);

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

  if (!currentTenant) return null;

  return (
    <div className="max-w-6xl mx-auto w-full animation-fade-in">
      <header className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[var(--color-secondary)]">
            {currentTenant.name} / Tokens
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--color-text)]">
            Token Registry
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-muted)]">
            Browse and manage all token definitions registered under your organization.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="glass-panel flex items-center gap-3 rounded-2xl px-5 py-3">
            <span className="text-2xl font-bold tabular-nums text-[var(--color-text)] bg-clip-text text-transparent bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)]">
              {tokens.length}
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
              Total Tokens
            </span>
          </div>
          <button
            type="button"
            onClick={() => loadTokens()}
            disabled={loading}
            className="hover:bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-2xl px-4 py-3 flex items-center gap-2 text-sm font-semibold transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <svg className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </header>

      <div className="glass-panel min-h-[500px] rounded-3xl p-6 sm:p-8">
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="animate-pulse rounded-2xl bg-white/5 border border-[var(--color-border)] p-6 min-h-[220px]">
                <div className="h-12 w-12 rounded-xl bg-white/10 mb-4" />
                <div className="h-5 w-3/4 rounded bg-white/10 mb-2" />
                <div className="h-4 w-1/2 rounded bg-white/10 mb-6" />
                <div className="h-10 w-full rounded-xl bg-white/5" />
              </div>
            ))}
          </div>
        ) : tokens.length === 0 ? (
          <div className="flex h-[400px] flex-col items-center justify-center text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-surface-alt)] to-[var(--color-surface)] shadow-lg">
              <svg className="h-10 w-10 text-[var(--color-text-muted)]/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold tracking-tight text-[var(--color-text)]">No Tokens Minted</h3>
            <p className="mt-2 text-sm text-[var(--color-text-muted)] max-w-sm">
              Head over to the Workspace tab to initialize and register your first organization token.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {tokens.map((t) => (
              <article 
                key={t.id}
                onClick={() => navigate(`/token/${t.id}`, { state: { token: t } })}
                onKeyDown={(e) => e.key === 'Enter' && navigate(`/token/${t.id}`, { state: { token: t } })}
                tabIndex={0}
                role="button"
                className="glass-card group flex h-full flex-col p-6 rounded-2xl cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)]/80 text-lg font-bold text-white shadow-lg shadow-[var(--color-primary)]/20 transition-transform group-hover:scale-110">
                      {(t.symbol || "?").slice(0, 4)}
                    </div>
                    <div>
                      <h3 className="font-bold text-[var(--color-text)] truncate max-w-[120px]">{t.name}</h3>
                      <p className="mt-0.5 font-mono text-xs font-semibold tracking-wider text-[var(--color-primary)]">{t.symbol}</p>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full border border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] group-hover:bg-[var(--color-text)] group-hover:text-[var(--color-surface)] group-hover:border-[var(--color-text)] transition-colors">
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>

                <div className="mt-6 pt-5 border-t border-[var(--color-border)] grid grid-cols-2 gap-4 flex-1">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Decimals</p>
                    <p className="mt-1 font-mono text-sm font-semibold text-[var(--color-text)]">{t.decimals}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-text-muted)]">Supply</p>
                    <p className="mt-1 font-mono text-sm font-semibold text-[var(--color-text)] truncate drop-shadow-sm">{t.totalSupply || "Uncapped"}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
