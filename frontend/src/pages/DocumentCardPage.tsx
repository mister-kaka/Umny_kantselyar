import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import "../styles/global.css";
import "../styles/DocumentCard.css";
import { getDocumentById, getDocumentAiResult, analyzeDocument, deleteDocument, verifyDocument, routeDocument, getDocumentTypes, getDocumentCategories, getDepartments, createDocumentType, createDocumentCategory, extractText } from '../services/api';
import { DocumentCard as DocumentCardType, DocumentFile, DocumentRoute, DocumentAiResult, DocumentType, DocumentCategory, Department } from '../types/';
import Card from '../components/Card';
import { translateStatus, getStatusColorClass } from '../constants/statuses';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';

type PreviewData = {
  fileName: string;
  content: string;
  isImage?: boolean;
  isPdf?: boolean;
  isTable?: boolean;
};

const getPreviewTypeFromExt = (fileName: string): 'image' | 'pdf' | 'text' | 'docx' | 'xlsx' | 'none' => {
  const ext = fileName.split('.').pop()?.toLowerCase() || '';
  if (['jpg', 'jpeg', 'png', 'tiff', 'tif'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (ext === 'txt') return 'text';
  if (ext === 'docx') return 'docx';
  if (ext === 'xlsx') return 'xlsx';
  return 'none';
};

const canPreviewFromExt = (fileName: string): boolean => {
  return getPreviewTypeFromExt(fileName) !== 'none';
};

const formatConfidence = (value: number | null | undefined): number => {
  if (value == null) return 0;
  return Math.round(value * 100);
};

const DocumentCardPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from;
  const [activeTab, setActiveTab] = useState<"overview" | "ai" | "verification" | "ocr" | "history">("overview");

  const [data, setData] = useState<DocumentCardType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [aiResult, setAiResult] = useState<DocumentAiResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiAnalyzed, setAiAnalyzed] = useState(false);

  const [copied, setCopied] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);

  const [verifyTypeId, setVerifyTypeId] = useState<number | undefined>(undefined);
  const [verifyTypeText, setVerifyTypeText] = useState('');
  const [verifyCategoryId, setVerifyCategoryId] = useState<number | undefined>(undefined);
  const [verifyCategoryText, setVerifyCategoryText] = useState('');
  const [verifyDepartmentId, setVerifyDepartmentId] = useState<number | undefined>(undefined);
  const [verifyReceivedDate, setVerifyReceivedDate] = useState<string>('');
  const [verifySenderName, setVerifySenderName] = useState<string>('');
  const [verifyComment, setVerifyComment] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [verifyMessage, setVerifyMessage] = useState('');

  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectComment, setRejectComment] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  const [ocrLoading, setOcrLoading] = useState(false);

  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [documentCategories, setDocumentCategories] = useState<DocumentCategory[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    const shouldOpenVerification = (location.state as any)?.openVerificationTab;
    if (shouldOpenVerification) {
      setActiveTab("verification");

      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  const getBackLabel = (): string => {
    switch (from) {
      case 'main': return 'На главную';
      case 'upload': return 'Назад к загрузке';
      case 'search': return 'Архив документов';
      case 'notifications': return 'К уведомлениям';
      case 'verification': return 'В очередь проверки';
      default: return 'Архив документов';
    }
  };

  const getBackPath = (): string => {
    switch (from) {
      case 'main': return '/dashboard/main';
      case 'upload': return '/dashboard/incoming';
      case 'search': return '/dashboard/documents';
      case 'notifications': return '/dashboard/notifications';
      case 'verification': return '/dashboard/verification';
      default: return '/dashboard/documents';
    }
  };

  useEffect(() => {
    Promise.all([
      getDocumentTypes(),
      getDocumentCategories(),
      getDepartments()
    ]).then(([types, cats, deps]) => {
      setDocumentTypes(types);
      setDocumentCategories(cats);
      setDepartments(deps);
    }).catch(() => { });
  }, []);

  useEffect(() => {
    if (!id) {
      setError("ID документа не указан");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    getDocumentById(Number(id))
      .then((response) => {
        setData(response);
        if (response.aiResult) {
          setAiResult(response.aiResult);
          setAiAnalyzed(true);
        } else {
          loadAiResult(Number(id));
        }
        setLoading(false);
      })
      .catch((err) => {
        if (err.response?.status === 404) setError("Документ не найден");
        else setError("Ошибка загрузки документа");
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (data) {
      const typeName = data.classification?.type || aiResult?.documentTypeSuggested || '';
      const categoryName = data.classification?.category || aiResult?.categorySuggested || '';
      const deptName = data.currentDepartment || data.routes?.[0]?.departmentName;

      setVerifyTypeId(documentTypes.find(t => t.name === typeName)?.id);
      setVerifyTypeText(typeName);
      setVerifyCategoryId(documentCategories.find(c => c.name === categoryName)?.id);
      setVerifyCategoryText(categoryName);
      setVerifyDepartmentId(deptName ? departments.find(d => d.name === deptName)?.id : undefined);
      setVerifyReceivedDate(data.receivedDate ? new Date(data.receivedDate).toISOString().split('T')[0] : '');
      setVerifySenderName(data.senderName || '');
    }
  }, [data, documentTypes, documentCategories, departments, aiResult]);

  const loadAiResult = async (docId: number) => {
    try {
      const result = await getDocumentAiResult(docId);
      if (result) {
        setAiResult(result);
        setAiAnalyzed(true);
      }
    } catch { }
  };

  const handleAiAnalysis = async () => {
    if (!id) return;
    setAiLoading(true);
    setAiError(null);
    try {
      await analyzeDocument(Number(id));
      const result = await getDocumentAiResult(Number(id));
      setAiResult(result);
      setAiAnalyzed(true);
      const updatedData = await getDocumentById(Number(id));
      setData(updatedData);
    } catch {
      setAiError('Не удалось выполнить анализ документа');
    } finally {
      setAiLoading(false);
    }
  };

  const handleReExtractText = async () => {
    if (!id) return;
    setOcrLoading(true);
    try {
      await extractText(Number(id));
      const updatedData = await getDocumentById(Number(id));
      setData(updatedData);
      setVerifyStatus('success');
      setVerifyMessage('Текст успешно распознан');
    } catch {
      setVerifyStatus('error');
      setVerifyMessage('Ошибка при распознавании текста');
    } finally {
      setOcrLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    if (!window.confirm('Удалить документ? Это действие нельзя отменить.')) return;
    try {
      await deleteDocument(Number(id));
      navigate('/dashboard/documents');
    } catch {
      alert('Ошибка при удалении документа');
    }
  };

  const handleCopyOcr = () => {
    if (!data?.ocrResult?.rawText) return;
    navigator.clipboard.writeText(data.ocrResult.rawText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleVerify = async () => {
    if (!id) return;
    setVerifyLoading(true);
    setVerifyStatus('idle');
    setVerifyMessage('');
    try {
      let finalTypeId = verifyTypeId;
      if (verifyTypeText && !verifyTypeId) {
        try {
          const newType = await createDocumentType(verifyTypeText);
          finalTypeId = newType.id;
          setDocumentTypes(prev => [...prev, newType]);
          setVerifyTypeId(newType.id);
        } catch { }
      }

      let finalCategoryId = verifyCategoryId;
      if (verifyCategoryText && !verifyCategoryId) {
        try {
          const newCategory = await createDocumentCategory(verifyCategoryText);
          finalCategoryId = newCategory.id;
          setDocumentCategories(prev => [...prev, newCategory]);
          setVerifyCategoryId(newCategory.id);
        } catch { }
      }

      await verifyDocument(Number(id), {
        typeId: finalTypeId,
        categoryId: finalCategoryId,
        departmentId: verifyDepartmentId,
        receivedDate: verifyReceivedDate || undefined,
        senderName: verifySenderName || undefined,
        comment: verifyComment || undefined,
      });
      setVerifyStatus('success');
      setVerifyMessage('Документ проверен');
      const updatedData = await getDocumentById(Number(id));
      setData(updatedData);
    } catch {
      setVerifyStatus('error');
      setVerifyMessage('Ошибка при проверке документа');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleRoute = async () => {
    if (!id || !verifyDepartmentId) return;
    setRouteLoading(true);
    setVerifyStatus('idle');
    setVerifyMessage('');
    try {
      await routeDocument(Number(id), {
        departmentId: verifyDepartmentId,
        comment: verifyComment || undefined,
      });
      setVerifyStatus('success');
      setVerifyMessage('Документ направлен в отдел');
      const updatedData = await getDocumentById(Number(id));
      setData(updatedData);
      setActiveTab('history');
    } catch {
      setVerifyStatus('error');
      setVerifyMessage('Ошибка при направлении документа');
    } finally {
      setRouteLoading(false);
    }
  };

  const handleReject = async () => {
    if (!id) return;
    setRejectLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/documents/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        },
        body: JSON.stringify({ comment: rejectComment })
      });
      if (!response.ok) throw new Error('Ошибка при отклонении');
      setShowRejectModal(false);
      setRejectComment('');
      const updatedData = await getDocumentById(Number(id));
      setData(updatedData);
      setVerifyStatus('success');
      setVerifyMessage('Документ отклонён');
      setActiveTab('history');
    } catch {
      setVerifyStatus('error');
      setVerifyMessage('Ошибка при отклонении документа');
    } finally {
      setRejectLoading(false);
    }
  };

  const handlePreviewFile = async (file: DocumentFile) => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    const fileUrl = `${apiUrl}${file.filePath}`;
    const type = getPreviewTypeFromExt(file.fileName);

    if (type === 'image') {
      setPreview({ fileName: file.fileName, content: fileUrl, isImage: true });
      return;
    }
    if (type === 'pdf') {
      setPreview({ fileName: file.fileName, content: fileUrl, isPdf: true });
      return;
    }
    try {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error('Ошибка загрузки');
      if (type === 'text') {
        const text = await response.text();
        setPreview({ fileName: file.fileName, content: text });
        return;
      }
      if (type === 'docx') {
        const buffer = await response.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: buffer });
        setPreview({ fileName: file.fileName, content: result.value || 'Не удалось извлечь текст' });
        return;
      }
      if (type === 'xlsx') {
        const buffer = await response.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        let text = '';
        wb.SheetNames.forEach(sn => {
          text += `=== ${sn} ===\n` + XLSX.utils.sheet_to_csv(wb.Sheets[sn]) + '\n\n';
        });
        setPreview({ fileName: file.fileName, content: text || 'Не удалось извлечь данные', isTable: true });
        return;
      }
    } catch {
      setPreview({ fileName: file.fileName, content: 'Не удалось загрузить файл для предпросмотра' });
    }
  };

  const closePreview = () => setPreview(null);

  if (loading) return <div className="doc-loading">Загрузка документа...</div>;
  if (error) return <div className="doc-error">{error}</div>;
  if (!data) return <div className="doc-error">Документ не найден</div>;

  const getConfidenceClass = (percent: number): string => {
    if (percent >= 90) return "confidence-high";
    if (percent >= 70) return "confidence-medium";
    return "confidence-low";
  };

  const overallConfidence = formatConfidence(data.confidenceScore);
  const hasOcrText = !!data.ocrResult?.rawText;

  const currentDepartmentLabel = data.currentDepartment
    || data.routes?.[0]?.departmentName
    || 'Не назначен';

  const suggestedDepartment = aiResult?.departmentSuggested || null;
  const mainFile = data.files?.[0];

  const canReject = data.currentStatus !== 'rejected' && data.currentStatus !== 'routed';

  return (
    <div className="document-page">
      <div className="doc-topbar">
        <button className="back-to-list-btn back-to-list-btn--primary" onClick={() => navigate(getBackPath())}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 3l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {getBackLabel()}
        </button>
      </div>

      <div className="doc-header">
        <div className="doc-header-left">
          <h1 className="doc-title">Карточка документа</h1>
          <span className="doc-number">{data.registrationNumber}</span>
        </div>
        <div
          className={`confidence-badge ${getConfidenceClass(overallConfidence)}`}
          data-tooltip="Общая уверенность: OCR (качество распознавания) × 20% + AI-анализ × 80%"
        >
          Уверенность: {overallConfidence}% <span className="confidence-info-symbol">ⓘ</span>
        </div>
      </div>

      <div className="doc-info-panel">
        <div className="doc-info-item">
          <span className="doc-info-label">Название файла</span>
          <span className="doc-info-value" title={data.title}>
            {data.title}
            {mainFile && canPreviewFromExt(mainFile.fileName) && (
              <button className="doc-preview-btn" onClick={() => handlePreviewFile(mainFile)} title="Предпросмотр">
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M2 8s3-5 6-5 6 5 6 5-3 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />
                </svg>
              </button>
            )}
          </span>
        </div>
        <div className="doc-info-divider" />
        <div className="doc-info-item">
          <span className="doc-info-label">Дата документа</span>
          <span
            className="doc-info-value has-tooltip"
            data-tooltip="Дата из текста самого документа, извлечена AI. Может отличаться от даты загрузки в систему."
          >
            {data.receivedDate ? new Date(data.receivedDate).toLocaleDateString('ru-RU') : 'Не указана'}
            <span className="confidence-info-symbol">ⓘ</span>
          </span>
        </div>
        <div className="doc-info-divider" />
        <div className="doc-info-item">
          <span className="doc-info-label">Дата загрузки</span>
          <span className="doc-info-value">{data.uploadedAt ? new Date(data.uploadedAt).toLocaleDateString('ru-RU') : '-'}</span>
        </div>
        <div className="doc-info-divider" />
        <div className="doc-info-item">
          <span className="doc-info-label">Отправитель</span>
          <span className="doc-info-value">{data.senderName}</span>
        </div>
        <div className="doc-info-divider" />
        <div className="doc-info-item">
          <span className="doc-info-label">Статус</span>
          <span className={`status-badge ${getStatusColorClass(data.currentStatus)}`}>
            {translateStatus(data.currentStatus)}
          </span>
        </div>
        <div className="doc-info-divider" />
        <div className="doc-info-item">
          <span className="doc-info-label">Текущий отдел</span>
          <span className="doc-info-value">{currentDepartmentLabel}</span>
        </div>
      </div>

      <div className="doc-tabs-wrapper">
        <div className="tabs">
          <button className={`tab ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")}>Обзор</button>
          <button className={`tab ${activeTab === "ai" ? "active" : ""}`} onClick={() => setActiveTab("ai")}>AI-анализ</button>
          <button className={`tab ${activeTab === "verification" ? "active" : ""}`} onClick={() => setActiveTab("verification")}>Проверка</button>
          <button className={`tab ${activeTab === "ocr" ? "active" : ""}`} onClick={() => setActiveTab("ocr")}>Текст OCR</button>
          <button className={`tab ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>История маршрутов</button>
        </div>

        <div className="tab-content">
          {activeTab === "overview" && (
            <div className="overview-grid">
              <Card>
                <h3 className="card-section-title">Общая информация</h3>
                <div className="info-block">
                  <div className="info-row">
                    <span>Рег. номер</span>
                    <strong>{data.registrationNumber}</strong>
                  </div>
                  <div className="info-row">
                    <span>Внёс в систему</span>
                    <strong>{data.createdBy}</strong>
                  </div>
                  <div className="info-row">
                    <span>Дата загрузки</span>
                    <strong>{data.uploadedAt ? new Date(data.uploadedAt).toLocaleDateString('ru-RU') : '-'}</strong>
                  </div>
                  <div className="info-row">
                    <span>Статус</span>
                    <span className={`status-badge ${getStatusColorClass(data.currentStatus)}`}>
                      {translateStatus(data.currentStatus)}
                    </span>
                  </div>
                  <div className="info-row">
                    <span>Текущий отдел</span>
                    <strong>{currentDepartmentLabel}</strong>
                  </div>
                </div>
              </Card>

              <Card>
                <h3 className="card-section-title">Классификация</h3>
                <div className="classif-list">
                  <div className="classif-item">
                    <span className="classif-label">Тип документа</span>
                    <div className="classif-right">
                      <span className="classif-value">{data.classification?.type || aiResult?.documentTypeSuggested || '-'}</span>
                      <span
                        className={`confidence-chip ${getConfidenceClass(formatConfidence(data.classification?.typeConfidence ?? aiResult?.confidenceScore ?? null))}`}
                        data-tooltip="Точность определения типа документа AI-моделью"
                      >
                        {formatConfidence(data.classification?.typeConfidence ?? aiResult?.confidenceScore ?? null)}%
                        <span className="confidence-info-symbol">ⓘ</span>
                      </span>
                    </div>
                  </div>
                  <div className="classif-item">
                    <span className="classif-label">Категория</span>
                    <div className="classif-right">
                      <span className="classif-value">{data.classification?.category || aiResult?.categorySuggested || '-'}</span>
                      <span
                        className={`confidence-chip ${getConfidenceClass(formatConfidence(data.classification?.categoryConfidence ?? aiResult?.confidenceScore ?? null))}`}
                        data-tooltip="Точность определения категории документа AI-моделью"
                      >
                        {formatConfidence(data.classification?.categoryConfidence ?? aiResult?.confidenceScore ?? null)}%
                        <span className="confidence-info-symbol">ⓘ</span>
                      </span>
                    </div>
                  </div>
                  {aiResult?.extractedAmount != null && (
                    <div className="classif-item">
                      <span className="classif-label">Сумма</span>
                      <div className="classif-right">
                        <span className="classif-value">{aiResult.extractedAmount.toLocaleString('ru-RU')} ₽</span>
                      </div>
                    </div>
                  )}
                  {suggestedDepartment && (
                    <div className="classif-item">
                      <span className="classif-label">Рекомендован в отдел</span>
                      <div className="classif-right">
                        <span className="classif-value">{suggestedDepartment}</span>
                      </div>
                    </div>
                  )}
                  {aiResult?.summaryText && (
                    <div className="classif-item">
                      <span className="classif-label">Краткая сводка</span>
                      <div className="classif-right">
                        <span className="classif-value ai-summary-text">{aiResult.summaryText}</span>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              <Card>
                <h3 className="card-section-title">Источник документа</h3>
                {data.source ? (
                  <div className="info-block">
                    <div className="info-row">
                      <span>Тип источника</span>
                      <strong>
                        {data.source.sourceType === 'organization'
                          ? 'Организация'
                          : data.source.sourceType === 'individual'
                            ? 'Физ. лицо'
                            : data.source.sourceType === 'department'
                              ? 'Подразделение'
                              : data.source.sourceType}
                      </strong>
                    </div>
                    {data.source.organizationName && (
                      <div className="info-row">
                        <span>Организация</span>
                        <strong>{data.source.organizationName}</strong>
                      </div>
                    )}
                    {data.source.senderName && (
                      <div className="info-row">
                        <span>Отправитель</span>
                        <strong>{data.source.senderName}</strong>
                      </div>
                    )}
                    {data.source.contactInfo && (
                      <div className="info-row">
                        <span>Контакты</span>
                        <strong>{data.source.contactInfo}</strong>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="empty-message">Не указан</div>
                )}
              </Card>

              <Card>
                <h3 className="card-section-title">Связанные файлы</h3>
                {data.files?.length > 0 ? (
                  <div className="files-list">
                    {data.files.map((file: DocumentFile) => (
                      <div key={file.id} className="file-row">
                        <span className="file-icon" />
                        <span className="file-name">{file.fileName}</span>
                        <span className="file-size">{(file.fileSize / 1024).toFixed(0)} КБ</span>
                        <div className="file-actions">
                          {canPreviewFromExt(file.fileName) && (
                            <button className="file-preview-btn" onClick={() => handlePreviewFile(file)} title="Предпросмотр">
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                                <path d="M2 8s3-5 6-5 6 5 6 5-3 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                                <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />
                              </svg>
                            </button>
                          )}
                          <a
                            href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${file.filePath}`}
                            download={file.fileName}
                            className="file-download"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Скачать
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-message">Нет файлов</div>
                )}
              </Card>
            </div>
          )}

          {activeTab === "ai" && (
            <div className="ai-tab-layout">
              <Card>
                <h3 className="card-section-title">AI-анализ документа</h3>
                <div className="ai-analysis-control">
                  {!aiAnalyzed ? (
                    <>
                      <button
                        className="ai-btn"
                        onClick={handleAiAnalysis}
                        disabled={aiLoading || !hasOcrText}
                      >
                        {aiLoading
                          ? 'Анализ выполняется...'
                          : !hasOcrText
                            ? 'Требуется OCR-текст'
                            : 'Запустить AI-анализ'}
                      </button>
                      {!hasOcrText && (
                        <p className="ai-warning">
                          Для запуска AI-анализа необходимо сначала загрузить документ через сканирование
                        </p>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="ai-success">Анализ выполнен</p>
                      <button
                        className="ai-btn-secondary"
                        onClick={() => {
                          setAiResult(null);
                          setAiAnalyzed(false);
                          setAiError(null);
                        }}
                      >
                        Повторить анализ
                      </button>
                    </>
                  )}
                </div>
                {aiError && (
                  <div className="ai-error">
                    <p>{aiError}</p>
                    <button className="ai-btn-secondary" onClick={handleAiAnalysis}>
                      Повторить
                    </button>
                  </div>
                )}
              </Card>

              {aiResult && (
                <div className="ai-results-grid">
                  <div className="ai-result-card">
                    <div className="ai-result-card-label">Тип документа</div>
                    <div className="ai-result-card-value">{aiResult.documentTypeSuggested || '-'}</div>
                  </div>
                  <div className="ai-result-card">
                    <div className="ai-result-card-label">Категория</div>
                    <div className="ai-result-card-value">{aiResult.categorySuggested || '-'}</div>
                  </div>
                  <div className="ai-result-card">
                    <div className="ai-result-card-label">Рекомендуемый отдел</div>
                    <div className="ai-result-card-value">{aiResult.departmentSuggested || '-'}</div>
                  </div>
                  <div className="ai-result-card">
                    <div className="ai-result-card-label">Уверенность модели</div>
                    <div className="ai-result-card-value">
                      <span
                        className={`confidence-chip ${getConfidenceClass(formatConfidence(aiResult.confidenceScore))}`}
                        data-tooltip="Уверенность AI-модели в правильности всего анализа"
                      >
                        {formatConfidence(aiResult.confidenceScore)}%
                        <span className="confidence-info-symbol">ⓘ</span>
                      </span>
                    </div>
                  </div>
                  {aiResult.extractedDate && (
                    <div className="ai-result-card">
                      <div className="ai-result-card-label">Дата в документе</div>
                      <div className="ai-result-card-value">
                        {new Date(aiResult.extractedDate).toLocaleDateString('ru-RU')}
                      </div>
                    </div>
                  )}
                  {aiResult.extractedAmount != null && (
                    <div className="ai-result-card">
                      <div className="ai-result-card-label">Сумма</div>
                      <div className="ai-result-card-value">
                        {aiResult.extractedAmount.toLocaleString('ru-RU')} ₽
                      </div>
                    </div>
                  )}
                  {aiResult.sourceSenderSuggested && (
                    <div className="ai-result-card ai-result-card--wide">
                      <div className="ai-result-card-label">Отправитель (AI)</div>
                      <div className="ai-result-card-value">{aiResult.sourceSenderSuggested}</div>
                    </div>
                  )}
                  {(aiResult.sourceTypeSuggested || aiResult.sourceOrganizationSuggested || aiResult.sourceContactSuggested) && (
                    <div className="ai-result-card ai-result-card--wide">
                      <div className="ai-result-card-label">Источник документа</div>
                      <div className="ai-result-card-value">
                        {aiResult.sourceTypeSuggested && (
                          <span>
                            Тип: {aiResult.sourceTypeSuggested === 'organization'
                              ? 'Организация'
                              : aiResult.sourceTypeSuggested === 'individual'
                                ? 'Физ. лицо'
                                : aiResult.sourceTypeSuggested === 'department'
                                  ? 'Подразделение'
                                  : aiResult.sourceTypeSuggested}
                          </span>
                        )}
                        {aiResult.sourceOrganizationSuggested && (
                          <span>
                            {aiResult.sourceTypeSuggested ? ' — ' : ''}{aiResult.sourceOrganizationSuggested}
                          </span>
                        )}
                        {aiResult.sourceContactSuggested && (
                          <span>
                            {aiResult.sourceOrganizationSuggested ? ', ' : ''}{aiResult.sourceContactSuggested}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  <div className="ai-result-card ai-result-card--wide">
                    <div className="ai-result-card-label">Краткая сводка</div>
                    <div className="ai-result-card-value ai-result-card-value--left">{aiResult.summaryText || '-'}</div>
                  </div>
                  {aiResult.keyPhrases && aiResult.keyPhrases.length > 0 && (
                    <div className="ai-result-card ai-result-card--wide">
                      <div className="ai-result-card-label">Ключевые фразы</div>
                      <div className="ai-result-card-value">{aiResult.keyPhrases.join(', ')}</div>
                    </div>
                  )}
                  <div className="ai-result-card ai-result-card--wide">
                    <div className="ai-result-card-label">Использованная модель</div>
                    <div className="ai-result-card-value ai-result-card-value--muted">
                      {aiResult.modelName || '-'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "verification" && (
            <Card>
              <h3 className="card-section-title">Проверка оператором</h3>
              <p className="verification-hint">
                Проверьте и при необходимости скорректируйте данные, определённые AI.
              </p>

              <div className="verification-form">
                <div className="verification-group">
                  <h4 className="verification-group-title">Классификация</h4>
                  <div className="verification-row">
                    <label className="verification-label">Тип документа</label>
                    <input
                      type="text"
                      className="verification-select"
                      list="verification-types"
                      value={verifyTypeText}
                      onChange={e => {
                        setVerifyTypeText(e.target.value);
                        const found = documentTypes.find(t => t.name.toLowerCase() === e.target.value.toLowerCase());
                        setVerifyTypeId(found?.id);
                      }}
                      placeholder="Выберите или введите новый тип"
                    />
                    <datalist id="verification-types">
                      {documentTypes.map(t => (
                        <option key={t.id} value={t.name} />
                      ))}
                    </datalist>
                    {aiResult?.documentTypeSuggested && !verifyTypeId && (
                      <span className="verification-ai-hint">
                        AI предложил: {aiResult.documentTypeSuggested}
                      </span>
                    )}
                  </div>

                  <div className="verification-row">
                    <label className="verification-label">Категория</label>
                    <input
                      type="text"
                      className="verification-select"
                      list="verification-categories"
                      value={verifyCategoryText}
                      onChange={e => {
                        setVerifyCategoryText(e.target.value);
                        const found = documentCategories.find(c => c.name.toLowerCase() === e.target.value.toLowerCase());
                        setVerifyCategoryId(found?.id);
                      }}
                      placeholder="Выберите или введите новую категорию"
                    />
                    <datalist id="verification-categories">
                      {documentCategories.map(c => (
                        <option key={c.id} value={c.name} />
                      ))}
                    </datalist>
                    {aiResult?.categorySuggested && !verifyCategoryId && (
                      <span className="verification-ai-hint">
                        AI предложил: {aiResult.categorySuggested}
                      </span>
                    )}
                  </div>
                </div>

                <div className="verification-group">
                  <h4 className="verification-group-title">Маршрутизация</h4>
                  <div className="verification-row">
                    <label className="verification-label">Отдел</label>
                    <select
                      className="verification-select"
                      value={verifyDepartmentId ?? ''}
                      onChange={e => setVerifyDepartmentId(e.target.value ? Number(e.target.value) : undefined)}
                    >
                      <option value="">— Выберите отдел —</option>
                      {departments.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                    {aiResult?.departmentSuggested && (
                      <span className="verification-ai-hint">
                        AI предложил: {aiResult.departmentSuggested}
                      </span>
                    )}
                  </div>

                  <div className="verification-row">
                    <label className="verification-label">Дата документа</label>
                    <input
                      type="date"
                      className="verification-select"
                      value={verifyReceivedDate}
                      onChange={e => setVerifyReceivedDate(e.target.value)}
                    />
                  </div>

                  <div className="verification-row">
                    <label className="verification-label">Отправитель</label>
                    <input
                      type="text"
                      className="verification-select"
                      value={verifySenderName}
                      onChange={e => setVerifySenderName(e.target.value)}
                      placeholder="Отправитель"
                    />
                  </div>

                  <div className="verification-row">
                    <label className="verification-label">Комментарий</label>
                    <textarea
                      className="verification-textarea"
                      value={verifyComment}
                      onChange={e => setVerifyComment(e.target.value)}
                      placeholder="Комментарий к проверке (необязательно)"
                      rows={3}
                    />
                  </div>
                </div>

                <div className="verification-actions">
                  <button className="ai-btn" onClick={handleVerify} disabled={verifyLoading}>
                    {verifyLoading ? 'Сохранение...' : 'Подтвердить'}
                  </button>
                  <button
                    className="ai-btn-secondary"
                    onClick={handleRoute}
                    disabled={routeLoading || !verifyDepartmentId}
                  >
                    {routeLoading ? 'Отправка...' : 'Направить в отдел'}
                  </button>
                  {canReject && (
                    <button
                      className="ai-btn-danger"
                      onClick={() => setShowRejectModal(true)}
                      disabled={verifyLoading || routeLoading}
                      title="Отклонить документ. Документ будет перемещён в архив с пометкой «Отклонён»."
                    >
                      Отклонить
                    </button>
                  )}
                </div>

                {verifyStatus !== 'idle' && (
                  <div className={`verification-status ${verifyStatus}`}>
                    {verifyMessage}
                  </div>
                )}
              </div>
            </Card>
          )}

          {activeTab === "ocr" && (
            <Card>
              <div className="ocr-header">
                <h3 className="card-section-title">Распознанный текст</h3>
                <div className="ocr-header-right">
                  {data.ocrResult && (
                    <span
                      className={`confidence-chip ${getConfidenceClass(formatConfidence(data.ocrResult.ocrConfidence))}`}
                      data-tooltip="Качество извлечения текста из файла. Зависит от качества исходного изображения или PDF."
                    >
                      Точность: {formatConfidence(data.ocrResult.ocrConfidence)}%
                      <span className="confidence-info-symbol">ⓘ</span>
                    </span>
                  )}
                </div>
              </div>
              <pre className="ocr-text">{data.ocrResult?.rawText || 'Текст не распознан'}</pre>
              <div className="ocr-footer">
                <button className="ocr-copy-btn" onClick={handleCopyOcr} disabled={!data.ocrResult?.rawText}>
                  {copied ? 'Скопировано' : 'Копировать'}
                </button>
                <button className="ocr-retry-btn" onClick={handleReExtractText} disabled={ocrLoading}>
                  {ocrLoading ? 'Распознавание...' : 'Повторить распознавание'}
                </button>
              </div>
            </Card>
          )}

          {activeTab === "history" && (
            <Card>
              <h3 className="card-section-title">История маршрутов</h3>
              {data.routes.length > 0 ? (
                <div className="table-wrapper">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>Отдел</th>
                        <th>Статус</th>
                        <th>Причина</th>
                        <th>Дата</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.routes.map((route: DocumentRoute, idx: number) => (
                        <tr key={idx}>
                          <td>{route.departmentName || '—'}</td>
                          <td>
                            <span className={`status-badge ${getStatusColorClass(route.routeStatus)}`}>
                              {translateStatus(route.routeStatus)}
                            </span>
                          </td>
                          <td>{route.routeReason || '—'}</td>
                          <td>
                            {new Date(route.routedAt).toLocaleString('ru-RU', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-message">Маршрутов пока нет</div>
              )}
            </Card>
          )}
        </div>
      </div>

      <div className="doc-bottom-actions">
        <button className="delete-doc-btn" onClick={handleDelete}>
          Удалить документ
        </button>
      </div>

      {from !== 'archive' && from !== 'search' && (
        <div className="doc-bottom-link">
          <a href="/dashboard/documents" onClick={(e) => { e.preventDefault(); navigate('/dashboard/documents'); }}>
            В архив документов
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      )}

      {preview && (
        <div className="preview-overlay" onClick={closePreview}>
          <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="preview-header">
              <h3>{preview.fileName}</h3>
              <button className="preview-close-btn" onClick={closePreview}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="preview-content">
              {preview.isImage && <img src={preview.content} alt={preview.fileName} className="preview-image" />}
              {preview.isPdf && <iframe src={preview.content} title={preview.fileName} className="preview-pdf" />}
              {!preview.isImage && !preview.isPdf && (
                <pre className={preview.isTable ? "preview-table" : ""}>{preview.content}</pre>
              )}
            </div>
          </div>
        </div>
      )}

      {showRejectModal && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Отклонение документа</h3>
              <button className="modal-close" onClick={() => setShowRejectModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Вы уверены, что хотите отклонить документ?</p>
              <label className="modal-label">Причина отклонения (необязательно)</label>
              <textarea
                className="modal-textarea"
                value={rejectComment}
                onChange={(e) => setRejectComment(e.target.value)}
                placeholder="Укажите причину отклонения..."
                rows={3}
              />
            </div>
            <div className="modal-footer">
              <button className="modal-btn-cancel" onClick={() => setShowRejectModal(false)}>
                Отмена
              </button>
              <button className="modal-btn-confirm" onClick={handleReject} disabled={rejectLoading}>
                {rejectLoading ? 'Отклонение...' : 'Да, отклонить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentCardPage;