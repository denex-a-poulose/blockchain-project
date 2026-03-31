import { auth } from "../firebase";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

/**
 * Creates or fetches a user profile via the backend API.
 *
 * @param {import('firebase/auth').User} user - Firebase Auth user object
 * @param {string} [name] - Optional name override (from signup form)
 * @returns {Promise<any>} The user profile data
 */
export async function createUserProfile(user, name) {
  if (!user) throw new Error("User is required to create a profile.");

  const token = await user.getIdToken();
  const res = await fetch(`${API_URL}/users/profile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ name: name || user.displayName || "" })
  });

  if (!res.ok) {
    throw new Error("Failed to create or fetch user profile");
  }

  return res.json();
}

/**
 * Fetches a user profile from the backend API by UID.
 *
 * @param {string} userId - The user's UID
 * @returns {Promise<any|null>} The user profile or null if not found
 */
export async function getUserProfile(userId) {
  if (!userId) throw new Error("userId is required.");
  
  const currentUser = auth.currentUser;
  if (!currentUser) return null;

  const token = await currentUser.getIdToken();
  const res = await fetch(`${API_URL}/users/${userId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error("Failed to fetch user profile");
  }

  return res.json();
}
