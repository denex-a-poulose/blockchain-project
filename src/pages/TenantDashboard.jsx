import { useState, useEffect } from "react";
import { useTenant } from "../contexts/TenantContext";
import { useAuth } from "../contexts/AuthContext";
import {
  getTenantMembers,
  inviteUserToTenant,
  removeMember,
} from "../services/tenantService";

export default function TenantDashboard() {
  const { currentTenant, refreshTenants } = useTenant();
  const { currentUser } = useAuth();
  const [members, setMembers] = useState([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [loading, setLoading] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (currentTenant?.id) {
      loadMembers();
    }
  }, [currentTenant?.id]);

  async function loadMembers() {
    setLoading(true);
    try {
      const data = await getTenantMembers(currentTenant.id);
      setMembers(data);
    } catch (err) {
      console.error("Failed to load members:", err);
    }
    setLoading(false);
  }

  async function handleInvite(e) {
    e.preventDefault();
    setMessage({ type: "", text: "" });

    if (!inviteEmail.trim()) return;

    setInviteLoading(true);
    try {
      const result = await inviteUserToTenant(currentTenant.id, inviteEmail, inviteRole);
      if (result.status === "joined") {
        setMessage({ type: "success", text: `${result.email} has been added to the organization.` });
        await loadMembers();
      } else {
        setMessage({ type: "success", text: `Invitation sent to ${result.email}. They'll be added when they sign up.` });
      }
      setInviteEmail("");
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
    setInviteLoading(false);
  }

  async function handleRemoveMember(member) {
    if (member.userId === currentUser.uid) return;

    const confirm = window.confirm(`Remove ${member.name || member.email} from this organization?`);
    if (!confirm) return;

    try {
      await removeMember(member.membershipId);
      setMessage({ type: "success", text: `${member.email} has been removed.` });
      await loadMembers();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  if (!currentTenant) return null;

  const currentUserRole = currentTenant.role;
  const canManage = currentUserRole === "admin" || currentUserRole === "owner";

  return (
    <div className="max-w-2xl mx-auto animation-fade-in">
      {/* Tenant info */}
      <div className="glass-panel rounded-3xl p-8 mb-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[var(--color-primary)] to-indigo-500" />
        <div className="flex items-center gap-4 mb-6 pt-2">
          <div className="w-14 h-14 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-[var(--color-primary)]/30 rounded-2xl flex items-center justify-center text-[var(--color-primary)] text-xl font-bold shadow-[0_0_15px_rgba(139,92,246,0.15)]">
            {currentTenant.name?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-[var(--color-text)]">
              {currentTenant.name}
            </h2>
            <p className="text-xs text-[var(--color-text-muted)] capitalize">
              Your role: {currentUserRole}
            </p>
          </div>
        </div>

        {currentTenant.description && (
          <p className="text-sm text-[var(--color-text-muted)] mb-4">
            {currentTenant.description}
          </p>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {currentTenant.id && (
            <div className="bg-[var(--color-surface-alt)] rounded-lg px-3 py-2">
              <p className="text-xs text-[var(--color-text-muted)] mb-0.5">Organization ID</p>
              <p className="text-sm font-medium text-[var(--color-text)] truncate">{currentTenant.id}</p>
            </div>
          )}
          {currentTenant.currency && (
            <div className="bg-[var(--color-surface-alt)] rounded-lg px-3 py-2">
              <p className="text-xs text-[var(--color-text-muted)] mb-0.5">Currency</p>
              <p className="text-sm font-medium text-[var(--color-text)]">{currentTenant.currency}</p>
            </div>
          )}
          {currentTenant.country && (
            <div className="bg-[var(--color-surface-alt)] rounded-lg px-3 py-2">
              <p className="text-xs text-[var(--color-text-muted)] mb-0.5">Country</p>
              <p className="text-sm font-medium text-[var(--color-text)]">{currentTenant.country}</p>
            </div>
          )}
          {currentTenant.language && (
            <div className="bg-[var(--color-surface-alt)] rounded-lg px-3 py-2">
              <p className="text-xs text-[var(--color-text-muted)] mb-0.5">Language</p>
              <p className="text-sm font-medium text-[var(--color-text)] uppercase">{currentTenant.language}</p>
            </div>
          )}
        </div>
      </div>

      {/* Feedback message */}
      {message.text && (
        <div
          className={`mb-4 px-4 py-3 rounded-xl text-sm font-medium ${
            message.type === "success" ? "success-banner" : "error-message"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Invite form */}
      {canManage && (
        <div className="glass-panel rounded-3xl p-8 mb-8">
          <h3 className="text-lg font-bold text-[var(--color-text)] mb-1">
            Invite a Member
          </h3>
          <p className="text-xs text-[var(--color-text-muted)] mb-3">
            Enter their email. If they already have an account, they'll be added instantly. Otherwise, they'll be added when they sign up with that email.
          </p>
          <form onSubmit={handleInvite} className="flex gap-2">
            <input
              type="email"
              className="input-field flex-1"
              placeholder="colleague@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              required
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="input-field w-auto"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="submit"
              className="btn-primary w-auto whitespace-nowrap"
              disabled={inviteLoading}
            >
              {inviteLoading ? "…" : "Invite"}
            </button>
          </form>
        </div>
      )}

      {/* Members list */}
      <div className="glass-panel rounded-3xl overflow-hidden mb-8">
        <div className="px-8 py-5 border-b border-[var(--color-border)] bg-white/5">
          <h3 className="text-lg font-bold text-[var(--color-text)]">
            Members ({members.length})
          </h3>
        </div>

        {loading ? (
          <div className="px-6 py-8 text-center text-sm text-[var(--color-text-muted)]">
            Loading members…
          </div>
        ) : members.length === 0 ? (
          <div className="px-6 py-8 text-center text-sm text-[var(--color-text-muted)]">
            No members found.
          </div>
        ) : (
          <div>
            {members.map((member) => (
              <div
                key={member.membershipId}
                className="px-6 py-3 flex items-center justify-between border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-surface-alt)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-full flex items-center justify-center text-xs font-semibold text-[var(--color-text-muted)]">
                    {(member.name || member.email)?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text)]">
                      {member.name || "—"}
                      {member.userId === currentUser.uid && (
                        <span className="ml-1.5 text-xs text-[var(--color-text-muted)]">(you)</span>
                      )}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)]">{member.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium text-[var(--color-text-muted)] capitalize px-2 py-0.5 bg-[var(--color-surface-alt)] rounded-md">
                    {member.role}
                  </span>
                  {canManage && member.userId !== currentUser.uid && (
                    <button
                      onClick={() => handleRemoveMember(member)}
                      className="text-xs text-[var(--color-error)] hover:underline cursor-pointer"
                    >
                      Remove
                    </button>
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
