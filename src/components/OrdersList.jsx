import { useState, useEffect } from "react";
import { getTenantOrders, fulfillOrder } from "../services/paymentService";
import { getTenantTokens } from "../services/tokenService";
import { ShoppingBag, Clock, CheckCircle2, User, Wallet, ExternalLink, Pickaxe } from "lucide-react";
import { useAccount, useWalletClient, usePublicClient, useSwitchChain } from "wagmi";
import { parseUnits } from "viem";

export default function OrdersList({ tenantId }) {
  const [orders, setOrders] = useState([]);
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState({});

  const { address, isConnected, chain } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { switchChain } = useSwitchChain();

  useEffect(() => {
    if (tenantId) {
      loadOrders();
    }
  }, [tenantId]);

  async function loadOrders() {
    setLoading(true);
    try {
      const [ordersData, tokensData] = await Promise.all([
        getTenantOrders(tenantId),
        getTenantTokens(tenantId)
      ]);
      setOrders(ordersData);
      setTokens(tokensData || []);
    } catch (err) {
      console.error("Failed to load orders:", err);
    }
    setLoading(false);
  }

  async function handleMint(order) {
    if (!isConnected || !walletClient) {
      alert("Please connect your wallet first.");
      return;
    }

    // Ensure we are on Sepolia (Chain ID: 11155111)
    if (chain?.id !== 11155111) {
      if (window.confirm("You are not on the Sepolia Testnet. Would you like to switch now?")) {
        try {
          await switchChain({ chainId: 11155111 });
        } catch (e) {
          return alert("Please switch your MetaMask to Sepolia Testnet to continue.");
        }
      } else {
        return;
      }
    }

    const token = tokens.find(t => t.id === order.tokenId);
    if (!token) {
      alert("Token configuration not found for this order.");
      return;
    }
    if (!token.contractAddress) {
      alert("This token has not been deployed to the blockchain yet. Please deploy it from the Token Market first.");
      return;
    }

    setActionLoading(prev => ({ ...prev, [order.id]: "Awaiting MetaMask..." }));
    try {
      const abi = typeof token.abi === 'string' ? JSON.parse(token.abi) : token.abi;
      
      // Calculate amount in wei
      const quantityWei = parseUnits(order.quantity.toString(), parseInt(token.decimals || 18));

      const txHash = await walletClient.writeContract({
        address: token.contractAddress,
        abi,
        functionName: 'mint',
        args: [order.walletAddress, quantityWei]
      });

      setActionLoading(prev => ({ ...prev, [order.id]: "Confirming on-chain..." }));
      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
      
      if (receipt.status === 'reverted') {
        throw new Error("Transaction reverted on-chain.");
      }

      setActionLoading(prev => ({ ...prev, [order.id]: "Updating status..." }));
      await fulfillOrder(order.id, txHash);
      
      await loadOrders();
    } catch (err) {
      console.error("Minting failed:", err);
      alert("Failed to mint tokens: " + (err.message || "Unknown error"));
    } finally {
      setActionLoading(prev => ({ ...prev, [order.id]: null }));
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-sm text-[var(--color-text-muted)] animate-pulse">Loading orders…</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="glass-panel rounded-3xl p-12 text-center">
        <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 opacity-20">
          <ShoppingBag className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold mb-1">No orders yet</h3>
        <p className="text-sm text-[var(--color-text-muted)]">Your token sales will appear here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-2 px-2">
        <h3 className="text-lg font-bold">Recent Orders</h3>
        <button onClick={loadOrders} className="text-xs text-[var(--color-primary)] hover:underline font-bold uppercase tracking-widest">Refresh</button>
      </div>

      <div className="grid gap-4">
        {orders.map((order) => (
          <div key={order.id} className="glass-panel rounded-[1.5rem] p-6 hover:bg-white/[0.02] transition-colors border border-white/5 group">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              
              {/* Left: Info */}
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  order.status === 'paid' ? 'bg-amber-500/10 text-amber-400' :
                  (order.status === 'minted' || order.status === 'fulfilled') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'
                }`}>
                  {(order.status === 'minted' || order.status === 'fulfilled') ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                </div>
                <div>
                  <h4 className="font-bold text-[var(--color-text)] flex items-center gap-2">
                    {order.tokenName || "Unknown Token"}
                    <span className="px-2 py-0.5 rounded-md bg-white/5 text-[10px] uppercase tracking-widest text-[var(--color-text-muted)]">
                      {order.quantity} Units
                    </span>
                  </h4>
                  <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1.5 mt-1">
                    <User className="w-3 h-3" /> {order.buyerId?.slice(0, 8)}...
                    <span className="opacity-30">•</span>
                    <Clock className="w-3 h-3" /> {order.createdAt ? new Date(order.createdAt._seconds * 1000).toLocaleString() : 'Just now'}
                  </p>
                </div>
              </div>

              {/* Middle: Wallet */}
              <div className="lg:max-w-[200px]">
                <p className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-widest mb-1 opacity-50">Target Wallet</p>
                <div className="flex items-center gap-2 text-xs font-mono text-[var(--color-text-muted)] group-hover:text-white transition-colors">
                  <Wallet className="w-3 h-3 text-[var(--color-primary)]" />
                  {order.walletAddress?.slice(0, 6)}...{order.walletAddress?.slice(-4)}
                </div>
              </div>

              {/* Right: Amount & Status & Action */}
              <div className="flex items-center justify-between lg:justify-end gap-6 border-t lg:border-t-0 pt-4 lg:pt-0">
                <div className="text-left lg:text-right">
                  <p className="text-[10px] text-[var(--color-text-muted)] font-bold uppercase tracking-widest mb-0.5 opacity-50">Amount</p>
                  <p className="text-lg font-black text-white">${order.totalPrice?.toFixed(2)}</p>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-widest border ${
                      (order.status === 'minted' || order.status === 'fulfilled') ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 
                      order.status === 'paid' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 
                      'bg-blue-500/10 border-blue-500/20 text-blue-400'
                    }`}>
                      {order.status === 'fulfilled' ? 'minted' : order.status}
                    </div>
                    <a 
                      href={`https://dashboard.stripe.com/test/payments/${order.paymentId}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl transition-all text-[var(--color-text-muted)]"
                      title="View on Stripe"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                  
                  {order.status === 'paid' && (
                    <button 
                      onClick={() => handleMint(order)}
                      disabled={!!actionLoading[order.id]}
                      className="btn-primary py-2 px-4 text-xs flex items-center gap-2 shadow-lg shadow-[var(--color-primary)]/20 disabled:opacity-50"
                    >
                      {actionLoading[order.id] ? (
                        <span className="animate-pulse">{actionLoading[order.id]}</span>
                      ) : (
                        <> <Pickaxe className="w-3.5 h-3.5" /> Allocate Tokens </>
                      )}
                    </button>
                  )}
                  {(order.status === 'minted' || order.status === 'fulfilled') && order.mintTxHash && (
                    <a 
                      href={`https://sepolia.etherscan.io/tx/${order.mintTxHash}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-[10px] text-emerald-400/70 hover:text-emerald-400 underline decoration-emerald-400/30 underline-offset-2 flex items-center gap-1"
                    >
                      View Mint Tx <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  )}
                </div>
              </div>

            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
