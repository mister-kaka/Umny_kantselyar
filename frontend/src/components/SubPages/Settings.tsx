import "./../../styles/global.css";
import "./../../styles/Dashboard.css";
import "./../../styles/Settings.css";
import Card from "../Card";
import DropdownButton from "../DropdownButton";
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
  exportData, importData, getAbout,
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

type Tab = "provider" | "interface" | "notifications" | "security" | "references" | "routing-rules" | "backup" | "about";

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>("provider");
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const { setCompactView, setShowConfidence, setDefaultPageLimit, setTheme, defaultPageLimit } = useSettings();

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
  const [secPage, setSecPage] = useState({ sessions: 1, login: 1, audit: 1 });
  const [secTotalPages, setSecTotalPages] = useState({ sessions: 1, login: 1, audit: 1 });

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

  const [newTemplateTypeId, setNewTemplateTypeId] = useState<number | undefined>(undefined);
  const [newTemplateCategoryId, setNewTemplateCategoryId] = useState<number | undefined>(undefined);
  const [newTemplateDeptId, setNewTemplateDeptId] = useState<number | undefined>(undefined);

  const [aboutVersion, setAboutVersion] = useState("");

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
        getLoginHistory(1, defaultPageLimit),
        getAuditLog(1, defaultPageLimit),
      ]);
      setSessions(sessionsRes);
      setLoginHistory(loginRes.items);
      setSecTotalPages(prev => ({ ...prev, login: loginRes.totalPages }));
      setAuditLog(auditRes.items);
      setSecTotalPages(prev => ({ ...prev, audit: auditRes.totalPages }));
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

  const fetchLoginHistoryPage = async (page: number) => {
    try {
      const res = await getLoginHistory(page, defaultPageLimit);
      setLoginHistory(res.items);
      setSecPage(prev => ({ ...prev, login: page }));
      setSecTotalPages(prev => ({ ...prev, login: res.totalPages }));
    } catch {}
  };

  const fetchAuditLogPage = async (page: number) => {
    try {
      const res = await getAuditLog(page, defaultPageLimit);
      setAuditLog(res.items);
      setSecPage(prev => ({ ...prev, audit: page }));
      setSecTotalPages(prev => ({ ...prev, audit: res.totalPages }));
    } catch {}
  };

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
      setSettingsStatus("Настройки сохранены!"); setStatusType("success");
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
        setSettingsStatus("Успешное подключение!"); setStatusType("success");
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
      setSettingsStatus('Настройки интерфейса сохранены!');
      setStatusType('success');
    } catch {
      setErrorMsg('Ошибка сохранения интерфейса');
    }
  };

  const saveNotifications = async () => {
    try {
      const payload: NotificationSettings = { ...notifications };
      const updated = await updateNotificationSettings(payload);
      setNotifications(updated);
      setSettingsStatus('Настройки уведомлений сохранены!');
      setStatusType('success');
    } catch {
      setErrorMsg('Ошибка сохранения уведомлений');
    }
  };

  const handleLogoutAll = async () => {
    try {
      await logoutAll();
      setSettingsStatus("Выход со всех устройств выполнен!"); setStatusType("success");
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
    if (!newTypeName.trim()) return;
    try {
      const created = await createDocumentType(newTypeName.trim());
      setDocTypes(prev => [...prev, created]);
      setNewTypeName("");
    } catch {}
  };

  const handleDeleteType = async (id: number) => {
    try {
      await deleteDocumentType(id);
      setDocTypes(prev => prev.filter(t => t.id !== id));
    } catch {}
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const created = await createDocumentCategory(newCategoryName.trim());
      setDocCategories(prev => [...prev, created]);
      setNewCategoryName("");
    } catch {}
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      await deleteDocumentCategory(id);
      setDocCategories(prev => prev.filter(c => c.id !== id));
    } catch {}
  };

  const handleCreateDept = async () => {
    if (!newDeptName.trim()) return;
    try {
      const created = await createDepartment(newDeptName.trim());
      setDepartments(prev => [...prev, created]);
      setNewDeptName("");
    } catch {}
  };

  const handleArchiveDept = async (id: number) => {
    try {
      await deleteDepartment(id);
      setDepartments(prev => prev.map(d => d.id === id ? { ...d, isActive: false } : d));
    } catch {}
  };

  const handleRestoreDept = async (id: number) => {
    try {
      await restoreDepartment(id);
      setDepartments(prev => prev.map(d => d.id === id ? { ...d, isActive: true } : d));
    } catch {}
  };

  const handleCreateTemplate = async () => {
    if (!newTemplateTypeId || !newTemplateCategoryId || !newTemplateDeptId) return;
    try {
      const created = await createRouteTemplate({
        name: `${docTypes.find(t => t.id === newTemplateTypeId)?.name || ''} → ${departments.find(d => d.id === newTemplateDeptId)?.name || ''}`,
        departmentIds: [newTemplateDeptId],
      });
      setTemplates(prev => [...prev, created]);
      setNewTemplateTypeId(undefined);
      setNewTemplateCategoryId(undefined);
      setNewTemplateDeptId(undefined);
    } catch {}
  };

  const handleDeleteTemplate = async (id: number) => {
    try {
      await deleteRouteTemplate(id);
      setTemplates(prev => prev.filter(t => t.id !== id));
    } catch {}
  };

  const handleExport = async () => {
    try {
      const blob = await exportData();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setSettingsStatus("Данные экспортированы!"); setStatusType("success");
    } catch {
      setErrorMsg("Ошибка экспорта");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const result = await importData(file);
      setSettingsStatus(`Импортировано: ${JSON.stringify(result.counts)}`); setStatusType("success");
    } catch {
      setErrorMsg("Ошибка импорта");
    }
  };

  const truncateUA = (ua: string | null): string => {
    if (!ua) return 'Неизвестное устройство';
    return ua.length > 60 ? ua.substring(0, 60) + '...' : ua;
  };

  const getTemplateLabel = (t: RouteTemplate): string => {
    const parts: string[] = [];
    if (t.departmentIds?.length) {
      parts.push(` ${departments.find(d => d.id === t.departmentIds[0])?.name || 'Отдел'}`);
    }
    return parts.length ? parts.join(' ') : t.name;
  };

    const ACTION_LABELS: Record<string, string> = {
    'login': 'Вход в систему',
    'logout_all': 'Выход со всех устройств',
    'profile_update': 'Обновление профиля',
    'password_change': 'Смена пароля',
    'document_upload': 'Загрузка документа',
    'document_delete': 'Удаление документа',
    'document_verify': 'Проверка документа',
    'document_route': 'Маршрутизация',
    'document_reject': 'Отклонение',
    'document_update': 'Редактирование',
    'ocr_extract': 'Извлечение текста',
    'ai_analysis': 'AI-анализ',
    'ai_analysis_error': 'Ошибка AI',
    'export_excel': 'Экспорт в Excel',
    'export_data': 'Экспорт данных',
    'import_data': 'Импорт данных',
    'settings_update_ai': 'Настройки AI',
    'notification_mark_read': 'Прочитано',
    'notification_mark_all_read': 'Прочитаны все',
    'notification_delete': 'Удалено',
    'notification_delete_all_read': 'Удалены прочитанные',
    'comment_added': 'Комментарий',
    'comment_deleted': 'Удалён комментарий',
    'logout_session': 'Сессия завершена',
    'reference_created': 'Справочник создан',
    'reference_deleted': 'Справочник удалён',
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
    { key: "provider", label: "Провайдер" },
    { key: "interface", label: "Интерфейс" },
    { key: "notifications", label: "Уведомления" },
    { key: "security", label: "Безопасность" },
    { key: "references", label: "Справочники" },
    { key: "routing-rules", label: "Правила маршрутизации" },
    { key: "backup", label: "Резервное копирование" },
    { key: "about", label: "О системе" },
  ];

  const isWideTab = activeTab === "security" || activeTab === "references" || activeTab === "routing-rules" || activeTab === "backup" || activeTab === "about";

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
          {activeTab === "provider" && (
            <Card className="cuttinPaddin">
              <div className="settings-form">
                <div className="settings-form-row">
                  <span className="settings-form-label">Провайдер:</span>
                  <div className="settings-form-control">
                    <DropdownButton
                      options={providers.map(p => p.providerName)}
                      selectedLabel={currentProvider?.providerName || "Выберите провайдера"}
                      onSelect={handleProviderSelect}
                      isOpen={isProviderOpen}
                      onToggle={() => { setIsProviderOpen(prev => !prev); setIsModelOpen(false); }}/>
                  </div>
                </div>
                <div className="settings-form-row">
                  <span className="settings-form-label">Модель:</span>
                  <div className="settings-form-control">
                    <DropdownButton
                      options={currentProvider?.models.map(m => m.modelName) || []}
                      selectedLabel={currentModel?.modelName || "Выберите модель"}
                      onSelect={handleModelSelect}
                      isOpen={isModelOpen}
                      onToggle={() => { setIsModelOpen(prev => !prev); setIsProviderOpen(false); }}/>
                  </div>
                </div>
                <div className="settings-form-row">
                  <span className="settings-form-label">API Key:</span>
                  <div className="settings-form-control">
                    <input
                      type="password"
                      name="ai_provider_key"
                      autoComplete="new-password"
                      value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                      placeholder="Введите API ключ"
                      className="settings-form-input"/>
                  </div>
                </div>
                <div className="settings-form-row">
                  <span className="settings-form-label">Base URL:</span>
                  <div className="settings-form-control">
                    <input
                      type="text"
                      value={baseUrl}
                      onChange={e => setBaseUrl(e.target.value)}
                      placeholder="https://api.example.com"
                      className="settings-form-input"/>
                  </div>
                </div>
                <div className="settings-actions">
                  <button className="apply-button" onClick={handleTestConnection}>Проверить подключение</button>
                  <button className="apply-button" onClick={handleSaveAi}>Сохранить</button>
                  {settingsStatus && <span className={`settings-status ${statusType}`}>{settingsStatus}</span>}
                </div>
              </div>
            </Card>
          )}

          {activeTab === "interface" && interfaceSettings && (
            <Card className="cuttinPaddin">
              <div className="settings-form">
                <div className="settings-form-row">
                  <span className="settings-form-label">Компактный вид</span>
                  <label className="switch">
                    <input type="checkbox" checked={interfaceSettings.compactView}
                      onChange={e => setInterfaceSettings(prev => prev ? { ...prev, compactView: e.target.checked } : prev)} />
                    <span className="slider round"></span>
                  </label>
                </div>
                <div className="settings-form-row">
                  <span className="settings-form-label">Показывать уверенность</span>
                  <label className="switch">
                    <input type="checkbox" checked={interfaceSettings.showConfidence}
                      onChange={e => setInterfaceSettings(prev => prev ? { ...prev, showConfidence: e.target.checked } : prev)} />
                    <span className="slider round"></span>
                  </label>
                </div>
                <div className="settings-form-row">
                  <span className="settings-form-label">Лимит страниц</span>
                  <DropdownButton
                    options={["5", "10", "20", "50"]}
                    selectedLabel={String(interfaceSettings.defaultPageLimit)}
                    onSelect={val => setInterfaceSettings(prev => prev ? { ...prev, defaultPageLimit: parseInt(val) } : prev)}
                    defaultLabel="10"
                    isOpen={activeFilter === "limit"}
                    onToggle={() => toggleFilter("limit")}/>
                </div>
                <div className="settings-form-row">
                  <span className="settings-form-label">Тема</span>
                  <div className="settings-actions">
                    <button className="apply-button" onClick={() => setInterfaceSettings(prev => prev ? { ...prev, theme: "light" } : prev)}
                      disabled={interfaceSettings.theme === "light"}>Светлая</button>
                    <button className="apply-button" onClick={() => setInterfaceSettings(prev => prev ? { ...prev, theme: "dark" } : prev)}
                      disabled={interfaceSettings.theme === "dark"}>Тёмная</button>
                  </div>
                </div>
                <div className="settings-actions">
                  <button className="apply-button" onClick={saveInterface}>Сохранить</button>
                  {settingsStatus && <span className={`settings-status ${statusType}`}>{settingsStatus}</span>}
                </div>
              </div>
            </Card>
          )}

          {activeTab === "notifications" && (
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
          )}

          {activeTab === "security" && (
            <Card className="cuttinPaddin">
              <div className={isWideTab ? "settings-form-wide" : "settings-form"}>
                <div className="security-section-card">
                  <div className="security-section-header">Активные сессии ({sessions.length})</div>
                  {secLoading ? <p>Загрузка...</p> : secError ? <p>{secError}</p> : (
                    <Table>
                      <thead><tr><th>Устройство</th><th>IP</th><th>Начало сессии</th><th></th></tr></thead>
                      <tbody>
                        {sessions.length === 0 ? (
                          <tr><td colSpan={4}>Нет активных сессий</td></tr>
                        ) : sessions.map(s => (
                          <tr key={s.id}>
                            <td>{truncateUA(s.userAgent)}</td>
                            <td>{s.ipAddress || '-Ы'}</td>
                            <td>{formatMoscowDateTime(s.createdAt)}</td>
                            <td>
                              <button className="apply-button" onClick={() => handleLogoutSession(s.id)}>Завершить</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </div>

                <div className="security-section-card">
                  <div className="security-section-header">История входов</div>
                  {secLoading ? <p>Загрузка...</p> : secError ? <p>{secError}</p> : (
                    <Table
                      rightTitle={secTotalPages.login > 1 && (
                        <span className="UltimatePaginationWrapper">
                          <Pagination page={secPage.login} totalPages={secTotalPages.login} onPageChange={fetchLoginHistoryPage} />
                        </span>
                      )}
                    >
                      <thead><tr><th>Время</th><th>IP</th><th>Устройство</th></tr></thead>
                      <tbody>
                        {loginHistory.length === 0 ? (
                          <tr><td colSpan={3}>Нет записей</td></tr>
                        ) : loginHistory.map(l => (
                          <tr key={l.id}>
                            <td>{formatMoscowDateTime(l.loginTime)}</td>
                            <td>{l.ipAddress || '-'}</td>
                            <td>{truncateUA(l.userAgent)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  )}
                </div>

                <div className="security-section-card">
                  <div className="security-section-header">Журнал действий</div>
                  {secLoading ? <p>Загрузка...</p> : secError ? <p>{secError}</p> : (
                    <Table
                      rightTitle={secTotalPages.audit > 1 && (
                        <span className="UltimatePaginationWrapper">
                          <Pagination page={secPage.audit} totalPages={secTotalPages.audit} onPageChange={fetchAuditLogPage} />
                        </span>
                      )}
                    >
                      <thead><tr><th>Дата</th><th>Пользователь</th><th>Действие</th><th>Описание</th></tr></thead>
                      <tbody>
                        {auditLog.length === 0 ? (
                          <tr><td colSpan={4}>Нет записей</td></tr>
                        ) : auditLog.map(a => (
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
                  )}
                </div>

                <div className="settings-actions">
                  <button className="apply-button" onClick={handleLogoutAll}>Выйти со всех устройств</button>
                  {settingsStatus && <span className={`settings-status ${statusType}`}>{settingsStatus}</span>}
                </div>
              </div>
            </Card>
          )}

          {activeTab === "references" && (
            <Card className="cuttinPaddin">
              <div className={isWideTab ? "settings-form-wide" : "settings-form"}>
                <h4 className="settings-section-title">Типы документов</h4>
                <div className="settings-chips">
                  {docTypes.map(t => (
                    <span key={t.id} className="settings-chip">
                      {t.name}
                      <button className="settings-chip-remove" onClick={() => handleDeleteType(t.id)}>×</button>
                    </span>
                  ))}
                </div>
                <div className="settings-form-row">
                  <input className="settings-form-input" value={newTypeName} onChange={e => setNewTypeName(e.target.value)} placeholder="Новый тип" onKeyDown={e => e.key === 'Enter' && handleCreateType()} />
                  <button className="apply-button" onClick={handleCreateType}>Добавить</button>
                </div>

                <h4 className="settings-section-title">Категории</h4>
                <div className="settings-chips">
                  {docCategories.map(c => (
                    <span key={c.id} className="settings-chip">
                      {c.name}
                      <button className="settings-chip-remove" onClick={() => handleDeleteCategory(c.id)}>×</button>
                    </span>
                  ))}
                </div>
                <div className="settings-form-row">
                  <input className="settings-form-input" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} placeholder="Новая категория" onKeyDown={e => e.key === 'Enter' && handleCreateCategory()} />
                  <button className="apply-button" onClick={handleCreateCategory}>Добавить</button>
                </div>

                <h4 className="settings-section-title">Отделы</h4>
                <div className="settings-list">
                  {departments.map(d => (
                    <div key={d.id} className="settings-list-row">
                      <span className={d.isActive ? '' : 'settings-archived'}>{d.name}</span>
                      {d.isActive ? (
                        <button className="apply-button" onClick={() => handleArchiveDept(d.id)}>Архивировать</button>
                      ) : (
                        <button className="apply-button" onClick={() => handleRestoreDept(d.id)}>Восстановить</button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="settings-form-row">
                  <input className="settings-form-input" value={newDeptName} onChange={e => setNewDeptName(e.target.value)} placeholder="Новый отдел" onKeyDown={e => e.key === 'Enter' && handleCreateDept()} />
                  <button className="apply-button" onClick={handleCreateDept}>Добавить</button>
                </div>
              </div>
            </Card>
          )}

          {activeTab === "routing-rules" && (
            <Card className="cuttinPaddin">
              <div className={isWideTab ? "settings-form-wide" : "settings-form"}>
                <div className="routing-rules-info">
                  <p>Правила маршрутизации позволяют автоматически предлагать отдел для документа на основе его типа и категории.</p>
                  <p>При проверке документа оператор может выбрать правило - и отдел заполнится автоматически.</p>
                </div>

                <h4 className="settings-section-title">Существующие правила</h4>
                {templates.length === 0 ? (
                  <p className="text-tertiary">Нет созданных правил</p>
                ) : (
                  <div className="settings-list">
                    {templates.map(t => (
                      <div key={t.id} className="settings-list-row">
                        <div>
                          <strong>{t.name}</strong>
                          {t.description && <span className="text-tertiary"> - {t.description}</span>}
                          <div className="text-tertiary template-dept-list">
                            {getTemplateLabel(t)}
                          </div>
                        </div>
                        <button className="apply-button" onClick={() => handleDeleteTemplate(t.id)}>Удалить</button>
                      </div>
                    ))}
                  </div>
                )}

                <h4 className="settings-section-title template-new-title">Новое правило</h4>
                <div className="routing-rules-form">
                  <div className="settings-form-row">
                    <span className="settings-form-label">Если тип документа:</span>
                    <div className="settings-form-control">
                      <DropdownButton
                        options={docTypes.map(t => t.name)}
                        selectedLabel={docTypes.find(t => t.id === newTemplateTypeId)?.name || "Выберите тип"}
                        onSelect={(name) => {
                          const found = docTypes.find(t => t.name === name);
                          setNewTemplateTypeId(found?.id);
                        }}
                        defaultLabel="Выберите тип"
                        isOpen={activeFilter === "ruleType"}
                        onToggle={() => toggleFilter("ruleType")}/>
                    </div>
                  </div>
                  <div className="settings-form-row">
                    <span className="settings-form-label">Категория:</span>
                    <div className="settings-form-control">
                      <DropdownButton
                        options={docCategories.map(c => c.name)}
                        selectedLabel={docCategories.find(c => c.id === newTemplateCategoryId)?.name || "Выберите категорию"}
                        onSelect={(name) => {
                          const found = docCategories.find(c => c.name === name);
                          setNewTemplateCategoryId(found?.id);
                        }}
                        defaultLabel="Выберите категорию"
                        isOpen={activeFilter === "ruleCategory"}
                        onToggle={() => toggleFilter("ruleCategory")}/>
                    </div>
                  </div>
                  <div className="settings-form-row">
                    <span className="settings-form-label">Направить в отдел:</span>
                    <div className="settings-form-control">
                      <DropdownButton
                        options={departments.filter(d => d.isActive).map(d => d.name)}
                        selectedLabel={departments.find(d => d.id === newTemplateDeptId)?.name || "Выберите отдел"}
                        onSelect={(name) => {
                          const found = departments.find(d => d.name === name);
                          setNewTemplateDeptId(found?.id);
                        }}
                        defaultLabel="Выберите отдел"
                        isOpen={activeFilter === "ruleDept"}
                        onToggle={() => toggleFilter("ruleDept")}/>
                    </div>
                  </div>
                </div>
                <div className="settings-actions">
                  <button className="apply-button" onClick={handleCreateTemplate}
                    disabled={!newTemplateTypeId || !newTemplateCategoryId || !newTemplateDeptId}>
                    Создать правило
                  </button>
                </div>
              </div>
            </Card>
          )}

          {activeTab === "backup" && (
            <Card className="cuttinPaddin">
              <div className={isWideTab ? "settings-form-wide" : "settings-form"}>
                <h4 className="settings-section-title">Экспорт данных</h4>
                <p className="text-secondary">Выгрузить все документы, справочники и настройки в файл JSON для резервного копирования.</p>
                <div className="settings-actions">
                  <button className="apply-button" onClick={handleExport}>Экспортировать</button>
                </div>

                <h4 className="settings-section-title backup-import-title">Импорт данных</h4>
                <p className="text-secondary">Загрузить данные из ранее сохранённого файла. Существующие данные будут заменены.</p>
                <div className="settings-actions">
                  <input type="file" accept=".json" onChange={handleImport} id="import-file" className="settings-file-input" />
                  <label htmlFor="import-file" className="apply-button settings-file-label">Выбрать файл и импортировать</label>
                </div>
                {settingsStatus && <span className={`settings-status ${statusType}`}>{settingsStatus}</span>}
              </div>
            </Card>
          )}

          {activeTab === "about" && (
            <Card className="cuttinPaddin">
              <div className={isWideTab ? "settings-form-wide" : "settings-form"}>
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
                  <li>Нехланова Алина - логин, загрузка, аналитика, графики, адаптив</li>
                  <li>Ефанов Егор - дашборд, архив, настройки, пагинация, тёмная тема</li>
                  <li>Мотовилова Мария - адаптив поиска, дашборда, списка документов</li>
                  <li>Мельникова Виолетта - адаптив логина, карточки документа, настроек</li>
                </ul>

                <p className="about-copyright">© 2026, Умный Канцеляр</p>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default Settings;