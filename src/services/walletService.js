import { auth } from "../firebase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function fetchWithAuth(endpoint, options = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("User must be authenticated.");

  const token = await user.getIdToken();
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "API request failed");
  }

  return data;
}

export async function getTenantWallets(tenantId) {
  return await fetchWithAuth(`/wallets/${tenantId}`);
}

export async function addWallet(tenantId, walletAddress) {
  return await fetchWithAuth(`/wallets/${tenantId}`, {
    method: "POST",
    body: JSON.stringify({ walletAddress }),
  });
}

export async function getNonce(tenantId, walletAddress) {
  const data = await fetchWithAuth(`/wallets/${tenantId}/nonce/${walletAddress}`);
  return data.nonce;
}

export async function verifyWallet(tenantId, walletAddress, signature) {
  return await fetchWithAuth(`/wallets/${tenantId}/verify`, {
    method: "POST",
    body: JSON.stringify({ walletAddress, signature }),
  });
}
