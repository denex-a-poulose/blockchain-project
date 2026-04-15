import { useLocation, useNavigate, useParams } from "react-router-dom";
import { useTenant } from "../contexts/TenantContext";
import Navbar from "../components/Navbar";
import TokenDetailView from "../components/TokenDetailView";

export default function TokenDetails() {
  const { tokenId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentTenant } = useTenant();
  
  if (!currentTenant) {
    return (
      <div className="min-h-screen bg-[var(--color-surface-alt)]">
        <Navbar />
        <div className="flex items-center justify-center h-64">
           <p className="text-[var(--color-text-muted)]">Please select an organization first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--color-surface-alt)]">
      <Navbar />
      <main className="flex-1 overflow-y-auto py-10 px-4 w-full">
        <TokenDetailView 
          tokenId={tokenId} 
          initialToken={location.state?.token} 
          onBack={() => navigate('/')} 
        />
      </main>
    </div>
  );
}
