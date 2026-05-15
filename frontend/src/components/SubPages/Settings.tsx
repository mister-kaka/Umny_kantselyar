import "./../../styles/global.css";
import "./../../styles/Dashboard.css";
import "./../../styles/Settings.css";
import Card from "../Card";
import DropdownButton from "../DropdownButton";
import React, { useState, useEffect } from "react";
import { getAiProviders, getAiSettings, updateAiSettings } from "../../services/api";
import { AiProvider, AiSettings } from "../../types";

const Settings = () => {
  const [activeTab, setActiveTab] = useState<"provider" | "appearance">("provider");

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

  const [Settings_Status, setSettings_Status] = useState("");

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
      setApiKey(settingsData.apiKey || "");
      setBaseUrl(settingsData.baseUrl || "");
      setError(null);
    } catch (e) {
      setError("Не удалось загрузить настройки");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
  if (Settings_Status === "") return;               
  const timer = setTimeout(() => {
    setSettings_Status("");                 
  }, 3000);
  return () => clearTimeout(timer);        
}, [Settings_Status]);

  const currentProvider = providers.find((p) => p.providerCode === selectedProviderCode);
  const currentModel = currentProvider?.models.find((m) => m.modelCode === selectedModelCode);

  const handleProviderSelect = (providerName: string) => {
    const provider = providers.find((p) => p.providerName === providerName);
    if (provider) {
      setSelectedProviderCode(provider.providerCode);
      setSelectedModelCode(provider.models[0]?.modelCode || "");
      setIsProviderOpen(false);
    }
  };

  const handleModelSelect = (modelName: string) => {
    const model = currentProvider?.models.find((m) => m.modelName === modelName);
    if (model) {
      setSelectedModelCode(model.modelCode);
      setIsModelOpen(false);
    }
  };

  const handleSave = async () => {
    try {
      const updated = await updateAiSettings({
        providerCode: selectedProviderCode,
        modelName: selectedModelCode,
        apiKey,
        baseUrl: baseUrl || null,
      });
      setSettings(updated);
      setSettings_Status("Настройки успешно сохранены!") 
    } catch (e) {
      setSettings_Status("Ошибка при сохранении настроек") 
      console.error(e);
    }
  };

  const handleTestConnection = async () => { 
    setSettings_Status("Проверка подключения...")
    try {
      await getAiSettings()
      setSettings_Status("Успешное подключение!")
    } catch (e) {
      setSettings_Status("Ошибка подключения")
    }
  };

  return (
    <div>
      <div className="Heading-main-text">
        <h2>Настройки</h2>
        <h4 className="text-secondary">Управление параметрами ИИ и системы</h4>
      </div>

      <Card className="settings-tabs">
        <span
          className={`settings-option ${activeTab === "provider" ? "active" : ""}`}
          onClick={() => setActiveTab("provider")}>
          Настройки провайдера
        </span>
        <span
          className={`settings-option ${activeTab === "appearance" ? "active" : ""}`}
          onClick={() => setActiveTab("appearance")}>
          Настройки внешнего вида
        </span>
      </Card>

      {loading ? (
        <p>Загрузка...</p>
      ) : error ? (<p>{error} — <button className="apply-button" onClick={fetchData}>Повторить</button></p>)
      : !loading && !error && activeTab === "provider" && (
        <Card className="cuttinPaddin">
          <div className="settings-form">
            <div className="settings-form-row">
              <span className="settings-form-label">Провайдер:</span>
              <div className="settings-form-control">
                <DropdownButton
                  options={providers.map((p) => p.providerName)}
                  selectedLabel={currentProvider?.providerName || "Выберите провайдера"}
                  onSelect={handleProviderSelect}
                  isOpen={isProviderOpen}
                  onToggle={() => {
                    setIsProviderOpen((prev) => !prev);
                    setIsModelOpen(false);
                  }}/>
              </div>
            </div>

            <div className="settings-form-row">
              <span className="settings-form-label">Модель:</span>
              <div className="settings-form-control">
                <DropdownButton
                  options={currentProvider?.models.map((m) => m.modelName) || []}
                  selectedLabel={currentModel?.modelName || "Выберите модель"}
                  onSelect={handleModelSelect}
                  isOpen={isModelOpen}
                  onToggle={() => {
                    setIsModelOpen((prev) => !prev);
                    setIsProviderOpen(false);
                  }}/>
              </div>
            </div>

            <div className="settings-form-row">
              <span className="settings-form-label">API Key:</span>
              <div className="settings-form-control">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="settings-form-input"/>
              </div>
            </div>

            <div className="settings-form-row">
              <span className="settings-form-label">Base URL:</span>
              <div className="settings-form-control">
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
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
              {Settings_Status === "Проверка подключения..." && <span className="appearance-placeholder">{Settings_Status}</span>}
              {(Settings_Status === "Настройки успешно сохранены!" || Settings_Status === "Успешное подключение!" ) && 
              <span className="Success">{Settings_Status}</span>}
              {(Settings_Status === "Ошибка при сохранении настроек" || Settings_Status === "Ошибка подключения"  ) && 
              <span className="Fail">{Settings_Status}</span>}
            </div>
          </div>
        </Card>
      )}

      {activeTab === "appearance" && (
        <Card>
          <p className="appearance-placeholder">Раздел в разработке</p>
        </Card>
      )}
    </div>
  );
};

export default Settings;
