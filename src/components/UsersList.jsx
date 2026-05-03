import { useState, useEffect } from "react";
import { getTenantInvestors } from "../services/tenantService";
import { Users, Mail, Wallet, Coins, Clock, ChevronDown, CheckCircle2 } from "lucide-react";

export default function UsersList({ tenantId }) {
  const [investors, setInvestors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (tenantId) loadInvestors();
  }, [tenantId]);

  async function loadInvestors() {
    setLoading(true);
    try {
      const data = await getTenantInvestors(tenantId);
      setInvestors(data);
    } catch (err) {
      console.error("Failed to load investors:", err);
    }
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-[var(--color-text-muted)] animate-pulse">Loading users…</p>
      </div>
    );
  }

  if (investors.length === 0) {
    return (
      <div className="glass-panel rounded-3xl p-12 text-center">
        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 opacity-20">
          <Users className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold mb-1">No users found</h3>
        <p className="text-sm text-[var(--color-text-muted)]">Your token holders will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2 px-2">
        <h3 className="text-lg font-bold">Users & Investors</h3>
        <button onClick={loadInvestors} className="text-xs text-[var(--color-primary)] hover:underline font-bold uppercase tracking-widest">Refresh</button>
      </div>

      <div className="grid gap-4">
        {investors.map((inv) => (
          <div key={inv.id} className="glass-panel rounded-[1.5rem] p-6 hover:bg-white/[0.02] transition-colors border border-white/5 group">
            <div 
              className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 cursor-pointer"
              onClick={() => setExpandedId(expandedId === inv.id ? null : inv.id)}
            >
              
              {/* Left: Info */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center flex-shrink-0 shadow-lg shadow-[var(--color-primary)]/20">
                   <Users className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-bold text-[var(--color-text)] flex items-center gap-2">
                    {inv.name}
                  </h4>
                  <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5 mt-1">
                    <Mail className="w-3 h-3" /> {inv.email}
                  </p>
                </div>
              </div>

              {/* Middle: Stats */}
              <div className="flex gap-8">
                <div>
                  <p className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-widest mb-0.5 opacity-50">Total Invested</p>
                  <p className="text-sm font-black text-white">${inv.totalInvested?.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-widest mb-0.5 opacity-50">Total Tokens</p>
                  <p className="text-sm font-black text-[var(--color-primary)]">{inv.totalTokens}</p>
                </div>
              </div>

              {/* Right: Expand */}
              <div className="flex items-center justify-end">
                 <ChevronDown className={`w-5 h-5 text-[var(--color-text-muted)] transition-transform ${expandedId === inv.id ? 'rotate-180' : ''}`} />
              </div>
            </div>

            {/* Expanded Content: Orders */}
            {expandedId === inv.id && (
              <div className="mt-6 pt-6 border-t border-[var(--color-border)] animate-in fade-in slide-in-from-top-2 duration-300">
                 <h5 className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] mb-4 flex items-center gap-2">
                    <Coins className="w-4 h-4" /> Investment History
                 </h5>
                 <div className="space-y-3">
                    {inv.orders.map(order => (
                       <div key={order.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-black/20 border border-white/5">
                          <div className="flex items-center gap-3">
                             <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${(order.status === 'minted' || order.status === 'fulfilled') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                {(order.status === 'minted' || order.status === 'fulfilled') ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
                             </div>
                             <div>
                                <p className="text-sm font-bold text-white">{order.tokenName} <span className="text-xs font-normal text-[var(--color-text-muted)] ml-2">{order.quantity} units</span></p>
                                <p className="text-[10px] text-[var(--color-text-muted)] font-mono flex items-center gap-1 mt-0.5"><Wallet className="w-3 h-3" /> {order.walletAddress?.slice(0,6)}...{order.walletAddress?.slice(-4)}</p>
                             </div>
                          </div>
                          <div className="text-left sm:text-right">
                             <p className="text-sm font-bold">${order.totalPrice?.toFixed(2)}</p>
                             <p className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${(order.status === 'minted' || order.status === 'fulfilled') ? 'text-emerald-400' : 'text-amber-400'}`}>{order.status === 'fulfilled' ? 'minted' : order.status}</p>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
