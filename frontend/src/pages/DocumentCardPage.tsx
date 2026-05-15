import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import "../styles/global.css";
import "../styles/DocumentCard.css";
import { getDocumentById, getDocumentAiResult, analyzeDocument } from '../services/api';
import { DocumentCard as DocumentCardType, DocumentFile, DocumentRoute, DocumentAiResult } from '../types/';
import Card from '../components/Card';
import { translateStatus, getStatusColor } from '../components/SubPages/MainMenu';

const DocumentCardPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"overview" | "ai" | "ocr" | "history">("overview");
  
  const [data, setData] = useState<DocumentCardType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [aiResult, setAiResult] = useState<DocumentAiResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiAnalyzed, setAiAnalyzed] = useState(false);

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
        console.error("Ошибка загрузки:", err);
        if (err.response?.status === 404) {
          setError("Документ не найден");
        } else {
          setError("Ошибка загрузки документа");
        }
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
    } catch (err) {
      console.error('Ошибка загрузки AI-результата:', err);
    }
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
      setData(prev => prev ? { ...prev, aiResult: result } : prev);
    } catch (err) {
      console.error('Ошибка AI-анализа:', err);
      setAiError('Не удалось выполнить анализ документа');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiReset = () => {
    setAiResult(null);
    setAiAnalyzed(false);
    setAiError(null);
  };

  if (loading) {
    return <div className="loading">Загрузка документа...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!data) {
    return <div className="error">Документ не найден</div>;
  }

  const getConfidenceClass = (percent: number): string => {
    if (percent >= 90) return "confidence-high";
    if (percent >= 70) return "confidence-medium";
    return "confidence-low";
  };

  const overallConfidence = (data.confidenceScore || 0) * 100;
  const hasOcrText = !!data.ocrResult?.rawText;

  return (
    <div className="document-page">

      <button 
        className="back-to-list-btn"
        onClick={() => navigate('/dashboard/documents')} >
        Все документы →
      </button>
        
      <div className="doc-header">
        <div>
          <h1>Карточка документа</h1>
          <div className="doc-number">{data.registrationNumber}</div>
        </div>
      
        <div className={`confidence-badge ${getConfidenceClass(overallConfidence)}`}>
          Уверенность: {overallConfidence.toFixed(0)}%
        </div>
      </div>

      <div className="two-columns">

        {/* Левая колонка */}
        <div className="left-column-wrapper">
          <div className="left-column">
           <h3 className="left-column-title">Основная информация</h3>
            <Card>
              <div className="info-block">
                <div className="info-row">
                  <span>Название</span>
                  <strong>{data.title}</strong>
                </div>
                <div className="info-row">
                  <span>Дата</span>
                  <strong>{new Date(data.receivedDate).toLocaleDateString('ru-RU')}</strong>
                </div>
                <div className="info-row">
                  <span>Отправитель</span>
                  <strong>{data.senderName}</strong>
                </div>
                <div className="info-row">
                  <span>Тип документа</span>
                  <strong>{data.documentType ?? '—'}</strong>
                </div>
                <div className="info-row">
                  <span>Категория</span>
                  <strong>{data.category ?? '—'}</strong>
                </div>
              </div>
            </Card>
          </div>

          <div className="about-percentages-card">
            <Card>
              <div className="about-percentages">
                <h3>О процентах</h3>
                <div className="percentage-legend">
                  <div className="legend-item">
                    <span className="legend-dot" />
                    <span className="legend-text">
                      <strong>Уверенность:</strong> общая оценка системой достоверности документа
                    </span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" />
                    <span className="legend-text">
                      <strong>Классификация:</strong> точность определения типа и категории
                    </span>
                  </div>
                  <div className="legend-item">
                    <span className="legend-dot" />
                    <span className="legend-text">
                      <strong>Распознавание:</strong> качество извлечения текста из файла
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* Правая колонка */}
        <div className="right-column">
          <div className="tabs">
            <button className={`tab ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")}>Обзор</button>
            <button className={`tab ${activeTab === "ai" ? "active" : ""}`} onClick={() => setActiveTab("ai")}>AI-анализ</button>
            <button className={`tab ${activeTab === "ocr" ? "active" : ""}`} onClick={() => setActiveTab("ocr")}>Текст OCR</button>
            <button className={`tab ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>История</button>
          </div>

          <div className="tab-content">

            {/* Вкладка 1: Обзор */}
            {activeTab === "overview" && (
              <>
                <Card>
                  <h3>Общая информация</h3>
                  <div className="info-block">
                    <div className="info-row">
                      <span>Рег. номер</span>
                      <strong>{data.registrationNumber}</strong>
                    </div>
                    <div className="info-row">
                      <span>Тема</span>
                      <strong>{data.title}</strong>
                    </div>
                    <div className="info-row">
                      <span>Отправитель</span>
                      <strong>{data.senderName}</strong>
                    </div>
                    <div className="info-row">
                      <span>Дата поступления</span>
                      <strong>{new Date(data.receivedDate).toLocaleDateString('ru-RU')}</strong>
                    </div>
                    <div className="info-row">
                      <span>Статус</span>
                      <span className={`status-badge ${getStatusColor(data.currentStatus)}`}>
                        {translateStatus(data.currentStatus)}
                      </span>
                    </div>
                    <div className="info-row">
                      <span>Тип документа</span>
                      <strong>{data.documentType ?? '—'}</strong>
                    </div>
                    <div className="info-row">
                      <span>Категория</span>
                      <strong>{data.category ?? '—'}</strong>
                    </div>
                    <div className="info-row">
                      <span>Внёс в систему</span>
                      <strong>{data.createdBy}</strong>
                    </div>
                    <div className="info-row">
                      <span>Текущий отдел</span>
                      <strong>{data.routes?.[0]?.departmentName ?? 'Не назначен'}</strong>
                    </div>
                  </div>
                </Card>

                {data.source && (
                  <Card>
                    <h3>Источник документа</h3>
                    <div className="info-block">
                      <div className="info-row">
                        <span>Тип источника</span>
                        <strong>
                          {data.source.sourceType === 'organization' ? 'Организация' :
                           data.source.sourceType === 'individual' ? 'Физ. лицо' :
                           data.source.sourceType}
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
                  </Card>
                )}

                <Card>
                  <h3>Связанные файлы</h3>
                  {data.files && data.files.length > 0 ? (
                    <div className="files-list">
                      {data.files.map((file: DocumentFile) => (
                        <div key={file.id} className="file-row">
                          <span className="file-icon" />
                          <span className="file-name">{file.fileName}</span>
                          <span className="file-size">{(file.fileSize / 1024).toFixed(0)} КБ</span>
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
                      ))}
                    </div>
                  ) : (
                    <div className="empty-message">Нет файлов</div>
                  )}
                </Card>

                <Card>
                  <h3>Классификация</h3>
                  <div className="classif-list">
                    <div className="classif-item">
                      <span className="classif-label">Тип документа</span>
                      <div className="classif-right">
                        <span className="classif-value">{data.classification?.type || "—"}</span>
                        <span className={`confidence-chip ${getConfidenceClass(data.classification?.typeConfidence || 0)}`}>
                          {data.classification?.typeConfidence || 0}%
                        </span>
                      </div>
                    </div>
                    <div className="classif-item">
                      <span className="classif-label">Категория</span>
                      <div className="classif-right">
                        <span className="classif-value">{data.classification?.category || "—"}</span>
                        <span className={`confidence-chip ${getConfidenceClass(data.classification?.categoryConfidence || 0)}`}>
                          {data.classification?.categoryConfidence || 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                </Card>
              </>
            )}

            {/* Вкладка 2: AI-анализ */}
            {activeTab === "ai" && (
              <Card>
                <h3>AI-анализ документа</h3>
                
                <div className="ai-analysis-control">
                  {!aiAnalyzed ? (
                    <>
                      <button 
                        className="ai-btn"
                        onClick={handleAiAnalysis}
                        disabled={aiLoading || !hasOcrText}
                      >
                        {aiLoading ? 'Анализ выполняется...' : 
                         !hasOcrText ? 'Требуется OCR-текст' :
                         'Запустить AI-анализ'}
                      </button>
                      {!hasOcrText && (
                        <p className="ai-warning">Для запуска AI-анализа необходимо сначала выполнить OCR-распознавание документа</p>
                      )}
                    </>
                  ) : (
                    <div className="ai-analysis-control">
                      <p className="ai-success">Анализ выполнен!</p>
                      <button className="ai-btn-secondary" onClick={handleAiReset}>
                        Повторить анализ
                      </button>
                    </div>
                  )}
                </div>
                
                {aiError && (
                  <div className="ai-error">
                    <p>{aiError}</p>
                    <button className="ai-btn-secondary" onClick={handleAiAnalysis}>Повторить</button>
                  </div>
                )}
                
                {aiResult && (
                  <div className="ai-result">
                    <div className="ai-result-row">
                      <span className="ai-label">Предложенный тип документа:</span>
                      <span className="ai-value">{aiResult.documentTypeSuggested || '—'}</span>
                    </div>
                    <div className="ai-result-row">
                      <span className="ai-label">Предложенная категория:</span>
                      <span className="ai-value">{aiResult.categorySuggested || '—'}</span>
                    </div>
                    <div className="ai-result-row">
                      <span className="ai-label">Короткая сводка:</span>
                      <span className="ai-value">{aiResult.summaryText || '—'}</span>
                    </div>
                    <div className="ai-result-row">
                      <span className="ai-label">Рекомендуемое подразделение:</span>
                      <span className="ai-value">{aiResult.departmentSuggested || '—'}</span>
                    </div>
                    <div className="ai-result-row">
                      <span className="ai-label">Уверенность модели:</span>
                      <span className={`confidence-chip ${getConfidenceClass(aiResult.confidenceScore || 0)}`}>
                        {aiResult.confidenceScore || 0}%
                      </span>
                    </div>
                    <div className="ai-result-row">
                      <span className="ai-label">Использованная модель:</span>
                      <span className="ai-value">{aiResult.modelName || '—'}</span>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Вкладка 3: Текст OCR */}
            {activeTab === "ocr" && (
              <div>
                <Card>
                  <div className="ocr-block">
                    <h3>Исходный текст</h3>
                    <pre>{data.ocrResult?.rawText || 'Текст не распознан'}</pre>
                  </div>
                  <div className="ocr-block">
                    <h3>Нормализованный текст</h3>
                    <p>{data.ocrResult?.normalizedText || 'Текст не распознан'}</p>
                  </div>
                  {data.ocrResult && (
                    <div className="info-row">
                      <span>Уверенность распознавания</span>
                      <span className={`confidence-chip ${getConfidenceClass(data.ocrResult.ocrConfidence)}`}>
                        {data.ocrResult.ocrConfidence}%
                      </span>
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* Вкладка 4: История маршрутов */}
            {activeTab === "history" && (
              <Card>
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
                          <td>{route.departmentName}</td>
                          <td>
                            <span className={`status-badge ${getStatusColor(route.routeStatus)}`}>
                              {translateStatus(route.routeStatus)}
                            </span>
                          </td>
                          <td>{route.routeReason || "—"}</td>
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
      </div>
    </div>
  );
};

export default DocumentCardPage;