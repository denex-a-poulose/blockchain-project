import { useState, useEffect } from "react";
import { useTenant } from "../contexts/TenantContext";
import { getTenantTokens, createToken } from "../services/tokenService";

export default function TokenCreation() {
  const { currentTenant } = useTenant();
  const [tokens, setTokens] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [form, setForm] = useState({
    name: "",
    symbol: "",
    decimals: "18",
    totalSupply: "",
    description: "",
  });

  useEffect(() => {
    if (currentTenant?.id) loadTokens();
  }, [currentTenant?.id]);

  async function loadTokens() {
    setLoading(true);
    try {
      const data = await getTenantTokens(currentTenant.id);
      setTokens(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setTokens([]);
    }
    setLoading(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage({ type: "", text: "" });
    if (!form.name.trim() || !form.symbol.trim()) {
      setMessage({ type: "error", text: "Name and symbol are required." });
      return;
    }
    setSaving(true);
    try {
      await createToken(currentTenant.id, {
        name: form.name.trim(),
        symbol: form.symbol.trim(),
        decimals: form.decimals,
        totalSupply: form.totalSupply,
        description: form.description,
      });
      setMessage({ type: "success", text: "Token definition saved for this organization." });
      setForm({
        name: "",
        symbol: "",
        decimals: "18",
        totalSupply: "",
        description: "",
      });
      await loadTokens();
    } catch (err) {
      setMessage({ type: "error", text: err.message || "Failed to create token." });
    }
    setSaving(false);
  }

  if (!currentTenant) return null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-[var(--color-text)]">Tokens</h2>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          Create token definitions for this organization (metadata stored in your workspace; deploy on-chain separately).
        </p>
      </div>

      {message.text && (
        <div
          className={`mb-6 px-4 py-3 rounded-xl text-sm font-medium ${
            message.type === "success" ? "success-banner" : "error-message"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6 mb-6">
        <h3 className="text-sm font-semibold text-[var(--color-text)] mb-4">Create token</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Name</label>
            <input
              className="input-field"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Acme Reward Token"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Symbol</label>
              <input
                className="input-field"
                value={form.symbol}
                onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value }))}
                placeholder="e.g. ACM"
                maxLength={12}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Decimals</label>
              <input
                type="number"
                min={0}
                max={30}
                className="input-field"
                value={form.decimals}
                onChange={(e) => setForm((f) => ({ ...f, decimals: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">
              Total supply (string)
            </label>
            <input
              className="input-field"
              value={form.totalSupply}
              onChange={(e) => setForm((f) => ({ ...f, totalSupply: e.target.value }))}
              placeholder="e.g. 1000000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-1.5">Description</label>
            <textarea
              className="input-field"
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional notes"
            />
          </div>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save token"}
          </button>
        </form>
      </div>

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--color-border)]">
          <h3 className="text-sm font-semibold text-[var(--color-text)]">
            Organization tokens ({tokens.length})
          </h3>
        </div>
        {loading ? (
          <div className="px-6 py-8 text-center text-sm text-[var(--color-text-muted)]">Loading…</div>
        ) : tokens.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-[var(--color-text-muted)]">
            No tokens yet. Create one above.
          </div>
        ) : (
          <div>
            {tokens.map((t) => (
              <div
                key={t.id || t.tokenId}
                className="px-6 py-4 border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-surface-alt)] transition-colors"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-[var(--color-text)]">{t.name}</p>
                    <span className="text-xs font-mono text-[var(--color-primary)]">{t.symbol}</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Token ID: <span className="font-mono text-[var(--color-text)]">{t.tokenId}</span>
                  </p>
                  <p className="text-xs text-[var(--color-text-muted)]">
                    Decimals {t.decimals}
                    {t.totalSupply ? ` · Supply ${t.totalSupply}` : ""}
                  </p>
                  {t.description && (
                    <p className="text-xs text-[var(--color-text-muted)] mt-1">{t.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
