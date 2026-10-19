import React, { useEffect, useState, useMemo } from "react";
import axios from "axios";
import { Plus } from "lucide-react";

import { AdminUsersStateMessage } from "./admin-users/components/AdminUsersStateMessage";
import {
  createAdminUser,
  getAdminUsers,
  type AdminUser,
} from "../../services/adminUserService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

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
  const [canManageUsers, setCanManageUsers] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    password_confirmation: "",
  });

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
      pageBg: "#111c2f",
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
    const isAdmin = role === "admin" || role === "owner";
    setCanManageUsers(isAdmin);

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

  const resetCreateForm = () => {
    setForm({ name: "", email: "", password: "", password_confirmation: "" });
    setFieldErrors({});
    setCreateError(null);
  };

  const handleCreateUser = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    setCreateError(null);
    setFieldErrors({});
    setSuccessMessage(null);

    try {
      await createAdminUser(form);
    } catch (createRequestError) {
      if (axios.isAxiosError(createRequestError)) {
        const response = createRequestError.response?.data as
          | { message?: string; errors?: Record<string, string[]> }
          | undefined;
        const nextFieldErrors = Object.fromEntries(
          Object.entries(response?.errors ?? {}).map(([field, messages]) => [
            field,
            messages[0] ?? "Please check this field.",
          ]),
        );
        setFieldErrors(nextFieldErrors);
        setCreateError(
          Object.keys(nextFieldErrors).length > 0
            ? "Please correct the highlighted fields."
            : response?.message ?? "Unable to create the user.",
        );
      } else {
        setCreateError("Unable to create the user. Please try again.");
      }
      setCreating(false);
      return;
    }

    setCreateDialogOpen(false);
    resetCreateForm();
    setSuccessMessage("User created successfully.");
    setCreating(false);

    try {
      const refreshedUsers = await getAdminUsers();
      setUsers(refreshedUsers);
      setError(null);
    } catch {
      setError("User was created, but the list could not be refreshed.");
    }
  };

  const totalUsers = users.length;
  const totalAdmins = users.filter((u) => u.role === "admin" || u.role === "owner").length;
  const totalRegularUsers = totalUsers - totalAdmins;

  const roleBadge = (role: AdminUser["role"]) => {
    const isAdmin = role === "admin" || role === "owner";
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
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: adminUsersColors.title }}>
            Admin Users
          </h1>
          <p className="text-xs mt-1" style={{ color: adminUsersColors.muted }}>
            Kelola dan pantau akun yang memiliki akses ke NimbusDrive.
          </p>
        </div>
        {canManageUsers && (
          <button
            type="button"
            onClick={() => {
              resetCreateForm();
              setCreateDialogOpen(true);
            }}
            className="inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-opacity hover:opacity-90"
            style={{ background: accentColor, color: "#fff" }}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create User
          </button>
        )}
      </div>

      {successMessage && (
        <div
          role="status"
          className="mb-4 rounded-lg border px-3 py-2 text-sm"
          style={{
            background: "rgba(34, 197, 94, 0.10)",
            borderColor: "rgba(34, 197, 94, 0.30)",
            color: resolvedTheme === "light" ? "#166534" : "#86efac",
          }}
        >
          {successMessage}
        </div>
      )}

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

      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          if (!creating) {
            setCreateDialogOpen(open);
            if (!open) resetCreateForm();
          }
        }}
      >
        <DialogContent
          className="sm:max-w-md"
          style={{
            background: adminUsersColors.cardBg,
            borderColor: adminUsersColors.border,
            color: adminUsersColors.text,
          }}
        >
          <DialogHeader>
            <DialogTitle style={{ color: adminUsersColors.title }}>
              Create User
            </DialogTitle>
            <DialogDescription style={{ color: adminUsersColors.muted }}>
              Create a local account with standard user access.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateUser} className="space-y-4">
            {(["name", "email", "password", "password_confirmation"] as const).map(
              (field) => {
                const labels = {
                  name: "Name",
                  email: "Email",
                  password: "Password",
                  password_confirmation: "Confirm Password",
                };
                const error = fieldErrors[field];

                return (
                  <div key={field} className="space-y-1.5">
                    <Label
                      htmlFor={`create-user-${field}`}
                      style={{ color: adminUsersColors.text }}
                    >
                      {labels[field]}
                    </Label>
                    <Input
                      id={`create-user-${field}`}
                      name={field}
                      type={field === "password" || field === "password_confirmation" ? "password" : field === "email" ? "email" : "text"}
                      autoComplete={
                        field === "name"
                          ? "name"
                          : field === "email"
                            ? "email"
                            : field === "password"
                              ? "new-password"
                              : "new-password"
                      }
                      required
                      minLength={field === "password" || field === "password_confirmation" ? 8 : field === "name" ? 2 : undefined}
                      maxLength={field === "email" ? 255 : undefined}
                      value={form[field]}
                      aria-invalid={Boolean(error)}
                      aria-describedby={error ? `create-user-${field}-error` : undefined}
                      disabled={creating}
                      onChange={(event) => {
                        setForm((current) => ({
                          ...current,
                          [field]: event.target.value,
                        }));
                      }}
                      style={{
                        background: adminUsersColors.inputBg,
                        borderColor: error
                          ? "#ef4444"
                          : adminUsersColors.inputBorder,
                        color: adminUsersColors.title,
                      }}
                    />
                    {error && (
                      <p
                        id={`create-user-${field}-error`}
                        className="text-xs text-red-500"
                      >
                        {error}
                      </p>
                    )}
                  </div>
                );
              },
            )}
            {createError && (
              <p role="alert" className="text-sm text-red-500">
                {createError}
              </p>
            )}
            <DialogFooter>
              <button
                type="button"
                onClick={() => setCreateDialogOpen(false)}
                disabled={creating}
                className="h-9 rounded-lg border px-3 text-sm font-medium disabled:opacity-50"
                style={{
                  background: adminUsersColors.buttonSoftBg,
                  borderColor: adminUsersColors.border,
                  color: adminUsersColors.text,
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="h-9 rounded-lg px-3 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: accentColor, color: "#fff" }}
              >
                {creating ? "Creating..." : "Create User"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
                background: u.role === "admin" || u.role === "owner" ? accentColor : adminUsersColors.buttonSoftBg,
                color: u.role === "admin" || u.role === "owner" ? "#ffffff" : adminUsersColors.text,
                border: `1px solid ${u.role === "admin" || u.role === "owner" ? accentColor : adminUsersColors.border}`,
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
