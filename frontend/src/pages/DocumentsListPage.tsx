import "../styles/global.css";
import { Routes, Route, Navigate } from "react-router-dom";
import { SidebarProvider, useSidebar } from "../contexts/SidebarContexts";
import { getDocuments, getDocumentTypes, getDocumentCategories } from '../services/api';
import { DocumentListItem, DocumentType, DocumentCategory } from '../types';

const DocumentsListPage = () => {
    return (
        <div>
            Список документов
        </div>
    );
}

export default DocumentsListPage;