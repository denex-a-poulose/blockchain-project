import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import GoogleIcon from "../components/GoogleIcon";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(getErrorMessage(err.code));
    }
    setLoading(false);
  }

  async function handleGoogleSignIn() {
    setError("");
    setLoading(true);

    try {
      await loginWithGoogle();
      navigate("/");
    } catch (err) {
      setError(getErrorMessage(err.code));
    }
    setLoading(false);
  }

  function getErrorMessage(code) {
    switch (code) {
      case "auth/user-not-found":
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "Invalid email or password.";
      case "auth/too-many-requests":
        return "Too many attempts. Please try again later.";
      case "auth/popup-closed-by-user":
        return "Sign-in popup was closed.";
      default:
        return "Something went wrong. Please try again.";
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="auth-card">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">
            Welcome back
          </h1>
          <p className="mt-1.5 text-sm text-[var(--color-text-muted)]">
            Sign in to your account to continue
          </p>
        </div>

        {error && <div className="error-message mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-[var(--color-text)] mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              className="input-field"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[var(--color-text)] mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              className="input-field"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn-primary mt-2"
            disabled={loading}
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="divider my-6">or</div>

        <button
          type="button"
          className="btn-google"
          onClick={handleGoogleSignIn}
          disabled={loading}
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
          Don&apos;t have an account?{" "}
          <Link
            to="/signup"
            className="text-[var(--color-primary)] font-medium hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
