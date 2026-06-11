import { useState } from "react";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
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
import { authService } from "../services/authService";

const pages: Record<string, React.ComponentType> = {

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

export default function App() {
  const pathname = window.location.pathname;
  if (pathname.startsWith("/share/")) {
    return <PublicSharePage />;
  }

  const [token, setToken] = useState(() => {
    return localStorage.getItem("nimbus_token");
  });


  const [activePage, setActivePage] = useState("dashboard");

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

  const PageComponent = pages[activePage] || Dashboard;

  return (
    <div
      className="flex h-screen w-screen overflow-hidden"
      style={{
        background: "#080d1a",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <Sidebar activePage={activePage} onNavigate={setActivePage} />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center border-b border-[#1a2540] bg-[#0b1121]">
          <div className="flex-1">
            <Topbar activePage={activePage} />
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="mr-6 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-300 hover:bg-red-500/20"
          >
            Logout
          </button>
        </div>

        <PageComponent />
      </div>
    </div>
  );
}
