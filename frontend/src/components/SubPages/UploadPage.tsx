import "../../styles/global.css";
import "../../styles/UploadPage.css";
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../Card";
import { uploadDocument, extractText, analyzeDocument } from "../../services/api";
import * as mammoth from "mammoth";
import * as XLSX from "xlsx";
import type { FileItem, UploadStep } from "../../types";

type PreviewData = {
  fileName: string;
  content: string;
  isImage?: boolean;
  isPdf?: boolean;
  isTable?: boolean;
};

const ALLOWED_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/tiff",
];

const MAX_SIZE_MB = 50;
const MAX_FILES = 15;

const STEPS = [
  { label: "Загрузка", desc: "Файл сохраняется на сервер" },
  { label: "Извлечение", desc: "Текст извлекается из документа" },
  { label: "AI-анализ", desc: "Тип, категория, отдел, сводка" },
];

const stepIndex = (status: FileItem["status"]): number => {
  if (status === "uploading") return 0;
  if (status === "extracting") return 1;
  if (status === "analyzing") return 2;
  if (status === "done") return 3;
  return -1;
};

let fileIdCounter = 0;
const generateFileId = () => `file-${Date.now()}-${++fileIdCounter}`;

const getPreviewType = (file: File): "image" | "pdf" | "text" | "docx" | "xlsx" | "none" => {
  if (file.type.startsWith("image/")) return "image";
  if (file.type === "application/pdf") return "pdf";
  if (file.type === "text/plain") return "text";
  if (file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") return "docx";
  if (file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") return "xlsx";
  return "none";
};

const canPreview = (file: File): boolean => {
  return getPreviewType(file) !== "none";
};

interface UploadPageProps {
  files: FileItem[];
  setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>;
  step: UploadStep;
  setStep: React.Dispatch<React.SetStateAction<UploadStep>>;
  errorMessage: string;
  setErrorMessage: React.Dispatch<React.SetStateAction<string>>;
  processedCount: number;
  setProcessedCount: React.Dispatch<React.SetStateAction<number>>;
  totalToProcess: number;
  setTotalToProcess: React.Dispatch<React.SetStateAction<number>>;
  isProcessing: boolean;
  setIsProcessing: React.Dispatch<React.SetStateAction<boolean>>;
}

const UploadPage: React.FC<UploadPageProps> = ({
  files, setFiles, step, setStep, errorMessage, setErrorMessage,
  processedCount, setProcessedCount, totalToProcess, setTotalToProcess,
  isProcessing, setIsProcessing,
}) => {
  const navigate = useNavigate();
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [dragItemId, setDragItemId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelRef = useRef(false);

  const validateFile = (f: File): string | null => {
    if (!f.type || !ALLOWED_MIME.includes(f.type)) return "Неподдерживаемый формат";
    if (f.size > MAX_SIZE_MB * 1024 * 1024) return `Превышен размер (макс. ${MAX_SIZE_MB} МБ)`;
    return null;
  };

  const waitingCount = () => files.filter(f => f.status === "waiting" || f.status === "cancelled").length;

  const addFiles = (newFiles: FileList | File[]) => {
    const remaining = MAX_FILES - waitingCount();
    if (remaining <= 0) {
      setErrorMessage(`Максимум ${MAX_FILES} файлов одновременно`);
      return;
    }
    const toAdd = Array.from(newFiles).slice(0, remaining);
    const validated: FileItem[] = [];
    for (const f of toAdd) {
      const error = validateFile(f);
      validated.push({
        id: generateFileId(),
        file: f,
        status: error ? "error" : "waiting",
        selected: !error,
        errorMessage: error || undefined,
      });
    }
    setFiles(prev => [...prev, ...validated]);
    setErrorMessage("");
    if (toAdd.length < Array.from(newFiles).length) {
      setErrorMessage(`Добавлено ${toAdd.length} из ${Array.from(newFiles).length}. Максимум ${MAX_FILES} файлов`);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) addFiles(e.target.files);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setDragOver(false); };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation(); setDragOver(false);
    if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
  };

  const toggleFileSelection = (fileId: string) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === fileId);
      if (!file || (file.status !== "waiting" && file.status !== "cancelled")) return prev;
      const rest = prev.filter(f => f.id !== fileId);
      return [...rest, { ...file, selected: !file.selected }];
    });
  };

  const toggleAll = () => {
    const selectableFiles = files.filter(f => f.status === "waiting" || f.status === "cancelled");
    const allSelected = selectableFiles.every(f => f.selected);
    setFiles(prev => prev.map(f => (f.status === "waiting" || f.status === "cancelled") ? { ...f, selected: !allSelected } : f));
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const removeProcessed = () => {
    setFiles(prev => prev.filter(f => f.status !== "done" && f.status !== "error" && f.status !== "cancelled"));
    setStep("idle");
    setErrorMessage("");
    setProcessedCount(0);
    setTotalToProcess(0);
  };

  const handleDragStart = (e: React.DragEvent, fileId: string) => {
    const item = files.find(f => f.id === fileId);
    if (!item || (item.status !== "waiting" && item.status !== "cancelled")) return;
    setDragItemId(fileId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOverItem = (e: React.DragEvent, fileId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDropItem = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!dragItemId || dragItemId === targetId) return;
    const targetItem = files.find(f => f.id === targetId);
    if (!targetItem || (targetItem.status !== "waiting" && targetItem.status !== "cancelled")) return;
    setFiles(prev => {
      const copy = [...prev];
      const dragIndex = copy.findIndex(f => f.id === dragItemId);
      const targetIndex = copy.findIndex(f => f.id === targetId);
      const [moved] = copy.splice(dragIndex, 1);
      copy.splice(targetIndex, 0, moved);
      return copy;
    });
    setDragItemId(null);
  };

  const processFile = async (fileItem: FileItem) => {
    if (cancelRef.current) return;
    try {
      setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: "extracting" } : f));
      const uploadResponse = await uploadDocument(fileItem.file);
      if (cancelRef.current) return;
      setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: "analyzing", documentId: uploadResponse.id } : f));
      await extractText(uploadResponse.id);
      if (cancelRef.current) return;
      await analyzeDocument(uploadResponse.id);
      if (cancelRef.current) return;
      setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: "done" } : f));
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: "error", errorMessage: err.response?.data?.message || "Ошибка обработки" } : f));
    }
    setProcessedCount(prev => prev + 1);
  };

  const handleUpload = async () => {
    const selectedFiles = files.filter(f => f.selected && (f.status === "waiting" || f.status === "cancelled"));
    if (selectedFiles.length === 0) return;
    cancelRef.current = false;
    setIsProcessing(true);
    setProcessedCount(0);
    setTotalToProcess(selectedFiles.length);
    setErrorMessage("");

    setFiles(prev => {
      const selectedIds = new Set(selectedFiles.map(f => f.id));
      const selected = prev.filter(f => selectedIds.has(f.id));
      const unselected = prev.filter(f => !selectedIds.has(f.id) && (f.status === "waiting" || f.status === "cancelled"));
      const rest = prev.filter(f => !selectedIds.has(f.id) && f.status !== "waiting" && f.status !== "cancelled");
      const markedUnselected = unselected.map(f => ({ ...f, status: "cancelled" as FileItem["status"] }));
      const markedSelected = selected.map(f => ({ ...f, status: "uploading" as FileItem["status"] }));
      return [...markedSelected, ...markedUnselected, ...rest];
    });

    for (const fileItem of selectedFiles) {
      if (cancelRef.current) break;
      await processFile(fileItem);
    }
    setIsProcessing(false);

    setFiles(prev => prev.map(f => f.status === "cancelled" ? { ...f, status: "waiting" } : f));

    const hasErrors = files.some(f => f.status === "error");
    setStep(hasErrors ? "error" : "success");
  };

  const handleRetry = (fileId?: string) => {
    if (fileId) {
      const fileItem = files.find(f => f.id === fileId);
      if (fileItem) {
        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: "waiting", selected: true, errorMessage: undefined } : f));
        processFile({ ...fileItem, status: "waiting", selected: true });
      }
    } else {
      files.filter(f => f.status === "error").forEach(f => {
        setFiles(prev => prev.map(p => p.id === f.id ? { ...p, status: "waiting", selected: true, errorMessage: undefined } : p));
      });
      handleUpload();
    }
  };

  const handleClear = () => {
    setStep("idle");
    setFiles([]);
    setErrorMessage("");
    setProcessedCount(0);
    setTotalToProcess(0);
    setIsProcessing(false);
    cancelRef.current = false;
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handlePreview = async (file: File) => {
    const type = getPreviewType(file);
    if (type === "image" || type === "pdf") {
      const reader = new FileReader();
      reader.onload = () => setPreview({ fileName: file.name, content: reader.result as string, isImage: type === "image", isPdf: type === "pdf" });
      reader.readAsDataURL(file);
      return;
    }
    if (type === "text") {
      const reader = new FileReader();
      reader.onload = () => setPreview({ fileName: file.name, content: reader.result as string });
      reader.readAsText(file);
      return;
    }
    if (type === "docx") {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const result = await mammoth.extractRawText({ arrayBuffer: reader.result as ArrayBuffer });
          setPreview({ fileName: file.name, content: result.value || "Не удалось извлечь текст" });
        } catch { setPreview({ fileName: file.name, content: "Не удалось прочитать документ" }); }
      };
      reader.readAsArrayBuffer(file);
      return;
    }
    if (type === "xlsx") {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const wb = XLSX.read(reader.result, { type: "array" });
          let text = "";
          wb.SheetNames.forEach(sn => { text += `=== ${sn} ===\n` + XLSX.utils.sheet_to_csv(wb.Sheets[sn]) + "\n\n"; });
          setPreview({ fileName: file.name, content: text || "Не удалось извлечь данные", isTable: true });
        } catch { setPreview({ fileName: file.name, content: "Не удалось прочитать таблицу" }); }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const closePreview = () => setPreview(null);

  const getProgressPercent = (): number => {
    if (totalToProcess === 0) return 0;
    return Math.round((processedCount / totalToProcess) * 100);
  };

  const getStatusText = (): string => {
    if (step === "processing") return `Обработано ${processedCount} из ${totalToProcess}`;
    if (step === "success") return `Обработано ${processedCount} документов`;
    if (step === "error") return errorMessage || "Произошла ошибка";
    return "";
  };

  const getStatusClass = (): string => {
    if (step === "error") return "status-error";
    if (step === "success") return "status-success";
    if (step === "processing") return "status-loading";
    return "";
  };

  const getFileStatusClass = (status: FileItem["status"]): string => {
    switch (status) {
      case "done": return "file-status-done";
      case "error": return "file-status-error";
      case "uploading": case "extracting": case "analyzing": return "file-status-processing";
      case "cancelled": return "file-status-cancelled";
      default: return "";
    }
  };

  const getFileStatusLabel = (status: FileItem["status"]): string => {
    switch (status) {
      case "waiting": return "Ожидает";
      case "uploading": return "Загрузка...";
      case "extracting": return "Извлечение текста...";
      case "analyzing": return "AI-анализ...";
      case "done": return "Готово";
      case "error": return "Ошибка";
      case "cancelled": return "Пропущен";
      default: return "";
    }
  };

  const selectedCount = files.filter(f => f.selected && (f.status === "waiting" || f.status === "cancelled")).length;
  const selectableFiles = files.filter(f => f.status === "waiting" || f.status === "cancelled");
  const allWaitingSelected = selectableFiles.length > 0 && selectableFiles.every(f => f.selected);
  const hasProcessedFiles = files.some(f => f.status === "done" || f.status === "error" || f.status === "cancelled");
  const isFull = waitingCount() >= MAX_FILES;
  const canAddMore = !isFull;
  const hasProcessingFiles = files.some(f => ["uploading", "extracting", "analyzing"].includes(f.status));

  const sortedFiles = [...files].sort((a, b) => {
    if (a.selected && !b.selected) return -1;
    if (!a.selected && b.selected) return 1;
    return 0;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "Enter" && !isProcessing && selectedCount > 0) {
        e.preventDefault();
        handleUpload();
      }
      if (e.key === "Escape" && !isProcessing) {
        e.preventDefault();
        handleClear();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isProcessing, selectedCount, files]);

  return (
    <div className="upload-page">
      <div className="upload-main-col">
        <Card className="upload-card">
          <h1 className="upload-title">Загрузка документов</h1>
          <p className="upload-subtitle">Можно загрузить до {MAX_FILES} файлов одновременно</p>

          {canAddMore && !isProcessing && (
            <div className={["upload-area", dragOver ? "drag-over" : ""].filter(Boolean).join(" ")}
              onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()} role="button" tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}>
              <input ref={fileInputRef} type="file" multiple accept=".pdf,.docx,.txt,.xlsx,.jpg,.jpeg,.png,.tiff" className="file-input-hidden" onChange={handleFileSelect} />
              <div className="upload-icon-wrap"><img src="/icons/upload/UploadIcon.png" className="upload-icon-img" alt="" /></div>
              <p className="upload-text">Перетащите файлы в эту область</p>
              <p className="upload-hint">PDF, DOCX, TXT, XLSX, JPG, PNG, TIFF - до {MAX_SIZE_MB} МБ каждый</p>
              <div className="upload-actions-row">
                <button className="upload-scan-btn" onClick={(e) => { e.stopPropagation(); navigate('/dashboard/scan'); }}>
                  Сканировать
                </button>
              </div>
            </div>
          )}

          {isFull && !isProcessing && <div className="upload-limit-reached">Достигнут лимит в {MAX_FILES} файлов. Удалите ненужные или дождитесь обработки.</div>}

          {files.length > 0 && (
            <div className="files-queue">
              <div className="files-queue-header">
                <label className="file-queue-select-all">
                  {!isProcessing && <input type="checkbox" checked={allWaitingSelected} onChange={toggleAll} disabled={selectableFiles.length === 0} />}
                  {!isProcessing && <span className="file-queue-checkmark" />}
                  <span>
                    {isProcessing
                      ? `Обработано: ${processedCount} из ${totalToProcess}`
                      : `Выбрано: ${selectedCount} из ${waitingCount()}`
                    }
                  </span>
                </label>
                <div className="files-queue-header-actions">
                  {!isProcessing && selectedCount > 0 && <button className="upload-btn-primary" onClick={handleUpload}>Загрузить ({selectedCount})</button>}
                </div>
              </div>
              {isProcessing && totalToProcess > 0 && (
                <div className="upload-progress-bar">
                  <div className="upload-progress-fill" style={{ width: `${getProgressPercent()}%` }} />
                </div>
              )}
              <div className="files-queue-list">
                {sortedFiles.map(item => (
                  <div key={item.id} className={`file-queue-item ${getFileStatusClass(item.status)} ${dragItemId === item.id ? "file-queue-item--dragging" : ""}`}
                    draggable={!isProcessing && (item.status === "waiting" || item.status === "cancelled")}
                    onDragStart={(e) => handleDragStart(e, item.id)}
                    onDragOver={(e) => handleDragOverItem(e, item.id)}
                    onDrop={(e) => handleDropItem(e, item.id)}>
                    {!isProcessing && (item.status === "waiting" || item.status === "cancelled") && (
                      <label className="file-queue-checkbox" onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={item.selected} onChange={() => toggleFileSelection(item.id)} />
                        <span className="file-queue-checkmark" />
                      </label>
                    )}
                    {isProcessing && item.status === "cancelled" && (
                      <div className="file-queue-icon">
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="8" stroke="var(--text-tertiary)" strokeWidth="1.5"/><path d="M6 6l6 6M12 6l-6 6" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round"/></svg>
                      </div>
                    )}
                    {["uploading", "extracting", "analyzing"].includes(item.status) && (
                      <div className="file-queue-icon"><div className="file-queue-spinner" /></div>
                    )}
                    {item.status === "done" && (
                      <div className="file-queue-icon"><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="8" stroke="var(--color-status-loaded)" strokeWidth="1.5"/><path d="M5 9l3 3 5-5" stroke="var(--color-status-loaded)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
                    )}
                    {item.status === "error" && (
                      <div className="file-queue-icon"><svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="8" stroke="var(--color-status-rejected)" strokeWidth="1.5"/><path d="M6 6l6 6M12 6l-6 6" stroke="var(--color-status-rejected)" strokeWidth="1.5" strokeLinecap="round"/></svg></div>
                    )}
                    <div className="file-queue-info">
                      <span className="file-queue-name">{item.file.name}</span>
                      <span className="file-queue-meta">
                        {(item.file.size / 1024 / 1024).toFixed(2)} МБ
                        <span className="file-queue-separator">•</span>
                        <span className={`file-queue-status ${getFileStatusClass(item.status)}`}>{item.errorMessage || getFileStatusLabel(item.status)}</span>
                      </span>
                    </div>
                    <div className="file-queue-actions">
                      {!isProcessing && (item.status === "waiting" || item.status === "error" || item.status === "cancelled") && canPreview(item.file) && (
                        <button className="file-queue-preview-btn" onClick={() => handlePreview(item.file)} title="Предпросмотр">
                          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8s3-5 6-5 6 5 6 5-3 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/></svg>
                        </button>
                      )}
                      {item.status === "done" && item.documentId && (
                        <button className="upload-btn-primary upload-btn-xs" onClick={() => navigate(`/dashboard/documents/${item.documentId}`, { state: { from: 'upload' } })}>Открыть</button>
                      )}
                      {item.status === "error" && (
                        <button className="file-queue-retry-btn" onClick={() => handleRetry(item.id)} title="Повторить">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M1 7a6 6 0 0111.47-2.5M13 7a6 6 0 01-11.47 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M11 2.5V5H8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        </button>
                      )}
                      {!isProcessing && (item.status === "waiting" || item.status === "error" || item.status === "cancelled") && (
                        <button className="file-queue-remove-btn" onClick={() => removeFile(item.id)} title="Удалить">
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {hasProcessingFiles && (
            <>
              <div className="stepper">
                {STEPS.map((s, i) => {
                  const activeFile = files.find(f => stepIndex(f.status) === i);
                  const doneFile = files.find(f => stepIndex(f.status) > i);
                  const isDone = !!doneFile && !activeFile;
                  const isActive = !!activeFile;
                  const isLast = i === STEPS.length - 1;
                  return (
                    <div key={i} className="stepper-item">
                      <div className={["stepper-dot", isDone ? "done" : isActive ? "active" : ""].filter(Boolean).join(" ")}>
                        {isDone ? (
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 7l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        ) : isActive ? (
                          <span className="stepper-loader" />
                        ) : (
                          <span>{i + 1}</span>
                        )}
                      </div>
                      {!isLast && <div className={["stepper-line", isDone ? "done" : ""].filter(Boolean).join(" ")} />}
                    </div>
                  );
                })}
              </div>
              <div className="stepper-labels">
                {STEPS.map((s, i) => (
                  <span key={i}>{s.label}</span>
                ))}
              </div>
            </>
          )}

          {(step === "processing" || step === "success" || step === "error") && (
            <div className={`status-container ${getStatusClass()}`}>
              <span className="status-text">{getStatusText()}</span>
              {isProcessing && <div className="loader" />}
            </div>
          )}

          <div className="upload-actions">
            {step === "error" && !isProcessing && <button className="upload-btn-primary" onClick={() => handleRetry()}>Повторить всё</button>}
            {step === "success" && !isProcessing && <button className="upload-btn-primary" onClick={() => navigate('/dashboard/documents')}>К списку документов</button>}
            {hasProcessedFiles && !isProcessing && (
              <button className="upload-btn-secondary upload-btn-sm" onClick={removeProcessed}>Удалить обработанные</button>
            )}
            {files.length > 0 && (
              <button className="upload-btn-secondary upload-btn-danger" onClick={handleClear}>Очистить всё</button>
            )}
          </div>
        </Card>
      </div>

      <aside className="upload-sidebar">
        <Card className="sidebar-card">
          <h3 className="sidebar-section-title">Форматы файлов</h3>
          <div className="sidebar-group">
            <div className="sidebar-group-label">Документы</div>
            <div className="sidebar-row"><span className="sidebar-format">PDF</span><span className="sidebar-format-desc">Текст и сканы</span></div>
            <div className="sidebar-row"><span className="sidebar-format">DOCX</span><span className="sidebar-format-desc">Документы Word</span></div>
            <div className="sidebar-row"><span className="sidebar-format">TXT</span><span className="sidebar-format-desc">Текстовый файл</span></div>
            <div className="sidebar-row"><span className="sidebar-format">XLSX</span><span className="sidebar-format-desc">Таблицы Excel</span></div>
          </div>
          <div className="sidebar-group">
            <div className="sidebar-group-label">Изображения</div>
            <div className="sidebar-row"><span className="sidebar-format">JPG / PNG</span><span className="sidebar-format-desc">Фотографии, сканы</span></div>
            <div className="sidebar-row"><span className="sidebar-format">TIFF</span><span className="sidebar-format-desc">Сканы высокого качества</span></div>
          </div>
          <p className="sidebar-note">Максимальный размер: <strong>{MAX_SIZE_MB} МБ</strong></p>
          <p className="sidebar-note">Максимум файлов: <strong>{MAX_FILES}</strong></p>
        </Card>
        <Card className="sidebar-card">
          <h3 className="sidebar-section-title">Что даёт AI-анализ</h3>
          <div className="sidebar-ai-row"><span className="sidebar-ai-label">Тип документа</span><span className="sidebar-ai-desc">Юридическая форма документа (Договор, Счёт, Акт, Письмо и тд.)</span></div>
          <div className="sidebar-ai-row"><span className="sidebar-ai-label">Категория</span><span className="sidebar-ai-desc">Тематика документа (Финансы, Кадры, Логистика, Закупки и тд.)</span></div>
          <div className="sidebar-ai-row"><span className="sidebar-ai-label">Краткая сводка</span><span className="sidebar-ai-desc">Суть документа в нескольких предложениях</span></div>
          <div className="sidebar-ai-row"><span className="sidebar-ai-label">Рекомендуемый отдел</span><span className="sidebar-ai-desc">Отдел для направления документа (Бухгалтерия, Юридический, HR и тд.)</span></div>
          <div className="sidebar-ai-row"><span className="sidebar-ai-label">Уверенность</span><span className="sidebar-ai-desc">Насколько модель уверена в результатах анализа (0-100%)</span></div>
        </Card>
      </aside>

      {preview && (
        <div className="preview-overlay" onClick={closePreview}>
          <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="preview-header"><h3>{preview.fileName}</h3><button className="preview-close-btn" onClick={closePreview}><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></button></div>
            <div className="preview-content">
              {preview.isImage && <img src={preview.content} alt={preview.fileName} className="preview-image" />}
              {preview.isPdf && <iframe src={preview.content} title={preview.fileName} className="preview-pdf" />}
              {!preview.isImage && !preview.isPdf && <pre className={preview.isTable ? "preview-table" : ""}>{preview.content}</pre>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadPage;