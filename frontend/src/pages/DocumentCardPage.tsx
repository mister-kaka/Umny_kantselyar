import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import "../styles/global.css";
import "../styles/DocumentCard.css";
import { getDocumentById, getDocumentAiResult, analyzeDocument, deleteDocument } from '../services/api';
import { DocumentCard as DocumentCardType, DocumentFile, DocumentRoute, DocumentAiResult } from '../types/';
import Card from '../components/Card';
import { translateStatus, getStatusColor } from '../components/SubPages/MainMenu';

const DocumentCardPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as any)?.from;
  const [activeTab, setActiveTab] = useState<"overview" | "ai" | "ocr" | "history">("overview");

  const [data, setData] = useState<DocumentCardType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [aiResult, setAiResult] = useState<DocumentAiResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiAnalyzed, setAiAnalyzed] = useState(false);

  const [copied, setCopied] = useState(false);

  const getBackLabel = (): string => {
    switch (from) {
      case 'main': return 'На главную';
      case 'upload': return 'Назад к загрузке';
      case 'search': return 'Архив документов';
      default: return 'Архив документов';
    }
  };

  const getBackPath = (): string => {
    switch (from) {
      case 'main': return '/dashboard/main';
      case 'upload': return '/dashboard/incoming';
      case 'search': return '/dashboard/documents';
      default: return '/dashboard/documents';
    }
  };

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

  const loadAiResult = async (docId: number) => {
    try {
      const result = await getDocumentAiResult(docId);
      if (result) {
        setAiResult(result);
        setAiAnalyzed(true);
      }
    } catch {}
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
      // Обновляем данные карточки после AI-анализа (отправитель, дата, тип, категория, уверенность)
      const updatedData = await getDocumentById(Number(id));
      setData(updatedData);
    } catch {
      setAiError('Не удалось выполнить анализ документа');
    } finally {
      setAiLoading(false);
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

  if (loading) return <div className="doc-loading">Загрузка документа...</div>;
  if (error) return <div className="doc-error">{error}</div>;
  if (!data) return <div className="doc-error">Документ не найден</div>;

  const getConfidenceClass = (percent: number): string => {
    if (percent >= 90) return "confidence-high";
    if (percent >= 70) return "confidence-medium";
    return "confidence-low";
  };

  const getConfidenceClassFromDecimal = (score: number | null): string => {
    if (score == null) return "confidence-low";
    const percent = score * 100;
    if (percent >= 90) return "confidence-high";
    if (percent >= 70) return "confidence-medium";
    return "confidence-low";
  };

  const overallConfidence = data.confidenceScore != null ? data.confidenceScore * 100 : 0;
  const hasOcrText = !!data.ocrResult?.rawText;

  return (
    <div className="document-page">
      <div className="doc-topbar">
        <button className="back-to-list-btn back-to-list-btn--primary" onClick={() => navigate(getBackPath())}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          {getBackLabel()}
        </button>
        <button className="delete-doc-btn" onClick={handleDelete}>
          Удалить документ
        </button>
      </div>

      <div className="doc-header">
        <div className="doc-header-left">
          <h1 className="doc-title">Карточка документа</h1>
          <span className="doc-number">{data.registrationNumber}</span>
        </div>
        <div className={`confidence-badge ${getConfidenceClass(overallConfidence)}`}>
          Уверенность: {overallConfidence.toFixed(0)}%
        </div>
      </div>

      <div className="doc-info-panel">
        <div className="doc-info-item">
          <span className="doc-info-label">Название файла</span>
          <span className="doc-info-value">{data.title}</span>
        </div>
        <div className="doc-info-divider" />
        <div className="doc-info-item">
          <span className="doc-info-label">Дата документа</span>
          <span className="doc-info-value">{data.receivedDate ? new Date(data.receivedDate).toLocaleDateString('ru-RU') : '-'}</span>
        </div>
        <div className="doc-info-divider" />
        <div className="doc-info-item">
          <span className="doc-info-label">Отправитель</span>
          <span className="doc-info-value">{data.senderName}</span>
        </div>
        <div className="doc-info-divider" />
        <div className="doc-info-item">
          <span className="doc-info-label">Тип документа</span>
          <span className="doc-info-value">{data.documentType ?? '-'}</span>
        </div>
        <div className="doc-info-divider" />
        <div className="doc-info-item">
          <span className="doc-info-label">Статус</span>
          <span className={`status-badge ${getStatusColor(data.currentStatus)}`}>
            {translateStatus(data.currentStatus)}
          </span>
        </div>
        <div className="doc-info-divider" />
        <div className="doc-info-item">
          <span className="doc-info-label">Текущий отдел</span>
          <span className="doc-info-value">{data.routes?.[0]?.departmentName ?? 'Не назначен'}</span>
        </div>
      </div>

      <div className="doc-tabs-wrapper">
        <div className="tabs">
          <button className={`tab ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")}>Обзор</button>
          <button className={`tab ${activeTab === "ai" ? "active" : ""}`} onClick={() => setActiveTab("ai")}>AI-анализ</button>
          <button className={`tab ${activeTab === "ocr" ? "active" : ""}`} onClick={() => setActiveTab("ocr")}>Текст OCR</button>
          <button className={`tab ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>История маршрутов</button>
        </div>

        <div className="tab-content">
          {activeTab === "overview" && (
            <div className="overview-grid">
              <Card>
                <h3 className="card-section-title">Общая информация</h3>
                <div className="info-block">
                  <div className="info-row"><span>Рег. номер</span><strong>{data.registrationNumber}</strong></div>
                  <div className="info-row"><span>Название файла</span><strong>{data.title}</strong></div>
                  <div className="info-row"><span>Отправитель</span><strong>{data.senderName}</strong></div>
                  <div className="info-row"><span>Дата документа</span><strong>{data.receivedDate ? new Date(data.receivedDate).toLocaleDateString('ru-RU') : '-'}</strong></div>
                  <div className="info-row"><span>Тип документа</span><strong>{data.documentType ?? '-'}</strong></div>
                  <div className="info-row"><span>Категория</span><strong>{data.category ?? '-'}</strong></div>
                  <div className="info-row"><span>Внёс в систему</span><strong>{data.createdBy}</strong></div>
                  <div className="info-row"><span>Статус</span><span className={`status-badge ${getStatusColor(data.currentStatus)}`}>{translateStatus(data.currentStatus)}</span></div>
                  <div className="info-row"><span>Текущий отдел</span><strong>{data.routes?.[0]?.departmentName ?? 'Не назначен'}</strong></div>
                </div>
              </Card>

              <Card>
                <h3 className="card-section-title">Классификация</h3>
                <div className="classif-list">
                  <div className="classif-item">
                    <span className="classif-label">Тип документа</span>
                    <div className="classif-right">
                      <span className="classif-value">{data.classification?.type || '-'}</span>
                      <span className={`confidence-chip ${getConfidenceClassFromDecimal(data.classification?.typeConfidence ?? null)}`}>{data.classification?.typeConfidence ?? 0}%</span>
                    </div>
                  </div>
                  <div className="classif-item">
                    <span className="classif-label">Категория</span>
                    <div className="classif-right">
                      <span className="classif-value">{data.classification?.category || '-'}</span>
                      <span className={`confidence-chip ${getConfidenceClassFromDecimal(data.classification?.categoryConfidence ?? null)}`}>{data.classification?.categoryConfidence ?? 0}%</span>
                    </div>
                  </div>
                </div>
              </Card>

              {data.source && (
                <Card>
                  <h3 className="card-section-title">Источник документа</h3>
                  <div className="info-block">
                    <div className="info-row"><span>Тип источника</span><strong>{data.source.sourceType === 'organization' ? 'Организация' : data.source.sourceType === 'individual' ? 'Физ. лицо' : data.source.sourceType}</strong></div>
                    {data.source.organizationName && <div className="info-row"><span>Организация</span><strong>{data.source.organizationName}</strong></div>}
                    {data.source.senderName && <div className="info-row"><span>Отправитель</span><strong>{data.source.senderName}</strong></div>}
                    {data.source.contactInfo && <div className="info-row"><span>Контакты</span><strong>{data.source.contactInfo}</strong></div>}
                  </div>
                </Card>
              )}

              <Card>
                <h3 className="card-section-title">Связанные файлы</h3>
                {data.files?.length > 0 ? (
                  <div className="files-list">
                    {data.files.map((file: DocumentFile) => (
                      <div key={file.id} className="file-row">
                        <span className="file-icon" />
                        <span className="file-name">{file.fileName}</span>
                        <span className="file-size">{(file.fileSize / 1024).toFixed(0)} КБ</span>
                        <a href={`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${file.filePath}`} download={file.fileName} className="file-download" target="_blank" rel="noopener noreferrer">Скачать</a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-message">Нет файлов</div>
                )}
              </Card>

              <Card>
                <h3 className="card-section-title">О процентах</h3>
                <div className="percentage-legend">
                  <div className="legend-item">
                    <span className="legend-dot" />
                    <span className="legend-text"><strong>Общая уверенность:</strong> средневзвешенная оценка (OCR 20% + AI 80%)</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" />
                    <span className="legend-text"><strong>Классификация:</strong> точность определения типа и категории</span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" />
                    <span className="legend-text"><strong>Точность OCR:</strong> качество извлечения текста из файла</span>
                  </div>
                </div>
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
                      <button className="ai-btn" onClick={handleAiAnalysis} disabled={aiLoading || !hasOcrText}>
                        {aiLoading ? 'Анализ выполняется...' : !hasOcrText ? 'Требуется OCR-текст' : 'Запустить AI-анализ'}
                      </button>
                      {!hasOcrText && <p className="ai-warning">Для запуска AI-анализа необходимо сначала загрузить документ через сканирование</p>}
                    </>
                  ) : (
                    <>
                      <p className="ai-success">Анализ выполнен</p>
                      <button className="ai-btn-secondary" onClick={() => { setAiResult(null); setAiAnalyzed(false); setAiError(null); }}>Повторить анализ</button>
                    </>
                  )}
                </div>
                {aiError && (
                  <div className="ai-error">
                    <p>{aiError}</p>
                    <button className="ai-btn-secondary" onClick={handleAiAnalysis}>Повторить</button>
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
                      <span className={`confidence-chip ${getConfidenceClassFromDecimal(aiResult.confidenceScore ?? null)}`}>{aiResult.confidenceScore ?? 0}%</span>
                    </div>
                  </div>
                  {aiResult.extractedDate && (
                    <div className="ai-result-card">
                      <div className="ai-result-card-label">Дата в документе</div>
                      <div className="ai-result-card-value">{new Date(aiResult.extractedDate).toLocaleDateString('ru-RU')}</div>
                    </div>
                  )}
                  {aiResult.extractedCounterparty && (
                    <div className="ai-result-card">
                      <div className="ai-result-card-label">Контрагент</div>
                      <div className="ai-result-card-value">{aiResult.extractedCounterparty}</div>
                    </div>
                  )}
                  {aiResult.extractedAmount != null && (
                    <div className="ai-result-card">
                      <div className="ai-result-card-label">Сумма</div>
                      <div className="ai-result-card-value">{aiResult.extractedAmount.toLocaleString('ru-RU')} ₽</div>
                    </div>
                  )}
                  <div className="ai-result-card ai-result-card--wide">
                    <div className="ai-result-card-label">Краткая сводка</div>
                    <div className="ai-result-card-value">{aiResult.summaryText || '-'}</div>
                  </div>
                  {aiResult.keyPhrases && aiResult.keyPhrases.length > 0 && (
                    <div className="ai-result-card ai-result-card--wide">
                      <div className="ai-result-card-label">Ключевые фразы</div>
                      <div className="ai-result-card-value">{aiResult.keyPhrases.join(', ')}</div>
                    </div>
                  )}
                  <div className="ai-result-card ai-result-card--wide">
                    <div className="ai-result-card-label">Использованная модель</div>
                    <div className="ai-result-card-value ai-result-card-value--muted">{aiResult.modelName || '-'}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "ocr" && (
            <Card>
              <div className="ocr-header">
                <h3 className="card-section-title">Распознанный текст</h3>
                <div className="ocr-header-right">
                  {data.ocrResult && (
                    <span className={`confidence-chip ${getConfidenceClass(data.ocrResult.ocrConfidence)}`}>
                      Точность: {data.ocrResult.ocrConfidence}%
                    </span>
                  )}
                  <button className="ocr-copy-btn" onClick={handleCopyOcr} disabled={!data.ocrResult?.rawText}>
                    {copied ? 'Скопировано' : 'Копировать'}
                  </button>
                </div>
              </div>
              <pre className="ocr-text">{data.ocrResult?.rawText || 'Текст не распознан'}</pre>
            </Card>
          )}

          {activeTab === "history" && (
            <Card>
              <h3 className="card-section-title">История маршрутов</h3>
              <div className="table-wrapper">
                <table className="history-table">
                  <thead>
                    <tr><th>Отдел</th><th>Статус</th><th>Причина</th><th>Дата</th></tr>
                  </thead>
                  <tbody>
                    {data.routes.map((route: DocumentRoute, idx: number) => (
                      <tr key={idx}>
                        <td>{route.departmentName}</td>
                        <td><span className={`status-badge ${getStatusColor(route.routeStatus)}`}>{translateStatus(route.routeStatus)}</span></td>
                        <td>{route.routeReason || '-'}</td>
                        <td>{new Date(route.routedAt).toLocaleDateString('ru-RU')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      </div>

      {from !== 'archive' && from !== 'search' && (
        <div className="doc-bottom-link">
          <a href="/dashboard/documents" onClick={(e) => { e.preventDefault(); navigate('/dashboard/documents'); }}>
            В архив документов
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </a>
        </div>
      )}
    </div>
  );
};

export default DocumentCardPage;