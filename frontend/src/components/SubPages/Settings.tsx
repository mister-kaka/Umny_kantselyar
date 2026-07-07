import "./../../styles/global.css";
import "./../../styles/Dashboard.css";
import "./../../styles/Settings.css";
import Card from "../Card";
import DropdownButton from "../DropdownButton";
import { DateFilterDropdown } from "../DropdownButton";
import Table from "../Table";
import Pagination from "../Pagination";
import Tooltip from "../Tooltip";
import { useSearchParams } from "react-router-dom";
import React, { useState, useEffect } from "react";
import {
  getAiProviders, getAiSettings, updateAiSettings, testAiConnection,
  getNotificationSettings, updateNotificationSettings,
  getInterfaceSettings, updateInterfaceSettings,
  getSessions, getLoginHistory, logoutAll, getAuditLog, deleteSession,
  getDocumentTypes, createDocumentType, deleteDocumentType,
  getDocumentCategories, createDocumentCategory, deleteDocumentCategory,
  getDepartments, createDepartment, deleteDepartment, restoreDepartment,
  getRouteTemplates, createRouteTemplate, deleteRouteTemplate,
  getAbout, getProfile, adminCleanup,
} from "../../services/api";
import {
  AiProvider, AiSettings,
  NotificationSettings,
  InterfaceSettings,
  Session,
  LoginHistoryItem,
  AuditLogItem,
  DocumentType,
  DocumentCategory,
  Department,
  RouteTemplate,
} from "../../types";
import { formatMoscowDateTime } from "../../utils/moscowTime";
import { useSettings } from "../../contexts/SettingsContext";
import { getThemedIcon } from "../../utils/getThemedIcon";

type Tab = "interface" | "notifications" | "security" | "references" | "routing-rules" | "provider" | "about";

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>("interface");
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const { setCompactView, setShowConfidence, setDefaultPageLimit, setTheme, defaultPageLimit } = useSettings();

  const [userRole, setUserRole] = useState<string>("");
  const isAdmin = userRole === "Администратор";

  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [aiSettings, setAiSettings] = useState<AiSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedProviderCode, setSelectedProviderCode] = useState("");
  const [selectedModelCode, setSelectedModelCode] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");

  const [isProviderOpen, setIsProviderOpen] = useState(false);
  const [isModelOpen, setIsModelOpen] = useState(false);

  const [settingsStatus, setSettingsStatus] = useState("");
  const [statusType, setStatusType] = useState<"" | "success" | "error" | "loading">("");

  const [notifications, setNotifications] = useState<NotificationSettings>({
    newDocument: true,
    documentReady: true,
    extractError: true,
    pendingVerification: true,
    routedToDepartment: true,
    rejected: false,
    verified: false,
    lowConfidence: false,
    passwordChanged: false,
    profileUpdated: false,
    settingsChanged: false,
    newLogin: false,
    commentAdded: false,
    documentDeleted: false,
    referenceCreated: true,
    referenceDeleted: true,
  });

  const [interfaceSettings, setInterfaceSettings] = useState<InterfaceSettings | null>(null);

  const [userSettingsLoading, setUserSettingsLoading] = useState(true);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryItem[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogItem[]>([]);
  const [secLoading, setSecLoading] = useState(false);
  const [secError, setSecError] = useState<string | null>(null);

  const [themeKey, setThemeKey] = useState(0);
  const [loginDateFilter, setLoginDateFilter] = useState<{ from: string | null; to: string | null }>({ from: null, to: null });
  const [auditDateFilter, setAuditDateFilter] = useState<{ from: string | null; to: string | null }>({ from: null, to: null });
  const [loginLimit, setLoginLimit] = useState(defaultPageLimit);
  const [auditLimit, setAuditLimit] = useState(defaultPageLimit);
  const [loginPage, setLoginPage] = useState(1);
  const [auditPage, setAuditPage] = useState(1);
  const [loginTotalPages, setLoginTotalPages] = useState(1);
  const [auditTotalPages, setAuditTotalPages] = useState(1);

  const [journalCleanupMonths, setJournalCleanupMonths] = useState("12");
  const [auditCleanupStatus, setAuditCleanupStatus] = useState("");
  const [auditCleanupStatusType, setAuditCleanupStatusType] = useState<"" | "success" | "error">("");

  useEffect(() => {
    const observer = new MutationObserver(() => setThemeKey(prev => prev + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setLoginLimit(defaultPageLimit);
    setAuditLimit(defaultPageLimit);
  }, [defaultPageLimit]);

  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const toggleFilter = (key: string) => setActiveFilter((prev) => (prev === key ? null : key));

  const [docTypes, setDocTypes] = useState<DocumentType[]>([]);
  const [docCategories, setDocCategories] = useState<DocumentCategory[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [templates, setTemplates] = useState<RouteTemplate[]>([]);
  const [refsLoading, setRefsLoading] = useState(false);

  const [newTypeName, setNewTypeName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newDeptName, setNewDeptName] = useState("");

  const [showCreateTemplateModal, setShowCreateTemplateModal] = useState(false);
  const [newTemplateTypeId, setNewTemplateTypeId] = useState<number | undefined>(undefined);
  const [newTemplateCategoryId, setNewTemplateCategoryId] = useState<number | undefined>(undefined);
  const [newTemplateDeptId, setNewTemplateDeptId] = useState<number | undefined>(undefined);

  const [aboutVersion, setAboutVersion] = useState("");

  const [refsStatus, setRefsStatus] = useState<{ type: string; category: string; dept: string }>({ type: '', category: '', dept: '' });
  const [refsStatusType, setRefsStatusType] = useState<{ type: '' | 'success' | 'error'; category: '' | 'success' | 'error'; dept: '' | 'success' | 'error' }>({ type: '', category: '', dept: '' });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profile = await getProfile();
        setUserRole(profile.role);
      } catch {}
    };
    loadProfile();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [providersData, settingsData] = await Promise.all([
        getAiProviders(),
        getAiSettings(),
      ]);
      setProviders(providersData);
      setAiSettings(settingsData);
      setSelectedProviderCode(settingsData.providerCode);
      setSelectedModelCode(settingsData.modelName);
      setApiKey("");
      setBaseUrl(settingsData.baseUrl || "");
      setError(null);
    } catch (e) {
      setError("Не удалось загрузить настройки AI");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (tabFromUrl === "notifications") {
      setActiveTab("notifications");
    }
  }, [tabFromUrl]);

  useEffect(() => {
    const loadUserSettings = async () => {
      try {
        const [notif, iface] = await Promise.all([
          getNotificationSettings(),
          getInterfaceSettings(),
        ]);
        setNotifications(notif);
        setInterfaceSettings(iface);
        setCompactView(iface.compactView);
        setShowConfidence(iface.showConfidence);
        setDefaultPageLimit(iface.defaultPageLimit);
        setTheme(iface.theme);
      } catch (e) {
      } finally {
        setUserSettingsLoading(false);
      }
    };
    loadUserSettings();
  }, []);

  const fetchSecurityData = async () => {
    setSecLoading(true);
    setSecError(null);
    try {
      const [sessionsRes, loginRes, auditRes] = await Promise.all([
        getSessions(),
        getLoginHistory(loginPage, loginLimit),
        getAuditLog(auditPage, auditLimit),
      ]);
      setSessions(sessionsRes);
      setLoginHistory(loginRes.items);
      setLoginTotalPages(loginRes.totalPages);
      setAuditLog(auditRes.items);
      setAuditTotalPages(auditRes.totalPages);
    } catch (e) {
      setSecError("Ошибка загрузки данных безопасности");
    } finally {
      setSecLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "security") {
      fetchSecurityData();
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "security") {
      fetchSecurityData();
    }
  }, [loginPage, loginLimit, auditPage, auditLimit]);

  const fetchLoginHistoryPage = async (page: number) => {
    setLoginPage(page);
  };

  const fetchAuditLogPage = async (page: number) => {
    setAuditPage(page);
  };

  const filteredLoginHistory = loginHistory.filter(l => {
    if (loginDateFilter.from) {
      const d = new Date(l.loginTime).toISOString().split('T')[0];
      if (d < loginDateFilter.from) return false;
    }
    if (loginDateFilter.to) {
      const d = new Date(l.loginTime).toISOString().split('T')[0];
      if (d > loginDateFilter.to) return false;
    }
    return true;
  });

  const filteredAuditLog = auditLog.filter(a => {
    if (auditDateFilter.from) {
      const d = new Date(a.createdAt).toISOString().split('T')[0];
      if (d < auditDateFilter.from) return false;
    }
    if (auditDateFilter.to) {
      const d = new Date(a.createdAt).toISOString().split('T')[0];
      if (d > auditDateFilter.to) return false;
    }
    return true;
  });

  useEffect(() => {
    if (!interfaceSettings) return;
    document.documentElement.setAttribute("data-theme", interfaceSettings.theme);
  }, [interfaceSettings]);

  useEffect(() => {
    if (!interfaceSettings) return;
    if (interfaceSettings.compactView) {
      document.documentElement.classList.add("compact-view");
    } else {
      document.documentElement.classList.remove("compact-view");
    }
  }, [interfaceSettings]);

  useEffect(() => {
    if (!settingsStatus) return;
    const t = setTimeout(() => {
      setSettingsStatus("");
      setStatusType("");
    }, 3000);
    return () => clearTimeout(t);
  }, [settingsStatus]);

  const currentProvider = providers.find(p => p.providerCode === selectedProviderCode);
  const currentModel = currentProvider?.models.find(m => m.modelCode === selectedModelCode);

  const handleProviderSelect = (name: string) => {
    const p = providers.find(p => p.providerName === name);
    if (p) {
      setSelectedProviderCode(p.providerCode);
      setSelectedModelCode(p.models[0]?.modelCode || "");
      setIsProviderOpen(false);
    }
  };

  const handleModelSelect = (name: string) => {
    const m = currentProvider?.models.find(m => m.modelName === name);
    if (m) { setSelectedModelCode(m.modelCode); setIsModelOpen(false); }
  };

  const handleSaveAi = async () => {
    setSettingsStatus(""); setStatusType("");
    if (!selectedProviderCode) return setErrorMsg("Выберите провайдера");
    if (!selectedModelCode) return setErrorMsg("Выберите модель");
    if (!apiKey.trim()) return setErrorMsg("Введите API ключ");
    try {
      const updated = await updateAiSettings({
        providerCode: selectedProviderCode, modelName: selectedModelCode,
        apiKey, baseUrl: baseUrl || null,
      });
      setAiSettings(updated);
      setSettingsStatus("Настройки сохранены"); setStatusType("success");
    } catch { setErrorMsg("Ошибка сохранения"); }
  };

  const handleTestConnection = async () => {
    setSettingsStatus(""); setStatusType("");
    if (!selectedProviderCode) return setErrorMsg("Выберите провайдера");
    if (!apiKey.trim()) return setErrorMsg("Введите API ключ");
    setSettingsStatus("Проверка..."); setStatusType("loading");
    try {
      const result = await testAiConnection({
        providerCode: selectedProviderCode, modelName: selectedModelCode,
        apiKey, baseUrl: baseUrl || null,
      });
      if (result.status === 'success') {
        setSettingsStatus("Подключение успешно"); setStatusType("success");
      } else {
        setErrorMsg(`Ошибка: ${result.message}`);
      }
    } catch { setErrorMsg("Ошибка подключения"); }
  };

  const setErrorMsg = (msg: string) => {
    setSettingsStatus(msg); setStatusType("error");
  };

  const toggleNotif = (key: keyof NotificationSettings) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const saveInterface = async () => {
    if (!interfaceSettings) return;
    try {
      const payload: InterfaceSettings = {
        compactView: Boolean(interfaceSettings.compactView),
        showConfidence: Boolean(interfaceSettings.showConfidence),
        defaultPageLimit: Number(interfaceSettings.defaultPageLimit),
        theme: interfaceSettings.theme as 'light' | 'dark',
      };
      const updated = await updateInterfaceSettings(payload);
      setInterfaceSettings(updated);
      setCompactView(updated.compactView);
      setShowConfidence(updated.showConfidence);
      setDefaultPageLimit(updated.defaultPageLimit);
      setTheme(updated.theme);
      document.documentElement.setAttribute('data-theme', updated.theme);
      if (updated.compactView) {
        document.documentElement.classList.add('compact-view');
      } else {
        document.documentElement.classList.remove('compact-view');
      }
      setSettingsStatus('Настройки интерфейса сохранены');
      setStatusType('success');
    } catch {
      setErrorMsg('Ошибка сохранения интерфейса');
    }
  };

  const saveNotifications = async () => {
    try {
      const payload: NotificationSettings = {
        newDocument: notifications.newDocument,
        documentReady: notifications.documentReady,
        extractError: notifications.extractError,
        pendingVerification: notifications.pendingVerification,
        routedToDepartment: notifications.routedToDepartment,
        rejected: notifications.rejected,
        verified: notifications.verified,
        lowConfidence: notifications.lowConfidence,
        passwordChanged: notifications.passwordChanged,
        profileUpdated: notifications.profileUpdated,
        settingsChanged: notifications.settingsChanged,
        newLogin: notifications.newLogin,
        commentAdded: notifications.commentAdded,
        documentDeleted: notifications.documentDeleted,
        referenceCreated: notifications.referenceCreated,
        referenceDeleted: notifications.referenceDeleted,
      };
      const updated = await updateNotificationSettings(payload);
      setNotifications(updated);
      setSettingsStatus('Настройки уведомлений сохранены');
      setStatusType('success');
    } catch {
      setErrorMsg('Ошибка сохранения уведомлений');
    }
  };

  const handleLogoutAll = async () => {
    try {
      await logoutAll();
      setSettingsStatus("Выход со всех устройств выполнен"); setStatusType("success");
      fetchSecurityData();
    } catch {
      setErrorMsg("Ошибка при выходе");
    }
  };

  const handleLogoutSession = async (sessionId: number) => {
    try {
      await deleteSession(sessionId);
      setSessions(prev => prev.filter(s => s.id !== sessionId));
    } catch {}
  };

  const handleAuditCleanup = async () => {
    try {
      const res = await adminCleanup("audit", parseInt(journalCleanupMonths));
      setAuditCleanupStatus(res.message);
      setAuditCleanupStatusType("success");
      setTimeout(() => { setAuditCleanupStatus(""); setAuditCleanupStatusType(""); }, 4000);
      fetchSecurityData();
    } catch {
      setAuditCleanupStatus("Ошибка очистки");
      setAuditCleanupStatusType("error");
      setTimeout(() => { setAuditCleanupStatus(""); setAuditCleanupStatusType(""); }, 4000);
    }
  };

  const loadRefs = async () => {
    setRefsLoading(true);
    try {
      const [types, cats, deps, tmpls] = await Promise.all([
        getDocumentTypes(),
        getDocumentCategories(),
        getDepartments(),
        getRouteTemplates(),
      ]);
      setDocTypes(types);
      setDocCategories(cats);
      setDepartments(deps);
      setTemplates(tmpls);
    } catch {}
    setRefsLoading(false);
  };

  useEffect(() => {
    if (activeTab === "references") loadRefs();
    if (activeTab === "routing-rules") loadRefs();
    if (activeTab === "about") {
      getAbout().then(res => setAboutVersion(res.version)).catch(() => setAboutVersion("1.5.0"));
    }
  }, [activeTab]);

  const handleCreateType = async () => {
    if (!newTypeName.trim()) {
      setRefsStatus(prev => ({ ...prev, type: 'Введите название типа' }));
      setRefsStatusType(prev => ({ ...prev, type: 'error' }));
      return;
    }
    try {
      const created = await createDocumentType(newTypeName.trim());
      setDocTypes(prev => [...prev, created]);
      setNewTypeName('');
      setRefsStatus(prev => ({ ...prev, type: 'Тип создан' }));
      setRefsStatusType(prev => ({ ...prev, type: 'success' }));
    } catch (err: any) {
      setRefsStatus(prev => ({ ...prev, type: 'Такой тип уже существует' }));
      setRefsStatusType(prev => ({ ...prev, type: 'error' }));
    }
  };

  const handleDeleteType = async (id: number) => {
    if (!window.confirm('Удалить тип документа? Это действие нельзя отменить.')) return;
    try {
      await deleteDocumentType(id);
      setDocTypes(prev => prev.filter(t => t.id !== id));
      setRefsStatus(prev => ({ ...prev, type: 'Тип удалён' }));
      setRefsStatusType(prev => ({ ...prev, type: 'success' }));
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Не удалось удалить тип';
      setRefsStatus(prev => ({ ...prev, type: message }));
      setRefsStatusType(prev => ({ ...prev, type: 'error' }));
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      setRefsStatus(prev => ({ ...prev, category: 'Введите название категории' }));
      setRefsStatusType(prev => ({ ...prev, category: 'error' }));
      return;
    }
    try {
      const created = await createDocumentCategory(newCategoryName.trim());
      setDocCategories(prev => [...prev, created]);
      setNewCategoryName('');
      setRefsStatus(prev => ({ ...prev, category: 'Категория создана' }));
      setRefsStatusType(prev => ({ ...prev, category: 'success' }));
    } catch (err: any) {
      setRefsStatus(prev => ({ ...prev, category: 'Такая категория уже существует' }));
      setRefsStatusType(prev => ({ ...prev, category: 'error' }));
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!window.confirm('Удалить категорию? Это действие нельзя отменить.')) return;
    try {
      await deleteDocumentCategory(id);
      setDocCategories(prev => prev.filter(c => c.id !== id));
      setRefsStatus(prev => ({ ...prev, category: 'Категория удалена' }));
      setRefsStatusType(prev => ({ ...prev, category: 'success' }));
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Не удалось удалить категорию';
      setRefsStatus(prev => ({ ...prev, category: message }));
      setRefsStatusType(prev => ({ ...prev, category: 'error' }));
    }
  };

  const handleCreateDept = async () => {
    if (!newDeptName.trim()) {
      setRefsStatus(prev => ({ ...prev, dept: 'Введите название отдела' }));
      setRefsStatusType(prev => ({ ...prev, dept: 'error' }));
      return;
    }
    try {
      const created = await createDepartment(newDeptName.trim());
      setDepartments(prev => [...prev, created]);
      setNewDeptName('');
      setRefsStatus(prev => ({ ...prev, dept: 'Отдел создан' }));
      setRefsStatusType(prev => ({ ...prev, dept: 'success' }));
    } catch (err: any) {
        const message = err?.response?.data?.message || '';
        if (message.includes('разархивируйте')) {
          setRefsStatus(prev => ({ ...prev, dept: 'Отдел в архиве. Восстановите его' }));
        } else {
          setRefsStatus(prev => ({ ...prev, dept: 'Такой отдел уже существует' }));
        }
        setRefsStatusType(prev => ({ ...prev, dept: 'error' }));
    }
  };

  const handleArchiveDept = async (id: number) => {
    try {
      await deleteDepartment(id);
      setDepartments(prev => prev.map(d => d.id === id ? { ...d, isActive: false } : d));
      setRefsStatus(prev => ({ ...prev, dept: 'Отдел архивирован' }));
      setRefsStatusType(prev => ({ ...prev, dept: 'success' }));
    } catch {
      setRefsStatus(prev => ({ ...prev, dept: 'Не удалось архивировать' }));
      setRefsStatusType(prev => ({ ...prev, dept: 'error' }));
    }
  };

  const handleRestoreDept = async (id: number) => {
    try {
      await restoreDepartment(id);
      setDepartments(prev => prev.map(d => d.id === id ? { ...d, isActive: true } : d));
      setRefsStatus(prev => ({ ...prev, dept: 'Отдел восстановлен' }));
      setRefsStatusType(prev => ({ ...prev, dept: 'success' }));
    } catch {
      setRefsStatus(prev => ({ ...prev, dept: 'Не удалось восстановить' }));
      setRefsStatusType(prev => ({ ...prev, dept: 'error' }));
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplateTypeId || !newTemplateCategoryId || !newTemplateDeptId) {
      setErrorMsg('Заполните все поля правила');
      return;
    }
    try {
      const typeName = docTypes.find(t => t.id === newTemplateTypeId)?.name || '';
      const categoryName = docCategories.find(c => c.id === newTemplateCategoryId)?.name || '';
      const created = await createRouteTemplate({
        name: `${typeName} - ${categoryName}`,
        departmentIds: [newTemplateDeptId],
      });
      setTemplates(prev => [...prev, created]);
      setNewTemplateTypeId(undefined);
      setNewTemplateCategoryId(undefined);
      setNewTemplateDeptId(undefined);
      setShowCreateTemplateModal(false);
      setSettingsStatus('Правило создано');
      setStatusType('success');
    } catch {
      setErrorMsg('Не удалось создать правило');
    }
  };

  const handleDeleteTemplate = async (id: number) => {
     if (!window.confirm('Удалить правило маршрутизации?')) return;
    try {
      await deleteRouteTemplate(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
      setSettingsStatus('Правило удалено');
      setStatusType('success');
    } catch {
      setErrorMsg('Не удалось удалить правило');
    }
  };

  const truncateUA = (ua: string | null): string => {
    if (!ua) return 'Неизвестное устройство';
    return ua.length > 60 ? ua.substring(0, 60) + '...' : ua;
  };

  const getTemplateLabel = (t: RouteTemplate): string => {
    const dept = departments.find(d => d.id === t.departmentIds?.[0]);
    return dept ? `${dept.name}` : '';
  };

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
    'notification_mark_read': 'Прочитано',
    'notification_mark_all_read': 'Прочитаны все',
    'notification_delete': 'Удалено',
    'notification_delete_all_read': 'Удалены прочитанные',
    'comment_added': 'Комментарий',
    'comment_deleted': 'Удалён комментарий',
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

  const getActionLabel = (action: string) => ACTION_LABELS[action] || action;

  const getDetailsText = (details: any): string => {
    if (!details) return '-';
    if (typeof details === 'string') return details;
    if (details.counts) return `Импортировано: ${JSON.stringify(details.counts)}`;
    if (details.affectedCount !== undefined) return `Затронуто: ${details.affectedCount}`;
    if (details.notificationId) return `Уведомление #${details.notificationId}`;
    if (details.documentId) return `Документ #${details.documentId}`;
    return '-';
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: "interface", label: "Интерфейс" },
    { key: "notifications", label: "Уведомления" },
    { key: "security", label: "Безопасность" },
    { key: "references", label: "Справочники" },
    { key: "routing-rules", label: "Правила маршрутизации" },
    { key: "provider", label: "Провайдер" },
    { key: "about", label: "О системе" },
  ];

  return (
    <div>
      <h2 className="page-title">Настройки</h2>
      <p className="page-subtitle">Управление параметрами ИИ и системы</p>

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

      {loading || userSettingsLoading ? (
        <p>Загрузка...</p>
      ) : error ? (
        <p>{error} - <button className="apply-button" onClick={fetchData}>Повторить</button></p>
      ) : (
        <>
          {activeTab === "interface" && interfaceSettings && (
            <div className="settings-tab-content">
              <Card className="settings-section-card">
                <div className="settings-form">
                  <div className="settings-switch-row">
                    <span className="settings-switch-label">Компактный вид</span>
                    <span className="settings-switch-desc">Уменьшенные отступы и размеры элементов</span>
                    <label className="switch">
                      <input type="checkbox" checked={interfaceSettings.compactView}
                        onChange={e => setInterfaceSettings(prev => prev ? { ...prev, compactView: e.target.checked } : prev)} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                  <div className="settings-switch-row">
                    <span className="settings-switch-label">Уверенность</span>
                    <span className="settings-switch-desc">Показывать процент уверенности OCR</span>
                    <label className="switch">
                      <input type="checkbox" checked={interfaceSettings.showConfidence}
                        onChange={e => setInterfaceSettings(prev => prev ? { ...prev, showConfidence: e.target.checked } : prev)} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                  <div className="settings-switch-row">
                    <span className="settings-switch-label">Лимит страниц</span>
                    <span className="settings-switch-desc">Количество записей на странице по умолчанию</span>
                    <DropdownButton
                      options={["5", "10", "20", "50"]}
                      selectedLabel={String(interfaceSettings.defaultPageLimit)}
                      onSelect={val => setInterfaceSettings(prev => prev ? { ...prev, defaultPageLimit: parseInt(val) } : prev)}
                      defaultLabel="10"
                      isOpen={activeFilter === "limit"}
                      onToggle={() => toggleFilter("limit")}/>
                  </div>
                  <div className="settings-theme-row">
                    <span className="settings-switch-label">Тема</span>
                    <span className="settings-switch-desc">Светлое или тёмное оформление интерфейса</span>
                    <div className="settings-theme-buttons">
                      <button
                        className={`settings-theme-btn ${interfaceSettings.theme === "light" ? "active" : ""}`}
                        onClick={() => setInterfaceSettings(prev => prev ? { ...prev, theme: "light" } : prev)}
                      >
                        Светлая
                      </button>
                      <button
                        className={`settings-theme-btn ${interfaceSettings.theme === "dark" ? "active" : ""}`}
                        onClick={() => setInterfaceSettings(prev => prev ? { ...prev, theme: "dark" } : prev)}
                      >
                        Тёмная
                      </button>
                    </div>
                  </div>
                  <div className="settings-actions">
                    <Tooltip text="Сохранить настройки интерфейса">
                      <button className="apply-button" onClick={saveInterface}>Сохранить</button>
                    </Tooltip>
                    {settingsStatus && <span className={`settings-status ${statusType}`}>{settingsStatus}</span>}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="settings-tab-content">
              <Card className="cuttinPaddin">
                <div className="settings-form">
                  <div className="settings-notifications-grid">
                    <div className="settings-notifications-col">
                      <h4 className="settings-section-title">Документы</h4>
                      {([
                        ["newDocument", "Новый документ"],
                        ["documentReady", "Документ готов"],
                        ["extractError", "Ошибка извлечения текста"],
                        ["pendingVerification", "Ожидание проверки"],
                        ["routedToDepartment", "Направлен в отдел"],
                        ["rejected", "Отклонён"],
                        ["verified", "Проверен"],
                        ["lowConfidence", "Низкая уверенность"],
                        ["documentDeleted", "Документ удалён"],
                      ] as [keyof NotificationSettings, string][]).map(([key, label]) => (
                        <div className="settings-form-row" key={key}>
                          <span className="settings-form-label">{label}</span>
                          <label className="switch">
                            <input type="checkbox" checked={notifications[key]} onChange={() => toggleNotif(key)} />
                            <span className="slider round"></span>
                          </label>
                        </div>
                      ))}
                    </div>
                    <div className="settings-notifications-col">
                      <h4 className="settings-section-title">Система</h4>
                      {([
                        ["passwordChanged", "Смена пароля"],
                        ["profileUpdated", "Обновление профиля"],
                        ["settingsChanged", "Изменение настроек"],
                        ["newLogin", "Новый вход в систему"],
                        ["commentAdded", "Новый комментарий"],
                        ["referenceCreated", "Создание справочника"],
                        ["referenceDeleted", "Удаление справочника"],
                      ] as [keyof NotificationSettings, string][]).map(([key, label]) => (
                        <div className="settings-form-row" key={key}>
                          <span className="settings-form-label">{label}</span>
                          <label className="switch">
                            <input type="checkbox" checked={notifications[key]} onChange={() => toggleNotif(key)} />
                            <span className="slider round"></span>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="settings-actions">
                    <button className="apply-button" onClick={saveNotifications}>Сохранить</button>
                    {settingsStatus && <span className={`settings-status ${statusType}`}>{settingsStatus}</span>}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === "security" && (
            <div className="settings-tab-content">
              <Card className="settings-section-card">
                <h4 className="settings-section-header">Активные сессии ({sessions.length})</h4>
                {secLoading ? <p>Загрузка...</p> : secError ? <p>{secError}</p> : (
                  <div className="table-wrapper">
                    <Table>
                      <thead><tr><th>Устройство</th><th>IP</th><th>Начало сессии</th><th></th></tr></thead>
                      <tbody>
                        {sessions.length === 0 ? (
                          <tr><td colSpan={4} className="empty-cell">Нет активных сессий</td></tr>
                        ) : sessions.map(s => (
                          <tr key={s.id}>
                            <td>{truncateUA(s.userAgent)}</td>
                            <td>{s.ipAddress || '-'}</td>
                            <td>{formatMoscowDateTime(s.createdAt)}</td>
                            <td>
                              <button className="apply-button" onClick={() => handleLogoutSession(s.id)}>Завершить</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </Card>

              <Card className="settings-section-card">
                <h4 className="settings-section-header">История входов</h4>
                {secLoading ? <p>Загрузка...</p> : secError ? <p>{secError}</p> : (
                  <>
                    <Card className="filtersButtsWrapper admin-table-controls">
                      <Tooltip text="Фильтр по дате">
                        <DateFilterDropdown
                          onFilterChange={(range) => {
                            setLoginDateFilter(range);
                          }}
                          icon={<img src={getThemedIcon("/icons/filters/data.png")} key={themeKey} alt="Дата" />}
                          isOpen={activeFilter === 'loginDate'}
                          onToggle={() => toggleFilter('loginDate')}
                        />
                      </Tooltip>
                      <Tooltip text="Количество записей на странице">
                        <DropdownButton
                          options={['5', '10', '20', '50']}
                          selectedLabel={String(loginLimit)}
                          onSelect={(value) => {
                            const newLimit = parseInt(value, 10);
                            if (!isNaN(newLimit)) setLoginLimit(newLimit);
                          }}
                          defaultLabel={String(defaultPageLimit)}
                          isOpen={activeFilter === 'loginLimit'}
                          onToggle={() => toggleFilter('loginLimit')}
                        />
                      </Tooltip>
                      {(loginDateFilter.from || loginDateFilter.to) && (
                        <Tooltip text="Сбросить фильтр даты">
                          <button className="removeFiltersButt" onClick={() => setLoginDateFilter({ from: null, to: null })}>
                            Сбросить фильтры
                          </button>
                        </Tooltip>
                      )}
                    </Card>
                    <div className="table-wrapper">
                      <Table
                        rightTitle={loginTotalPages > 1 && (
                          <span className="UltimatePaginationWrapper">
                            <Pagination page={loginPage} totalPages={loginTotalPages} onPageChange={fetchLoginHistoryPage} />
                          </span>
                        )}
                      >
                        <thead><tr><th>Время</th><th>IP</th><th>Устройство</th></tr></thead>
                        <tbody>
                          {filteredLoginHistory.length === 0 ? (
                            <tr><td colSpan={3} className="empty-cell">Нет записей</td></tr>
                          ) : filteredLoginHistory.map(l => (
                            <tr key={l.id}>
                              <td>{formatMoscowDateTime(l.loginTime)}</td>
                              <td>{l.ipAddress || '-'}</td>
                              <td>{truncateUA(l.userAgent)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  </>
                )}
              </Card>

              <Card className="settings-section-card">
                <h4 className="settings-section-header">Журнал действий</h4>
                {secLoading ? <p>Загрузка...</p> : secError ? <p>{secError}</p> : (
                  <>
                    <Card className="filtersButtsWrapper admin-table-controls">
                      <Tooltip text="Фильтр по дате">
                        <DateFilterDropdown
                          onFilterChange={(range) => {
                            setAuditDateFilter(range);
                          }}
                          icon={<img src={getThemedIcon("/icons/filters/data.png")} key={themeKey} alt="Дата" />}
                          isOpen={activeFilter === 'auditDate'}
                          onToggle={() => toggleFilter('auditDate')}
                        />
                      </Tooltip>
                      <Tooltip text="Количество записей на странице">
                        <DropdownButton
                          options={['5', '10', '20', '50']}
                          selectedLabel={String(auditLimit)}
                          onSelect={(value) => {
                            const newLimit = parseInt(value, 10);
                            if (!isNaN(newLimit)) setAuditLimit(newLimit);
                          }}
                          defaultLabel={String(defaultPageLimit)}
                          isOpen={activeFilter === 'auditLimit'}
                          onToggle={() => toggleFilter('auditLimit')}
                        />
                      </Tooltip>
                      {(auditDateFilter.from || auditDateFilter.to) && (
                        <Tooltip text="Сбросить фильтр даты">
                          <button className="removeFiltersButt" onClick={() => setAuditDateFilter({ from: null, to: null })}>
                            Сбросить фильтры
                          </button>
                        </Tooltip>
                      )}
                    </Card>

                    {isAdmin && (
                      <Card className="filtersButtsWrapper admin-table-controls">
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
                            <button className="apply-button" onClick={handleAuditCleanup}>
                              Очистить журнал
                            </button>
                          </Tooltip>
                          {auditCleanupStatus && (
                            <span className={`settings-status ${auditCleanupStatusType}`}>
                              {auditCleanupStatus}
                            </span>
                          )}
                        </div>
                      </Card>
                    )}

                    <div className="table-wrapper">
                      <Table
                        rightTitle={auditTotalPages > 1 && (
                          <span className="UltimatePaginationWrapper">
                            <Pagination page={auditPage} totalPages={auditTotalPages} onPageChange={fetchAuditLogPage} />
                          </span>
                        )}
                      >
                        <thead><tr><th>Дата</th><th>Пользователь</th><th>Действие</th><th>Описание</th></tr></thead>
                        <tbody>
                          {filteredAuditLog.length === 0 ? (
                            <tr><td colSpan={4} className="empty-cell">Нет записей</td></tr>
                          ) : filteredAuditLog.map(a => (
                            <tr key={a.id}>
                              <td>{formatMoscowDateTime(a.createdAt)}</td>
                              <td>
                                <span className="security-user-cell">
                                  {a.userAvatarUrl ? (
                                    <img
                                      src={a.userAvatarUrl.startsWith('http') ? a.userAvatarUrl : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${a.userAvatarUrl}`}
                                      className="security-avatar"
                                      alt={a.userName}
                                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                  ) : (
                                    <span className="security-avatar security-avatar--initials">
                                      {a.userName?.charAt(0) || '?'}
                                    </span>
                                  )}
                                  {a.userName}
                                </span>
                              </td>
                              <td>{getActionLabel(a.action)}</td>
                              <td className="security-details-cell">{getDetailsText(a.details)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                    </div>
                  </>
                )}
              </Card>

              <div className="settings-actions">
                <button className="apply-button" onClick={handleLogoutAll}>Выйти со всех устройств</button>
                {settingsStatus && <span className={`settings-status ${statusType}`}>{settingsStatus}</span>}
              </div>
            </div>
          )}

          {activeTab === "references" && (
            <div className="settings-tab-content">
              <Card className="settings-section-card">
                <h4 className="settings-section-header">Типы документов</h4>
                <div className="settings-chips">
                  {docTypes.map(t => (
                    <span key={t.id} className="settings-chip">
                      {t.name}
                      {isAdmin && (
                        <button className="settings-chip-remove" onClick={() => handleDeleteType(t.id)}>×</button>
                      )}
                    </span>
                  ))}
                </div>
                <div className="settings-ref-row">
                  <input className="settings-form-input" value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="Новый тип" onKeyDown={e => e.key === 'Enter' && handleCreateType()} />
                  <button className="apply-button" onClick={handleCreateType}>Добавить</button>
                  {refsStatus.type && <span className={`refs-inline-status ${refsStatusType.type}`}>{refsStatus.type}</span>}
                </div>
              </Card>

              <Card className="settings-section-card">
                <h4 className="settings-section-header">Категории</h4>
                <div className="settings-chips">
                  {docCategories.map(c => (
                    <span key={c.id} className="settings-chip">
                      {c.name}
                      {isAdmin && (
                        <button className="settings-chip-remove" onClick={() => handleDeleteCategory(c.id)}>×</button>
                      )}
                    </span>
                  ))}
                </div>
                <div className="settings-ref-row">
                  <input className="settings-form-input" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Новая категория" onKeyDown={e => e.key === 'Enter' && handleCreateCategory()} />
                  <button className="apply-button" onClick={handleCreateCategory}>Добавить</button>
                  {refsStatus.category && <span className={`refs-inline-status ${refsStatusType.category}`}>{refsStatus.category}</span>}
                </div>
              </Card>

              <Card className="settings-section-card">
                <h4 className="settings-section-header">Отделы</h4>
                <div className="settings-list">
                  {departments.map(d => (
                    <div key={d.id} className="settings-list-row">
                      <span className={d.isActive ? '' : 'settings-archived'}>{d.name}</span>
                      {isAdmin && d.isActive && (
                        <button className="apply-button" onClick={() => handleArchiveDept(d.id)}>Архивировать</button>
                      )}
                      {isAdmin && !d.isActive && (
                        <button className="apply-button" onClick={() => handleRestoreDept(d.id)}>Восстановить</button>
                      )}
                    </div>
                  ))}
                </div>
                {isAdmin && (
                  <div className="settings-ref-row">
                    <input className="settings-form-input" value={newDeptName} onChange={e => setNewDeptName(e.target.value)} placeholder="Новый отдел" onKeyDown={e => e.key === 'Enter' && handleCreateDept()} />
                    <button className="apply-button" onClick={handleCreateDept}>Добавить</button>
                    {refsStatus.dept && <span className={`refs-inline-status ${refsStatusType.dept}`}>{refsStatus.dept}</span>}
                  </div>
                )}
              </Card>
            </div>
          )}

          {activeTab === "routing-rules" && (
            <div className="settings-tab-content">
              <Card className="settings-section-card">
                <p className="settings-hint-text">
                  Правила маршрутизации позволяют автоматически предлагать отдел для документа на основе его типа и категории. При проверке документа оператор может выбрать правило - и отдел заполнится автоматически.
                </p>

                <h4 className="settings-section-title">Существующие правила</h4>
                {templates.length === 0 ? (
                  <p className="text-tertiary">Нет созданных правил</p>
                ) : (
                  <div className="settings-list">
                    {templates.map(t => (
                      <div key={t.id} className="settings-list-row">
                        <div>
                          <strong>{t.name}</strong>
                          {getTemplateLabel(t) && (
                            <div className="text-tertiary template-dept-list">
                              {getTemplateLabel(t)}
                            </div>
                          )}
                        </div>
                        {isAdmin && (
                          <button className="apply-button" onClick={() => handleDeleteTemplate(t.id)}>Удалить</button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="settings-actions">
                  <button className="apply-button" onClick={() => {
                    setNewTemplateTypeId(undefined);
                    setNewTemplateCategoryId(undefined);
                    setNewTemplateDeptId(undefined);
                    setShowCreateTemplateModal(true);
                  }}>
                    + Создать правило
                  </button>
                  {settingsStatus && <span className={`settings-status ${statusType}`}>{settingsStatus}</span>}
                </div>
              </Card>
            </div>
          )}

          {activeTab === "provider" && (
            <div className="settings-tab-content">
              <Card className="settings-section-card">
                {!isAdmin && (
                  <p className="settings-hint-text">Настройки AI-провайдера доступны только администратору. Вы можете просмотреть текущие параметры.</p>
                )}
                <div className="settings-form">
                  <div className="settings-form-row">
                    <span className="settings-form-label">Провайдер</span>
                    <div className="settings-form-control">
                      <DropdownButton
                        options={providers.map(p => p.providerName)}
                        selectedLabel={currentProvider?.providerName || "Выберите провайдера"}
                        onSelect={isAdmin ? handleProviderSelect : () => {}}
                        isOpen={isAdmin ? isProviderOpen : false}
                        onToggle={isAdmin ? () => { setIsProviderOpen(prev => !prev); setIsModelOpen(false); } : () => {}}/>
                    </div>
                  </div>
                  <div className="settings-form-row">
                    <span className="settings-form-label">Модель</span>
                    <div className="settings-form-control">
                      <DropdownButton
                        options={currentProvider?.models.map(m => m.modelName) || []}
                        selectedLabel={currentModel?.modelName || "Выберите модель"}
                        onSelect={isAdmin ? handleModelSelect : () => {}}
                        isOpen={isAdmin ? isModelOpen : false}
                        onToggle={isAdmin ? () => { setIsModelOpen(prev => !prev); setIsProviderOpen(false); } : () => {}}/>
                    </div>
                  </div>
                  <div className="settings-form-row">
                    <span className="settings-form-label">API Key</span>
                    <div className="settings-form-control">
                      <input
                        type="password"
                        name="ai_provider_key"
                        autoComplete="new-password"
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)}
                        placeholder="Введите API ключ"
                        className="settings-form-input"
                        disabled={!isAdmin}/>
                    </div>
                  </div>
                  <div className="settings-form-row">
                    <span className="settings-form-label">Base URL</span>
                    <div className="settings-form-control">
                      <input
                        type="text"
                        value={baseUrl}
                        onChange={e => setBaseUrl(e.target.value)}
                        placeholder="https://api.example.com"
                        className="settings-form-input"
                        disabled={!isAdmin}/>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="settings-actions">
                      <Tooltip text="Проверить подключение к API провайдера">
                        <button className="apply-button" onClick={handleTestConnection}>Проверить подключение</button>
                      </Tooltip>
                      <Tooltip text="Сохранить настройки провайдера">
                        <button className="apply-button" onClick={handleSaveAi}>Сохранить</button>
                      </Tooltip>
                      {settingsStatus && <span className={`settings-status ${statusType}`}>{settingsStatus}</span>}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}

          {activeTab === "about" && (
            <div className="settings-tab-content">
              <Card className="settings-section-card">
                <div className="settings-form-wide">
                  <h4 className="settings-section-title">О системе</h4>
                  <p className="about-system-name">Умный Канцеляр v{aboutVersion}</p>
                  <p className="about-system-desc">Система автоматизации документооборота транспортной компании.</p>

                  <h4 className="settings-section-title about-section-title">Технологии</h4>
                  <ul className="about-list">
                    <li>NestJS (бэкенд)</li>
                    <li>React + TypeScript + Vite (фронтенд)</li>
                    <li>PostgreSQL (база данных)</li>
                    <li>DeepSeek (AI-анализ)</li>
                  </ul>

                  <h4 className="settings-section-title about-section-title">Команда</h4>
                  <ul className="about-list">
                    <li>Начинова Мария - тимлид, бэкенд, AI, OCR, безопасность, профиль, общие доработки</li>
                    <li>Москалева Александра - уведомления, сканирование, проверка, загрузка, справочники, роутинг</li>
                    <li>Мейсарош Карина - API, типы, подразделения, маршрутизация</li>
                    <li>Нехланова Алина - логин, карточка документа, загрузка, аналитика, графики, адаптив</li>
                    <li>Ефанов Егор - дашборд, архив, настройки, пагинация, тёмная тема</li>
                    <li>Мотовилова Мария - адаптив поиска, дашборда, списка документов</li>
                    <li>Мельникова Виолетта - адаптив логина, карточки документа, настроек</li>
                  </ul>

                  <p className="about-copyright">2026, Умный Канцеляр</p>
                </div>
              </Card>
            </div>
          )}
        </>
      )}

      {showCreateTemplateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateTemplateModal(false)}>
          <div className="modal-content modal-content--settings" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Новое правило маршрутизации</h3>
              <button className="modal-close" onClick={() => setShowCreateTemplateModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="modal-form">
                <div className="settings-form-row">
                  <span className="settings-form-label">Тип документа</span>
                  <div className="settings-form-control">
                    <DropdownButton
                      options={docTypes.map(t => t.name)}
                      selectedLabel={docTypes.find(t => t.id === newTemplateTypeId)?.name || "Выберите тип"}
                      onSelect={(name) => {
                        const found = docTypes.find(t => t.name === name);
                        setNewTemplateTypeId(found?.id);
                      }}
                      defaultLabel="Выберите тип"
                      isOpen={activeFilter === "modalRuleType"}
                      onToggle={() => toggleFilter("modalRuleType")}/>
                  </div>
                </div>
                <div className="settings-form-row">
                  <span className="settings-form-label">Категория</span>
                  <div className="settings-form-control">
                    <DropdownButton
                      options={docCategories.map(c => c.name)}
                      selectedLabel={docCategories.find(c => c.id === newTemplateCategoryId)?.name || "Выберите категорию"}
                      onSelect={(name) => {
                        const found = docCategories.find(c => c.name === name);
                        setNewTemplateCategoryId(found?.id);
                      }}
                      defaultLabel="Выберите категорию"
                      isOpen={activeFilter === "modalRuleCategory"}
                      onToggle={() => toggleFilter("modalRuleCategory")}/>
                  </div>
                </div>
                <div className="settings-form-row">
                  <span className="settings-form-label">Направить в отдел</span>
                  <div className="settings-form-control">
                    <DropdownButton
                      options={departments.filter(d => d.isActive).map(d => d.name)}
                      selectedLabel={departments.find(d => d.id === newTemplateDeptId)?.name || "Выберите отдел"}
                      onSelect={(name) => {
                        const found = departments.find(d => d.name === name);
                        setNewTemplateDeptId(found?.id);
                      }}
                      defaultLabel="Выберите отдел"
                      isOpen={activeFilter === "modalRuleDept"}
                      onToggle={() => toggleFilter("modalRuleDept")}/>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-btn-cancel" onClick={() => setShowCreateTemplateModal(false)}>Отмена</button>
              <button
                className="modal-btn-confirm"
                onClick={handleCreateTemplate}
                disabled={!newTemplateTypeId || !newTemplateCategoryId || !newTemplateDeptId}
              >
                Создать
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;