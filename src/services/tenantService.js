import { auth } from "../firebase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/**
 * Helper to execute authorized API requests to the Node.js backend
 */
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

export async function createTenant(tenantData) {
  return await fetchWithAuth("/tenants", {
    method: "POST",
    body: JSON.stringify(tenantData),
  });
}

export async function getUserTenants() {
  return await fetchWithAuth("/tenants");
}

export async function getTenantMembers(tenantId) {
  return await fetchWithAuth(`/tenants/${tenantId}/members`);
}

export async function getTenantInvestors(tenantId) {
  return await fetchWithAuth(`/tenants/${tenantId}/investors`);
}

export async function inviteUserToTenant(tenantId, email, role = "member") {
  return await fetchWithAuth(`/tenants/${tenantId}/invite`, {
    method: "POST",
    body: JSON.stringify({ email, role }),
  });
}

export async function removeMember(membershipId) {
  return await fetchWithAuth(`/tenants/membership/${membershipId}`, {
    method: "DELETE",
  });
}

// Automatically process any invites sent before the user signed up
export async function processPendingInvitations() {
  return await fetchWithAuth("/tenants/invitations/process", {
    method: "POST",
  });
}
