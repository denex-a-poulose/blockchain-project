import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTenant } from "../contexts/TenantContext";

const CURRENCIES = [
  { code: "USD", label: "USD — US Dollar" },
  { code: "EUR", label: "EUR — Euro" },
  { code: "BTC", label: "BTC — Bitcoin" },
  { code: "ETH", label: "ETH — Ethereum" },
];

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "zh", label: "Chinese" },
  { code: "ja", label: "Japanese" },
  { code: "hi", label: "Hindi" },
  { code: "ar", label: "Arabic" },
  { code: "pt", label: "Portuguese" },
  { code: "ko", label: "Korean" },
];

export default function CreateTenant() {
  const [formData, setFormData] = useState({
    name: "",
    businessId: "",
    description: "",
    currency: "USD",
    country: "",
    language: "en",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { createTenant } = useTenant();
  const navigate = useNavigate();

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (!formData.name.trim()) {
      return setError("Organization name is required.");
    }
    if (!formData.businessId.trim()) {
      return setError("Business ID is required.");
    }

    setLoading(true);
    try {
      await createTenant(formData);
      navigate("/");
    } catch (err) {
      setError(err.message || "Failed to create organization.");
    }
    setLoading(false);
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="auth-card" style={{ maxWidth: 480 }}>
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-text)]">
            Create an organization
          </h1>
          <p className="mt-1.5 text-sm text-[var(--color-text-muted)]">
            Set up your organization details
          </p>
        </div>

        {error && <div className="error-message mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Organization Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-[var(--color-text)] mb-1.5"
            >
              Organization name <span className="text-[var(--color-error)]">*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              className="input-field"
              placeholder="e.g. Acme Corp"
              value={formData.name}
              onChange={handleChange}
              required
              autoFocus
            />
          </div>

          {/* Business ID */}
          <div>
            <label
              htmlFor="businessId"
              className="block text-sm font-medium text-[var(--color-text)] mb-1.5"
            >
              Business ID <span className="text-[var(--color-error)]">*</span>
            </label>
            <input
              id="businessId"
              name="businessId"
              type="text"
              className="input-field"
              placeholder="e.g. ACME-001 or registration number"
              value={formData.businessId}
              onChange={handleChange}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-[var(--color-text)] mb-1.5"
            >
              Description
            </label>
            <textarea
              id="description"
              name="description"
              className="input-field"
              style={{ minHeight: 80, resize: "vertical" }}
              placeholder="Brief description of your organization"
              value={formData.description}
              onChange={handleChange}
              rows={3}
            />
          </div>

          {/* Currency & Country — side by side */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="currency"
                className="block text-sm font-medium text-[var(--color-text)] mb-1.5"
              >
                Currency
              </label>
              <select
                id="currency"
                name="currency"
                className="input-field"
                value={formData.currency}
                onChange={handleChange}
              >
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="country"
                className="block text-sm font-medium text-[var(--color-text)] mb-1.5"
              >
                Country
              </label>
              <input
                id="country"
                name="country"
                type="text"
                className="input-field"
                placeholder="e.g. India"
                value={formData.country}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Language */}
          <div>
            <label
              htmlFor="language"
              className="block text-sm font-medium text-[var(--color-text)] mb-1.5"
            >
              Language
            </label>
            <select
              id="language"
              name="language"
              className="input-field"
              value={formData.language}
              onChange={handleChange}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="btn-primary mt-2"
            disabled={loading}
          >
            {loading ? "Creating…" : "Create organization"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => navigate("/")}
          className="mt-4 w-full text-center text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors cursor-pointer"
        >
          ← Back to dashboard
        </button>
      </div>
    </div>
  );
}
