import Sidebar from "../components/Sidebar";
import Header from "../components/Header";
import MainMenu from "../components/SubPages/MainMenu";
import UploadPage from "../components/SubPages/UploadPage";
import Verification from "../components/SubPages/Verification";
import Routing from "../components/SubPages/Routing";
import DocumentsListPage from "../components/SubPages/DocumentsListPage";
import DocumentCardPage from "./DocumentCardPage";
import Departments from "../components/SubPages/Departments";
import DepartmentDetailPage from "./DepartmentDetailPage";
import Analytics from "../components/SubPages/Analytics";
import Settings from "../components/SubPages/Settings";
import Notifications from "../components/SubPages/Notifications";
import Scanner from "../components/Scanner";
import ProfilePage from "./ProfilePage";
import "../styles/global.css";
import "../styles/Dashboard.css";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { SidebarProvider, useSidebar } from "../contexts/SidebarContexts";
import { useState } from "react";
import type { FileItem, UploadStep } from "../types/index";

const DashboardContent = () => {
  const { collapsed } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();

  const [files, setFiles] = useState<FileItem[]>([]);
  const [uploadStep, setUploadStep] = useState<UploadStep>("idle");
  const [uploadErrorMessage, setUploadErrorMessage] = useState<string>("");
  const [uploadProcessedCount, setUploadProcessedCount] = useState(0);
  const [uploadTotalToProcess, setUploadTotalToProcess] = useState(0);
  const [uploadIsProcessing, setUploadIsProcessing] = useState(false);

  const isUploadPage = location.pathname === "/dashboard/incoming";

  return (
    <div className="body">
      <Sidebar />
      <Header />
      <main className={`main-content ${collapsed ? 'collapsed' : ''}`}>
        <div style={{ display: isUploadPage ? 'block' : 'none' }}>
          <UploadPage
            files={files}
            setFiles={setFiles}
            step={uploadStep}
            setStep={setUploadStep}
            errorMessage={uploadErrorMessage}
            setErrorMessage={setUploadErrorMessage}
            processedCount={uploadProcessedCount}
            setProcessedCount={setUploadProcessedCount}
            totalToProcess={uploadTotalToProcess}
            setTotalToProcess={setUploadTotalToProcess}
            isProcessing={uploadIsProcessing}
            setIsProcessing={setUploadIsProcessing}
          />
        </div>
        <div style={{ display: !isUploadPage ? 'block' : 'none' }}>
          <Routes>
            <Route path="/" element={<Navigate to="main" replace />} />
            <Route path="main" element={<MainMenu />} />
            <Route path="verification" element={<Verification />} />
            <Route path="routing" element={<Routing />} />
            <Route path="documents" element={<DocumentsListPage />} />
            <Route path="documents/:id" element={<DocumentCardPage />} />
            <Route path="profile" element={<ProfilePage />} />
            <Route path="departments" element={<Departments />} />
            <Route path="departments/:id" element={<DepartmentDetailPage />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="settings" element={<Settings />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="scan" element={<Scanner onClose={() => navigate('/dashboard/incoming')} />} />
          </Routes>
        </div>
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