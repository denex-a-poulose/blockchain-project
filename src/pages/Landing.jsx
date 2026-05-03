import { useTenant } from "../contexts/TenantContext";
import { useNavigate } from "react-router-dom";
import TenantSwitcher from "../components/TenantSwitcher";
import TenantDashboard from "./TenantDashboard";
import WalletManager from "../components/WalletManager";
import TokenMarket from "./TokenMarket";
import Navbar from "../components/Navbar";
import Sidebar from "../components/Sidebar";
import TokenDetailView from "../components/TokenDetailView";
import OrdersList from "../components/OrdersList";
import UsersList from "../components/UsersList";
import { useState } from "react";

export default function Landing() {
  const { tenants, currentTenant, loading } = useTenant();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-surface-alt)]">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        {currentTenant && tenants.length > 0 && (
           <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
        )}
        <main className="flex-1 overflow-y-auto py-8 px-4 w-full">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
          </div>
        ) : tenants.length === 0 ? (
          /* No tenants — prompt to create */
          <div className="flex items-center justify-center h-64">
            {/* ... contents same ... */}
            <div className="text-center max-w-sm">
              <div className="w-14 h-14 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
              </div>
              <h2 className="text-lg font-semibold text-[var(--color-text)] mb-1">No organizations yet</h2>
              <p className="text-sm text-[var(--color-text-muted)] mb-5">Create an organization to get started with your blockchain project.</p>
              <button onClick={() => navigate("/create-tenant")} className="btn-primary w-auto inline-flex items-center gap-2 px-5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                Create organization
              </button>
            </div>
          </div>
        ) : currentTenant ? (
          (() => {
            if (activeTab === "overview") return <TenantDashboard />;
            if (activeTab === "wallets") return <WalletManager />;
            if (activeTab === "tokenMarket") return <TokenMarket />;
            if (activeTab === "orders") return <OrdersList tenantId={currentTenant.id} />;
            if (activeTab === "users") return <UsersList tenantId={currentTenant.id} />;
            if (activeTab.startsWith("token-")) {
              const tokenId = activeTab.replace("token-", "");
              return <TokenDetailView tokenId={tokenId} onBack={() => setActiveTab("overview")} />;
            }
            return <div>Placeholder</div>;
          })()
        ) : null}
        </main>
      </div>
    </div>
  );
}
