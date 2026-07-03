import "../../styles/global.css";
import "../../styles/Dashboard.css";
import "../../styles/Settings.css";
import "../../styles/AdminPanel.css";
import Card from "../Card";
import DropdownButton from "../DropdownButton";
import { DateFilterDropdown } from "../DropdownButton";
import Table from "../Table";
import Pagination from "../Pagination";
import Tooltip from "../Tooltip";
import React, { useState, useEffect, useCallback } from "react";
import {
    getAdminAuditLog,
    getAdminUsers,
    getAdminUserStats,
    updateAdminUserRole,
    toggleAdminUserBlock,
    createAdminUser,
    resetAdminUserPassword,
    deleteAdminUser,
    getAdminSystemSettings,
    updateAdminSystemSettings,
    adminCleanup,
    getAdminLogs,
    adminExport,
    adminImport,
    getAdminStats,
    sendAdminNotification,
    getAdminNotificationHistory,
    getDepartments,
    exportData,
    importData,
} from "../../services/api";
import {
    AdminAuditLogItem,
    AdminUser,
    AdminStats,
    Department,
} from "../../types";
import { formatMoscowDateTime, formatMoscowDate } from "../../utils/moscowTime";
import { translateStatus, getStatusColorClass } from "../../constants/statuses";
import { useSettings } from "../../contexts/SettingsContext";
import { getThemedIcon } from "../../utils/getThemedIcon";

type Tab = "journal" | "users" | "system" | "backup" | "stats" | "notifications";

const ACTION_LABELS: Record<string, string> = {
    'login': 'Вход в систему',
    'logout_all': 'Выход со всех устройств',
    'logout_session': 'Сессия завершена',
    'profile_update': 'Обновление профиля',
    'password_change': 'Смена пароля',
    'avatar_upload': 'Загрузка аватара',
    'document_upload': 'Загрузка документа',
    'document_delete': 'Удаление документа',
    'document_verify': 'Проверка документа',
    'document_route': 'Маршрутизация',
    'document_reject': 'Отклонение',
    'document_update': 'Редактирование',
    'ocr_extract': 'Извлечение текста',
    'ai_analysis': 'AI-анализ',
    'ai_analysis_start': 'AI-анализ',
    'ai_analysis_complete': 'AI-анализ',
    'ai_analysis_error': 'Ошибка AI',
    'export_excel': 'Экспорт в Excel',
    'export_data': 'Экспорт данных',
    'import_data': 'Импорт данных',
    'settings_update': 'Изменение настроек',
    'settings_update_ai': 'Настройки AI',
    'settings_update_interface': 'Настройки интерфейса',
    'settings_update_notifications': 'Настройки уведомлений',
    'system_settings_update': 'Системные настройки',
    'cleanup': 'Очистка данных',
    'notification_mark_read': 'Уведомление прочитано',
    'notification_mark_all_read': 'Все уведомления прочитаны',
    'notification_delete': 'Уведомление удалено',
    'notification_delete_all_read': 'Удалены прочитанные',
    'comment_added': 'Комментарий добавлен',
    'comment_deleted': 'Комментарий удалён',
    'reference_created': 'Справочник создан',
    'reference_deleted': 'Справочник удалён',
    'user_created': 'Пользователь создан',
    'user_deleted': 'Пользователь удалён',
    'user_role_change': 'Смена роли',
    'user_blocked': 'Пользователь заблокирован',
    'user_unblocked': 'Пользователь разблокирован',
    'user_password_reset': 'Сброс пароля',
    'mass_notification': 'Массовая рассылка',
};

const ACTION_OPTIONS = Object.values(ACTION_LABELS);
const REVERSE_ACTION_MAP: Record<string, string> = Object.fromEntries(
    Object.entries(ACTION_LABELS).map(([k, v]) => [v, k])
);

const getActionLabel = (action: string) => ACTION_LABELS[action] || action;

const getDetailsText = (details: any): string => {
    if (!details) return '-';
    if (typeof details === 'string') return details;
    if (details.registrationNumber) return `Док. ${details.registrationNumber}`;
    if (details.counts) {
        const parts = Object.entries(details.counts).map(([k, v]) => `${k}: ${v}`).join(', ');
        return `Импортировано: ${parts}`;
    }
    if (details.deletedCount !== undefined) return `Удалено: ${details.deletedCount}`;
    if (details.targetUserId) {
        const email = details.email || '';
        const role = details.role || details.newRole || '';
        return `Пользователь #${details.targetUserId}${email ? ` (${email})` : ''}${role ? `, ${role}` : ''}`;
    }
    if (details.recipientsCount !== undefined) return `Получателей: ${details.recipientsCount}`;
    if (details.title) return details.title;
    if (details.settings) {
        const keys = Object.keys(details.settings);
        return `Изменены: ${keys.join(', ')}`;
    }
    if (details.newRole) return `Новая роль: ${details.newRole}`;
    return '-';
};

const AdminPanel: React.FC = () => {
    const { defaultPageLimit, theme } = useSettings();
    const [activeTab, setActiveTab] = useState<Tab>("journal");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [journal, setJournal] = useState<AdminAuditLogItem[]>([]);
    const [journalPage, setJournalPage] = useState(1);
    const [journalTotalPages, setJournalTotalPages] = useState(1);
    const [journalTotal, setJournalTotal] = useState(0);
    const [journalLimit, setJournalLimit] = useState(defaultPageLimit);
    const [journalSearch, setJournalSearch] = useState("");
    const [journalSearchInput, setJournalSearchInput] = useState("");
    const [journalAction, setJournalAction] = useState("");
    const [journalDateFilter, setJournalDateFilter] = useState<{ from: string | null; to: string | null }>({ from: null, to: null });
    const [journalCleanupMonths, setJournalCleanupMonths] = useState("12");
    const [journalStatus, setJournalStatus] = useState("");
    const [journalStatusType, setJournalStatusType] = useState<"" | "success" | "error">("");

    const [users, setUsers] = useState<AdminUser[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [userLimit, setUserLimit] = useState(defaultPageLimit);
    const [userSearch, setUserSearch] = useState("");
    const [userRoleFilter, setUserRoleFilter] = useState<string>("all");
    const [userPage, setUserPage] = useState(1);
    const [showUserDetailModal, setShowUserDetailModal] = useState(false);
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
    const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
    const [showBlockConfirmModal, setShowBlockConfirmModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
    const [selectedUserRole, setSelectedUserRole] = useState("");
    const [userStats, setUserStats] = useState<{ documentCount: number; commentCount: number; sessionCount: number } | null>(null);
    const [newUserForm, setNewUserForm] = useState({ fullName: "", email: "", password: "", role: "operator", departmentId: "" });
    const [resetPasswordForm, setResetPasswordForm] = useState({ newPassword: "" });
    const [usersStatus, setUsersStatus] = useState("");
    const [usersStatusType, setUsersStatusType] = useState<"" | "success" | "error">("");

    const [uploadMaxSize, setUploadMaxSize] = useState("50");
    const [uploadMaxFiles, setUploadMaxFiles] = useState("15");
    const [allowedFormats, setAllowedFormats] = useState<string[]>(["pdf", "docx", "txt", "xlsx", "jpg", "jpeg", "png", "tiff"]);
    const [cleanupDocsMonths, setCleanupDocsMonths] = useState("12");
    const [cleanupNotifMonths, setCleanupNotifMonths] = useState("3");
    const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);
    const [cleanupConfirmType, setCleanupConfirmType] = useState<"documents" | "notifications" | "audit">("documents");
    const [logsDateFrom, setLogsDateFrom] = useState("");
    const [logsDateTo, setLogsDateTo] = useState("");
    const [uploadStatus, setUploadStatus] = useState("");
    const [uploadStatusType, setUploadStatusType] = useState<"" | "success" | "error">("");
    const [cleanupStatus, setCleanupStatus] = useState("");
    const [cleanupStatusType, setCleanupStatusType] = useState<"" | "success" | "error">("");
    const [logsStatus, setLogsStatus] = useState("");
    const [logsStatusType, setLogsStatusType] = useState<"" | "success" | "error">("");

    const [exportSections, setExportSections] = useState<string[]>(["documents", "references", "users", "settings", "routes", "audit"]);
    const [fullImportFile, setFullImportFile] = useState<File | null>(null);
    const [fullImportFileName, setFullImportFileName] = useState("");
    const [selectiveImportFile, setSelectiveImportFile] = useState<File | null>(null);
    const [selectiveImportFileName, setSelectiveImportFileName] = useState("");
    const [importSections, setImportSections] = useState<string[]>(["documents", "references", "users"]);
    const [fullExportStatus, setFullExportStatus] = useState("");
    const [fullExportStatusType, setFullExportStatusType] = useState<"" | "success" | "error">("");
    const [fullImportStatus, setFullImportStatus] = useState("");
    const [fullImportStatusType, setFullImportStatusType] = useState<"" | "success" | "error">("");
    const [selectiveExportStatus, setSelectiveExportStatus] = useState("");
    const [selectiveExportStatusType, setSelectiveExportStatusType] = useState<"" | "success" | "error">("");
    const [selectiveImportStatus, setSelectiveImportStatus] = useState("");
    const [selectiveImportStatusType, setSelectiveImportStatusType] = useState<"" | "success" | "error">("");

    const [stats, setStats] = useState<AdminStats | null>(null);

    const [notifTarget, setNotifTarget] = useState<string>("all");
    const [notifUserIds, setNotifUserIds] = useState<number[]>([]);
    const [notifTitle, setNotifTitle] = useState("");
    const [notifMessage, setNotifMessage] = useState("");
    const [notifHistory, setNotifHistory] = useState<any[]>([]);
    const [notifHistoryPage, setNotifHistoryPage] = useState(1);
    const [notifHistoryTotalPages, setNotifHistoryTotalPages] = useState(1);
    const [notifHistoryLimit, setNotifHistoryLimit] = useState(defaultPageLimit);
    const [notifHistoryDateFilter, setNotifHistoryDateFilter] = useState<{ from: string | null; to: string | null }>({ from: null, to: null });
    const [notifStatus, setNotifStatus] = useState("");
    const [notifStatusType, setNotifStatusType] = useState<"" | "success" | "error">("");

    const [themeKey, setThemeKey] = useState(0);

    const [activeFilter, setActiveFilter] = useState<string | null>(null);
    const toggleFilter = (filterId: string) => {
        setActiveFilter(prev => (prev === filterId ? null : filterId));
    };

    useEffect(() => {
        setThemeKey(prev => prev + 1);
    }, [theme]);

    const hasJournalFilters = !!(journalSearch || journalAction || journalDateFilter.from || journalDateFilter.to);
    const hasUserFilters = !!(userSearch || userRoleFilter !== "all");

    const showStatus = (setter: (msg: string) => void, typeSetter: (t: "" | "success" | "error") => void, msg: string, type: "" | "success" | "error") => {
        setter(msg);
        typeSetter(type);
        setTimeout(() => { setter(""); typeSetter(""); }, 4000);
    };

    const fetchJournal = useCallback(async (page = 1) => {
        setLoading(true);
        setError(null);
        try {
            const params: any = { page, limit: journalLimit };
            if (journalAction) params.action = journalAction;
            if (journalDateFilter.from) params.dateFrom = journalDateFilter.from;
            if (journalDateFilter.to) params.dateTo = journalDateFilter.to;
            if (journalSearch) params.userName = journalSearch;
            const res = await getAdminAuditLog(params);
            setJournal(res.items);
            setJournalPage(page);
            setJournalTotalPages(res.totalPages);
            setJournalTotal(res.total);
        } catch {
            setError("Ошибка загрузки журнала");
        } finally {
            setLoading(false);
        }
    }, [journalLimit, journalAction, journalDateFilter, journalSearch]);

    const fetchUsers = async () => {
        setLoading(true);
        setError(null);
        try {
            const [usersRes, deptsRes] = await Promise.all([
                getAdminUsers(),
                getDepartments(),
            ]);
            setUsers(usersRes);
            setDepartments(deptsRes);
        } catch {
            setError("Ошибка загрузки пользователей");
        } finally {
            setLoading(false);
        }
    };

    const fetchSystemSettings = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getAdminSystemSettings();
            const maxSize = parseInt(res["upload.max_file_size_mb"] || "50", 10);
            const maxFiles = parseInt(res["upload.max_files_per_batch"] || "15", 10);
            setUploadMaxSize(String(maxSize > 0 ? maxSize : 50));
            setUploadMaxFiles(String(maxFiles > 0 ? maxFiles : 15));
            const formats = res["upload.allowed_formats"];
            if (Array.isArray(formats)) {
                setAllowedFormats(formats);
            } else if (typeof formats === 'string') {
                try { setAllowedFormats(JSON.parse(formats)); } catch { setAllowedFormats(["pdf", "docx", "txt", "xlsx", "jpg", "jpeg", "png", "tiff"]); }
            }
            const cleanupRules = res["cleanup_rules"];
            if (cleanupRules) {
                if (typeof cleanupRules === 'string') {
                    try {
                        const parsed = JSON.parse(cleanupRules);
                        setCleanupDocsMonths(String(parsed.documentsOlderMonths || 12));
                        setCleanupNotifMonths(String(parsed.notificationsOlderMonths || 3));
                    } catch {}
                } else {
                    setCleanupDocsMonths(String(cleanupRules.documentsOlderMonths || 12));
                    setCleanupNotifMonths(String(cleanupRules.notificationsOlderMonths || 3));
                }
            }
        } catch {
            setError("Ошибка загрузки системных настроек");
        } finally {
            setLoading(false);
        }
    };

    const fetchStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await getAdminStats();
            setStats(res);
        } catch {
            setError("Ошибка загрузки статистики");
        } finally {
            setLoading(false);
        }
    };

    const fetchNotifHistory = useCallback(async (page = 1) => {
        try {
            const res = await getAdminNotificationHistory(page, notifHistoryLimit);
            let items = res.items;
            if (notifHistoryDateFilter.from || notifHistoryDateFilter.to) {
                items = items.filter((item: any) => {
                    const d = new Date(item.createdAt).toISOString().split('T')[0];
                    if (notifHistoryDateFilter.from && d < notifHistoryDateFilter.from) return false;
                    if (notifHistoryDateFilter.to && d > notifHistoryDateFilter.to) return false;
                    return true;
                });
            }
            setNotifHistory(items);
            setNotifHistoryPage(page);
            setNotifHistoryTotalPages(res.totalPages);
        } catch {}
    }, [notifHistoryLimit, notifHistoryDateFilter]);

    useEffect(() => {
        if (activeTab === "journal") fetchJournal();
        else if (activeTab === "users") fetchUsers();
        else if (activeTab === "system") fetchSystemSettings();
        else if (activeTab === "stats") fetchStats();
        else if (activeTab === "notifications") { fetchNotifHistory(); fetchUsers(); }
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === "journal") fetchJournal();
    }, [journalLimit, journalAction, journalDateFilter, journalSearch]);

    useEffect(() => {
        if (activeTab === "notifications") fetchNotifHistory();
    }, [notifHistoryLimit, notifHistoryDateFilter]);

    const handleJournalSearch = () => {
        setJournalSearch(journalSearchInput);
        setJournalPage(1);
    };

    const handleSaveSystemSettings = async () => {
        const maxSize = parseInt(uploadMaxSize, 10);
        const maxFiles = parseInt(uploadMaxFiles, 10);
        if (isNaN(maxSize) || maxSize < 1) {
            showStatus(setUploadStatus, setUploadStatusType, "Размер файла должен быть не менее 1 МБ", "error");
            return;
        }
        if (isNaN(maxFiles) || maxFiles < 1) {
            showStatus(setUploadStatus, setUploadStatusType, "Количество файлов должно быть не менее 1", "error");
            return;
        }
        try {
            await updateAdminSystemSettings({
                "upload.max_file_size_mb": String(maxSize),
                "upload.max_files_per_batch": String(maxFiles),
                "upload.allowed_formats": allowedFormats,
            });
            showStatus(setUploadStatus, setUploadStatusType, "Настройки сохранены", "success");
        } catch {
            showStatus(setUploadStatus, setUploadStatusType, "Ошибка сохранения", "error");
        }
    };

    const handleCleanup = async () => {
        try {
            const months = cleanupConfirmType === "documents" ? parseInt(cleanupDocsMonths) 
                : cleanupConfirmType === "notifications" ? parseInt(cleanupNotifMonths)
                : parseInt(journalCleanupMonths);
            const type = cleanupConfirmType;
            const res = await adminCleanup(type, months);
            if (cleanupConfirmType === "audit") {
                showStatus(setJournalStatus, setJournalStatusType, res.message, "success");
            } else {
                showStatus(setCleanupStatus, setCleanupStatusType, res.message, "success");
            }
            setShowCleanupConfirm(false);
            if (cleanupConfirmType === "audit") {
                fetchJournal();
            }
        } catch {
            if (cleanupConfirmType === "audit") {
                showStatus(setJournalStatus, setJournalStatusType, "Ошибка очистки", "error");
            } else {
                showStatus(setCleanupStatus, setCleanupStatusType, "Ошибка очистки", "error");
            }
        }
    };

    const handleDownloadLogs = async (mode: "today" | "period") => {
        try {
            let blob: Blob;
            if (mode === "today") {
                blob = await getAdminLogs();
            } else {
                if (!logsDateFrom || !logsDateTo) {
                    showStatus(setLogsStatus, setLogsStatusType, "Выберите период", "error");
                    return;
                }
                blob = await getAdminLogs(undefined, logsDateFrom, logsDateTo);
            }
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `logs-${mode === "today" ? new Date().toISOString().slice(0, 10) : `${logsDateFrom}_${logsDateTo}`}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            showStatus(setLogsStatus, setLogsStatusType, "Логи скачаны", "success");
        } catch {
            showStatus(setLogsStatus, setLogsStatusType, "Ошибка скачивания логов", "error");
        }
    };

    const handleFullExport = async () => {
        try {
            const blob = await exportData();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `full_backup_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            showStatus(setFullExportStatus, setFullExportStatusType, "Полная копия скачана", "success");
        } catch {
            showStatus(setFullExportStatus, setFullExportStatusType, "Ошибка экспорта", "error");
        }
    };

    const handleFullImport = async () => {
        if (!fullImportFile) {
            showStatus(setFullImportStatus, setFullImportStatusType, "Выберите файл", "error");
            return;
        }
        try {
            const res = await importData(fullImportFile);
            showStatus(setFullImportStatus, setFullImportStatusType, res.message, "success");
            setFullImportFile(null);
            setFullImportFileName("");
        } catch {
            showStatus(setFullImportStatus, setFullImportStatusType, "Ошибка импорта", "error");
        }
    };

    const handleSelectiveExport = async () => {
        try {
            const data = await adminExport(exportSections);
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `backup_${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            showStatus(setSelectiveExportStatus, setSelectiveExportStatusType, "Данные экспортированы", "success");
        } catch {
            showStatus(setSelectiveExportStatus, setSelectiveExportStatusType, "Ошибка экспорта", "error");
        }
    };

    const handleSelectiveImport = async () => {
        if (!selectiveImportFile) {
            showStatus(setSelectiveImportStatus, setSelectiveImportStatusType, "Выберите файл", "error");
            return;
        }
        try {
            const res = await adminImport(selectiveImportFile, importSections);
            showStatus(setSelectiveImportStatus, setSelectiveImportStatusType, res.message, "success");
            setSelectiveImportFile(null);
            setSelectiveImportFileName("");
        } catch {
            showStatus(setSelectiveImportStatus, setSelectiveImportStatusType, "Ошибка импорта", "error");
        }
    };

    const handleRoleChange = async (userId: number, role: string) => {
        try {
            await updateAdminUserRole(userId, role);
            showStatus(setUsersStatus, setUsersStatusType, "Роль изменена", "success");
            fetchUsers();
        } catch {
            showStatus(setUsersStatus, setUsersStatusType, "Ошибка изменения роли", "error");
        }
    };

    const handleToggleBlock = async () => {
        if (!selectedUser) return;
        try {
            await toggleAdminUserBlock(selectedUser.id, !selectedUser.isBlocked);
            showStatus(setUsersStatus, setUsersStatusType, selectedUser.isBlocked ? "Пользователь разблокирован" : "Пользователь заблокирован", "success");
            setShowBlockConfirmModal(false);
            setShowUserDetailModal(false);
            setSelectedUser(null);
            fetchUsers();
        } catch {
            showStatus(setUsersStatus, setUsersStatusType, "Ошибка", "error");
        }
    };

    const handleResetPassword = async () => {
        if (!selectedUser || !resetPasswordForm.newPassword) return;
        try {
            await resetAdminUserPassword(selectedUser.id, resetPasswordForm.newPassword);
            showStatus(setUsersStatus, setUsersStatusType, "Пароль сброшен", "success");
            setShowResetPasswordModal(false);
            setShowUserDetailModal(false);
            setResetPasswordForm({ newPassword: "" });
            setSelectedUser(null);
        } catch {
            showStatus(setUsersStatus, setUsersStatusType, "Ошибка сброса пароля", "error");
        }
    };

    const handleDeleteUser = async () => {
        if (!selectedUser) return;
        try {
            await deleteAdminUser(selectedUser.id);
            showStatus(setUsersStatus, setUsersStatusType, "Пользователь удалён", "success");
            setShowDeleteUserModal(false);
            setShowUserDetailModal(false);
            setSelectedUser(null);
            setUserStats(null);
            fetchUsers();
        } catch {
            showStatus(setUsersStatus, setUsersStatusType, "Ошибка удаления", "error");
        }
    };

    const handleCreateUser = async () => {
        if (!newUserForm.fullName || !newUserForm.email || !newUserForm.password) {
            showStatus(setUsersStatus, setUsersStatusType, "Заполните обязательные поля", "error");
            return;
        }
        try {
            await createAdminUser({
                fullName: newUserForm.fullName,
                email: newUserForm.email,
                password: newUserForm.password,
                role: newUserForm.role,
                departmentId: newUserForm.departmentId ? parseInt(newUserForm.departmentId) : undefined,
            });
            showStatus(setUsersStatus, setUsersStatusType, "Пользователь создан", "success");
            setShowAddUserModal(false);
            setNewUserForm({ fullName: "", email: "", password: "", role: "operator", departmentId: "" });
            fetchUsers();
        } catch (err: any) {
            showStatus(setUsersStatus, setUsersStatusType, err?.response?.data?.message || "Ошибка создания", "error");
        }
    };

    const handleSendNotification = async () => {
        if (!notifTitle.trim() || !notifMessage.trim()) {
            showStatus(setNotifStatus, setNotifStatusType, "Заполните заголовок и сообщение", "error");
            return;
        }
        try {
            const res = await sendAdminNotification({
                target: notifTarget,
                userIds: notifTarget === "selected" ? notifUserIds : undefined,
                title: notifTitle,
                message: notifMessage,
            });
            showStatus(setNotifStatus, setNotifStatusType, res.message, "success");
            setNotifTitle("");
            setNotifMessage("");
            setNotifUserIds([]);
            fetchNotifHistory();
        } catch {
            showStatus(setNotifStatus, setNotifStatusType, "Ошибка отправки", "error");
        }
    };

    const handleUserClick = async (user: AdminUser) => {
        setSelectedUser(user);
        setSelectedUserRole(user.role);
        try {
            const stats = await getAdminUserStats(user.id);
            setUserStats(stats);
        } catch {
            setUserStats(null);
        }
        setShowUserDetailModal(true);
    };

    const toggleExportSection = (section: string) => {
        setExportSections(prev => prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]);
    };

    const toggleImportSection = (section: string) => {
        setImportSections(prev => prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]);
    };

    const toggleFormat = (format: string) => {
        setAllowedFormats(prev => prev.includes(format) ? prev.filter(f => f !== format) : [...prev, format]);
    };

    const filteredUsers = users.filter(u => {
        const q = userSearch.toLowerCase();
        const matchesSearch = !q || u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
        const matchesRole = userRoleFilter === "all" || u.role === userRoleFilter;
        return matchesSearch && matchesRole;
    });

    const totalUserPages = Math.ceil(filteredUsers.length / userLimit) || 1;
    const pagedUsers = filteredUsers.slice((userPage - 1) * userLimit, userPage * userLimit);

    const TABS: { key: Tab; label: string }[] = [
        { key: "journal", label: "Журнал" },
        { key: "users", label: "Пользователи" },
        { key: "system", label: "Система" },
        { key: "backup", label: "Резервное копирование" },
        { key: "stats", label: "Статистика" },
        { key: "notifications", label: "Уведомления" },
    ];

    const ALL_FORMATS = ["pdf", "docx", "txt", "xlsx", "jpg", "jpeg", "png", "tiff"];
    const ALL_SECTIONS = [
        { key: "documents", label: "Документы" },
        { key: "references", label: "Справочники" },
        { key: "users", label: "Пользователи" },
        { key: "settings", label: "Настройки" },
        { key: "routes", label: "История маршрутов" },
        { key: "audit", label: "Аудит" },
    ];
    const IMPORT_SECTIONS = [
        { key: "documents", label: "Документы" },
        { key: "references", label: "Справочники" },
        { key: "users", label: "Пользователи" },
    ];

    return (
        <div>
            <h2 className="page-title">Администрирование</h2>
            <p className="page-subtitle">Управление системой, пользователями и настройками</p>

            <Card className="settings-tabs">
                {TABS.map(tab => (
                    <button
                        key={tab.key}
                        className={`tab ${activeTab === tab.key ? "active" : ""}`}
                        onClick={() => setActiveTab(tab.key)}
                    >
                        {tab.label}
                    </button>
                ))}
            </Card>

            {loading && (
                <Card className="cuttinPaddin">
                    <div className="admin-skeleton">
                        <div className="skeleton-title" />
                        <div className="skeleton-text" />
                        <div className="skeleton-text short" />
                    </div>
                </Card>
            )}

            {error && !loading && (
                <Card className="error-state-card">
                    <div className="error-state">
                        <p className="error-text">{error}</p>
                        <button className="apply-button" onClick={() => {
                            if (activeTab === "journal") fetchJournal();
                            else if (activeTab === "users") fetchUsers();
                            else if (activeTab === "system") fetchSystemSettings();
                            else if (activeTab === "stats") fetchStats();
                        }}>Повторить</button>
                    </div>
                </Card>
            )}

            {!loading && !error && (
                <>
                    {activeTab === "journal" && (
                        <>
                            <Card className="filtersButtsWrapper">
                                <Tooltip text="Поиск по имени пользователя или email. Нажмите Enter для поиска">
                                    <input
                                        className="settings-form-input admin-filter-input-wide"
                                        type="text"
                                        placeholder="Поиск по ФИО или Email"
                                        value={journalSearchInput}
                                        onChange={e => setJournalSearchInput(e.target.value)}
                                        onKeyDown={e => { if (e.key === 'Enter') handleJournalSearch(); }}
                                    />
                                </Tooltip>
                                {journalSearchInput.trim() && (
                                    <Tooltip text="Найти">
                                        <button className="apply-button" onClick={handleJournalSearch}>Найти</button>
                                    </Tooltip>
                                )}
                                <Tooltip text="Фильтр по типу действия">
                                    <DropdownButton
                                        options={ACTION_OPTIONS}
                                        selectedLabel={journalAction ? getActionLabel(journalAction) : "Действие"}
                                        onSelect={(label) => {
                                            setJournalAction(REVERSE_ACTION_MAP[label] || "");
                                        }}
                                        icon={<img src={getThemedIcon("/icons/filters/Category.png")} key={themeKey} alt="Действие" />}
                                        defaultLabel="Действие"
                                        isOpen={activeFilter === 'journalAction'}
                                        onToggle={() => toggleFilter('journalAction')}
                                    />
                                </Tooltip>
                                <Tooltip text="Фильтр по дате">
                                    <DateFilterDropdown
                                        onFilterChange={(range) => setJournalDateFilter(range)}
                                        icon={<img src={getThemedIcon("/icons/filters/data.png")} key={themeKey} alt="Дата" />}
                                        isOpen={activeFilter === 'journalDate'}
                                        onToggle={() => toggleFilter('journalDate')}
                                    />
                                </Tooltip>
                                <Tooltip text="Количество записей на странице">
                                    <DropdownButton
                                        options={['5', '10', '20', '50']}
                                        selectedLabel={String(journalLimit)}
                                        onSelect={(value) => {
                                            const newLimit = parseInt(value, 10);
                                            if (!isNaN(newLimit)) setJournalLimit(newLimit);
                                        }}
                                        defaultLabel={String(defaultPageLimit)}
                                        isOpen={activeFilter === 'journalLimit'}
                                        onToggle={() => toggleFilter('journalLimit')}
                                    />
                                </Tooltip>
                                {hasJournalFilters && (
                                    <Tooltip text="Сбросить все фильтры журнала">
                                        <button
                                            className="removeFiltersButt"
                                            onClick={() => {
                                                setJournalSearchInput("");
                                                setJournalSearch("");
                                                setJournalAction("");
                                                setJournalDateFilter({ from: null, to: null });
                                                setJournalPage(1);
                                            }}
                                        >
                                            Сбросить фильтры
                                        </button>
                                    </Tooltip>
                                )}
                            </Card>

                            <Card className="filtersButtsWrapper">
                                <div className="admin-journal-cleanup-row">
                                    <span className="admin-journal-cleanup-label">Удалить записи старше</span>
                                    <input
                                        className="admin-journal-cleanup-input"
                                        type="number"
                                        min="1"
                                        placeholder="12"
                                        value={journalCleanupMonths}
                                        onChange={e => setJournalCleanupMonths(e.target.value)}
                                    />
                                    <span className="admin-journal-cleanup-unit">месяцев</span>
                                    <Tooltip text="Удалить все записи журнала старше указанного срока. Действие необратимо.">
                                        <button
                                            className="apply-button"
                                            onClick={() => {
                                                setCleanupConfirmType("audit");
                                                setShowCleanupConfirm(true);
                                            }}
                                        >
                                            Очистить журнал
                                        </button>
                                    </Tooltip>
                                    {journalStatus && (
                                        <span className={`settings-status ${journalStatusType} admin-journal-cleanup-status`}>
                                            {journalStatus}
                                        </span>
                                    )}
                                </div>
                            </Card>

                            <Card className="cuttinPaddin">
                                <Table
                                    title={<h4>Все записи ({journalTotal})</h4>}
                                    rightTitle={journalTotalPages > 1 && (
                                        <span className="UltimatePaginationWrapper">
                                            <Pagination page={journalPage} totalPages={journalTotalPages} onPageChange={(p) => fetchJournal(p)} />
                                        </span>
                                    )}
                                >
                                    <thead>
                                        <tr>
                                            <th>Дата</th>
                                            <th>Пользователь</th>
                                            <th>Действие</th>
                                            <th>Документ</th>
                                            <th>Описание</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {journal.length === 0 ? (
                                            <tr><td colSpan={5} className="empty-cell">Нет записей</td></tr>
                                        ) : journal.map(item => (
                                            <tr key={item.id}>
                                                <td>{formatMoscowDateTime(item.createdAt)}</td>
                                                <td>
                                                    <span className="security-user-cell">
                                                        {item.userAvatarUrl ? (
                                                            <img
                                                                src={item.userAvatarUrl.startsWith('http') ? item.userAvatarUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${item.userAvatarUrl}`}
                                                                className="security-avatar"
                                                                alt=""
                                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                            />
                                                        ) : (
                                                            <span className="security-avatar security-avatar--initials">
                                                                {item.userName?.charAt(0) || '?'}
                                                            </span>
                                                        )}
                                                        {item.userName}
                                                    </span>
                                                </td>
                                                <td>{getActionLabel(item.action)}</td>
                                                <td>{item.documentId ? `ВХ-2026-${String(item.documentId).padStart(3, '0')}` : '-'}</td>
                                                <td className="security-details-cell">{getDetailsText(item.details)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </Card>
                        </>
                    )}

                    {activeTab === "users" && (
                        <>
                            <Card className="filtersButtsWrapper">
                                <Tooltip text="Создать нового пользователя в системе">
                                    <button className="apply-button" onClick={() => {
                                        setShowAddUserModal(true);
                                        setNewUserForm({ fullName: "", email: "", password: "", role: "operator", departmentId: "" });
                                    }}>
                                        + Добавить пользователя
                                    </button>
                                </Tooltip>
                                <Tooltip text="Поиск по ФИО или Email">
                                    <input
                                        className="settings-form-input admin-filter-input-wide"
                                        type="text"
                                        placeholder="Поиск по ФИО или Email"
                                        value={userSearch}
                                        onChange={e => { setUserSearch(e.target.value); setUserPage(1); }}
                                    />
                                </Tooltip>
                                <Tooltip text="Фильтр по роли">
                                    <DropdownButton
                                        options={["Все", "Администраторы", "Операторы"]}
                                        selectedLabel={userRoleFilter === "all" ? "Все" : userRoleFilter === "admin" ? "Администраторы" : "Операторы"}
                                        onSelect={(val) => {
                                            if (val === "Все") setUserRoleFilter("all");
                                            else if (val === "Администраторы") setUserRoleFilter("admin");
                                            else setUserRoleFilter("operator");
                                            setUserPage(1);
                                        }}
                                        icon={<img src={getThemedIcon("/icons/filters/Operators.png")} key={themeKey} alt="Роль" />}
                                        defaultLabel="Все"
                                        isOpen={activeFilter === 'userRoleFilter'}
                                        onToggle={() => toggleFilter('userRoleFilter')}
                                    />
                                </Tooltip>
                                <Tooltip text="Количество пользователей на странице">
                                    <DropdownButton
                                        options={['5', '10', '20', '50']}
                                        selectedLabel={String(userLimit)}
                                        onSelect={(value) => {
                                            const newLimit = parseInt(value, 10);
                                            if (!isNaN(newLimit)) { setUserLimit(newLimit); setUserPage(1); }
                                        }}
                                        defaultLabel={String(defaultPageLimit)}
                                        isOpen={activeFilter === 'userLimit'}
                                        onToggle={() => toggleFilter('userLimit')}
                                    />
                                </Tooltip>
                                {hasUserFilters && (
                                    <Tooltip text="Сбросить все фильтры пользователей">
                                        <button
                                            className="removeFiltersButt"
                                            onClick={() => {
                                                setUserSearch("");
                                                setUserRoleFilter("all");
                                                setUserPage(1);
                                            }}
                                        >
                                            Сбросить фильтры
                                        </button>
                                    </Tooltip>
                                )}
                            </Card>

                            {usersStatus && (
                                <div className="settings-actions">
                                    <span className={`settings-status ${usersStatusType}`}>{usersStatus}</span>
                                </div>
                            )}

                            <Card className="cuttinPaddin">
                                <p className="admin-users-hint">Нажмите на пользователя, чтобы открыть карточку с информацией и действиями</p>
                                <Table
                                    title={<h4>Все пользователи ({filteredUsers.length})</h4>}
                                    rightTitle={totalUserPages > 1 && (
                                        <span className="UltimatePaginationWrapper">
                                            <Pagination page={userPage} totalPages={totalUserPages} onPageChange={(p) => setUserPage(p)} />
                                        </span>
                                    )}
                                >
                                    <thead>
                                        <tr>
                                            <th>Пользователь</th>
                                            <th>Email</th>
                                            <th>Роль</th>
                                            <th>Статус</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pagedUsers.length === 0 ? (
                                            <tr><td colSpan={4} className="empty-cell">Нет пользователей</td></tr>
                                        ) : pagedUsers.map(user => (
                                            <tr key={user.id} onClick={() => handleUserClick(user)} className="admin-user-row">
                                                <td>
                                                    <span className="security-user-cell">
                                                        {user.avatarUrl ? (
                                                            <img
                                                                src={user.avatarUrl.startsWith('http') ? user.avatarUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${user.avatarUrl}`}
                                                                className="security-avatar"
                                                                alt=""
                                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                            />
                                                        ) : (
                                                            <span className="security-avatar security-avatar--initials">
                                                                {user.fullName?.charAt(0) || '?'}
                                                            </span>
                                                        )}
                                                        {user.fullName}
                                                    </span>
                                                </td>
                                                <td>{user.email}</td>
                                                <td>{user.role === "admin" ? "Администратор" : "Оператор"}</td>
                                                <td>
                                                    <span className={`status-badge ${user.isBlocked ? 'status-rejected' : 'status-loaded'}`}>
                                                        {user.isBlocked ? 'Заблокирован' : 'Активен'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </Card>
                        </>
                    )}

                    {activeTab === "system" && (
                        <div className="admin-tab-content">
                            <Card className="admin-section-card">
                                <h4 className="admin-section-card-title">Ограничения загрузки</h4>
                                <div className="settings-form">
                                    <div className="admin-settings-grid">
                                        <div className="settings-form-row">
                                            <span className="settings-form-label">Макс. размер файла</span>
                                            <div className="admin-input-with-suffix">
                                                <input className="settings-form-input admin-filter-input-short" type="number" min="1" value={uploadMaxSize} onChange={e => setUploadMaxSize(e.target.value)} />
                                                <span className="admin-input-suffix">МБ</span>
                                            </div>
                                        </div>
                                        <div className="settings-form-row">
                                            <span className="settings-form-label">Макс. файлов за раз</span>
                                            <input className="settings-form-input admin-filter-input-short" type="number" min="1" value={uploadMaxFiles} onChange={e => setUploadMaxFiles(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="settings-form-row">
                                        <span className="settings-form-label">Разрешённые форматы</span>
                                        <div className="settings-form-control">
                                            <div className="settings-chips">
                                                {ALL_FORMATS.map(f => (
                                                    <span
                                                        key={f}
                                                        className={`settings-chip ${allowedFormats.includes(f) ? 'active' : ''}`}
                                                        onClick={() => toggleFormat(f)}
                                                    >
                                                        {f.toUpperCase()}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="settings-actions">
                                    <Tooltip text="Сохранить настройки загрузки">
                                        <button className="apply-button" onClick={handleSaveSystemSettings}>Сохранить</button>
                                    </Tooltip>
                                    {uploadStatus && (
                                        <span className={`settings-status ${uploadStatusType}`}>{uploadStatus}</span>
                                    )}
                                </div>
                            </Card>

                            <Card className="admin-section-card">
                                <h4 className="admin-section-card-title">Очистка данных</h4>
                                <div className="admin-cleanup-grid">
                                    <div className="admin-cleanup-row">
                                        <span className="admin-cleanup-label">Удалить документы старше</span>
                                        <input className="settings-form-input admin-filter-input-short" type="number" min="1" value={cleanupDocsMonths} onChange={e => setCleanupDocsMonths(e.target.value)} />
                                        <span className="admin-cleanup-unit">месяцев</span>
                                        <Tooltip text="Удалить все документы старше указанного срока. Действие необратимо.">
                                            <button className="apply-button" onClick={() => { setCleanupConfirmType("documents"); setShowCleanupConfirm(true); }}>Выполнить очистку</button>
                                        </Tooltip>
                                    </div>
                                    <div className="admin-cleanup-row">
                                        <span className="admin-cleanup-label">Удалить прочитанные уведомления старше</span>
                                        <input className="settings-form-input admin-filter-input-short" type="number" min="1" value={cleanupNotifMonths} onChange={e => setCleanupNotifMonths(e.target.value)} />
                                        <span className="admin-cleanup-unit">месяцев</span>
                                        <Tooltip text="Удалить все прочитанные уведомления старше указанного срока. Действие необратимо.">
                                            <button className="apply-button" onClick={() => { setCleanupConfirmType("notifications"); setShowCleanupConfirm(true); }}>Выполнить очистку</button>
                                        </Tooltip>
                                    </div>
                                </div>
                                <p className="text-tertiary admin-cleanup-warning">Операции очистки необратимы</p>
                                {cleanupStatus && (
                                    <div className="settings-actions">
                                        <span className={`settings-status ${cleanupStatusType}`}>{cleanupStatus}</span>
                                    </div>
                                )}
                            </Card>

                            <Card className="admin-section-card">
                                <h4 className="admin-section-card-title">Логи сервера</h4>
                                <div className="admin-logs-grid">
                                    <div className="admin-logs-row">
                                        <Tooltip text="Скачать файл логов за текущую дату">
                                            <button className="apply-button" onClick={() => handleDownloadLogs("today")}>Скачать логи за сегодня</button>
                                        </Tooltip>
                                    </div>
                                    <div className="admin-logs-row">
                                        <span className="admin-cleanup-label">Скачать за период</span>
                                        <span className="admin-logs-period-label">с</span>
                                        <input className="settings-form-input admin-filter-input-auto" type="date" value={logsDateFrom} onChange={e => setLogsDateFrom(e.target.value)} />
                                        <span className="admin-logs-period-label">по</span>
                                        <input className="settings-form-input admin-filter-input-auto" type="date" value={logsDateTo} onChange={e => setLogsDateTo(e.target.value)} />
                                        <Tooltip text="Скачать логи за выбранный период">
                                            <button className="apply-button" onClick={() => handleDownloadLogs("period")}>Скачать</button>
                                        </Tooltip>
                                    </div>
                                </div>
                                {logsStatus && (
                                    <div className="settings-actions">
                                        <span className={`settings-status ${logsStatusType}`}>{logsStatus}</span>
                                    </div>
                                )}
                            </Card>
                        </div>
                    )}

                    {activeTab === "backup" && (
                        <div className="admin-tab-content--backup">
                            <div className="admin-backup-wrapper">
                                <div className="admin-backup-card">
                                    <h4 className="admin-section-card-title">Экспорт полной копии</h4>
                                    <p className="admin-backup-card-description">
                                        Создание полной резервной копии всех данных системы, включая документы, OCR-результаты, AI-анализ, комментарии и уведомления.
                                    </p>
                                    <div className="admin-backup-card-body">
                                        <div className="admin-backup-card-actions">
                                            <Tooltip text="Скачать полную копию всех данных системы в одном файле">
                                                <button className="apply-button" onClick={handleFullExport}>
                                                    Скачать полную копию
                                                </button>
                                            </Tooltip>
                                            {fullExportStatus && (
                                                <span className={`settings-status ${fullExportStatusType}`}>{fullExportStatus}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="admin-backup-card">
                                    <h4 className="admin-section-card-title">Импорт полной копии</h4>
                                    <p className="admin-backup-card-description">
                                        Восстановление системы из полной резервной копии. Все текущие данные будут заменены.
                                    </p>
                                    <div className="admin-backup-card-body">
                                        <div className="admin-backup-file-selector">
                                            <label>
                                                <input
                                                    type="file"
                                                    accept=".json"
                                                    onChange={e => {
                                                        const file = e.target.files?.[0];
                                                        setFullImportFile(file || null);
                                                        setFullImportFileName(file?.name || "");
                                                    }}
                                                    className="admin-backup-file-input-hidden"
                                                />
                                                <span className="admin-backup-file-btn">
                                                    {fullImportFileName || "Выбрать файл"}
                                                </span>
                                            </label>
                                            {fullImportFileName && (
                                                <span className="admin-backup-file-name">{fullImportFileName}</span>
                                            )}
                                        </div>
                                        <p className="admin-backup-warning-text">
                                            Все текущие данные будут заменены данными из файла
                                        </p>
                                        <div className="admin-backup-card-actions">
                                            <Tooltip text="Загрузить полную копию системы из файла">
                                                <button
                                                    className="apply-button"
                                                    onClick={handleFullImport}
                                                    disabled={!fullImportFile}
                                                >
                                                    Загрузить полную копию
                                                </button>
                                            </Tooltip>
                                            {fullImportStatus && (
                                                <span className={`settings-status ${fullImportStatusType}`}>{fullImportStatus}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="admin-backup-wrapper">
                                <div className="admin-backup-card">
                                    <h4 className="admin-section-card-title">Выборочный экспорт</h4>
                                    <p className="admin-backup-card-description">
                                        Экспорт только выбранных разделов данных.
                                    </p>
                                    <div className="admin-backup-card-body">
                                        <div className="admin-backup-sections-row">
                                            <span className="admin-backup-sections-label">Разделы:</span>
                                            <div className="admin-backup-chips">
                                                {ALL_SECTIONS.map(s => (
                                                    <span
                                                        key={s.key}
                                                        className={`admin-backup-chip ${exportSections.includes(s.key) ? 'active' : ''}`}
                                                        onClick={() => toggleExportSection(s.key)}
                                                    >
                                                        {s.label}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="admin-backup-card-actions">
                                            <Tooltip text="Экспортировать только выбранные разделы">
                                                <button className="apply-button" onClick={handleSelectiveExport}>
                                                    Экспортировать выбранное
                                                </button>
                                            </Tooltip>
                                            <Tooltip text="Экспортировать все разделы">
                                                <button
                                                    className="apply-button"
                                                    onClick={() => {
                                                        setExportSections(ALL_SECTIONS.map(s => s.key));
                                                        setTimeout(handleSelectiveExport, 100);
                                                    }}
                                                >
                                                    Экспортировать всё
                                                </button>
                                            </Tooltip>
                                            {selectiveExportStatus && (
                                                <span className={`settings-status ${selectiveExportStatusType}`}>{selectiveExportStatus}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="admin-backup-card">
                                    <h4 className="admin-section-card-title">Выборочный импорт</h4>
                                    <p className="admin-backup-card-description">
                                        Импорт данных только выбранных разделов из файла резервной копии.
                                    </p>
                                    <div className="admin-backup-card-body">
                                        <div className="admin-backup-file-selector">
                                            <label>
                                                <input
                                                    type="file"
                                                    accept=".json"
                                                    onChange={e => {
                                                        const file = e.target.files?.[0];
                                                        setSelectiveImportFile(file || null);
                                                        setSelectiveImportFileName(file?.name || "");
                                                    }}
                                                    className="admin-backup-file-input-hidden"
                                                />
                                                <span className="admin-backup-file-btn">
                                                    {selectiveImportFileName || "Выбрать файл"}
                                                </span>
                                            </label>
                                            {selectiveImportFileName && (
                                                <span className="admin-backup-file-name">{selectiveImportFileName}</span>
                                            )}
                                        </div>
                                        <div className="admin-backup-sections-row">
                                            <span className="admin-backup-sections-label">Импортировать:</span>
                                            <div className="admin-backup-chips">
                                                {IMPORT_SECTIONS.map(s => (
                                                    <span
                                                        key={s.key}
                                                        className={`admin-backup-chip ${importSections.includes(s.key) ? 'active' : ''}`}
                                                        onClick={() => toggleImportSection(s.key)}
                                                    >
                                                        {s.label}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        <p className="admin-backup-warning-text">
                                            Выбранные данные будут заменены
                                        </p>
                                        <div className="admin-backup-card-actions">
                                            <Tooltip text="Импортировать данные из выбранного файла">
                                                <button
                                                    className="apply-button"
                                                    onClick={handleSelectiveImport}
                                                    disabled={!selectiveImportFile}
                                                >
                                                    Импортировать
                                                </button>
                                            </Tooltip>
                                            {selectiveImportStatus && (
                                                <span className={`settings-status ${selectiveImportStatusType}`}>{selectiveImportStatus}</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === "stats" && stats && (
                        <div className="admin-tab-content">
                            <div className="admin-stats-grid">
                                <Card className="stat-card">
                                    <div className="stat-card-icon-wrap">
                                        <img src="/icons/admin/total.png" className="stat-card-icon" alt="" />
                                    </div>
                                    <div>
                                        <div className="stat-card-value">{stats.totalDocuments}</div>
                                        <div className="stat-card-label">Всего документов</div>
                                    </div>
                                </Card>
                                <Card className="stat-card">
                                    <div className="stat-card-icon-wrap">
                                        <img src="/icons/admin/users.png" className="stat-card-icon" alt="" />
                                    </div>
                                    <div>
                                        <div className="stat-card-value">{stats.totalUsers}</div>
                                        <div className="stat-card-label">Пользователей</div>
                                    </div>
                                </Card>
                                <Card className="stat-card">
                                    <div className="stat-card-icon-wrap">
                                        <img src="/icons/admin/confidence.png" className="stat-card-icon" alt="" />
                                    </div>
                                    <div>
                                        <div className="stat-card-value">{stats.averageConfidence}%</div>
                                        <div className="stat-card-label">Средняя уверенность</div>
                                    </div>
                                </Card>
                                <Card className="stat-card">
                                    <div className="stat-card-icon-wrap">
                                        <img src="/icons/admin/routes.png" className="stat-card-icon" alt="" />
                                    </div>
                                    <div>
                                        <div className="stat-card-value">{stats.totalRoutes}</div>
                                        <div className="stat-card-label">Маршрутов</div>
                                    </div>
                                </Card>
                            </div>

                            <Card className="admin-section-card">
                                <h4 className="admin-section-card-title">Документы по статусам</h4>
                                <div className="admin-chart-bars">
                                    {stats.statusStats.map(s => (
                                        <div key={s.status} className="admin-chart-bar-row">
                                            <span className="admin-chart-bar-label">
                                                <span className={`status-badge ${getStatusColorClass(s.status)}`}>
                                                    {translateStatus(s.status)}
                                                </span>
                                            </span>
                                            <div className="admin-chart-bar-wrap">
                                                <div
                                                    className="admin-chart-bar-fill"
                                                    style={{ width: `${Math.min((s.count / Math.max(...stats.statusStats.map(x => x.count), 1)) * 100, 100)}%` }}
                                                />
                                            </div>
                                            <span className="admin-chart-bar-count">{s.count}</span>
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            <Card className="admin-section-card">
                                <h4 className="admin-section-card-title">Активность пользователей</h4>
                                <Table>
                                    <thead>
                                        <tr>
                                            <th>Пользователь</th>
                                            <th>Действий</th>
                                            <th>Активность</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.userActivity.length === 0 ? (
                                            <tr><td colSpan={3} className="empty-cell">Нет данных</td></tr>
                                        ) : stats.userActivity.map(u => (
                                            <tr key={u.userId}>
                                                <td className="admin-activity-user">{u.userName}</td>
                                                <td className="admin-activity-count">{u.count}</td>
                                                <td className="admin-activity-bar-cell">
                                                    <div className="admin-chart-bar-wrap">
                                                        <div
                                                            className="admin-chart-bar-fill"
                                                            style={{ width: `${Math.min((u.count / Math.max(...stats.userActivity.map(x => x.count), 1)) * 100, 100)}%` }}
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </Card>
                        </div>
                    )}

                    {activeTab === "notifications" && (
                        <div className="admin-tab-content">
                            <Card className="admin-section-card">
                                <h4 className="admin-section-card-title">Рассылка уведомлений</h4>
                                <div className="settings-form">
                                    <div className="settings-form-row">
                                        <span className="settings-form-label">Кому</span>
                                        <div className="settings-form-control">
                                            <select className="settings-form-input" value={notifTarget} onChange={e => setNotifTarget(e.target.value)}>
                                                <option value="all">Все</option>
                                                <option value="admins">Администраторы</option>
                                                <option value="operators">Операторы</option>
                                                <option value="selected">Выбрать</option>
                                            </select>
                                        </div>
                                    </div>
                                    {notifTarget === "selected" && (
                                        <div className="settings-form-row">
                                            <span className="settings-form-label">Пользователи</span>
                                            <div className="settings-form-control">
                                                <div className="admin-notif-users-scroll">
                                                    <div className="settings-chips">
                                                        {users.map(u => (
                                                            <span
                                                                key={u.id}
                                                                className={`settings-chip ${notifUserIds.includes(u.id) ? 'active' : ''}`}
                                                                onClick={() => setNotifUserIds(prev => prev.includes(u.id) ? prev.filter(id => id !== u.id) : [...prev, u.id])}
                                                            >
                                                                {u.fullName}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    <div className="settings-form-row">
                                        <span className="settings-form-label">Заголовок</span>
                                        <input className="settings-form-input" type="text" value={notifTitle} onChange={e => setNotifTitle(e.target.value)} placeholder="Заголовок уведомления" />
                                    </div>
                                    <div className="settings-form-row">
                                        <span className="settings-form-label">Сообщение</span>
                                        <textarea className="settings-form-input admin-notif-textarea" value={notifMessage} onChange={e => setNotifMessage(e.target.value)} placeholder="Текст сообщения" rows={4} />
                                    </div>
                                    <div className="settings-actions">
                                        <Tooltip text="Отправить уведомление выбранным получателям">
                                            <button className="apply-button" onClick={handleSendNotification}>Отправить</button>
                                        </Tooltip>
                                        {notifStatus && (
                                            <span className={`settings-status ${notifStatusType}`}>{notifStatus}</span>
                                        )}
                                    </div>
                                </div>
                            </Card>

                            <Card className="admin-section-card">
                                <h4 className="admin-section-card-title">История рассылок</h4>
                                <Card className="filtersButtsWrapper admin-table-controls">
                                    <Tooltip text="Фильтр по дате">
                                        <DateFilterDropdown
                                            onFilterChange={(range) => setNotifHistoryDateFilter(range)}
                                            icon={<img src={getThemedIcon("/icons/filters/data.png")} key={themeKey} alt="Дата" />}
                                            isOpen={activeFilter === 'notifHistoryDate'}
                                            onToggle={() => toggleFilter('notifHistoryDate')}
                                        />
                                    </Tooltip>
                                    <Tooltip text="Количество записей на странице">
                                        <DropdownButton
                                            options={['5', '10', '20', '50']}
                                            selectedLabel={String(notifHistoryLimit)}
                                            onSelect={(value) => {
                                                const newLimit = parseInt(value, 10);
                                                if (!isNaN(newLimit)) setNotifHistoryLimit(newLimit);
                                            }}
                                            defaultLabel={String(defaultPageLimit)}
                                            isOpen={activeFilter === 'notifHistoryLimit'}
                                            onToggle={() => toggleFilter('notifHistoryLimit')}
                                        />
                                    </Tooltip>
                                    {(notifHistoryDateFilter.from || notifHistoryDateFilter.to) && (
                                        <Tooltip text="Сбросить фильтр даты">
                                            <button
                                                className="removeFiltersButt"
                                                onClick={() => setNotifHistoryDateFilter({ from: null, to: null })}
                                            >
                                                Сбросить фильтры
                                            </button>
                                        </Tooltip>
                                    )}
                                </Card>
                                <Table
                                    rightTitle={notifHistoryTotalPages > 1 && (
                                        <span className="UltimatePaginationWrapper">
                                            <Pagination page={notifHistoryPage} totalPages={notifHistoryTotalPages} onPageChange={(p) => setNotifHistoryPage(p)} />
                                        </span>
                                    )}
                                >
                                    <thead>
                                        <tr>
                                            <th>Дата</th>
                                            <th>Заголовок</th>
                                            <th>Получателей</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {notifHistory.length === 0 ? (
                                            <tr><td colSpan={3} className="empty-cell">Нет рассылок</td></tr>
                                        ) : notifHistory.map((item: any) => (
                                            <tr key={item.id}>
                                                <td>{formatMoscowDateTime(item.createdAt)}</td>
                                                <td>{item.details?.title || '-'}</td>
                                                <td>{item.details?.recipientsCount || '-'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </Card>
                        </div>
                    )}
                </>
            )}

            {showUserDetailModal && selectedUser && (
                <div className="modal-overlay" onClick={() => { setShowUserDetailModal(false); setSelectedUser(null); setUserStats(null); }}>
                    <div className="modal-content modal-content--user-detail" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{selectedUser.fullName}</h3>
                            <button className="modal-close" onClick={() => { setShowUserDetailModal(false); setSelectedUser(null); setUserStats(null); }}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="admin-user-detail-top">
                                <div className="admin-user-detail-avatar">
                                    {selectedUser.avatarUrl ? (
                                        <img
                                            src={selectedUser.avatarUrl.startsWith('http') ? selectedUser.avatarUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${selectedUser.avatarUrl}`}
                                            className="admin-user-detail-avatar-img"
                                            alt=""
                                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                        />
                                    ) : (
                                        <span className="admin-user-detail-avatar-initials">
                                            {selectedUser.fullName?.charAt(0) || '?'}
                                        </span>
                                    )}
                                </div>
                                <div className="admin-user-detail-info">
                                    <p className="admin-user-detail-email">{selectedUser.email}</p>
                                    <div className="admin-user-detail-meta-row">
                                        <span className="text-tertiary">{selectedUser.role === "admin" ? "Администратор" : "Оператор"}</span>
                                        <span className="admin-user-detail-separator">|</span>
                                        <span className={`status-badge ${selectedUser.isBlocked ? 'status-rejected' : 'status-loaded'}`}>
                                            {selectedUser.isBlocked ? 'Заблокирован' : 'Активен'}
                                        </span>
                                        <span className="admin-user-detail-separator">|</span>
                                        <span className="text-tertiary">{formatMoscowDate(selectedUser.createdAt)}</span>
                                    </div>
                                </div>
                            </div>

                            {userStats && (
                                <div className="admin-user-stats">
                                    <div className="admin-user-stats-item">
                                        <span className="admin-user-stats-value">{userStats.documentCount}</span>
                                        <span className="admin-user-stats-label">документов</span>
                                    </div>
                                    <div className="admin-user-stats-item">
                                        <span className="admin-user-stats-value">{userStats.commentCount}</span>
                                        <span className="admin-user-stats-label">комментариев</span>
                                    </div>
                                    <div className="admin-user-stats-item">
                                        <span className="admin-user-stats-value">{userStats.sessionCount}</span>
                                        <span className="admin-user-stats-label">сессий</span>
                                    </div>
                                </div>
                            )}

                            <div className="admin-user-detail-actions">
                                <div className="admin-user-detail-actions-grid">
                                    <div className="settings-form-row">
                                        <span className="settings-form-label">Роль</span>
                                        <select
                                            className="settings-form-input"
                                            value={selectedUserRole}
                                            onChange={e => {
                                                setSelectedUserRole(e.target.value);
                                                handleRoleChange(selectedUser.id, e.target.value);
                                                setSelectedUser(prev => prev ? { ...prev, role: e.target.value } : null);
                                            }}
                                        >
                                            <option value="admin">Администратор</option>
                                            <option value="operator">Оператор</option>
                                        </select>
                                    </div>
                                    <div className="admin-user-detail-actions-buttons">
                                        <Tooltip text="Сбросить пароль пользователя. Все сессии будут завершены.">
                                            <button
                                                className="apply-button"
                                                onClick={() => {
                                                    setResetPasswordForm({ newPassword: "" });
                                                    setShowResetPasswordModal(true);
                                                }}
                                            >
                                                Сбросить пароль
                                            </button>
                                        </Tooltip>
                                        <Tooltip text={selectedUser.isBlocked ? "Разблокировать пользователя" : "Заблокировать пользователя. Все сессии будут завершены."}>
                                            <button
                                                className={`apply-button ${!selectedUser.isBlocked ? 'admin-btn-danger' : ''}`}
                                                onClick={() => setShowBlockConfirmModal(true)}
                                            >
                                                {selectedUser.isBlocked ? 'Разблокировать' : 'Заблокировать'}
                                            </button>
                                        </Tooltip>
                                        <Tooltip text="Удалить пользователя безвозвратно.">
                                            <button
                                                className="apply-button admin-btn-danger"
                                                onClick={() => setShowDeleteUserModal(true)}
                                            >
                                                Удалить
                                            </button>
                                        </Tooltip>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="modal-btn-cancel" onClick={() => { setShowUserDetailModal(false); setSelectedUser(null); setUserStats(null); }}>Закрыть</button>
                        </div>
                    </div>
                </div>
            )}

            {showAddUserModal && (
                <div className="modal-overlay" onClick={() => setShowAddUserModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Добавить пользователя</h3>
                            <button className="modal-close" onClick={() => setShowAddUserModal(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <div className="settings-form">
                                <div className="settings-form-row">
                                    <span className="settings-form-label">ФИО</span>
                                    <input className="settings-form-input" type="text" value={newUserForm.fullName} onChange={e => setNewUserForm(prev => ({ ...prev, fullName: e.target.value }))} placeholder="Иванов Иван Иванович" />
                                </div>
                                <div className="settings-form-row">
                                    <span className="settings-form-label">Email</span>
                                    <input className="settings-form-input" type="email" value={newUserForm.email} onChange={e => setNewUserForm(prev => ({ ...prev, email: e.target.value }))} placeholder="user@example.com" />
                                </div>
                                <div className="settings-form-row">
                                    <span className="settings-form-label">Пароль</span>
                                    <input className="settings-form-input" type="password" value={newUserForm.password} onChange={e => setNewUserForm(prev => ({ ...prev, password: e.target.value }))} placeholder="Не менее 6 символов" />
                                </div>
                                <div className="settings-form-row">
                                    <span className="settings-form-label">Роль</span>
                                    <select className="settings-form-input" value={newUserForm.role} onChange={e => setNewUserForm(prev => ({ ...prev, role: e.target.value }))}>
                                        <option value="operator">Оператор</option>
                                        <option value="admin">Администратор</option>
                                    </select>
                                </div>
                                <div className="settings-form-row">
                                    <span className="settings-form-label">Отдел</span>
                                    <select className="settings-form-input" value={newUserForm.departmentId} onChange={e => setNewUserForm(prev => ({ ...prev, departmentId: e.target.value }))}>
                                        <option value="">Не назначен</option>
                                        {departments.filter(d => d.isActive).map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="modal-btn-cancel" onClick={() => setShowAddUserModal(false)}>Отмена</button>
                            <button className="modal-btn-confirm" onClick={handleCreateUser}>Создать</button>
                        </div>
                    </div>
                </div>
            )}

            {showResetPasswordModal && selectedUser && (
                <div className="modal-overlay" onClick={() => { setShowResetPasswordModal(false); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Сброс пароля</h3>
                            <button className="modal-close" onClick={() => { setShowResetPasswordModal(false); }}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <p className="text-secondary">Пользователь: <strong>{selectedUser.fullName}</strong></p>
                            <div className="settings-form">
                                <div className="settings-form-row">
                                    <span className="settings-form-label">Новый пароль</span>
                                    <input className="settings-form-input" type="password" value={resetPasswordForm.newPassword} onChange={e => setResetPasswordForm({ newPassword: e.target.value })} placeholder="Не менее 6 символов" />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button className="modal-btn-cancel" onClick={() => { setShowResetPasswordModal(false); }}>Отмена</button>
                            <button className="modal-btn-confirm" onClick={handleResetPassword}>Сбросить</button>
                        </div>
                    </div>
                </div>
            )}

            {showDeleteUserModal && selectedUser && (
                <div className="modal-overlay" onClick={() => { setShowDeleteUserModal(false); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Удаление пользователя</h3>
                            <button className="modal-close" onClick={() => { setShowDeleteUserModal(false); }}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <p className="text-secondary">Вы действительно хотите удалить пользователя?</p>
                            <p><strong>{selectedUser.fullName}</strong> ({selectedUser.email})</p>
                            {userStats && (
                                <div className="admin-user-stats">
                                    <div className="admin-user-stats-item">
                                        <span className="admin-user-stats-value">{userStats.documentCount}</span>
                                        <span className="admin-user-stats-label">документов</span>
                                    </div>
                                    <div className="admin-user-stats-item">
                                        <span className="admin-user-stats-value">{userStats.commentCount}</span>
                                        <span className="admin-user-stats-label">комментариев</span>
                                    </div>
                                    <div className="admin-user-stats-item">
                                        <span className="admin-user-stats-value">{userStats.sessionCount}</span>
                                        <span className="admin-user-stats-label">сессий</span>
                                    </div>
                                </div>
                            )}
                            <p className="admin-warning-text">Это действие нельзя отменить</p>
                        </div>
                        <div className="modal-footer">
                            <button className="modal-btn-cancel" onClick={() => { setShowDeleteUserModal(false); }}>Отмена</button>
                            <button className="modal-btn-confirm admin-btn-danger" onClick={handleDeleteUser}>Удалить</button>
                        </div>
                    </div>
                </div>
            )}

            {showBlockConfirmModal && selectedUser && (
                <div className="modal-overlay" onClick={() => { setShowBlockConfirmModal(false); }}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>{selectedUser.isBlocked ? 'Разблокировка' : 'Блокировка'} пользователя</h3>
                            <button className="modal-close" onClick={() => { setShowBlockConfirmModal(false); }}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <p className="text-secondary">
                                {selectedUser.isBlocked
                                    ? `Разблокировать пользователя «${selectedUser.fullName}»?`
                                    : `Заблокировать пользователя «${selectedUser.fullName}»?`
                                }
                            </p>
                            {!selectedUser.isBlocked && (
                                <p className="text-tertiary">При блокировке все активные сессии пользователя будут завершены</p>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="modal-btn-cancel" onClick={() => { setShowBlockConfirmModal(false); }}>Отмена</button>
                            <button className={`modal-btn-confirm ${!selectedUser.isBlocked ? 'admin-btn-danger' : ''}`} onClick={handleToggleBlock}>
                                {selectedUser.isBlocked ? 'Разблокировать' : 'Заблокировать'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showCleanupConfirm && (
                <div className="modal-overlay" onClick={() => setShowCleanupConfirm(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Подтверждение очистки</h3>
                            <button className="modal-close" onClick={() => setShowCleanupConfirm(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <p className="text-secondary">
                                {cleanupConfirmType === "audit"
                                    ? `Будут удалены записи журнала старше ${journalCleanupMonths} месяцев.`
                                    : `Будут удалены ${cleanupConfirmType === "documents" ? "документы" : "прочитанные уведомления"} старше ${cleanupConfirmType === "documents" ? cleanupDocsMonths : cleanupNotifMonths} месяцев.`
                                }
                            </p>
                            <p className="admin-warning-text">Это действие необратимо</p>
                        </div>
                        <div className="modal-footer">
                            <button className="modal-btn-cancel" onClick={() => setShowCleanupConfirm(false)}>Отмена</button>
                            <button className="modal-btn-confirm admin-btn-danger" onClick={handleCleanup}>Выполнить</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;