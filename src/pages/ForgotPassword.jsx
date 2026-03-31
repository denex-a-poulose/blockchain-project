import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { resetPassword } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      await resetPassword(email);
      setMessage("Check your inbox for further instructions.");
    } catch (err) {
      setError(getErrorMessage(err.code));
    }
    setLoading(false);
  }

  function getErrorMessage(code) {
    switch (code) {
      case "auth/user-not-found":
        return "No account found with this email.";
      case "auth/invalid-email":
        return "Please enter a valid email address.";
      default:
        return "Failed to reset password. Please try again.";
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="auth-card">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">
            Reset Password
          </h1>
          <p className="mt-1.5 text-sm text-[var(--color-text-muted)]">
            Enter your email to receive a password reset link
          </p>
        </div>

        {error && <div className="error-message mb-4">{error}</div>}
        {message && (
          <div className="mb-4 rounded-lg bg-green-500/10 p-3 text-sm text-green-600 border border-green-500/20">
            {message}
          </div>
        )}

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

          <button
            type="submit"
            className="btn-primary mt-2"
            disabled={loading}
          >
            {loading ? "Sending link…" : "Send Reset Link"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
          Remember your password?{" "}
          <Link
            to="/login"
            className="text-[var(--color-primary)] font-medium hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
