import {
  collection,
  addDoc,
  setDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db, auth } from "../firebase";

/**
 * @typedef {Object} Tenant
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string} currency
 * @property {string} country
 * @property {string} language
 * @property {string} createdBy
 * @property {import('firebase/firestore').Timestamp} createdAt
 */

/**
 * @typedef {Object} TenantInput
 * @property {string} id
 * @property {string} name
 * @property {string} [description]
 * @property {string} currency
 * @property {string} country
 * @property {string} language
 */

/**
 * @typedef {Object} UserTenant
 * @property {string} id
 * @property {string} userId
 * @property {string} tenantId
 * @property {"admin"|"member"|"owner"} role
 * @property {import('firebase/firestore').Timestamp} joinedAt
 */

/**
 * Creates a new tenant and automatically creates an admin membership
 * for the current authenticated user.
 *
 * @param {TenantInput} tenantData - The tenant data
 * @returns {Promise<Tenant>} The created tenant object with ID
 * @throws {Error} If user is not authenticated or Firestore operation fails
 */
export async function createTenant(tenantData) {
  const user = auth.currentUser;
  if (!user) throw new Error("User must be authenticated to create a tenant.");

  const { id, name, description, currency, country, language } = tenantData;

  if (!name || !name.trim()) throw new Error("Tenant name is required.");
  if (!id || !id.trim()) throw new Error("Organization ID is required.");
  
  const formattedId = id.trim();
  if (!/^[a-zA-Z0-9-]+$/.test(formattedId)) {
    throw new Error("Organization ID can only contain letters, numbers, and hyphens.");
  }

  try {
    const tenantDocRef = doc(db, "tenants", formattedId);
    const tenantSnap = await getDoc(tenantDocRef);
    if (tenantSnap.exists()) {
      throw new Error("This organization ID is already taken. Please choose another one.");
    }

    // Create tenant document
    await setDoc(tenantDocRef, {
      id: formattedId,
      name: name.trim(),
      description: description?.trim() || "",
      currency: currency || "USD",
      country: country || "",
      language: language || "en",
      createdBy: user.uid,
      createdAt: serverTimestamp(),
    });

    // Create admin membership (avoid duplicates by checking first)
    const existing = await checkMembership(user.uid, formattedId);
    if (!existing) {
      const memberRef = doc(collection(db, "user_tenants"));
      await setDoc(memberRef, {
        id: memberRef.id,
        userId: user.uid,
        tenantId: formattedId,
        role: "admin",
        joinedAt: serverTimestamp(),
      });
    }

    return {
      id: formattedId,
      name: name.trim(),
      description: description?.trim() || "",
      currency,
      country,
      language,
      createdBy: user.uid,
      createdAt: null,
    };
  } catch (error) {
    if (error.message.includes("already taken") || error.message.includes("contain letters")) {
      throw error;
    }
    console.error("Failed to create tenant:", error);
    throw new Error("Failed to create tenant. Please try again.");
  }
}

/**
 * Fetches all tenants that a user belongs to.
 * Queries user_tenants by userId, then fetches each tenant document.
 *
 * @param {string} userId - The user's UID
 * @returns {Promise<Array<Tenant & { role: string }>>} Array of tenant objects with role
 * @throws {Error} If userId is missing or Firestore operation fails
 */
export async function getUserTenants(userId) {
  if (!userId) throw new Error("userId is required.");

  try {
    // Query user_tenants for this user
    const q = query(
      collection(db, "user_tenants"),
      where("userId", "==", userId)
    );
    const membershipSnap = await getDocs(q);

    if (membershipSnap.empty) return [];

    // Fetch each tenant document
    const tenants = await Promise.all(
      membershipSnap.docs.map(async (memberDoc) => {
        const { tenantId, role } = memberDoc.data();
        const tenantRef = doc(db, "tenants", tenantId);
        const tenantSnap = await getDoc(tenantRef);

        if (!tenantSnap.exists()) return null;

        return {
          id: tenantSnap.id,
          ...tenantSnap.data(),
          role,
        };
      })
    );

    // Filter out any null entries (deleted tenants)
    return tenants.filter(Boolean);
  } catch (error) {
    console.error("Failed to fetch user tenants:", error);
    throw new Error("Failed to load tenants. Please try again.");
  }
}

/**
 * Fetches all members of a tenant with their user profiles.
 *
 * @param {string} tenantId - The tenant ID
 * @returns {Promise<Array<{ userId: string, role: string, email: string, name: string, joinedAt: any }>>}
 */
export async function getTenantMembers(tenantId) {
  if (!tenantId) throw new Error("tenantId is required.");

  try {
    const q = query(
      collection(db, "user_tenants"),
      where("tenantId", "==", tenantId)
    );
    const memberSnap = await getDocs(q);

    if (memberSnap.empty) return [];

    const members = await Promise.all(
      memberSnap.docs.map(async (memberDoc) => {
        const { userId, role, joinedAt } = memberDoc.data();
        const userRef = doc(db, "tenant_users", userId);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.exists() ? userSnap.data() : {};

        return {
          membershipId: memberDoc.id,
          userId,
          role,
          joinedAt,
          email: userData.email || "Unknown",
          name: userData.name || "Unknown",
        };
      })
    );

    return members;
  } catch (error) {
    console.error("Failed to fetch tenant members:", error);
    throw new Error("Failed to load members. Please try again.");
  }
}

/**
 * Invites a user to a tenant by email.
 * If the user exists, creates membership directly.
 * If not, creates a pending invitation.
 *
 * @param {string} tenantId - The tenant ID
 * @param {string} email - The email to invite
 * @param {"admin"|"member"} role - The role to assign
 * @returns {Promise<{ status: "joined"|"pending", email: string }>}
 */
export async function inviteUserToTenant(tenantId, email, role = "member") {
  const user = auth.currentUser;
  if (!user) throw new Error("User must be authenticated to invite members.");

  if (!email || !email.trim()) throw new Error("Email is required.");

  try {
    // Check if user with this email exists in tenant_users collection
    const usersQuery = query(
      collection(db, "tenant_users"),
      where("email", "==", email.trim())
    );
    const usersSnap = await getDocs(usersQuery);

    if (!usersSnap.empty) {
      // User exists — create direct membership
      const targetUser = usersSnap.docs[0];
      const targetUserId = targetUser.id;

      // Check for existing membership
      const existing = await checkMembership(targetUserId, tenantId);
      if (existing) {
        throw new Error("User is already a member of this tenant.");
      }

      const memberRef = doc(collection(db, "user_tenants"));
      await setDoc(memberRef, {
        id: memberRef.id,
        userId: targetUserId,
        tenantId,
        role,
        joinedAt: serverTimestamp(),
        invitedBy: user.uid,
      });

      return { status: "joined", email: email.trim() };
    } else {
      // User doesn't exist — create pending invitation
      // Check for existing pending invite
      const pendingQuery = query(
        collection(db, "pending_invitations"),
        where("email", "==", email.trim()),
        where("tenantId", "==", tenantId)
      );
      const pendingSnap = await getDocs(pendingQuery);

      if (!pendingSnap.empty) {
        throw new Error("An invitation has already been sent to this email.");
      }

      await addDoc(collection(db, "pending_invitations"), {
        email: email.trim(),
        tenantId,
        role,
        invitedBy: user.uid,
        createdAt: serverTimestamp(),
      });

      return { status: "pending", email: email.trim() };
    }
  } catch (error) {
    if (error.message.includes("already")) throw error;
    console.error("Failed to invite user:", error);
    throw new Error("Failed to send invitation. Please try again.");
  }
}

/**
 * Removes a member from a tenant.
 *
 * @param {string} membershipId - The user_tenants document ID
 * @returns {Promise<void>}
 */
export async function removeMember(membershipId) {
  const user = auth.currentUser;
  if (!user) throw new Error("User must be authenticated.");

  try {
    const { deleteDoc } = await import("firebase/firestore");
    const memberRef = doc(db, "user_tenants", membershipId);
    await deleteDoc(memberRef);
  } catch (error) {
    console.error("Failed to remove member:", error);
    throw new Error("Failed to remove member. Please try again.");
  }
}

/**
 * Processes pending invitations for a newly registered user.
 * Called after user signs up — checks if any invitations exist for their email.
 *
 * @param {import('firebase/auth').User} user - The authenticated user
 * @returns {Promise<number>} Number of invitations processed
 */
export async function processPendingInvitations(user) {
  if (!user || !user.email) return 0;

  try {
    const q = query(
      collection(db, "pending_invitations"),
      where("email", "==", user.email)
    );
    const inviteSnap = await getDocs(q);

    if (inviteSnap.empty) return 0;

    const { deleteDoc } = await import("firebase/firestore");

    let processed = 0;
    for (const inviteDoc of inviteSnap.docs) {
      const { tenantId, role, invitedBy } = inviteDoc.data();

      // Check if membership already exists
      const existing = await checkMembership(user.uid, tenantId);
      if (!existing) {
        const memberRef = doc(collection(db, "user_tenants"));
        await setDoc(memberRef, {
          id: memberRef.id,
          userId: user.uid,
          tenantId,
          role,
          joinedAt: serverTimestamp(),
          invitedBy,
        });
        processed++;
      }

      // Delete the pending invitation
      await deleteDoc(doc(db, "pending_invitations", inviteDoc.id));
    }

    return processed;
  } catch (error) {
    console.error("Failed to process pending invitations:", error);
    return 0;
  }
}

/**
 * Checks if a membership already exists for a user-tenant pair.
 *
 * @param {string} userId
 * @param {string} tenantId
 * @returns {Promise<boolean>}
 */
async function checkMembership(userId, tenantId) {
  const q = query(
    collection(db, "user_tenants"),
    where("userId", "==", userId),
    where("tenantId", "==", tenantId)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}
