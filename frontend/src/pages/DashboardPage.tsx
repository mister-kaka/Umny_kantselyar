import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import MainMenu from "../components/SubPages/MainMenu";
import UploadPage from "../components/SubPages/UploadPage";
import Verification from "../components/SubPages/Verification";
import Routing from "../components/SubPages/Routing";
import DocumentsListPage from "../components/SubPages/DocumentsListPage";
import DocumentCardPage from "./DocumentCardPage"; // Импортируем карточку сюда
import Departments from "../components/SubPages/Departments";
import Analytics from "../components/SubPages/Analytics";
import Settings from "../components/SubPages/Settings";
import Notifications from "../components/SubPages/Notifications";
import "../styles/global.css";
import { Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider, useSidebar } from "../contexts/SidebarContexts";

const DashboardContent = () => {
  const { collapsed } = useSidebar();
  return (
    <div className="body">
      <Sidebar />
      <Header />
      <main className={`main-content ${collapsed ? 'collapsed' : ''}`}>
        <Routes>
          <Route path="/" element={<Navigate to="main" replace />} />
          <Route path="main" element={<MainMenu />} />
          <Route path="incoming" element={<UploadPage />} />
          <Route path="verification" element={<Verification />} />
          <Route path="routing" element={<Routing />} />
          <Route path="documents" element={<DocumentsListPage />} />
          <Route path="documents/:id" element={<DocumentCardPage />} /> 
          <Route path="departments" element={<Departments />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<Settings />} />
          <Route path="notifications" element={<Notifications />} />
        </Routes>
      </main>
    </div>
  );
};

const DashboardPage = () => {
  return (
    <SidebarProvider>
      <DashboardContent />
    </SidebarProvider>
  );
};

export default DashboardPage;