import "./../../styles/global.css";
import "./../../styles/Dashboard.css";
import "./../../styles/Settings.css";
import Card from "../Card";
import DropdownButton from "../DropdownButton";
import Table from "../Table";
import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { getAiProviders, getAiSettings, updateAiSettings, testAiConnection} from "../../services/api";
import { AiProvider, AiSettings } from "../../types";

const Settings = () => {
  const [searchParams] = useSearchParams();
  const tabFromUrl = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<
    "provider" | "interface" | "notifications" | "security"
  >("provider");

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

  const [notifications, setNotifications] = useState({
    newDocument: false,
    statusChange: false,
    routingUpdate: false,
    aiAnalysis: false,
    systemNews: false,
  });

  const [interfaceSettings, setInterfaceSettings] = useState({
    compact: false,
    showConfidence: false,
    limit: 10,
    theme: "light" as "light" | "dark",
  });

  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const toggleFilter = (key: string) => {
    setActiveFilter((prev) => (prev === key ? null : key));
  };

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
      setError("Не удалось загрузить настройки");
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
    if (!settingsStatus) return;
    const t = setTimeout(() => { setSettingsStatus(""); setStatusType(""); }, 3000);
    return () => clearTimeout(t);
  }, [settingsStatus]);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", interfaceSettings.theme);
  }, [interfaceSettings.theme]);

  useEffect(() => {
  if (interfaceSettings.compact) {
    document.documentElement.classList.add("compact-view");
  } else {
    document.documentElement.classList.remove("compact-view");
  }
  }, [interfaceSettings.compact]);

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

  return (
    <div>
      <div className="Heading-main-text">
        <h2>Настройки</h2>
        <h4 className="text-secondary">Управление параметрами ИИ и системы</h4>
      </div>

      <Card className="settings-tabs">
        {[
          { key: "provider", label: "Настройки провайдера" },
          { key: "interface", label: "Интерфейс" },
          { key: "notifications", label: "Уведомления" },
          { key: "security", label: "Безопасность" },
        ].map(tab => (
          <span
            key={tab.key}
            className={`settings-option ${activeTab === tab.key ? "active" : ""}`}
            onClick={() => setActiveTab(tab.key as any)}>
            {tab.label}
          </span>
        ))}
      </Card>

      {loading ? (
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

          {activeTab === "interface" && (
            <Card className="cuttinPaddin">
              <div className="settings-form">
                <h3>Параметры интерфейса</h3>
                <div className="settings-form-row">
                  <span className="settings-form-label">Компактный вид</span>
                  <label className="switch">
                    <input type="checkbox" checked={interfaceSettings.compact}
                      onChange={e => setInterfaceSettings(prev => ({ ...prev, compact: e.target.checked }))} />
                    <span className="slider round"></span>
                  </label>
                </div>
                <div className="settings-form-row">
                  <span className="settings-form-label">Показывать уверенность</span>
                  <label className="switch">
                    <input type="checkbox" checked={interfaceSettings.showConfidence}
                      onChange={e => setInterfaceSettings(prev => ({ ...prev, showConfidence: e.target.checked }))} />
                    <span className="slider round"></span>
                  </label>
                </div>
                  <div className="settings-form-row">
                    <span className="settings-form-label">Лимит страниц</span>
                    <DropdownButton
                      options={["10", "20", "50"]}
                      selectedLabel={String(interfaceSettings.limit)}
                      onSelect={val => setInterfaceSettings(prev => ({ ...prev, limit: parseInt(val) }))}
                      defaultLabel="10"
                      isOpen={activeFilter === "limit"}
                      onToggle={() => toggleFilter("limit")}/>
                  </div>
                <div className="settings-form-row">
                  <span className="settings-form-label">Тема</span>
                  <div className="settings-actions">
                    <button className="apply-button" onClick={() => setInterfaceSettings(prev => ({ ...prev, theme: "light" }))}
                      disabled={interfaceSettings.theme === "light"}>
                      Светлая
                    </button>
                    <button className="apply-button" onClick={() => setInterfaceSettings(prev => ({ ...prev, theme: "dark" }))}
                      disabled={interfaceSettings.theme === "dark"}>
                      Тёмная
                    </button>
                  </div>
                </div>
                <div className="settings-actions">
                  <button className="apply-button" onClick={() => alert("Сохранение интерфейса — заглушка")}>
                    Сохранить
                  </button>
                </div>
              </div>
            </Card>
          )}

          {activeTab === "notifications" && (
            <Card className="cuttinPaddin">
              <div className="settings-form">
                <h3>Настройки уведомлений</h3>
                {[
                  ["newDocument", "Новый документ"],
                  ["statusChange", "Изменение статуса"],
                  ["routingUpdate", "Маршрутизация"],
                  ["aiAnalysis", "AI-анализ завершён"],
                  ["systemNews", "Системные новости"],
                ].map(([key, label]) => (
                  <div className="settings-form-row" key={key}>
                    <span className="settings-form-label">{label}</span>
                    <label className="switch">
                      <input type="checkbox" checked={(notifications as any)[key]}
                        onChange={e => setNotifications(prev => ({ ...prev, [key]: e.target.checked }))} />
                      <span className="slider round"></span>
                    </label>
                  </div>
                ))}
                <div className="settings-actions">
                  <button className="apply-button">
                    Сохранить
                  </button>
                </div>
              </div>
            </Card>
          )}

          {activeTab === "security" && (
            <Card className="cuttinPaddin">
              <div className="settings-form">
                <h3>История входов</h3>
                <Table>
                  <thead><tr><th>Время</th><th>IP</th><th>Устройство</th></tr></thead>
                  <tbody>
                    <tr><td colSpan={3}></td></tr>
                  </tbody>
                </Table>

                <h3>Активные сессии</h3>
                <Table>
                  <thead><tr><th>Устройство</th><th>IP</th><th>Начало</th></tr></thead>
                  <tbody>
                    <tr><td colSpan={3}></td></tr>
                  </tbody>
                </Table>

                <h3>Журнал действий</h3>
                <Table>
                  <thead><tr><th>Дата</th><th>Пользователь</th><th>Действие</th></tr></thead>
                  <tbody>
                    <tr><td colSpan={3}></td></tr>
                  </tbody>
                </Table>
                <button className="apply-button">Выйти со всех устройств</button>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default Settings;