import {
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebase";

/**
 * @typedef {Object} UserProfile
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {import('firebase/firestore').Timestamp} createdAt
 */

/**
 * Creates a user profile document in Firestore.
 * Document ID = user.uid to avoid duplicates.
 * Skips creation if the document already exists.
 *
 * @param {import('firebase/auth').User} user - Firebase Auth user object
 * @param {string} [name] - Optional name override (from signup form)
 * @returns {Promise<UserProfile>} The user profile data
 */
export async function createUserProfile(user, name) {
  if (!user) throw new Error("User is required to create a profile.");

  const userRef = doc(db, "tenant_users", user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return /** @type {UserProfile} */ (userSnap.data());
  }

  /** @type {UserProfile} */
  const profileData = {
    id: user.uid,
    name: name || user.displayName || "",
    email: user.email || "",
    createdAt: serverTimestamp(),
  };

  await setDoc(userRef, profileData);
  return profileData;
}

/**
 * Fetches a user profile from Firestore by UID.
 *
 * @param {string} userId - The user's UID
 * @returns {Promise<UserProfile|null>} The user profile or null if not found
 */
export async function getUserProfile(userId) {
  if (!userId) throw new Error("userId is required.");

  const userRef = doc(db, "tenant_users", userId);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists()) return null;
  return /** @type {UserProfile} */ (userSnap.data());
}
