import "../../styles/global.css";
import React, { useState, useEffect } from 'react';
import Card from "../Card";
import Table from "../Table";
import "../../styles/Dashboard.css";
import "../../styles/DocumentsListPage.css";
import "../../styles/Settings.css";
import { DocumentsListResponse, DocumentListItem, DocumentType, DocumentCategory } from "../../types";
import { getDocuments, getDocumentTypes, getDocumentCategories, deleteDocument, exportDocuments } from "../../services/api";
import { useNavigate } from 'react-router-dom';
import { translateStatus, getStatusColorClass, getAllStatusesForFilter } from "../../constants/statuses";
import { DateFilterDropdown } from "../DropdownButton";
import DropdownButton from "../DropdownButton";
import Pagination from "../Pagination";
import Tooltip from "../Tooltip";
import { formatMoscowDate } from "../../utils/moscowTime";
import { useSettings } from "../../contexts/SettingsContext";

const DocumentsListPage = () => {
  const navigate = useNavigate();
  const { defaultPageLimit } = useSettings();

  const [data, setData] = useState<DocumentsListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtersError, setFiltersError] = useState('');
  const [page, setPage] = useState(1);
  const [Plimit, setPLimit] = useState(defaultPageLimit);
  const [isExporting, setIsExporting] = useState(false);

  const [types, setTypes] = useState<DocumentType[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);

  const [filters, setFilters] = useState({
    typeId: undefined as number | undefined,
    categoryId: undefined as number | undefined,
    status: undefined as string | undefined,
  });

  const [dateFilter, setDateFilter] = useState<{ from: string | null; to: string | null }>({
    from: null,
    to: null,
  });

  const [selectedLabels, setSelectedLabels] = useState({
    docType: 'Тип документа',
    category: 'Категория',
    status: 'Статус',
  });

  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const toggleFilter = (filterId: string) => {
    setActiveFilter(prev => (prev === filterId ? null : filterId));
  };

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const hasActiveFilters = !!(filters.typeId || filters.categoryId || filters.status || dateFilter.from || dateFilter.to);

  const statusOptionsForFilter = getAllStatusesForFilter();
  const RUSStatuses = statusOptionsForFilter.map(s => s.label);
  const reverseStatusMap = Object.fromEntries(
    statusOptionsForFilter.map(s => [s.label, s.value])
  );

  const handleRowClick = (id: number) => {
    navigate(`/dashboard/documents/${id}`, { state: { from: 'archive' } });
  };

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!data?.items) return;
    const allSelected = data.items.every(doc => selectedIds.has(doc.id));
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(data.items.map(doc => doc.id)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0 || deleting) return;
    if (!window.confirm(`Удалить ${selectedIds.size} выбранных документов? Это действие нельзя отменить.`)) return;

    setDeleting(true);
    let errorCount = 0;
    for (const id of selectedIds) {
      try {
        await deleteDocument(id);
      } catch {
        errorCount++;
      }
    }
    setDeleting(false);
    setSelectedIds(new Set());

    if (errorCount > 0) {
      alert(`Удалено ${selectedIds.size - errorCount} из ${selectedIds.size}. Ошибок: ${errorCount}`);
    }

    fetchDocuments();
  };

  const handleExport = async () => {
    if (!data?.total || data.total === 0) {
      alert('Нет документов для экспорта');
      return;
    }

    setIsExporting(true);
    try {
      const blob = await exportDocuments({
        typeId: filters.typeId,
        categoryId: filters.categoryId,
        status: filters.status,
        dateFrom: dateFilter.from ?? undefined,
        dateTo: dateFilter.to ?? undefined,
        dateField: 'upload',
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `documents_export_${new Date().toISOString().slice(0, 19)}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Ошибка экспорта:', error);
      alert('Не удалось экспортировать документы');
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [filters, dateFilter]);

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
        limit: Plimit,
        ...filters,
        dateFrom: dateFilter.from ?? undefined,
        dateTo: dateFilter.to ?? undefined,
        dateField: 'upload',
      });
      setData(response);

      if (response.items.length === 0 && page > 1) {
        setPage(1);
      }
    } catch (e) {
      const msg = 'Ошибка загрузки документов';
      setError(msg);
      console.error(msg, e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [page, filters, Plimit, dateFilter]);

  const findTypeId = (name: string) => types.find(t => t.name === name)?.id;
  const findCategoryId = (name: string) => categories.find(c => c.name === name)?.id;

  const hasFiltersError = filtersError !== '';

  const typeOptions = types.length > 0
    ? types.map(t => t.name)
    : (hasFiltersError ? ['Ошибка загрузки'] : []);

  const categoryOptions = categories.length > 0
    ? categories.map(c => c.name)
    : (hasFiltersError ? ['Ошибка загрузки'] : []);

  const statusOptions = hasFiltersError ? ['Ошибка загрузки'] : RUSStatuses;

  const handleRetry = () => {
    fetchFilters();
    fetchDocuments();
  };

  const allSelected = data?.items && data.items.length > 0 && data.items.every(doc => selectedIds.has(doc.id));

  return (
    <div>
      <h2 className="page-title">Архив документов</h2>
      <p className="page-subtitle">Все документы в системе</p>

      <Card className="filtersButtsWrapper">
        <Tooltip text="Фильтр по дате загрузки">
          <DateFilterDropdown
            onFilterChange={(range) => {
              setDateFilter({ from: range.from, to: range.to });
            }}
            icon={<img src="/icons/filters/data.png" alt="📅" />}
            isOpen={activeFilter === 'date'}
            onToggle={() => toggleFilter('date')}/>
        </Tooltip>
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

        <Tooltip text="Показать документы с выбранным статусом">
          <DropdownButton
            options={statusOptions}
            selectedLabel={selectedLabels.status}
            onSelect={(RUSStatus) => {
              if (RUSStatus === 'Ошибка загрузки') return;
              const ENGStatus = reverseStatusMap[RUSStatus] || RUSStatus;
              setFilters(prev => ({ ...prev, status: ENGStatus }));
              setSelectedLabels(prev => ({ ...prev, status: RUSStatus }));
            }}
            icon={<img src="/icons/filters/Status.png" alt="🟢🟡🔴" />}
            defaultLabel="Статус"
            isOpen={activeFilter === 'status'}
            onToggle={() => toggleFilter('status')}/>
        </Tooltip>
        <Tooltip text="Количество документов на странице">
          <DropdownButton
            options={['5', '10', '20', '50']}
            selectedLabel={String(Plimit)}
            onSelect={(value) => {
              const newLimit = parseInt(value, 10);
              if (!isNaN(newLimit)) setPLimit(newLimit);
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
              setFilters({
                typeId: undefined,
                categoryId: undefined,
                status: undefined,
              });
              setDateFilter({ from: null, to: null });
              setPage(1);
              setSelectedLabels({
                docType: 'Тип документа',
                category: 'Категория',
                status: 'Статус',
              });
            }}>
            Сбросить фильтры
          </button>
        </Tooltip>

        <Tooltip text="Экспортировать документы в Excel">
          <button 
            className="apply-button"
            onClick={handleExport}
            disabled={isExporting}
            style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            {isExporting ? 'Экспорт...' : 'Экспорт'}
          </button>
        </Tooltip>

        {selectedIds.size > 0 && (
          <Tooltip text="Удалить выбранные документы. Действие необратимо">
            <button
              className="mass-delete-btn"
              onClick={handleDeleteSelected}
              disabled={deleting}
            >
              {deleting ? 'Удаление...' : `Удалить (${selectedIds.size})`}
            </button>
          </Tooltip>
        )}
      </Card>

      <Card className="cuttinPaddin">
        <Table
          title={<h4>Все документы ({data?.total ?? 0})</h4>}
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
              <th>
                <label className="file-queue-checkbox">
                  <input type="checkbox" checked={allSelected || false} onChange={toggleSelectAll} />
                  <span className="file-queue-checkmark" />
                </label>
              </th>
              <th>Рег. номер</th>
              <th>Название файла</th>
              <th>Отправитель</th>
              <th>Дата загрузки</th>
              <th>Тип</th>
              <th>Категория</th>
              <th>Статус</th>
              <th>Отдел</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9}>Загрузка...</td></tr>
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
              data.items.map((doc: DocumentListItem) => (
                <tr key={doc.id}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <label className="file-queue-checkbox">
                      <input type="checkbox" checked={selectedIds.has(doc.id)} onChange={() => toggleSelect(doc.id)} />
                      <span className="file-queue-checkmark" />
                    </label>
                  </td>
                  <td onClick={() => handleRowClick(doc.id)}>{doc.registrationNumber}</td>
                  <td onClick={() => handleRowClick(doc.id)}>{doc.title}</td>
                  <td onClick={() => handleRowClick(doc.id)}>{doc.senderName}</td>
                  <td onClick={() => handleRowClick(doc.id)}>{formatMoscowDate(doc.uploadedAt)}</td>
                  <td onClick={() => handleRowClick(doc.id)}>{doc.documentType}</td>
                  <td onClick={() => handleRowClick(doc.id)}>{doc.category}</td>
                  <td onClick={() => handleRowClick(doc.id)}>
                    <span className={`status-badge ${getStatusColorClass(doc.currentStatus)}`}>
                      {translateStatus(doc.currentStatus)}
                    </span>
                  </td>
                  <td onClick={() => handleRowClick(doc.id)}>{doc.department}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={9}>Нет документов</td></tr>
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
};

export default DocumentsListPage;