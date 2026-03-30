import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAuth } from "./AuthContext";
import {
  getUserTenants,
  createTenant as createTenantService,
} from "../services/tenantService";

const TenantContext = createContext(null);

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}

export function TenantProvider({ children }) {
  const { currentUser } = useAuth();
  const [tenants, setTenants] = useState([]);
  const [currentTenant, setCurrentTenant] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load user's tenants when auth state changes
  const loadTenants = useCallback(async () => {
    if (!currentUser) {
      setTenants([]);
      setCurrentTenant(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const userTenants = await getUserTenants(currentUser.uid);
      setTenants(userTenants);

      // Restore last active tenant from localStorage, or pick first
      const savedTenantId = localStorage.getItem(`activeTenant_${currentUser.uid}`);
      const savedTenant = userTenants.find((t) => t.id === savedTenantId);
      setCurrentTenant(savedTenant || userTenants[0] || null);
    } catch (error) {
      console.error("Failed to load tenants:", error);
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    loadTenants();
  }, [loadTenants]);

  // Switch active tenant
  function switchTenant(tenantId) {
    const tenant = tenants.find((t) => t.id === tenantId);
    if (tenant) {
      setCurrentTenant(tenant);
      if (currentUser) {
        localStorage.setItem(`activeTenant_${currentUser.uid}`, tenantId);
      }
    }
  }

  // Create a new tenant and refresh the list
  async function createTenant(tenantData) {
    const newTenant = await createTenantService(tenantData);
    await loadTenants();
    switchTenant(newTenant.id);
    return newTenant;
  }

  const value = {
    tenants,
    currentTenant,
    loading,
    switchTenant,
    createTenant,
    refreshTenants: loadTenants,
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}
