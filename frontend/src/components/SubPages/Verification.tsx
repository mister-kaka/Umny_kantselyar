import "../../styles/global.css";
import "../../styles/Verification.css";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../Card";
import Table from "../Table";
import "../../styles/Dashboard.css";
import "../../styles/DocumentsListPage.css";
import { getDocuments, getDocumentTypes, getDocumentCategories } from "../../services/api";
import { DocumentType, DocumentCategory } from "../../types";
import { translateStatus, getStatusColorClass } from "../../constants/statuses";
import DropdownButton from "../DropdownButton";
import Pagination from "../Pagination";
import Tooltip from "../Tooltip";

interface VerificationDocument {
  id: number;
  registrationNumber: string;
  title: string;
  senderName: string;
  receivedDate: string;
  documentType: string;
  category: string;
  currentStatus: string;
  confidenceScore?: number;
  aiDocumentType?: string | null;
  aiCategory?: string | null;
  aiConfidence?: number | null;
}

const Verification = () => {
  const navigate = useNavigate();

  const [data, setData] = useState<{ items: VerificationDocument[]; total: number; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtersError, setFiltersError] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [types, setTypes] = useState<DocumentType[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);

  const [filters, setFilters] = useState({
    typeId: undefined as number | undefined,
    categoryId: undefined as number | undefined,
  });

  const [selectedLabels, setSelectedLabels] = useState({
    docType: 'Тип документа',
    category: 'Категория',
  });

  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const toggleFilter = (filterId: string) => {
    setActiveFilter(prev => (prev === filterId ? null : filterId));
  };

  const [takingId, setTakingId] = useState<number | null>(null);

  const hasActiveFilters = !!(filters.typeId || filters.categoryId);

  const handleRowClick = (id: number) => {
    navigate(`/dashboard/documents/${id}`, { state: { from: 'verification' } });
  };

  useEffect(() => {
    setPage(1);
  }, [filters]);

  const fetchFilters = async () => {
    try {
      const [typesRes, categoriesRes] = await Promise.all([
        getDocumentTypes(),
        getDocumentCategories()
      ]);
      setTypes(typesRes);
      setCategories(categoriesRes);
      setFiltersError('');
    } catch (e) {
      const msg = 'Ошибка загрузки фильтров';
      setFiltersError(msg);
      console.error(msg, e);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getDocuments({
        page,
        limit,
        status: 'pending_verification',
        typeId: filters.typeId,
        categoryId: filters.categoryId,
      });
      setData({
        items: response.items as VerificationDocument[],
        total: response.total,
        totalPages: response.totalPages,
      });
    } catch (e) {
      const msg = 'Ошибка загрузки очереди проверки';
      setError(msg);
      console.error(msg, e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [page, filters, limit]);

  const findTypeId = (name: string) => types.find(t => t.name === name)?.id;
  const findCategoryId = (name: string) => categories.find(c => c.name === name)?.id;

  const typeOptions = types.length > 0
    ? types.map(t => t.name)
    : (filtersError ? ['Ошибка загрузки'] : []);

  const categoryOptions = categories.length > 0
    ? categories.map(c => c.name)
    : (filtersError ? ['Ошибка загрузки'] : []);

  const handleRetry = () => {
    fetchFilters();
    fetchDocuments();
  };

  const getConfidenceClass = (score?: number): string => {
    if (!score) return "medium";
    if (score >= 80) return "high";
    if (score >= 50) return "medium";
    return "low";
  };

  const getVerificationStatusClass = (status: string): string => {
    return getStatusColorClass(status);
  };

  const getVerificationStatusText = (status: string): string => {
    return translateStatus(status);
  };

  const handleTakeToReview = async (docId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setTakingId(docId);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      navigate(`/dashboard/documents/${docId}`, { 
        state: { 
          openVerificationTab: true,
          from: 'verification'
        } 
      });
    } catch (err) {
      console.error("Ошибка:", err);
    } finally {
      setTakingId(null);
    }
  };

  const formatConfidence = (score?: number): number => {
    if (score === undefined || score === null) return 0;
    if (score > 1) return Math.round(score);
    return Math.round(score * 100);
  };

  return (
    <div>
      <Card className="filtersButtsWrapper">
        <Tooltip text="Показать документы только выбранного типа">
          <DropdownButton
            options={typeOptions}
            selectedLabel={selectedLabels.docType}
            onSelect={(name) => {
              if (name === 'Ошибка загрузки') return;
              const id = findTypeId(name);
              setFilters(prev => ({ ...prev, typeId: id }));
              setSelectedLabels(prev => ({ ...prev, docType: name }));
            }}
            icon={<img src="/icons/filters/Document_type.png" alt="📄" />}
            defaultLabel="Тип документа"
            isOpen={activeFilter === 'docType'}
            onToggle={() => toggleFilter('docType')}/>
        </Tooltip>

        <Tooltip text="Показать документы только выбранной категории">
          <DropdownButton
            options={categoryOptions}
            selectedLabel={selectedLabels.category}
            onSelect={(name) => {
              if (name === 'Ошибка загрузки') return;
              const id = findCategoryId(name);
              setFilters(prev => ({ ...prev, categoryId: id }));
              setSelectedLabels(prev => ({ ...prev, category: name }));
            }}
            icon={<img src="/icons/filters/Category.png" alt="🗂️" />}
            defaultLabel="Категория"
            isOpen={activeFilter === 'category'}
            onToggle={() => toggleFilter('category')}/>
        </Tooltip>

        <Tooltip text="Количество документов на странице">
          <DropdownButton
            options={['5', '10', '20', '50']}
            selectedLabel={String(limit)}
            onSelect={(value) => {
              const newLimit = parseInt(value, 10);
              if (!isNaN(newLimit)) setLimit(newLimit);
            }}
            defaultLabel="10"
            isOpen={activeFilter === 'limitSelector'}
            onToggle={() => toggleFilter('limitSelector')}/>
        </Tooltip>

        <Tooltip text="Сбросить все фильтры">
          <button
            className={`removeFiltersButt ${!hasActiveFilters ? 'disabled' : ''}`}
            disabled={!hasActiveFilters}
            onClick={() => {
              if (!hasActiveFilters) return;
              setFilters({ typeId: undefined, categoryId: undefined });
              setSelectedLabels({ docType: 'Тип документа', category: 'Категория' });
              setPage(1);
            }}>
            Сбросить фильтры
          </button>
        </Tooltip>
      </Card>

      <Card className="cuttinPaddin">
        <Table
          title={<h4>Очередь проверки ({data?.total ?? 0})</h4>}
          rightTitle={data && (
            <span className="UltimatePaginationWrapper">
              <Pagination
                page={page}
                totalPages={data.totalPages}
                onPageChange={(newPage) => setPage(newPage)}/>
            </span>
          )}>
          <thead>
            <tr>
              <th>Рег. номер</th>
              <th>Название</th>
              <th>Дата загрузки</th>
              <th>Тип (AI)</th>
              <th>Уверенность</th>
              <th>Статус</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px' }}>Загрузка...</td></tr>
            ) : error ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', color: 'var(--color-status-rejected)', padding: '20px' }}>
                  {error} — <button className="apply-button" onClick={handleRetry}>Повторить</button>
                </td>
              </tr>
            ) : filtersError && !types.length && !categories.length ? (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', color: 'var(--color-status-rejected)', padding: '20px' }}>
                  {filtersError} — <button className="apply-button" onClick={handleRetry}>Повторить</button>
                </td>
              </tr>
            ) : data?.items?.length ? (
              data.items.map((doc) => (
                <tr key={doc.id} onClick={() => handleRowClick(doc.id)} style={{ cursor: 'pointer' }}>
                  <td>{doc.registrationNumber}</td>
                  <td>{doc.title}</td>
                  <td>{new Date(doc.receivedDate).toLocaleDateString()}</td>
                  <td>{doc.aiDocumentType || doc.documentType || '-'}</td>
                  <td>
                    <div className="confidence-cell">
                      <div className="confidence-bar">
                        <div
                          className={`confidence-fill ${getConfidenceClass(formatConfidence(doc.confidenceScore))}`}
                          style={{ width: `${formatConfidence(doc.confidenceScore)}%` }}
                        />
                      </div>
                      <span className="confidence-text">{formatConfidence(doc.confidenceScore)}%</span>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge ${getVerificationStatusClass(doc.currentStatus)}`}>
                      {getVerificationStatusText(doc.currentStatus)}
                    </span>
                  </td>
                  <td>
                    {doc.currentStatus === "pending_verification" && (
                      <button
                        className="apply-button"
                        onClick={(e) => handleTakeToReview(doc.id, e)}
                        disabled={takingId === doc.id}
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        {takingId === doc.id ? '...' : 'Взять в проверку'}
                      </button>
                    )}
                    {doc.currentStatus === "in_review" && (
                      <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>В работе</span>
                    )}
                    {doc.currentStatus === "verified" && (
                      <span style={{ fontSize: "12px", color: "var(--color-status-loaded)" }}>✓ Проверено</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-tertiary)' }}>
                  Нет документов, ожидающих проверки
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
};

export default Verification;