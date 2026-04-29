import "../styles/global.css";
import { Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider, useSidebar } from "../contexts/SidebarContexts";
import { getDocumentById, getDocumentTypes, getDocumentCategories } from '../services/api';
import { DocumentCard, DocumentType, DocumentCategory } from '../types';

const DocumentCardPage = () => {
    return (
        <div>
            Карта документа
        </div>
    );
};

export default DocumentCardPage;