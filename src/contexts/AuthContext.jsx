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
    // Fire-and-forget profile creation — don't block auth navigation
    createUserProfile(result.user, name).catch((err) =>
      console.error("Background profile creation failed:", err)
    );
    processPendingInvitations(result.user).catch((err) =>
      console.error("Background invitation processing failed:", err)
    );
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
    // Set up the auth state listener IMMEDIATELY so we never miss a
    // state change (e.g. after email/password sign-in).
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      // Set currentUser RIGHT AWAY — never block on network calls.
      setCurrentUser(user);
      setLoading(false);

      // Profile creation happens in the background; if the backend is
      // down the user still gets into the app.
      if (user) {
        createUserProfile(user).catch((err) =>
          console.error("Failed to ensure user profile:", err)
        );
      }
    });

    // Handle any pending Google redirect result in the background.
    getRedirectResult(auth)
      .then(async (redirectResult) => {
        if (redirectResult?.user) {
          try {
            await createUserProfile(redirectResult.user);
            await processPendingInvitations(redirectResult.user);
          } catch (e) {
            console.error("Error processing redirect user:", e);
          }
        }
      })
      .catch((e) => {
        console.error("Google redirect sign-in error:", e);
      });

    return () => unsubscribe();
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
