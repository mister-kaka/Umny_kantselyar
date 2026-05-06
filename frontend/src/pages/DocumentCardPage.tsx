import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import "../styles/global.css";
import "../styles/DocumentCard.css";
import { getDocumentById } from '../services/api';
import { DocumentCard as DocumentCardType, DocumentFile, DocumentRoute } from '../types/';
import Card from '../components/Card';
import Table from '../components/Table';

const DocumentCardPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"overview" | "ocr" | "entities" | "history">("overview");
  
  const [data, setData] = useState<DocumentCardType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const routeColumns = [
    { key: "departmentName", title: "Отдел" },
    { key: "routeStatus", title: "Статус" },
    { key: "routeReason", title: "Причина" },
    { key: "routedAt", title: "Дата" },
  ];

  return (
    <div className="document-page">
      {/* Шапка с кнопкой назад */}
      
      <button 
          className="back-to-list-btn"
          onClick={() => navigate('/dashboard/documents')}
        >
          Все документы →
        </button>
        
      <div className="doc-header">
        <div>
          <h1>Проверка документа</h1>
          <div className="doc-number">{data.registrationNumber}</div>
        </div>
      
        <div className="confidence-badge">
          Уверенность: 
          <span className={`confidence-chip ${getConfidenceClass(data.classification?.typeConfidence || 0)}`}>
            {data.classification?.typeConfidence || 0}%
          </span>
        </div>
      </div>

      <div className="two-columns">
        {/* ========== ЛЕВАЯ КОЛОНКА ========== */}
        <div className="left-column">
          <Card>
            <h2>{data.title}</h2>
            <p className="doc-date">Дата: {data.receivedDate}</p>
            <p>Настоящий документ:</p>
            <div className="party">
              <strong>Отправитель:</strong>
              <p>{data.senderName}</p>
            </div>
            {(data as any).customer && (
              <div className="party">
                <strong>Заказчик:</strong>
                <p>
                  {(data as any).customer.name}<br />
                  {(data as any).customer.address && `Адрес: ${(data as any).customer.address}`}<br />
                  {(data as any).customer.inn && `ИНН: ${(data as any).customer.inn}`}
                </p>
              </div>
            )}
            {(data as any).supplier && (
              <div className="party">
                <strong>Поставщик:</strong>
                <p>
                  {(data as any).supplier.name}<br />
                  {(data as any).supplier.address && `Адрес: ${(data as any).supplier.address}`}<br />
                  {(data as any).supplier.inn && `ИНН: ${(data as any).supplier.inn}`}
                </p>
              </div>
            )}
            {(data as any).subject && <p><strong>Предмет договора:</strong> {(data as any).subject}</p>}
            {(data as any).amount && <p><strong>Сумма договора:</strong> {(data as any).amount}</p>}
            {(data as any).deliveryDate && <p><strong>Срок поставки:</strong> {(data as any).deliveryDate}</p>}
            <p><strong>Тип документа:</strong> {data.documentType}</p>
            <p><strong>Категория:</strong> {data.category}</p>
          </Card>
        </div>

        {/* ========== ПРАВАЯ КОЛОНКА ========== */}
        <div className="right-column">
          <div className="tabs">
            <button className={`tab ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")}>Обзор</button>
            <button className={`tab ${activeTab === "ocr" ? "active" : ""}`} onClick={() => setActiveTab("ocr")}>Текст OCR</button>
            <button className={`tab ${activeTab === "entities" ? "active" : ""}`} onClick={() => setActiveTab("entities")}>Сущности</button>
            <button className={`tab ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>История</button>
          </div>

          <div className="tab-content">
            {/* Вкладка 1: Обзор */}
            {activeTab === "overview" && (
              <>
                <Card>
                  <h3>Общая информация</h3>
                  <div className="info-grid">
                    <div className="info-item"><span className="info-label">Регистрационный номер</span><span className="info-value">{data.registrationNumber}</span></div>
                    <div className="info-item"><span className="info-label">Тема документа</span><span className="info-value">{data.title}</span></div>
                    <div className="info-item"><span className="info-label">Отправитель</span><span className="info-value">{data.senderName}</span></div>
                    <div className="info-item"><span className="info-label">Дата поступления</span><span className="info-value">{data.receivedDate}</span></div>
                    <div className="info-item"><span className="info-label">Текущий статус</span><span className="status-badge">{data.currentStatus}</span></div>
                    <div className="info-item"><span className="info-label">Тип документа</span><span className="info-value">{data.documentType}</span></div>
                    <div className="info-item"><span className="info-label">Категория</span><span className="info-value">{data.category}</span></div>
                    <div className="info-item"><span className="info-label">Кто создал запись</span><span className="info-value">{data.createdBy}</span></div>
                  </div>
                </Card>

                <Card>
                  <h3>Текущий отдел</h3>
                  <div className="current-department">
                    <span className="dept-icon">🏢</span>
                    <span className="dept-name">{data.department}</span>
                  </div>
                </Card>

                <Card>
                  <h3>Связанные файлы</h3>
                  {data.files && data.files.length > 0 ? (
                    <div className="files-list">
                      {data.files.map((file: DocumentFile) => (
                        <div key={file.id} className="file-row">
                          <span className="file-icon">📄</span>
                          <span className="file-name">{file.fileName}</span>
                          <span className="file-size">{file.fileSize} КБ</span>
                          <button className="file-download">⬇️</button>
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

                <div className="action-buttons">
                  <button className="btn-primary">Подтвердить классификацию</button>
                  <button className="btn-secondary">Редактировать поля</button>
                </div>
              </>
            )}

            {/* Вкладка 2: Текст OCR */}
            {activeTab === "ocr" && (
              <Card>
                <h3>Raw text</h3>
                <pre className="ocr-content">{data.ocrResult?.rawText || "Текст не распознан"}</pre>
                <h3 className="mt-4">Normalized text</h3>
                <p className="ocr-content">{data.ocrResult?.normalizedText || "Текст не распознан"}</p>
              </Card>
            )}

            {/* Вкладка 3: Сущности */}
            {activeTab === "entities" && (
              <Card>
                <h3>Извлечённые сущности</h3>
                <div className="empty-message">Сущности будут отображаться здесь</div>
              </Card>
            )}

{/* Вкладка 4: История маршрутов */}
{activeTab === "history" && (
  <Card>
    <Table title="История маршрутов">
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
            {data.routes.map((route, idx) => (
              <tr key={idx}>
                <td>{route.departmentName}</td>
                <td>
                  <span className={`status-badge ${route.routeStatus === "Завершено" ? "green" : route.routeStatus === "На рассмотрении" ? "orange" : "blue"}`}>
                    {route.routeStatus}
                  </span>
                </td>
                <td>{route.routeReason || "—"}</td>
                <td>{route.routedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Table>
  </Card>
)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentCardPage;