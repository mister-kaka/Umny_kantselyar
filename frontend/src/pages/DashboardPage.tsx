import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import MainMenu from "../components/SubPages/MainMenu";
import IncomingD from "../components/SubPages/IncomingD";
import Verification from "../components/SubPages/Verification";
import Routing from "../components/SubPages/Routing";
import Departments from "../components/SubPages/Departments";
import Analytics from "../components/SubPages/Analytics";
import Settings from "../components/SubPages/Settings";
import Notifications from "../components/SubPages/Notifications";
import "../styles/global.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SidebarProvider, useSidebar } from "../contexts/SidebarContexts";

const DashboardContent = () => {
  const { collapsed } = useSidebar();
  return (
    <div className="body">
      <Sidebar />
      <Header />
      <main className={`main-content ${collapsed ? 'collapsed' : ''}`}>
        <Routes>
          <Route path="/SubPages/MainMenu" element={<MainMenu />} />
          <Route path="/SubPages/IncomingD" element={<IncomingD />} />
          <Route path="/SubPages/Verification" element={<Verification />} />
          <Route path="/SubPages/Routing" element={<Routing />} />
          <Route path="/SubPages/Departaments" element={<Departments />} />
          <Route path="/SubPages/Analytics" element={<Analytics />} />
          <Route path="/SubPages/Settings" element={<Settings />} />
          <Route path="/SubPages/Notifications" element={<Notifications />} />
        </Routes>
      </main>
    </div>
  );
};

const DashboardPage = () => {
  return (
    <SidebarProvider>
      <BrowserRouter>
        <DashboardContent />
      </BrowserRouter>
    </SidebarProvider>
  );
};

export default DashboardPage;
