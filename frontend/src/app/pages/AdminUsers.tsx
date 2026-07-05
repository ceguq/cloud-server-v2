import React, { useEffect, useState } from "react";

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

  const theme = (() => {
    try {
      const raw = localStorage.getItem("nimbus_appearance_theme");
      const resolved =
        raw === "dark" || raw === "light"
          ? raw
          : window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";

      if (resolved === "light") {
          return {
          pageBg: "#f8fafc",
          title: "#0f172a",
          text: "#334155",
          muted: "#475569",
          panelBg: "#ffffff",
          panelBorder: "#dbe3ef",
        };
      }

      return {
        pageBg: "#111c2f",
        title: "#e2e8f0",
        muted: "#475569",
        panelBg: "#0f1729",
        panelBorder: "#1a2540",
      };
    } catch {
      return {
        pageBg: "#111c2f",
        title: "#e2e8f0",
        muted: "#475569",
        panelBg: "#0f1729",
        panelBorder: "#1a2540",
      };
    }
  })();

  return (
    <div
      className="flex-1 overflow-y-auto p-6"
      style={{ background: theme.pageBg }}
    >
      <div className="mb-5">
        <h1 className="text-xl font-semibold" style={{ color: theme.title }}>
          Admin Users
        </h1>
        <p className="text-xs mt-1" style={{ color: theme.muted }}>
          Kelola dan pantau akun yang memiliki akses ke NimbusDrive.
        </p>
      </div>


      <div
        className="rounded-xl mb-5 p-4"
        style={{ background: theme.panelBg, border: `1px solid ${theme.panelBorder}` }}
      >

        <div className="grid grid-cols-3 gap-3">
          <div
            className="rounded-lg border p-3"
            style={{
              borderColor: "rgba(148,163,184,0.25)",
              background: "rgba(148,163,184,0.05)",
            }}
          >
            <div className="text-xs" style={{ color: theme.muted }}>
              Total Users
            </div>
            <div className="text-lg font-semibold" style={{ color: theme.title }}>
              {totalUsers}
            </div>

          </div>

          <div
            className="rounded-lg border p-3"
            style={{
              borderColor: "rgba(103,232,249,0.25)",
              background: "rgba(6,182,212,0.08)",
            }}
          >
            <div className="text-xs" style={{ color: theme.muted }}>
              Total Admin
            </div>
            <div className="text-lg font-semibold" style={{ color: theme.title }}>
              {totalAdmins}
            </div>

          </div>

          <div
            className="rounded-lg border p-3"
            style={{
              borderColor: "rgba(148,163,184,0.25)",
              background: "rgba(100,116,139,0.06)",
            }}
          >
            <div className="text-xs" style={{ color: theme.muted }}>
              Total Regular User
            </div>
            <div className="text-lg font-semibold" style={{ color: theme.title }}>
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
          style={{ background: theme.panelBg, border: `1px solid ${theme.panelBorder}` }}
        >

          <div
            className="grid px-4 py-2.5 items-center"
            style={{
              gridTemplateColumns: "2fr 2fr 1fr 1fr",
              borderBottom: `1px solid ${theme.panelBorder}`,
            }}
          >
            <span
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: theme.title }}
            >
              Name
            </span>
            <span
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: theme.title }}
            >
              Email
            </span>
            <span
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: theme.title }}
            >
              Role
            </span>
            <span
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: theme.title }}
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
                borderBottom: `1px solid ${theme.panelBorder}`,
              }}
            >
              <span className="text-sm font-semibold capitalize" style={{ color: theme.title }}>
               {u.name}
              </span>
              <span className="text-xs" style={{ color: theme.title }}>
                {u.email}
              </span>
              <span
              className="inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-semibold capitalize"
              style={{
                background: u.role === "admin" ? "#4f46e5" : theme.panelBg,
                color: u.role === "admin" ? "#ffffff" : theme.title,
                border: `1px solid ${u.role === "admin" ? "#4f46e5" : theme.panelBorder}`,
             }}
          >
             {u.role}
           </span>
              <span className="text-xs" style={{ color: theme.title }}>
                {formatDate(u.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
