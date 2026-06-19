import { useEffect, useState, useCallback } from "react";
import { Sidebar } from "./components/Sidebar";

import { Topbar } from "./components/Topbar";
import { UploadManagerProvider } from "./upload/UploadManagerContext";
import { UploadTray } from "./upload/UploadTray";

import { Dashboard } from "./pages/Dashboard";
import { MyFiles } from "./pages/MyFiles";
import { GDrive } from "./pages/GDrive";
import { Shared } from "./pages/Shared";
import { Uploads } from "./pages/Uploads";
import { Devices } from "./pages/Devices";
import { Activity } from "./pages/Activity";


import { Trash } from "./pages/Trash";
import { ServerMonitor } from "./pages/ServerMonitor";
import { Settings } from "./pages/Settings";
import LoginPage from "./pages/LoginPage";
import { PublicSharePage } from "./pages/PublicSharePage";
import ActivityLogPage from "../pages/ActivityLogPage";

import { authService } from "../services/authService";
import { AdminUsers } from "./pages/AdminUsers";

const pages: Record<string, React.ComponentType<any>> = {
  dashboard: Dashboard,
  "my-files": MyFiles,
  gdrive: GDrive,
  shared: Shared,
  uploads: Uploads,
  devices: Devices,
  activity: Activity,
  trash: Trash,


  "server-monitor": ServerMonitor,
  settings: Settings,
  "admin-users": AdminUsers,
};

const routePages: Record<string, React.ComponentType> = {
  "/activity": ActivityLogPage,
  "/activity-feed": Activity,
};



const routeActivePages: Record<string, string> = {
  "/activity": "activity-log",
};

type AppearanceTheme = "dark" | "light" | "system";
type ResolvedTheme = "dark" | "light";

function safeReadAppearanceTheme(): AppearanceTheme {
  if (typeof window === "undefined") return "dark";

  try {
    const raw = window.localStorage.getItem("nimbus_appearance_theme");
    if (raw === "dark" || raw === "light" || raw === "system") return raw;
  } catch {
    // ignore
  }

  return "dark";
}

function resolveAppearanceTheme(theme: AppearanceTheme): ResolvedTheme {
  if (theme === "dark" || theme === "light") return theme;

  try {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    return mq?.matches ? "dark" : "light";
  } catch {
    return "dark";
  }
}


// Pathname to activePage mapping
const pathToActivePage: Record<string, string> = {
  "/": "dashboard",
  "/dashboard": "dashboard",
  "/my-files": "my-files",
  "/gdrive": "gdrive",
  "/shared": "shared",
  "/uploads": "uploads",
  "/devices": "devices",
  "/activity-feed": "activity",


  "/activity": "activity-log",
  "/trash": "trash",
  "/server-monitor": "server-monitor",
  "/settings": "settings",
  "/admin/users": "admin-users",
};

export default function App() {
  const [storageRefreshKey, setStorageRefreshKey] = useState(0);
  const [filesRefreshKey, setFilesRefreshKey] = useState(0);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveAppearanceTheme(safeReadAppearanceTheme())
  );

  const [pathname, setPathname] = useState(() => window.location.pathname);

  useEffect(() => {
    function handlePopState() {
      setPathname(window.location.pathname);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const [token, setToken] = useState(() => {
    return localStorage.getItem("nimbus_token");
  });

  const [activePage, setActivePage] = useState<string>(() => {
    const initialPath = window.location.pathname;
    return pathToActivePage[initialPath] || "dashboard";
  });

  // Sync activePage with pathname when pathname changes
  useEffect(() => {
    const mappedPage =
      pathToActivePage[pathname] || routeActivePages[pathname] || "dashboard";
    setActivePage(mappedPage);
  }, [pathname]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncThemeFromStorage = () => {
      setResolvedTheme(resolveAppearanceTheme(safeReadAppearanceTheme()));
    };

    syncThemeFromStorage();

    window.addEventListener("nimbus-appearance-change", syncThemeFromStorage);
    window.addEventListener("storage", syncThemeFromStorage);
    window.addEventListener("focus", syncThemeFromStorage);

    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    mq?.addEventListener?.("change", syncThemeFromStorage);

    return () => {
      window.removeEventListener("nimbus-appearance-change", syncThemeFromStorage);
      window.removeEventListener("storage", syncThemeFromStorage);
      window.removeEventListener("focus", syncThemeFromStorage);
      mq?.removeEventListener?.("change", syncThemeFromStorage);
    };
  }, []);

  const handleUploadCompleted = useCallback((didCompleteAny: boolean) => {
    if (!didCompleteAny) return;

    setStorageRefreshKey((value) => value + 1);
    setFilesRefreshKey((value) => value + 1);

    // Safety refresh for storage/list consistency if backend indexing lags.
    setTimeout(() => {
      setStorageRefreshKey((value) => value + 1);
      setFilesRefreshKey((value) => value + 1);
    }, 800);
  }, []);

  if (pathname.startsWith("/share/")) {
    return <PublicSharePage />;
  }

  function handleNavigate(page: string, path?: string) {
    const nextPath = path ?? (page === "dashboard" ? "/" : `/${page}`);

    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
      setPathname(nextPath);
    }

    setActivePage(page);
  }

  async function handleLogout() {
    try {
      await authService.logout();
    } catch (err) {
      console.error(err);
    } finally {
      localStorage.removeItem("nimbus_token");
      localStorage.removeItem("nimbus_user");
      setToken(null);

      window.history.pushState({}, "", "/");
      setPathname("/");
      setActivePage("dashboard");
    }
  }

  function handleLoginSuccess() {
    setToken(localStorage.getItem("nimbus_token"));

    window.history.pushState({}, "", "/");
    setPathname("/");
    setActivePage("dashboard");
  }

  if (!token) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const PageComponent =
    routePages[pathname] || pages[pathToActivePage[pathname] || activePage] || Dashboard;
  const currentActivePage = routeActivePages[pathname] || pathToActivePage[pathname] || activePage;
  const shellBackground =
    resolvedTheme === "light"
      ? "#f8fafc"
      : "linear-gradient(135deg, #142033 0%, #182640 52%, #10213a 100%)";

  return (
    <UploadManagerProvider onUploadCompleted={handleUploadCompleted}>
      <div
        className="flex h-screen w-screen gap-4 overflow-hidden p-4"
        style={{
          background: shellBackground,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <Sidebar
          activePage={currentActivePage}
          onNavigate={handleNavigate}
          storageRefreshKey={storageRefreshKey}
        />

        <div className="flex flex-col flex-1 min-w-0 gap-4 overflow-hidden">
          <Topbar activePage={currentActivePage} onLogout={handleLogout} />


          {currentActivePage === "my-files" ? (
            <MyFiles
              filesRefreshKey={filesRefreshKey}
              onStorageChanged={() =>
                setStorageRefreshKey((value) => value + 1)
              }
            />
          ) : currentActivePage === "trash" ? (
            <Trash
              onStorageChanged={() =>
                setStorageRefreshKey((value) => value + 1)
              }
            />
          ) : (
            <PageComponent />
          )}

          <UploadTray />
        </div>
      </div>
    </UploadManagerProvider>
  );
}
