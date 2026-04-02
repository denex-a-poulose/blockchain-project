import { useState, useEffect } from "react";
import { useAccount, useConnect, useDisconnect, useSignMessage } from "wagmi";
import { injected } from "wagmi/connectors";
import { useTenant } from "../contexts/TenantContext";
import { getTenantWallets, addWallet, getNonce, verifyWallet } from "../services/walletService";

export default function WalletManager() {
  const { currentTenant } = useTenant();
  const { address, isConnected } = useAccount();
  const { connectors, connect, isPending: isConnectPending, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (currentTenant?.id) {
      loadWallets();
    }
  }, [currentTenant?.id]);

  async function loadWallets() {
    setLoading(true);
    try {
      const data = await getTenantWallets(currentTenant.id);
      setWallets(data);
    } catch (err) {
      console.error("Failed to load wallets:", err);
    }
    setLoading(false);
  }

  async function handleAddWallet() {
    if (!isConnected || !address) return;
    setMessage({ type: "", text: "" });
    try {
      await addWallet(currentTenant.id, address);
      setMessage({ type: "success", text: "Wallet added successfully. Please verify it to activate." });
      await loadWallets();
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Failed to add wallet." });
    }
  }

  async function handleVerifyWallet(walletAddress) {
    setMessage({ type: "", text: "" });
    try {
      // 1. Get nonce from backend
      const nonce = await getNonce(currentTenant.id, walletAddress);
      
      // 2. Format the SIWE message
      const signatureMessage = `Sign this message to link your wallet to ${currentTenant.name}.\n\nNonce: ${nonce}`;
      
      // 3. Request signature from MetaMask
      const signature = await signMessageAsync({ message: signatureMessage });
      
      // 4. Send signature to backend for verification
      await verifyWallet(currentTenant.id, walletAddress, signature);
      setMessage({ type: "success", text: "Wallet verified and activated successfully!" });
      await loadWallets();
    } catch (err) {
      console.error(err);
      setMessage({ type: "error", text: err.message || "Failed to verify wallet." });
    }
  }

  if (!currentTenant) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-[var(--color-text)]">Wallets</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Manage Web3 wallets registered to this organization.
        </p>
      </div>

      {message.text && (
        <div
          className={`mb-6 px-4 py-3 rounded-xl text-sm font-medium ${
            message.type === "success" ? "success-banner" : "error-message"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Connect MetaMask Card */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-3">
          Connect your Web3 Wallet
        </h3>
        {!isConnected ? (
          <div className="flex flex-col gap-3">
            <button
              onClick={() => connect({ connector: injected() })}
              disabled={isConnectPending}
              className="btn-primary w-auto inline-flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M21.5 10.5C21.5 10.5 19 6 12 6C5 6 2.5 10.5 2.5 10.5M21.5 10.5C21.5 10.5 19 15 12 15C5 15 2.5 10.5 2.5 10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 18.5V15M12 6V2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {isConnectPending ? "Connecting MetaMask..." : "Connect MetaMask"}
            </button>
            {connectors.length === 0 && (
              <p className="text-sm text-[var(--color-error)] mt-1">
                MetaMask not detected. Please install the MetaMask browser extension.
              </p>
            )}
            {connectError && (
              <div className="mt-2 p-3 rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-surface)]">
                <p className="text-sm font-semibold text-[var(--color-error)] mb-1">
                  Connection Failed
                </p>
                <p className="text-sm text-[var(--color-error)]/90 break-words">
                  {connectError.name === 'ProviderNotFoundError' || connectError.message.includes('Provider not found') 
                    ? "We couldn't detect MetaMask in your browser. If you don't have it installed, please install the official extension to continue." 
                    : connectError.shortMessage || connectError.message}
                </p>
                {(connectError.name === 'ProviderNotFoundError' || connectError.message.includes('Provider not found')) && (
                  <a 
                    href="https://metamask.io/download/" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="inline-block mt-2 text-sm font-medium text-[var(--color-primary)] hover:underline"
                  >
                    Download MetaMask &rarr;
                  </a>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between bg-[var(--color-surface-alt)] p-4 rounded-xl border border-[var(--color-border)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#f6851b] to-[#f4a940] flex items-center justify-center p-2 shadow-sm">
                 {/* Fake Metamask Fox Icon Base */}
                <div style={{width: 16, height: 16, backgroundColor: 'white', borderRadius: '50%'}} />
              </div>
              <div>
                <p className="text-xs text-[var(--color-text-muted)] font-medium uppercase tracking-wider mb-0.5">Connected Address</p>
                <p className="text-sm font-semibold text-[var(--color-text)] font-mono">
                  {address.substring(0, 6)}...{address.substring(address.length - 4)}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleAddWallet}
                className="btn-primary py-1.5 px-3 text-xs w-auto whitespace-nowrap"
              >
                Add to Organization
              </button>
              <button
                onClick={() => disconnect()}
                className="py-1.5 px-3 text-xs font-medium text-[var(--color-text-muted)] hover:text-[var(--color-error)] transition-colors border border-[var(--color-border)] rounded-lg hover:border-[var(--color-error)] cursor-pointer"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Wallets List */}
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)]">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">
            Registered Wallets ({wallets.length})
          </h3>
        </div>

        {loading ? (
          <div className="px-6 py-8 text-center text-sm text-[var(--color-text-muted)]">
            Loading wallets…
          </div>
        ) : wallets.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-[var(--color-text-muted)]">
            No wallets registered.
          </div>
        ) : (
          <div>
            {wallets.map((wallet) => (
              <div
                key={wallet.id || wallet.walletAddress}
                className="px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-surface-alt)] transition-colors"
              >
                <div>
                  <p className="text-sm font-semibold text-[var(--color-text)] font-mono">
                    {wallet.walletAddress}
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">
                    Added: {wallet.createdAt ? new Date(wallet.createdAt._seconds ? wallet.createdAt._seconds * 1000 : wallet.createdAt).toLocaleDateString() : 'Just now'}
                  </p>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${
                      wallet.status === "active"
                        ? "bg-[var(--color-success-bg)] text-[var(--color-success-text)] border-[var(--color-success-border)]"
                        : "bg-[var(--color-warning-bg)] text-[var(--color-warning-text)] border-[var(--color-warning-border)]"
                    }`}
                  >
                    {wallet.status}
                  </span>
                  
                  {wallet.status === "pending" && (
                     <button
                        onClick={() => handleVerifyWallet(wallet.walletAddress)}
                        className="text-xs font-semibold text-white bg-[var(--color-primary)] hover:opacity-90 px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-sm"
                     >
                       Verify
                     </button>
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
