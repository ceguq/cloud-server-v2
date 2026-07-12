import React, { useEffect, useState, useMemo } from "react";

import { AdminUsersStateMessage } from "./admin-users/components/AdminUsersStateMessage";
import { getAdminUsers, type AdminUser } from "../../services/adminUserService";

function formatDate(value?: string): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Theme state for AdminUsers (light/dark + accent)
  type AppearanceTheme = "dark" | "light" | "system";
  type ResolvedTheme = "dark" | "light";

  const safeReadAppearanceTheme = (): AppearanceTheme => {
    try {
      const raw = localStorage.getItem("nimbus_appearance_theme");
      if (!raw) return "system";
      if (raw === "dark" || raw === "light" || raw === "system") return raw as AppearanceTheme;
      return "system";
    } catch {
      return "system";
    }
  };

  const safeReadAccentColor = (): string => {
    try {
      const raw = localStorage.getItem("nimbus_accent_color");
      if (!raw) return "#3b82f6";
      return raw;
    } catch {
      return "#3b82f6";
    }
  };

  const resolveAppearanceTheme = (theme: AppearanceTheme): ResolvedTheme => {
    if (theme === "dark") return "dark";
    if (theme === "light") return "light";
    try {
      if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
    } catch {
      // ignore
    }
    return "dark";
  };

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => resolveAppearanceTheme(safeReadAppearanceTheme()));
  const [accentColor, setAccentColor] = useState<string>(() => safeReadAccentColor());

  useEffect(() => {
    const syncThemeFromStorage = () => {
      try {
        const t = safeReadAppearanceTheme();
        setAccentColor(safeReadAccentColor());
        setResolvedTheme(resolveAppearanceTheme(t));
      } catch {
        setAccentColor("#3b82f6");
        setResolvedTheme("dark");
      }
    };

    syncThemeFromStorage();

    if (typeof window === "undefined") return undefined;

    window.addEventListener("nimbus-appearance-change", syncThemeFromStorage);
    window.addEventListener("storage", syncThemeFromStorage);
    window.addEventListener("focus", syncThemeFromStorage);

    let mq: MediaQueryList | null = null;
    try {
      mq = window.matchMedia?.("(prefers-color-scheme: dark)") ?? null;
      mq?.addEventListener?.("change", syncThemeFromStorage);
    } catch {
      // ignore
    }

    return () => {
      window.removeEventListener("nimbus-appearance-change", syncThemeFromStorage);
      window.removeEventListener("storage", syncThemeFromStorage);
      window.removeEventListener("focus", syncThemeFromStorage);
      mq?.removeEventListener?.("change", syncThemeFromStorage);
    };
  }, []);

  const adminUsersColors = useMemo(() => {
    if (resolvedTheme === "light") {
      return {
        pageBg: "#f8fafc",
        cardBg: "#ffffff",
        panelBg: "#f1f5f9",
        border: "#dbe3ef",
        title: "#0f172a",
        text: "#334155",
        muted: "#64748b",
        muted2: "#94a3b8",
        inputBg: "#ffffff",
        inputBorder: "#dbe3ef",
        inputText: "#334155",
        buttonSoftBg: "#f1f5f9",
        rowHoverBg: "#f8fafc",
      };
    }

    return {
      pageBg: "#080d1a",
      cardBg: "#0f1729",
      panelBg: "#0d1829",
      border: "#1a2540",
      title: "#e2e8f0",
      text: "#cbd5e1",
      muted: "#64748b",
      muted2: "#475569",
      inputBg: "#0d1829",
      inputBorder: "#1a2540",
      inputText: "#94a3b8",
      buttonSoftBg: "#1a2540",
      rowHoverBg: "#111c2f",
    };
  }, [resolvedTheme]);

  useEffect(() => {
    let mounted = true;

    const storedUser = (() => {
      try {
        const raw = localStorage.getItem("nimbus_user");
        if (!raw) return null;
        return JSON.parse(raw);
      } catch {
        return null;
      }
    })();

    const role = storedUser?.role;
    const isAdmin = role === "admin";

    if (!isAdmin) {
      setLoading(false);
      setError("Akses ditolak. Halaman ini hanya untuk admin.");
      setUsers([]);
      return () => {
        mounted = false;
      };
    }

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const list = await getAdminUsers();
        if (!mounted) return;
        setUsers(list ?? []);
      } catch {
        if (!mounted) return;
        setError("Gagal memuat daftar user.");
        setUsers([]);
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    };

    void load();

    return () => {
      mounted = false;
    };
  }, []);

  const totalUsers = users.length;
  const totalAdmins = users.filter((u) => u.role === "admin").length;
  const totalRegularUsers = totalUsers - totalAdmins;

  const roleBadge = (role: AdminUser["role"]) => {
    const isAdmin = role === "admin";
    const label = isAdmin ? "admin" : role === "user" ? "user" : String(role);

    return (
      <span
        className="inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-medium"
        style={{
          background: isAdmin
            ? "rgba(6,182,212,0.12)"
            : "rgba(100,116,139,0.10)",
          color: isAdmin ? "#67e8f9" : "#94a3b8",
          border: `1px solid ${isAdmin ? "rgba(6,182,212,0.25)" : "rgba(148,163,184,0.22)"}`,
        }}
      >
        {label}
      </span>
    );
  };

  return (
    <div
      className="flex-1 overflow-y-auto p-6"
      style={{ background: adminUsersColors.pageBg }}
    >
      <div className="mb-5">
        <h1 className="text-xl font-semibold" style={{ color: adminUsersColors.title }}>
          Admin Users
        </h1>
        <p className="text-xs mt-1" style={{ color: adminUsersColors.muted }}>
          Kelola dan pantau akun yang memiliki akses ke NimbusDrive.
        </p>
      </div>


      <div
        className="rounded-xl mb-5 p-4"
        style={{ background: adminUsersColors.cardBg, border: `1px solid ${adminUsersColors.border}` }}
      >

        <div className="grid grid-cols-3 gap-3">
          <div
            className="rounded-lg border p-3"
            style={{
              borderColor: adminUsersColors.border,
              background: adminUsersColors.panelBg,
            }}
          >
            <div className="text-xs" style={{ color: adminUsersColors.muted }}>
              Total Users
            </div>
            <div className="text-lg font-semibold" style={{ color: adminUsersColors.title }}>
              {totalUsers}
            </div>

          </div>

          <div
            className="rounded-lg border p-3"
            style={{
              borderColor: adminUsersColors.border,
              background: adminUsersColors.panelBg,
            }}
          >
            <div className="text-xs" style={{ color: adminUsersColors.muted }}>
              Total Admin
            </div>
            <div className="text-lg font-semibold" style={{ color: adminUsersColors.title }}>
              {totalAdmins}
            </div>

          </div>

          <div
            className="rounded-lg border p-3"
            style={{
              borderColor: adminUsersColors.border,
              background: adminUsersColors.panelBg,
            }}
          >
            <div className="text-xs" style={{ color: adminUsersColors.muted }}>
              Total Regular User
            </div>
            <div className="text-lg font-semibold" style={{ color: adminUsersColors.title }}>
              {totalRegularUsers}
            </div>

          </div>
        </div>
      </div>

      {loading && (
        <AdminUsersStateMessage
          tone="loading"
          title="Memuat daftar user..."
          className="text-xs"
          ariaLive="polite"
        />
      )}

      {!loading && error && (
        <AdminUsersStateMessage
          tone="error"
          title={error}
          className="text-xs"
          role="alert"
          ariaLive="assertive"
        />
      )}

      {!loading && !error && users.length === 0 && (
        <AdminUsersStateMessage
          tone="empty"
          title="Belum ada user."
          className="text-xs"
          ariaLive="polite"
        />
      )}

      {!loading && !error && users.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: adminUsersColors.cardBg, border: `1px solid ${adminUsersColors.border}` }}
        >

          <div
            className="grid px-4 py-2.5 items-center"
            style={{
              gridTemplateColumns: "2fr 2fr 1fr 1fr",
              borderBottom: `1px solid ${adminUsersColors.border}`,
            }}
          >
            <span
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: adminUsersColors.muted }}
            >
              Name
            </span>
            <span
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: adminUsersColors.muted }}
            >
              Email
            </span>
            <span
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: adminUsersColors.muted }}
            >
              Role
            </span>
            <span
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: adminUsersColors.muted }}
            >
              Created At
            </span>
          </div>

          {users.map((u) => (
            <div
              key={String(u.id)}
              className="grid px-4 py-2.5 items-center"
              style={{
                gridTemplateColumns: "2fr 2fr 1fr 1fr",
                borderBottom: `1px solid ${adminUsersColors.border}`,
                background: adminUsersColors.cardBg,
              }}
            >
              <span className="text-sm font-semibold capitalize" style={{ color: adminUsersColors.title }}>
               {u.name}
              </span>
              <span className="text-xs" style={{ color: adminUsersColors.muted }}>
                {u.email}
              </span>
              <span
              className="inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-semibold capitalize"
              style={{
                background: u.role === "admin" ? accentColor : adminUsersColors.buttonSoftBg,
                color: u.role === "admin" ? "#ffffff" : adminUsersColors.text,
                border: `1px solid ${u.role === "admin" ? accentColor : adminUsersColors.border}`,
             }}
          >
             {u.role}
           </span>
              <span className="text-xs" style={{ color: adminUsersColors.muted }}>
                {formatDate(u.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
