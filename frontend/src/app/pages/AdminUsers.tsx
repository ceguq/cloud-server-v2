import React, { useEffect, useState } from "react";

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

  return (
    <div
      className="flex-1 overflow-y-auto p-6"
      style={{ background: "#080d1a" }}
    >
      <div className="mb-5">
        <h1 className="text-xl font-semibold" style={{ color: "#e2e8f0" }}>
          Admin Users
        </h1>
        <p className="text-xs mt-1" style={{ color: "#475569" }}>
          Kelola dan pantau akun yang memiliki akses ke NimbusDrive.
        </p>
      </div>

      <div
        className="rounded-xl mb-5 p-4"
        style={{ background: "#0f1729", border: "1px solid #1a2540" }}
      >
        <div className="grid grid-cols-3 gap-3">
          <div
            className="rounded-lg border p-3"
            style={{
              borderColor: "rgba(148,163,184,0.25)",
              background: "rgba(148,163,184,0.05)",
            }}
          >
            <div className="text-xs" style={{ color: "#94a3b8" }}>
              Total Users
            </div>
            <div className="text-lg font-semibold" style={{ color: "#e2e8f0" }}>
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
            <div className="text-xs" style={{ color: "#67e8f9" }}>
              Total Admin
            </div>
            <div className="text-lg font-semibold" style={{ color: "#e2e8f0" }}>
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
            <div className="text-xs" style={{ color: "#94a3b8" }}>
              Total Regular User
            </div>
            <div className="text-lg font-semibold" style={{ color: "#e2e8f0" }}>
              {totalRegularUsers}
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="text-xs" style={{ color: "#64748b" }}>
          Memuat daftar user...
        </div>
      )}

      {!loading && error && (
        <div className="text-xs" style={{ color: "#f87171" }} role="alert">
          {error}
        </div>
      )}

      {!loading && !error && users.length === 0 && (
        <div className="text-xs" style={{ color: "#64748b" }}>
          Belum ada user.
        </div>
      )}

      {!loading && !error && users.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: "#0f1729", border: "1px solid #1a2540" }}
        >
          <div
            className="grid px-4 py-2.5 items-center"
            style={{
              gridTemplateColumns: "2fr 2fr 1fr 1fr",
              borderBottom: "1px solid #1a2540",
            }}
          >
            <span
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: "#334155" }}
            >
              Name
            </span>
            <span
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: "#334155" }}
            >
              Email
            </span>
            <span
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: "#334155" }}
            >
              Role
            </span>
            <span
              className="text-[11px] font-medium uppercase tracking-wider"
              style={{ color: "#334155" }}
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
                borderBottom: "1px solid rgba(10,16,32,1)",
              }}
            >
              <span className="text-sm" style={{ color: "#cbd5e1" }}>
                {u.name}
              </span>
              <span className="text-xs" style={{ color: "#475569" }}>
                {u.email}
              </span>
              <span>{roleBadge(u.role)}</span>
              <span className="text-xs" style={{ color: "#475569" }}>
                {formatDate(u.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
