import { auth } from "../firebase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function fetchWithAuth(endpoint, options = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error("Authentication required");

  const token = await user.getIdToken();
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  const res = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Request failed");
  }
  return res.json();
}

export async function getTenantOrders(tenantId) {
  return fetchWithAuth(`/payments/orders/${tenantId}`);
}

export async function fulfillOrder(orderId, txHash) {
  return fetchWithAuth(`/payments/orders/${orderId}/fulfill`, {
    method: 'PATCH',
    body: JSON.stringify({ txHash })
  });
}
