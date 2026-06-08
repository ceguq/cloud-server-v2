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
  const [activePage, setActivePage] = useState("dashboard");
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
        <Topbar activePage={activePage} />
        <PageComponent />
      </div>
    </div>
  );
}
