import "./../../styles/global.css";
import "./../../styles/Dashboard.css";
import "./../../styles/Settings.css";
import Card from "../Card";
import DropdownButton from "../DropdownButton";
import Table from "../Table";
import React, { useState, useEffect } from "react";
import {
  getAiProviders, getAiSettings, updateAiSettings, testAiConnection,
  getNotificationSettings, updateNotificationSettings,
  getInterfaceSettings, updateInterfaceSettings,
  getSessions, getLoginHistory, logoutAll, getAuditLog,
} from "../../services/api";
import {
  AiProvider, AiSettings,
  NotificationSettings,
  InterfaceSettings,
  Session,
  LoginHistoryItem,
  AuditLogItem,
} from "../../types";

type Tab = "provider" | "interface" | "notifications" | "security";

const Settings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>("provider");

  const [providers, setProviders] = useState<AiProvider[]>([]);
  const [settings, setSettings] = useState<AiSettings | null>(null);
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
    aiComplete: false,
    extractError: false,
    pendingVerification: false,
    routedToDepartment: false,
    lowConfidence: false,
    routeError: false,
    overdueVerification: false,
  });

  const [interfaceSettings, setInterfaceSettings] = useState<InterfaceSettings | null>(null);
  const [interfaceBaseline, setInterfaceBaseline] = useState<InterfaceSettings | null>(null);

  const [userSettingsLoading, setUserSettingsLoading] = useState(true);

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryItem[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogItem[]>([]);
  const [secLoading, setSecLoading] = useState(false);
  const [secError, setSecError] = useState<string | null>(null);

  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const toggleFilter = (key: string) => setActiveFilter((prev) => (prev === key ? null : key));

  const fetchData = async () => {
    try {
      setLoading(true);
      const [providersData, settingsData] = await Promise.all([
        getAiProviders(),
        getAiSettings(),
      ]);
      setProviders(providersData);
      setSettings(settingsData);
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
    const loadUserSettings = async () => {
      try {
        const [notif, iface] = await Promise.all([
          getNotificationSettings(),
          getInterfaceSettings(),
        ]);
        setNotifications(notif);
        setInterfaceSettings(iface);
        setInterfaceBaseline(iface);
      } catch (e) {
      } finally {
        setUserSettingsLoading(false);
      }
    };
    loadUserSettings();
  }, []);

  useEffect(() => {
    return () => {
      if (interfaceBaseline) {
        document.documentElement.setAttribute("data-theme", interfaceBaseline.theme);
        if (interfaceBaseline.compactView) {
          document.documentElement.classList.add("compact-view");
        } else {
          document.documentElement.classList.remove("compact-view");
        }
      }
    };
  }, [interfaceBaseline]);

  const fetchSecurityData = async () => {
    setSecLoading(true);
    setSecError(null);
    try {
      const [sessionsRes, loginRes, auditRes] = await Promise.all([
        getSessions(),
        getLoginHistory(1, 10),
        getAuditLog(1, 10),
      ]);
      setSessions(sessionsRes);
      setLoginHistory(loginRes.items);
      setAuditLog(auditRes.items);
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

  const handleSave = async () => {
    setSettingsStatus(""); setStatusType("");
    if (!selectedProviderCode) return setErrorMsg("Выберите провайдера");
    if (!selectedModelCode) return setErrorMsg("Выберите модель");
    if (!apiKey.trim()) return setErrorMsg("Введите API ключ");
    try {
      const updated = await updateAiSettings({
        providerCode: selectedProviderCode, modelName: selectedModelCode,
        apiKey, baseUrl: baseUrl || null,
      });
      setSettings(updated);
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
      setInterfaceBaseline(updated);
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
    const payload: NotificationSettings = {
      newDocument: Boolean(notifications.newDocument),
      aiComplete: Boolean(notifications.aiComplete),
      extractError: Boolean(notifications.extractError),
      pendingVerification: Boolean(notifications.pendingVerification),
      routedToDepartment: Boolean(notifications.routedToDepartment),
      lowConfidence: Boolean(notifications.lowConfidence),
      routeError: Boolean(notifications.routeError),
      overdueVerification: Boolean(notifications.overdueVerification),
    };
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

  return (
    <div>
      <div className="Heading-main-text">
        <h2>Настройки</h2>
        <h4 className="text-secondary">Управление параметрами ИИ и системы</h4>
      </div>

      <Card className="settings-tabs">
        {([
          { key: "provider", label: "Настройки провайдера" },
          { key: "interface", label: "Интерфейс" },
          { key: "notifications", label: "Уведомления" },
          { key: "security", label: "Безопасность" },
        ] as const).map(tab => (
          <span
            key={tab.key}
            className={`settings-option ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </span>
        ))}
      </Card>

      {loading || userSettingsLoading ? (
        <p>Загрузка...</p>
      ) : error ? (
        <p>{error} — <button className="apply-button" onClick={fetchData}>Повторить</button></p>
      ) : (
        <>
          {activeTab === "provider" && (
            <Card className="cuttinPaddin">
              <form autoComplete="off" onSubmit={e => e.preventDefault()}>
                <div className="settings-form">
                  <div className="settings-form-row">
                    <span className="settings-form-label">Провайдер:</span>
                    <div className="settings-form-control">
                      <DropdownButton
                        options={providers.map(p => p.providerName)}
                        selectedLabel={currentProvider?.providerName || "Выберите провайдера"}
                        onSelect={handleProviderSelect}
                        isOpen={isProviderOpen}
                        onToggle={() => {
                          setIsProviderOpen(prev => !prev);
                          setIsModelOpen(false);
                        }}/>
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
                        onToggle={() => {
                          setIsModelOpen(prev => !prev);
                          setIsProviderOpen(false);
                        }}/>
                    </div>
                  </div>

                  <div className="settings-form-row">
                    <span className="settings-form-label">API Key:</span>
                    <div className="settings-form-control">
                      <input
                        type="text"
                        readOnly
                        style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
                        tabIndex={-1}/>
                      <input
                        type="password"
                        readOnly
                        style={{ position: 'absolute', opacity: 0, width: 1, height: 1, pointerEvents: 'none' }}
                        tabIndex={-1}/>
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
                    <button className="apply-button" onClick={handleTestConnection}>
                      Проверить подключение
                    </button>
                    <button className="apply-button" onClick={handleSave}>
                      Сохранить настройки
                    </button>
                    <span></span>
                    {settingsStatus && (
                      <span className={`settings-status ${statusType}`}>
                        {settingsStatus}
                      </span>
                    )}
                  </div>
                </div>
              </form>
            </Card>
          )}

          {activeTab === "interface" && interfaceSettings && (
            <Card className="cuttinPaddin">
              <div className="settings-form">
                <h3>Параметры интерфейса</h3>
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
                      disabled={interfaceSettings.theme === "light"}>
                      Светлая
                    </button>
                    <button className="apply-button" onClick={() => setInterfaceSettings(prev => prev ? { ...prev, theme: "dark" } : prev)}
                      disabled={interfaceSettings.theme === "dark"}>
                      Тёмная
                    </button>
                  </div>
                </div>
                <div className="settings-actions">
                  <button className="apply-button" onClick={saveInterface}>
                    Сохранить
                  </button>
                    <span></span>
                    {settingsStatus && (
                      <span className={`settings-status ${statusType}`}>
                        {settingsStatus}
                      </span>
                    )}
                </div>
              </div>
            </Card>
          )}

          {activeTab === "notifications" && (
            <Card className="cuttinPaddin">
              <div className="settings-form">
                <h3>Настройки уведомлений</h3>
                {([
                  ["newDocument", "Новый документ"],
                  ["aiComplete", "AI-анализ завершён"],
                  ["extractError", "Ошибка извлечения текста"],
                  ["pendingVerification", "Ожидание проверки"],
                  ["routedToDepartment", "Направлен в отдел"],
                  ["lowConfidence", "Низкая уверенность"],
                  ["routeError", "Ошибка маршрутизации"],
                  ["overdueVerification", "Просрочена проверка"],
                ] as [keyof NotificationSettings, string][]).map(([key, label]) => (
                  <div className="settings-form-row" key={key}>
                    <span className="settings-form-label">{label}</span>
                    <label className="switch">
                      <input type="checkbox" checked={notifications[key]}
                        onChange={() => toggleNotif(key)} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                ))}
                <div className="settings-actions">
                  <button className="apply-button" onClick={saveNotifications}>
                    Сохранить
                  </button>
                    <span></span>
                    {settingsStatus && (
                      <span className={`settings-status ${statusType}`}>
                        {settingsStatus}
                      </span>
                    )}
                </div>
              </div>
            </Card>
          )}

          {activeTab === "security" && (
            <Card className="cuttinPaddin">
              <div className="settings-form">
                <h3>Активные сессии</h3>
                {secLoading ? <p>Загрузка...</p> : secError ? <p>{secError}</p> : (
                  <Table>
                    <thead><tr><th>Устройство</th><th>IP</th><th>Начало сессии</th></tr></thead>
                    <tbody>
                      {sessions.length === 0 ? (
                        <tr><td colSpan={3}>Нет активных сессий</td></tr>
                      ) : sessions.map(s => (
                        <tr key={s.id}>
                          <td>{s.userAgent || 'Неизвестно'}</td>
                          <td>{s.ipAddress || '—'}</td>
                          <td>{new Date(s.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
                <h3>История входов</h3>
                {secLoading ? <p>Загрузка...</p> : secError ? <p>{secError}</p> : (
                  <Table>
                    <thead><tr><th>Время</th><th>IP</th><th>Устройство</th></tr></thead>
                    <tbody>
                      {loginHistory.length === 0 ? (
                        <tr><td colSpan={3}>Нет записей</td></tr>
                      ) : loginHistory.map(l => (
                        <tr key={l.id}>
                          <td>{new Date(l.loginTime).toLocaleString()}</td>
                          <td>{l.ipAddress || '—'}</td>
                          <td>{l.userAgent || 'Неизвестно'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}

                <h3>Журнал действий</h3>
                {secLoading ? <p>Загрузка...</p> : secError ? <p>{secError}</p> : (
                  <Table>
                    <thead><tr><th>Дата</th><th>Пользователь</th><th>Действие</th></tr></thead>
                    <tbody>
                      {auditLog.length === 0 ? (
                        <tr><td colSpan={3}>Нет записей</td></tr>
                      ) : auditLog.map(a => (
                        <tr key={a.id}>
                          <td>{new Date(a.createdAt).toLocaleString()}</td>
                          <td>{a.userName}</td>
                          <td>{a.action}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>)}
                <div className="settings-actions">
                  <button className="apply-button" onClick={handleLogoutAll}>
                    Выйти со всех устройств
                  </button>
                    <span></span>
                    {settingsStatus && (
                      <span className={`settings-status ${statusType}`}>
                        {settingsStatus}
                      </span>
                    )}
                </div>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default Settings;