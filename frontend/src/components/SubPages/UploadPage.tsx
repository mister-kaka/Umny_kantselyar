import "../../styles/global.css";
import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../Card";
import "../../styles/UploadPage.css";
// import { uploadDocument, extractText, analyzeDocument } from "../../services/api";

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

const UploadPage = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<UploadStep>("idle");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [documentId, setDocumentId] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const allowedFormats = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "image/jpeg",
    "image/png",
    "image/tiff",
  ];
  const maxSizeMB = 10;

  const validateFile = (file: File): boolean => {
    if (!allowedFormats.includes(file.type)) {
      setErrorMessage(
        "Неподдерживаемый формат. Разрешены: PDF, DOCX, TXT, JPG, PNG, TIFF"
      );
      return false;
    }
    if (file.size > maxSizeMB * 1024 * 1024) {
      setErrorMessage(`Файл слишком большой. Максимум ${maxSizeMB} МБ`);
      return false;
    }
    return true;
  };

  const handleFileSelect = (selectedFile: File) => {
    if (!validateFile(selectedFile)) {
      setStep("error");
      return;
    }
    setFile(selectedFile);
    setErrorMessage("");
    setStep("selected");
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

  try {
    // ВРЕМЕННО: мок-данные, пока Карина не добавит API функции
    setStep("uploading");
    await new Promise(resolve => setTimeout(resolve, 1000)); // имитация загрузки
    setDocumentId("mock-doc-id-123");
    setStep("uploaded");

    setStep("extracting");
    await new Promise(resolve => setTimeout(resolve, 1500));
    setStep("extracted");

    setStep("analyzing");
    await new Promise(resolve => setTimeout(resolve, 2000));
    setStep("success");
    
    // КОГДА КАРИНА ДОБАВИТ ФУНКЦИИ (удалить имитацию, оставить то что ниже)
    /*
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
    */
    
  } catch (error: any) {
    console.error("Ошибка:", error);
    setErrorMessage(
      error.response?.data?.message || "Произошла ошибка при обработке документа"
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

  const handleGoToDocument = () => {
    navigate(`/dashboard/documents/${documentId}`);
  };

  const getStatusText = () => {
    switch (step) {
      case "uploading":
        return "Загрузка...";
      case "uploaded":
        return "Файл загружен";
      case "extracting":
        return "Извлекаем текст...";
      case "extracted":
        return "Текст извлечён";
      case "analyzing":
        return "AI анализирует...";
      case "success":
        return "Документ обработан";
      case "error":
        return `Ошибка: ${errorMessage}`;
      default:
        return "";
    }
  };

  const getStatusClass = () => {
    if (step === "error") return "status-error";
    if (step === "success") return "status-success";
    if (step === "uploaded" || step === "extracted") return "status-info";
    if (step === "uploading" || step === "extracting" || step === "analyzing")
      return "status-loading";
    return "";
  };

  const handleClear = () => {
    setStep("idle");
    setFile(null);
    setErrorMessage("");
  };

  return (
    <div>
      <Card className="upload-container">
        <h1 className="upload-title">Сканирование документа</h1>

        {step === "idle" || step === "selected" ? (
          <div
            className={`upload-area ${step === "selected" ? "has-file" : ""}`}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.txt,.jpg,.jpeg,.png,.tiff"
              onChange={(e) =>
                e.target.files?.[0] && handleFileSelect(e.target.files[0])
              }
              style={{ display: "none" }}
            />

            {step === "idle" ? (
              <>
                            { /* добавить картинку вместо 📁 */ }
                <div className="upload-icon">📁</div>
                <p className="upload-text">
                  Перетащите файл сюда или кликните для выбора
                </p>
                <p className="upload-hint">
                  Поддерживаемые форматы: PDF, DOCX, TXT, JPG, PNG, TIFF (до 10
                  МБ)
                </p>
              </>
            ) : (
              <div className="file-info">
                <div className="file-name">{file?.name}</div>
                <div className="file-size">
                  {file?.size && (file.size / 1024 / 1024).toFixed(2)} МБ
                </div>
              </div>
            )}
          </div>
        ) : null}

        {step !== "idle" && step !== "selected" && (
          <div className={`status-container ${getStatusClass()}`}>
            <div className="status-text">{getStatusText()}</div>
            {(step === "uploading" ||
              step === "extracting" ||
              step === "analyzing") && <div className="loader"></div>}
          </div>
        )}

        <div className="upload-actions">
          {step === "selected" && (
            <button className="button-primary" onClick={handleUpload}>
              Загрузить
            </button>
          )}

          {step === "error" && (
            <button className="button-secondary" onClick={handleRetry}>
              Повторить
            </button>
          )}

          {step === "success" && (
            <button className="button-primary" onClick={handleGoToDocument}>
              Перейти к документу
            </button>
          )}

          {(step === "idle" || step === "selected") && (
            <button className="button-secondary" onClick={handleClear}>
              Очистить
            </button>
          )}
        </div>
      </Card>
    </div>
  );
};

export default UploadPage;