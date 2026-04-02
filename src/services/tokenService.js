import { auth } from "../firebase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

async function parseResponseBody(res) {
  const raw = await res.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    const isHtml = raw.trimStart().startsWith("<!DOCTYPE") || raw.trimStart().startsWith("<html");
    throw new Error(
      isHtml
        ? "The API returned a web page instead of JSON. Check VITE_API_URL and backend deployment."
        : `Invalid JSON from server: ${raw.slice(0, 160)}`
    );
  }
}

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
  const data = await parseResponseBody(res);

  if (!res.ok) {
    throw new Error(data.error || "API request failed");
  }

  return data;
}

export async function getTenantTokens(tenantId) {
  return await fetchWithAuth(`/tokens/${tenantId}`);
}

export async function createToken(tenantId, payload) {
  return await fetchWithAuth(`/tokens/${tenantId}`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
