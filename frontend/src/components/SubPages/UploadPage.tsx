import "../../styles/global.css";
import "../../styles/UploadPage.css";
import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../Card";
import { uploadDocument, extractText, analyzeDocument } from "../../services/api";

type UploadStep =
  | "idle"
  | "selected"
  | "uploading"
  | "uploaded"
  | "extracting"
  | "extracted"
  | "analyzing"
  | "success"
  | "error";

const ALLOWED_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/tiff",
];

const MAX_SIZE_MB = 20;

const STEPS = [
  { label: "Загрузка файла", desc: "Файл сохраняется на сервер" },
  { label: "Извлечение текста", desc: "Текст извлекается из документа" },
  { label: "AI-анализ", desc: "Тип, категория, отдел, краткая сводка" },
];

const stepIndex = (step: UploadStep): number => {
  if (["uploading", "uploaded"].includes(step))    return 0;
  if (["extracting", "extracted"].includes(step))  return 1;
  if (["analyzing", "success"].includes(step))     return 2;
  return -1;
};

const UploadPage = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<UploadStep>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [documentId, setDocumentId] = useState<number | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (f: File): boolean => {
    if (!f.type || !ALLOWED_MIME.includes(f.type)) {
      setErrorMessage("Неподдерживаемый формат. Разрешены: PDF, DOCX, TXT, XLSX, JPG, PNG, TIFF");
      return false;
    }
    if (f.size > MAX_SIZE_MB * 1024 * 1024) {
      setErrorMessage(`Файл слишком большой. Максимум ${MAX_SIZE_MB} МБ`);
      return false;
    }
    return true;
  };

  const handleFileSelect = (selected: File) => {
    if (!validateFile(selected)) {
      setStep("error");
      return;
    }
    setFile(selected);
    setErrorMessage("");
    setStep("selected");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFileSelect(dropped);
  };

  const handleUpload = async () => {
    if (!file) return;
    try {
      setStep("uploading");
      const uploadResponse = await uploadDocument(file);
      setDocumentId(uploadResponse.id);
      setStep("uploaded");

      setStep("extracting");
      await extractText(uploadResponse.id);
      setStep("extracted");

      setStep("analyzing");
      await analyzeDocument(uploadResponse.id);
      setStep("success");

    } catch (error: unknown) {
      console.error("Ошибка загрузки:", error);
      const err = error as { response?: { data?: { message?: string } } };
      setErrorMessage(
        err.response?.data?.message || "Произошла ошибка при обработке документа"
      );
      setStep("error");
    }
  };

  const handleRetry = () => {
    if (file) {
      handleUpload();
    } else {
      setStep("idle");
      setFile(null);
      setErrorMessage("");
    }
  };

  const handleClear = () => {
    setStep("idle");
    setFile(null);
    setErrorMessage("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const getStatusText = (): string => {
    switch (step) {
      case "uploading":  
      return "Загрузка файла...";
      case "uploaded":   
      return "Файл загружен";
      case "extracting": 
      return "Извлекаем текст...";
      case "extracted":  
      return "Текст извлечён";
      case "analyzing":  
      return "AI анализирует документ...";
      case "success":    
      return "Документ обработан";
      case "error":      
      return errorMessage || "Произошла ошибка";
      default: return "";
    }
  };

  const getStatusClass = (): string => {
    if (step === "error")   
      return "status-error";
    if (step === "success") 
      return "status-success";
    if (["uploaded", "extracted"].includes(step))         
      return "status-info";
    if (["uploading", "extracting", "analyzing"].includes(step)) return "status-loading";
    return "";
  };

  const isProcessing = ["uploading", "extracting", "analyzing"].includes(step);
  const currentStep = stepIndex(step);
  const showStepper = !["idle", "selected", "error"].includes(step);
  const showUploadArea = ["idle", "selected"].includes(step);

  return (
    <div className="upload-page">

      <div className="upload-main-col">
        <Card className="upload-card">
          <h1 className="upload-title">Сканирование документа</h1>

          {showUploadArea && (
            <div
              className={[
                "upload-area",
                step === "selected" ? "has-file" : "",
                dragOver ? "drag-over" : "",
              ].filter(Boolean).join(" ")}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
              aria-label="Зона загрузки файла"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt,.xlsx,.jpg,.jpeg,.png,.tiff"
                className="file-input-hidden"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              />

              {step === "idle" ? (
                <>
                  <div className="upload-icon-wrap">
                    <img
                      src="/icons/upload/UploadIcon.png"
                      className="upload-icon-img"
                      alt=""
                      aria-hidden="true"
                    />
                  </div>
                  <p className="upload-text">Перетащите файл или кликните для выбора</p>
                  <p className="upload-hint">
                    PDF, DOCX, TXT, XLSX, JPG, PNG, TIFF - до {MAX_SIZE_MB} МБ
                  </p>
                </>
              ) : (
                <div className="file-info">
                  <div className="file-info-icon">
                    <img
                      src="/icons/upload/UploadIcon.png"
                      className="upload-icon-img upload-icon-small"
                      alt=""
                      aria-hidden="true"
                    />
                  </div>
                  <div className="file-name">{file?.name}</div>
                  <div className="file-size">
                    {file ? (file.size / 1024 / 1024).toFixed(2) : "0"} МБ
                  </div>
                  <div className="file-ready">Файл готов к загрузке</div>
                </div>
              )}
            </div>
          )}

          {showStepper && (
            <div className="stepper">
              {STEPS.map((s, i) => {
                const isDone   = step === "success" || i < currentStep;
                const isActive = !isDone && i === currentStep;
                const isLast   = i === STEPS.length - 1;
                return (
                  <div key={i} className="stepper-item">
                    <div className="stepper-left">
                      <div className={[
                        "stepper-dot",
                        isDone ? "done" : isActive ? "active" : "",
                      ].filter(Boolean).join(" ")}>
                        {isDone ? (
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                            <path
                              d="M2 6l3 3 5-5"
                              stroke="currentColor"
                              strokeWidth="1.8"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : (
                          <span>{i + 1}</span>
                        )}
                      </div>
                      {!isLast && (
                        <div className={[
                          "stepper-line",
                          isDone ? "done" : "",
                        ].filter(Boolean).join(" ")} />
                      )}
                    </div>
                    <div className="stepper-body">
                      <div className={[
                        "stepper-label",
                        isDone ? "done" : isActive ? "active" : "",
                      ].filter(Boolean).join(" ")}>
                        {s.label}
                        {isActive && isProcessing && <span className="stepper-loader" />}
                      </div>
                      <div className="stepper-desc">{s.desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {!["idle", "selected"].includes(step) && (
            <div className={`status-container ${getStatusClass()}`}>
              <span className="status-text">{getStatusText()}</span>
              {isProcessing && <div className="loader" aria-label="Загрузка" />}
            </div>
          )}

          <div className="upload-actions">
            {step === "selected" && (
              <button className="upload-btn-primary" onClick={handleUpload}>
                Загрузить
              </button>
            )}
            {step === "error" && (
              <button className="upload-btn-primary" onClick={handleRetry}>
                Повторить
              </button>
            )}
            {step === "success" && documentId !== null && (
              <button
                className="upload-btn-primary"
                onClick={() => navigate(`/dashboard/documents/${documentId}`)}
              >
                Перейти к документу
              </button>
            )}
            {["idle", "selected"].includes(step) && (
              <button className="upload-btn-secondary" onClick={handleClear}>
                Очистить
              </button>
            )}
          </div>
        </Card>
      </div>

      <aside className="upload-sidebar">
        <Card className="sidebar-card">
          <h3 className="sidebar-section-title">Форматы файлов</h3>
          <div className="sidebar-group">
            <div className="sidebar-group-label">Документы</div>
            <div className="sidebar-row">
              <span className="sidebar-format">PDF</span>
              <span className="sidebar-format-desc">Текст и сканы</span>
            </div>
            <div className="sidebar-row">
              <span className="sidebar-format">DOCX</span>
              <span className="sidebar-format-desc">Документы Word</span>
            </div>
            <div className="sidebar-row">
              <span className="sidebar-format">TXT</span>
              <span className="sidebar-format-desc">Текстовый файл</span>
            </div>
            <div className="sidebar-row">
              <span className="sidebar-format">XLSX</span>
              <span className="sidebar-format-desc">Таблицы Excel</span>
            </div>
          </div>
          <div className="sidebar-group">
            <div className="sidebar-group-label">Изображения</div>
            <div className="sidebar-row">
              <span className="sidebar-format">JPG / PNG</span>
              <span className="sidebar-format-desc">Фотографии, сканы</span>
            </div>
            <div className="sidebar-row">
              <span className="sidebar-format">TIFF</span>
              <span className="sidebar-format-desc">Сканы высокого качества</span>
            </div>
          </div>
          <p className="sidebar-note">Максимальный размер: <strong>{MAX_SIZE_MB} МБ</strong></p>
        </Card>

        <Card className="sidebar-card">
          <h3 className="sidebar-section-title">Что даёт AI-анализ</h3>
          <div className="sidebar-ai-row">
            <span className="sidebar-ai-label">Тип документа</span>
            <span className="sidebar-ai-desc">
              Юридическая форма документа (Договор, Счёт, Акт, Письмо и тд.)
            </span>
          </div>
          <div className="sidebar-ai-row">
            <span className="sidebar-ai-label">Категория</span>
            <span className="sidebar-ai-desc">
              Тематика документа (Финансы, Кадры, Логистика, Закупки и тд.)
            </span>
          </div>
          <div className="sidebar-ai-row">
            <span className="sidebar-ai-label">Краткая сводка</span>
            <span className="sidebar-ai-desc">
              Суть документа в нескольких предложениях
            </span>
          </div>
          <div className="sidebar-ai-row">
            <span className="sidebar-ai-label">Рекомендуемый отдел</span>
            <span className="sidebar-ai-desc">
              Отдел для направления документа (Бухгалтерия, Юридический, HR и тд.)
            </span>
          </div>
          <div className="sidebar-ai-row">
            <span className="sidebar-ai-label">Уверенность</span>
            <span className="sidebar-ai-desc">
              Насколько модель уверена в результатах анализа (0-100%)
            </span>
          </div>
        </Card>
      </aside>
    </div>
  );
};

export default UploadPage;