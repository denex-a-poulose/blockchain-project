import { useState, useEffect } from "react";
import { useAccount, useConnect, useDisconnect, useSignMessage, useWalletClient, usePublicClient } from "wagmi";
import { injected } from "wagmi/connectors";
import TokenAssetData from "../utils/abis/TokenAsset.json";
import { useTenant } from "../contexts/TenantContext";
import { createToken, getTenantTokens } from "../services/tokenService";
import { getTenantWallets, addWallet, getNonce, verifyWallet } from "../services/walletService";
import { useNavigate } from "react-router-dom";

export default function TokenMarket() {
  const { currentTenant } = useTenant();
  const navigate = useNavigate();
  
  // Web3 state
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending: isConnectPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  // Data states
  const [wallets, setWallets] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Wallet ADD State
  const [walletLabel, setWalletLabel] = useState("");
  const [walletMsg, setWalletMsg] = useState({ type: "", text: "" });

  const [formMsg, setFormMsg] = useState({ type: "", text: "" });

  // Token Config Form
  const [form, setForm] = useState({
    name: "",
    symbol: "",
    decimals: "18",
    description: "",
    mainCurrency: "USD",
    pricePerToken: "",
    softCap: "",
    hardCap: "",
    minInvestment: "",
    walletId: "",
  });

  const activeWallets = wallets.filter((w) => w.status === "active");

  useEffect(() => {
    if (currentTenant?.id) {
      loadData();
    }
  }, [currentTenant?.id]);

  useEffect(() => {
    // Auto-select the first active wallet if none is selected
    if (activeWallets.length > 0 && !form.walletId) {
      setForm((f) => ({ ...f, walletId: activeWallets[0].id }));
    }
  }, [wallets, activeWallets.length, form.walletId]);

  async function loadData() {
    setLoading(true);
    try {
      const [walletData, tokenData] = await Promise.all([
        getTenantWallets(currentTenant.id),
        getTenantTokens(currentTenant.id)
      ]);
      setWallets(Array.isArray(walletData) ? walletData : []);
      setTokens(Array.isArray(tokenData) ? tokenData : []);
    } catch (e) {
      console.error("Failed to load market data", e);
    }
    setLoading(false);
  }

  /* --- Wallet Logic --- */
  async function handleAddWallet() {
    if (!isConnected || !address) return;
    setWalletMsg({ type: "", text: "" });
    const label = walletLabel.trim() || "Market Wallet";
    try {
      await addWallet(currentTenant.id, address, label);
      setWalletLabel("");
      
      // Auto-verify after adding
      const nonce = await getNonce(currentTenant.id, address);
      const signatureMessage = `Sign this message to link your wallet to ${currentTenant.name}.\n\nNonce: ${nonce}`;
      const signature = await signMessageAsync({ message: signatureMessage });
      await verifyWallet(currentTenant.id, address, signature);
      
      setWalletMsg({ type: "success", text: "Wallet connected & verified!" });
      await loadData();
    } catch (err) {
      setWalletMsg({ type: "error", text: err.message || "Failed to add wallet." });
    }
  }

  /* --- Token Creation Logic --- */
  async function handleSubmit(e) {
    e.preventDefault();
    setFormMsg({ type: "", text: "" });
    
    const nameStr = form.name.trim();
    const symbolStr = form.symbol.trim();

    if (nameStr.length < 3) return setFormMsg({ type: "error", text: "Name must be at least 3 characters." });
    if (symbolStr.length < 2 || symbolStr.length > 8) return setFormMsg({ type: "error", text: "Symbol must be 2 to 8 characters." });
    if (!form.walletId) return setFormMsg({ type: "error", text: "You must link an active wallet." });
    if (!form.pricePerToken) return setFormMsg({ type: "error", text: "Price per token is required." });

    if (!walletClient) return setFormMsg({ type: "error", text: "Please connect your wallet first to deploy." });

    setSaving(true);
    try {
      setFormMsg({ type: "success", text: "Deploying to Blockchain... Please confirm the transaction in MetaMask." });

      const txHash = await walletClient.deployContract({
        abi: TokenAssetData.abi,
        bytecode: TokenAssetData.bytecode,
        args: [nameStr, symbolStr, parseInt(form.decimals), address],
      });

      setFormMsg({ type: "success", text: "Transaction submitted! Waiting for network confirmation..." });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      const contractAddress = receipt.contractAddress;

      setFormMsg({ type: "success", text: "Contract secured! Registering asset to your market..." });

      await createToken(currentTenant.id, {
        name: nameStr,
        symbol: symbolStr,
        decimals: form.decimals,
        totalSupply: "",
        description: form.description,
        walletId: form.walletId,
        mainCurrency: form.mainCurrency,
        pricePerToken: form.pricePerToken,
        softCap: form.softCap,
        hardCap: form.hardCap,
        minInvestment: form.minInvestment,
        contractAddress,
        transactionHash: txHash
      });
      setFormMsg({ type: "success", text: `Market Asset successfully launched at ${contractAddress.slice(0, 8)}...` });
      setForm(f => ({
        ...f, name: "", symbol: "", decimals: "18", description: "", pricePerToken: "", softCap: "", hardCap: "", minInvestment: ""
      }));
      await loadData();
    } catch (err) {
      console.error(err);
      setFormMsg({ type: "error", text: err.message || "Failed to create market asset." });
    }
    setSaving(false);
  }

  if (!currentTenant) return null;

  return (
    <div className="max-w-7xl mx-auto w-full animation-fade-in flex flex-col gap-8 pb-12">
      <header className="flex flex-col gap-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--color-primary)]">
          {currentTenant.name} / Assets
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-[var(--color-text)]">
          Token Market
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-[var(--color-text-muted)] mt-1">
          Configure new digital assets, manage treasury wallets, and overview your tokenized ecosystem.
        </p>
      </header>

      {/* --- SECTION 1: WALLET CONNECTION --- */}
      <div className="glass-panel overflow-hidden rounded-2xl relative">
        <div className="px-6 py-5 border-b border-[var(--color-border)] bg-white/5 flex justify-between items-center">
            <h2 className="text-lg font-bold text-[var(--color-text)] tracking-tight">1. Treasury Wallets</h2>
        </div>
        <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* Available Wallets */}
                <div className="space-y-4">
                   <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] border-b border-[var(--color-border)] pb-2 mb-4">Available Wallets</h3>
                   {activeWallets.length === 0 ? (
                       <p className="text-sm italic text-[var(--color-text-muted)]">No verified wallets. Connect one to proceed.</p>
                   ) : (
                       <div className="space-y-3">
                           {activeWallets.slice(0,3).map(w => (
                               <div key={w.id} className="flex items-center gap-3 bg-black/20 border border-[var(--color-border)] rounded-xl p-3">
                                   <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center ring-1 ring-inset ring-emerald-500/20">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                   </div>
                                   <div>
                                       <p className="text-xs font-bold text-[var(--color-text)]">{w.name}</p>
                                       <p className="text-[10px] text-[var(--color-text-muted)] font-mono">{w.walletAddress}</p>
                                   </div>
                               </div>
                           ))}
                       </div>
                   )}
                </div>

                {/* Connect Web3 Block */}
                <div className="space-y-4">
                   <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--color-text-muted)] border-b border-[var(--color-border)] pb-2 mb-4">Add New Wallet</h3>
                   
                   {walletMsg.text && (
                        <div className={`p-3 rounded-lg text-xs font-medium mb-3 ${walletMsg.type === "success" ? "bg-[var(--color-success-bg)] text-[var(--color-success-text)] border border-[var(--color-success-border)]" : "bg-[var(--color-error)]/10 text-[var(--color-error)] border border-[var(--color-error)]/20"}`}>
                            {walletMsg.text}
                        </div>
                   )}

                   {!isConnected ? (
                       <div>
                           <button onClick={() => connect({ connector: injected() })} disabled={isConnectPending} className="btn-primary w-auto text-sm py-2 px-6">
                              {isConnectPending ? "Connecting MetaMask..." : "Connect MetaMask"}
                           </button>
                           <p className="text-[10px] text-[var(--color-text-muted)] mt-2">Requires browser extension.</p>
                       </div>
                   ) : (
                       <div className="bg-[var(--color-surface-alt)] p-4 rounded-xl border border-[var(--color-border)] space-y-3">
                           <div className="flex justify-between items-center">
                               <div>
                                   <p className="text-[10px] font-bold text-[var(--color-primary)]">Connected Address</p>
                                   <p className="text-sm font-mono text-[var(--color-text)]">{address.substring(0, 6)}...{address.substring(address.length - 4)}</p>
                               </div>
                               <button onClick={() => disconnect()} className="text-[10px] uppercase font-bold text-[var(--color-text-muted)] hover:text-[var(--color-error)] border border-[var(--color-border)] rounded-md px-2 py-1">Disconnect</button>
                           </div>
                           <input 
                               className="input-field text-sm py-1.5"
                               placeholder="Label (e.g. Cold Storage)"
                               value={walletLabel}
                               onChange={e => setWalletLabel(e.target.value)}
                           />
                           <button onClick={handleAddWallet} className="btn-primary w-full text-xs py-2">
                               Verify & Add Wallet
                           </button>
                       </div>
                   )}
                </div>

            </div>
        </div>
      </div>

      {/* --- SECTION 2: ASSET CONFIGURATION & PREVIEW --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <div className="lg:col-span-8">
            <div className="glass-panel overflow-hidden rounded-2xl relative h-full flex flex-col">
              <div className="h-1 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)]" />
              <div className="p-6 flex-1 flex flex-col">
                <div className="mb-6 flex justify-between items-center shrink-0">
                  <h2 className="text-lg font-bold text-[var(--color-text)] tracking-tight">2. Asset Configuration</h2>
                </div>

                {formMsg.text && (
                  <div className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium ${formMsg.type === "success" ? "success-banner" : "error-message"}`}>
                    {formMsg.text}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[var(--color-text)]">Asset Name *</label>
                      <input className="input-field" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value.replace(/[^A-Za-z0-9 ]/g, '') }))} placeholder="Token Name" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-[var(--color-text)]">Symbol *</label>
                          <input className="input-field font-mono uppercase" value={form.symbol} onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value.replace(/[^A-Za-z0-9]/g, '').toUpperCase() }))} placeholder="SYM" maxLength={8} required />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-[var(--color-text)]">Decimals *</label>
                          <input className="input-field font-mono" value={form.decimals} onChange={(e) => { const v = e.target.value.replace(/\D/g, ''); if (v === '' || (parseInt(v) >= 0 && parseInt(v) <= 18)) setForm(f => ({ ...f, decimals: v })); }} required />
                        </div>
                    </div>
                  </div>

                  {/* Pricing Info */}
                  <div className="bg-white/5 rounded-xl p-5 border border-[var(--color-border)]">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          <div className="space-y-1">
                              <label className="text-xs font-semibold text-[var(--color-text)] text-[var(--color-primary)]">Main Currency *</label>
                              <select className="input-field appearance-none" value={form.mainCurrency} onChange={e => setForm(f => ({...f, mainCurrency: e.target.value}))}>
                                  <option value="USD">USD ($)</option>
                                  <option value="EUR">EUR (€)</option>
                                  <option value="USDC">USDC</option>
                                  <option value="USDT">USDT</option>
                                  <option value="ETH">ETH</option>
                                  <option value="MATIC">MATIC</option>
                              </select>
                          </div>
                          <div className="space-y-1">
                              <label className="text-xs font-semibold text-[var(--color-text)] text-[var(--color-primary)]">Price per Token *</label>
                              <div className="relative">
                                 <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-sm font-bold">{form.mainCurrency === "USD" || form.mainCurrency === "USDC" || form.mainCurrency === "USDT" ? "$" : form.mainCurrency === "EUR" ? "€" : ""}</span>
                                 <input className="input-field font-mono pl-7" placeholder="1.50" value={form.pricePerToken} onChange={(e) => setForm((f) => ({ ...f, pricePerToken: e.target.value.replace(/[^0-9.]/g, '') }))} required />
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Market Caps */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[var(--color-text)]">Soft Cap</label>
                      <input className="input-field font-mono" placeholder="Optional" value={form.softCap} onChange={(e) => setForm((f) => ({ ...f, softCap: e.target.value.replace(/[^0-9.]/g, '') }))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[var(--color-text)]">Hard Cap</label>
                      <input className="input-field font-mono" placeholder="Optional" value={form.hardCap} onChange={(e) => setForm((f) => ({ ...f, hardCap: e.target.value.replace(/[^0-9.]/g, '') }))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[var(--color-text)]">Min. Invest</label>
                      <input className="input-field font-mono" placeholder="Optional" value={form.minInvestment} onChange={(e) => setForm((f) => ({ ...f, minInvestment: e.target.value.replace(/[^0-9.]/g, '') }))} />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-[var(--color-text)]">Description</label>
                        <input className="input-field" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Asset summary..." maxLength={200} />
                      </div>
                      <div className="space-y-1 flex flex-col justify-end pb-0.5">
                         <label className="text-xs font-semibold text-[var(--color-text)]">Treasury Wallet *</label>
                         <select
                            className="input-field appearance-none cursor-pointer bg-black/20"
                            value={form.walletId}
                            onChange={(e) => setForm((f) => ({ ...f, walletId: e.target.value }))}
                            required
                            disabled={activeWallets.length === 0}
                          >
                            {activeWallets.length === 0 ? (
                              <option value="">No verified wallet</option>
                            ) : (
                              activeWallets.map((w) => (
                                <option key={w.id} value={w.id}>
                                  {w.name} ({w.walletAddress.slice(0,4)}...{w.walletAddress.slice(-4)})
                                </option>
                              ))
                            )}
                          </select>
                      </div>
                  </div>

                  <div className="mt-auto pt-6 border-t border-[var(--color-border)]">
                    <button type="submit" className="btn-primary w-full py-3.5 text-sm font-bold tracking-wide shadow-lg shadow-[var(--color-primary)]/20" disabled={saving || activeWallets.length === 0}>
                      {saving ? "Deploying Market Asset..." : "Deploy Asset"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4">
             {/* Live Preview Display */}
             <div className="glass-panel rounded-2xl p-6 relative overflow-hidden h-full">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-primary)] opacity-10 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-text-muted)] mb-6">3. Live Preview</h3>
                
                <div className="glass-card rounded-2xl p-6 relative z-10 border border-[var(--color-primary)]/20 bg-gradient-to-b from-white/5 to-transparent">
                   <div className="flex items-center gap-4 mb-6">
                      <div className="w-14 h-14 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-lg shadow-[var(--color-primary)]/20">
                          {form.symbol ? form.symbol.charAt(0) : "?"}
                      </div>
                      <div>
                          <h4 className="text-lg font-bold text-[var(--color-text)]">{form.name || "Token Name"}</h4>
                          <span className="text-[10px] font-mono font-bold text-[var(--color-primary)] bg-[var(--color-primary)]/10 px-2 py-0.5 rounded-md border border-[var(--color-primary)]/20">{form.symbol || "SYM"}</span>
                      </div>
                   </div>

                   <p className="text-xs text-[var(--color-text-muted)] italic min-h-[32px] break-words">
                       {form.description || "Description preview..."}
                   </p>

                   <div className="mt-6 space-y-4">
                       <div className="bg-black/30 rounded-xl p-4 border border-white/5">
                           <p className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Public Price</p>
                           <p className="text-2xl font-bold text-[var(--color-text)] mt-1">
                               {form.pricePerToken ? `${form.pricePerToken} ` : "0.00 "}
                               <span className="text-sm text-[var(--color-primary)]">{form.mainCurrency}</span>
                           </p>
                       </div>

                       <div className="grid grid-cols-2 gap-3 text-xs">
                           <div className="bg-[#161821] rounded-lg p-3 border border-white/5">
                               <p className="text-[var(--color-text-muted)] font-medium mb-1 line-clamp-1">Soft Cap</p>
                               <p className="font-mono text-[var(--color-text)] font-semibold break-all">{form.softCap ? `${form.softCap} ${form.mainCurrency}` : "-"}</p>
                           </div>
                           <div className="bg-[#161821] rounded-lg p-3 border border-white/5">
                               <p className="text-[var(--color-text-muted)] font-medium mb-1 line-clamp-1">Hard Cap</p>
                               <p className="font-mono text-[var(--color-text)] font-semibold break-all">{form.hardCap ? `${form.hardCap} ${form.mainCurrency}` : "-"}</p>
                           </div>
                       </div>
                       
                       <div className="text-[10px] text-center pt-2 text-[var(--color-text-muted)] font-mono border-t border-[var(--color-border)] flex justify-between">
                          <span>DECIMALS: {form.decimals || "18"}</span>
                          <span>Min Invest: {form.minInvestment ? `${form.minInvestment} ${form.mainCurrency}` : "None"}</span>
                       </div>
                   </div>
                </div>
             </div>
          </div>
      </div>

      {/* --- SECTION 4: TOKEN LIST GRID --- */}
      <div className="mt-8">
        <h3 className="text-lg font-bold text-[var(--color-text)] mb-6 flex items-center gap-2">
            <svg className="w-5 h-5 text-[var(--color-primary)]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            Active Market Assets
        </h3>
        
        {loading ? (
            <div className="glass-panel p-10 text-center rounded-2xl animate-pulse">
                <div className="h-6 w-32 bg-white/10 rounded mx-auto mb-3" />
                <p className="text-[var(--color-text-muted)] text-sm">Loading market assets...</p>
            </div>
        ) : tokens.length === 0 ? (
            <div className="glass-panel p-10 text-center rounded-2xl border-dashed border-2 border-[var(--color-border)]">
                 <svg className="w-10 h-10 mx-auto text-[var(--color-text-muted)] opacity-50 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                 <h4 className="text-[var(--color-text)] font-bold mb-1">No Market Assets</h4>
                 <p className="text-sm text-[var(--color-text-muted)]">Configure and deploy your first asset above.</p>
            </div>
        ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {tokens.map((t) => (
                <div key={t.id} onClick={() => navigate('/token/' + t.id, { state: { token: t } })} className="glass-card p-6 rounded-2xl cursor-pointer hover:-translate-y-1 transition-all duration-300">
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] flex items-center justify-center text-white font-bold text-lg shadow-md">
                      {(t.symbol || '?').charAt(0)}
                    </div>
                    <div className="text-right">
                       <p className="text-xs font-bold text-[var(--color-primary)]">{t.pricePerToken ? `${t.pricePerToken} ${t.mainCurrency}` : "N/A"}</p>
                       <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider">{t.symbol}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[var(--color-text)] font-bold truncate">{t.name}</h4>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1 font-mono break-all">{t.id}</p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-[var(--color-border)] flex flex-col gap-1.5 text-[10px] text-[var(--color-text-muted)] font-semibold uppercase">
                      <div className="flex justify-between items-center">
                          <span>Wallet: {t.walletId.slice(0,6)}...{t.walletId.slice(-4)}</span>
                          <span>Decimals: {t.decimals}</span>
                      </div>
                      {t.contractAddress && (
                        <div className="flex items-center gap-1.5 bg-black/20 rounded-md p-1.5 mt-1 text-[var(--color-primary)]">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                            <span className="font-mono tracking-widest break-all">On-Chain: {t.contractAddress.slice(0, 10)}...</span>
                        </div>
                      )}
                  </div>
                </div>
              ))}
            </div>
        )}
      </div>
    </div>
  );
}
