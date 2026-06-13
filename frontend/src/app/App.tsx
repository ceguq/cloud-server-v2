import { useEffect, useState, useCallback } from "react";
import { Sidebar } from "./components/Sidebar";

import { Topbar } from "./components/Topbar";
import { UploadManagerProvider } from "./upload/UploadManagerContext";
import { UploadTray } from "./upload/UploadTray";

import { Dashboard } from "./pages/Dashboard";
import { MyFiles } from "./pages/MyFiles";
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

const pages: Record<string, React.ComponentType<any>> = {
  dashboard: Dashboard,
  "my-files": MyFiles,
  shared: Shared,
  uploads: Uploads,
  devices: Devices,
  activity: Activity,
  trash: Trash,
  "server-monitor": ServerMonitor,
  settings: Settings,
};

const routePages: Record<string, React.ComponentType> = {
  "/activity": ActivityLogPage,
};

const routeActivePages: Record<string, string> = {
  "/activity": "activity-log",
};

// Pathname to activePage mapping
const pathToActivePage: Record<string, string> = {
  "/": "dashboard",
  "/dashboard": "dashboard",
  "/my-files": "my-files",
  "/shared": "shared",
  "/uploads": "uploads",
  "/devices": "devices",
  "/activity-feed": "activity",
  "/activity": "activity-log",
  "/trash": "trash",
  "/server-monitor": "server-monitor",
  "/settings": "settings",
};

export default function App() {
  const [storageRefreshKey, setStorageRefreshKey] = useState(0);
  const [filesRefreshKey, setFilesRefreshKey] = useState(0);

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
    const mappedPage = pathToActivePage[pathname] || routeActivePages[pathname] || "dashboard";
    setActivePage(mappedPage);
  }, [pathname]);

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
    }
  }

  function handleLoginSuccess() {
    setToken(localStorage.getItem("nimbus_token"));
  }

  if (!token) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  const PageComponent = routePages[pathname] || pages[activePage] || Dashboard;
  const currentActivePage = routeActivePages[pathname] || activePage;

  return (
    <UploadManagerProvider onUploadCompleted={handleUploadCompleted}>
      <div
        className="flex h-screen w-screen overflow-hidden"
        style={{
          background: "#080d1a",
          fontFamily: "'Inter', sans-serif",
        }}
      >
        <Sidebar
          activePage={currentActivePage}
          onNavigate={handleNavigate}
          storageRefreshKey={storageRefreshKey}
        />


        <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center border-b border-[#1a2540] bg-[#0b1121]">
            <div className="flex-1">
              <Topbar activePage={currentActivePage} />
            </div>

            <button
              type="button"
              onClick={handleLogout}
              className="mr-6 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20"
            >
              Logout
            </button>
          </div>

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
