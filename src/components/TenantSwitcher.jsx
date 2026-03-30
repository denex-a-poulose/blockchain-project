import { useState, useRef, useEffect } from "react";
import { useTenant } from "../contexts/TenantContext";
import { useNavigate } from "react-router-dom";

export default function TenantSwitcher() {
  const { tenants, currentTenant, switchTenant } = useTenant();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (tenants.length === 0) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[var(--color-text)] bg-[var(--color-surface-alt)] border border-[var(--color-border)] rounded-lg hover:border-[#cbd5e1] transition-colors cursor-pointer"
      >
        <span className="w-5 h-5 bg-[var(--color-primary)] rounded flex items-center justify-center text-white text-xs font-semibold">
          {currentTenant?.name?.charAt(0)?.toUpperCase() || "?"}
        </span>
        <span className="max-w-[120px] truncate">{currentTenant?.name || "Select"}</span>
        <svg
          className={`w-3.5 h-3.5 text-[var(--color-text-muted)] transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-56 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-lg overflow-hidden z-50">
          <div className="px-3 py-2 border-b border-[var(--color-border)]">
            <p className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
              Organizations
            </p>
          </div>

          <div className="py-1 max-h-48 overflow-y-auto">
            {tenants.map((tenant) => (
              <button
                key={tenant.id}
                onClick={() => {
                  switchTenant(tenant.id);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2.5 transition-colors cursor-pointer ${
                  currentTenant?.id === tenant.id
                    ? "bg-[var(--color-primary)] bg-opacity-5 text-[var(--color-primary)]"
                    : "text-[var(--color-text)] hover:bg-[var(--color-surface-alt)]"
                }`}
              >
                <span className="w-5 h-5 bg-[var(--color-primary)] rounded flex items-center justify-center text-white text-xs font-semibold shrink-0">
                  {tenant.name?.charAt(0)?.toUpperCase()}
                </span>
                <span className="truncate">{tenant.name}</span>
                <span className="ml-auto text-xs text-[var(--color-text-muted)] capitalize">
                  {tenant.role}
                </span>
              </button>
            ))}
          </div>

          <div className="border-t border-[var(--color-border)] py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                navigate("/create-tenant");
              }}
              className="w-full px-3 py-2 text-left text-sm text-[var(--color-primary)] hover:bg-[var(--color-surface-alt)] transition-colors flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create new organization
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
