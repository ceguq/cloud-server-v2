import { useState } from "react";
import { Cloud, Eye, EyeOff } from "lucide-react";
import { authService } from "../../services/authService";
import { LoadingSpinner } from "../components/LoadingSpinner";

type LoginPageProps = {
  onLoginSuccess: () => void;
};

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [email, setEmail] = useState("admin@nimbusdrive.local");
  const [password, setPassword] = useState("admin123456");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      const data = await authService.login(email, password);

      localStorage.setItem("nimbus_token", data.token);
      localStorage.setItem("nimbus_user", JSON.stringify(data.user));

      onLoginSuccess();
    } catch (err: any) {
      console.error(err);
      setError(
        err?.response?.data?.message ||
          err?.response?.data?.errors?.email?.[0] ||
          "Login gagal.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#080d1a] text-slate-100 flex items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-[#1a2540] bg-[#0f1729] p-8 shadow-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400">
            <Cloud size={26} className="text-white" />
          </div>

          <h1 className="text-2xl font-semibold">NimbusDrive V2</h1>
          <p className="mt-2 text-sm text-slate-500">
            Masuk ke cloud pribadi kamu.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm text-slate-400">Email</label>
            <input
              type="email"
              className="w-full rounded-xl border border-[#1a2540] bg-[#0d1829] px-4 py-3 text-sm outline-none focus:border-blue-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm text-slate-400">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                className="w-full rounded-xl border border-[#1a2540] bg-[#0d1829] px-4 py-3 pr-12 text-sm outline-none focus:border-blue-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
                title={showPassword ? "Sembunyikan password" : "Lihat password"}
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-slate-500 transition hover:bg-[#1a2540] hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/60"
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <LoadingSpinner size={14} color="#fff" />
                Masuk...
              </>
            ) : (
              "Login"
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
