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
import { formatMoscowDate } from "../../utils/moscowTime";
import { useSettings } from "../../contexts/SettingsContext";
import { getThemedIcon } from "../../utils/getThemedIcon";

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
  const { defaultPageLimit, showConfidence } = useSettings();

  const [data, setData] = useState<{ items: VerificationDocument[]; total: number; totalPages: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtersError, setFiltersError] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(defaultPageLimit);

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

  const [themeKey, setThemeKey] = useState(0);
  
  useEffect(() => {
    const observer = new MutationObserver(() => setThemeKey(prev => prev + 1));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const toggleFilter = (filterId: string) => {
    setActiveFilter(prev => (prev === filterId ? null : filterId));
  };

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

  const formatConfidence = (score?: number): number => {
    if (score === undefined || score === null) return 0;
    if (score > 1) return Math.round(score);
    return Math.round(score * 100);
  };

  const handleTakeToReview = (docId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/dashboard/documents/${docId}`, { 
      state: { 
        openVerificationTab: true,
        from: 'verification'
      } 
    });
  };

  return (
    <div>
      <h2 className="page-title">Очередь проверки</h2>
      <p className="page-subtitle">Документы, ожидающие проверки оператором</p>

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
            icon={<img src={getThemedIcon("/icons/filters/Document_type.png")} key={themeKey} alt="Тип" />}
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
            icon={<img src={getThemedIcon("/icons/filters/Category.png")} key={themeKey} alt="Категория" />}
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
            defaultLabel={String(defaultPageLimit)}
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

      <Card className="cuttinPaddin verification-table-wrapper">
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
              {showConfidence && <th>Уверенность</th>}
              <th>Статус</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={showConfidence ? 7 : 6} className="table-status-cell">Загрузка...</td></tr>
            ) : error ? (
              <tr>
                <td colSpan={showConfidence ? 7 : 6} className="table-error-cell">
                  {error} — <button className="apply-button" onClick={handleRetry}>Повторить</button>
                </td>
              </tr>
            ) : filtersError && !types.length && !categories.length ? (
              <tr>
                <td colSpan={showConfidence ? 7 : 6} className="table-error-cell">
                  {filtersError} — <button className="apply-button" onClick={handleRetry}>Повторить</button>
                </td>
              </tr>
            ) : data?.items?.length ? (
              data.items.map((doc) => (
                <tr key={doc.id} onClick={() => handleRowClick(doc.id)}>
                  <td>{doc.registrationNumber}</td>
                  <td>{doc.title}</td>
                  <td>{formatMoscowDate(doc.receivedDate)}</td>
                  <td>{doc.aiDocumentType || doc.documentType || '-'}</td>
                  {showConfidence && (
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
                  )}
                  <td>
                    <span className={`status-badge ${getStatusColorClass(doc.currentStatus)}`}>
                      {translateStatus(doc.currentStatus)}
                    </span>
                  </td>
                  <td>
                    {doc.currentStatus === "pending_verification" && (
                      <button
                        className="apply-button verification-take-btn"
                        onClick={(e) => handleTakeToReview(doc.id, e)}
                      >
                        Взять в проверку
                      </button>
                    )}
                    {doc.currentStatus === "in_review" && (
                      <span className="verification-status-text">В работе</span>
                    )}
                    {doc.currentStatus === "verified" && (
                      <span className="verification-status-text verification-status-done">Проверено</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={showConfidence ? 7 : 6} className="table-empty-cell">
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