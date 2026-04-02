import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  getRedirectResult,
  signInWithRedirect,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase";
import { createUserProfile } from "../services/userService";
import { processPendingInvitations } from "../services/tenantService";

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function signup(email, password, name) {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    // Create Firestore user profile + process any pending invitations
    await createUserProfile(result.user, name);
    await processPendingInvitations(result.user);
    return result;
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  /** Full-page redirect — avoids Cross-Origin-Opener-Policy / popup issues with Google sign-in. */
  function loginWithGoogle() {
    return signInWithRedirect(auth, googleProvider);
  }

  function logout() {
    return signOut(auth);
  }

  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email);
  }

  useEffect(() => {
    let unsubscribe = () => {};
    let cancelled = false;

    (async () => {
      try {
        const redirectResult = await getRedirectResult(auth);
        if (cancelled) return;
        if (redirectResult?.user) {
          await createUserProfile(redirectResult.user);
          await processPendingInvitations(redirectResult.user);
        }
      } catch (e) {
        console.error("Google redirect sign-in error:", e);
      }
      if (cancelled) return;

      unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          try {
            await createUserProfile(user);
          } catch (error) {
            console.error("Failed to ensure user profile:", error);
          }
        }
        setCurrentUser(user);
        setLoading(false);
      });
    })();

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  const value = {
    currentUser,
    signup,
    login,
    loginWithGoogle,
    logout,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
