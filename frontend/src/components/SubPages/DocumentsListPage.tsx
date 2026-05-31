import "../../styles/global.css";
import React, { useState, useEffect } from 'react';
import Card from "../Card";
import Table from "../Table";
import "../../styles/Dashboard.css";
import "../../styles/DocumentsListPage.css";
import "../../styles/Settings.css";
import { DocumentsListResponse, DocumentListItem, DocumentType, DocumentCategory } from "../../types";
import { getDocuments, getDocumentTypes, getDocumentCategories, deleteDocument } from "../../services/api";
import { useNavigate } from 'react-router-dom';
import { translateStatus, statusMap, getStatusColor } from "./MainMenu";
import { DateFilterDropdown } from "../DropdownButton";
import DropdownButton from "../DropdownButton";
import Pagination from "../Pagination";
import Tooltip from "../Tooltip";

const DocumentsListPage = () => {
  const navigate = useNavigate();

  const [data, setData] = useState<DocumentsListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtersError, setFiltersError] = useState('');
  const [page, setPage] = useState(1);
  const [Plimit, setPLimit] = useState(10);

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
  try {
    const exportBtn = document.querySelector('.export-excel-btn');
    if (exportBtn) exportBtn.textContent = 'Экспорт...';
    
    const params = new URLSearchParams();
    if (filters.typeId) params.append('typeId', String(filters.typeId));
    if (filters.categoryId) params.append('categoryId', String(filters.categoryId));
    if (filters.status) params.append('status', filters.status);
    if (dateFilter.from) params.append('dateFrom', dateFilter.from);
    if (dateFilter.to) params.append('dateTo', dateFilter.to);
    
    const response = await fetch(`http://localhost:3000/documents/export?${params.toString()}`, {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });
    
    if (!response.ok) throw new Error('Ошибка экспорта');
    
    const blob = await response.blob();
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
      const exportBtn = document.querySelector('.export-excel-btn');
      if (exportBtn) exportBtn.textContent = 'Экспорт';
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

  const RUSStatuses = Object.values(statusMap);
  const reverseStatusMap = Object.fromEntries(
    Object.entries(statusMap).map(([eng, rus]) => [rus, eng])
  );

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
      <Card className="filtersButtsWrapper">
        <DateFilterDropdown
          onFilterChange={(range) => {
            setDateFilter({ from: range.from, to: range.to });
          }}
          icon={<img src="/icons/filters/data.png" alt="📅" />}
          isOpen={activeFilter === 'date'}
          onToggle={() => toggleFilter('date')}/>
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
        <Tooltip text="Количество документов на странице">
          <DropdownButton
            options={['5', '10', '20', '50']}
            selectedLabel={String(Plimit)}
            onSelect={(value) => {
              const newLimit = parseInt(value, 10);
              if (!isNaN(newLimit)) setPLimit(newLimit);
            }}
            defaultLabel="10"
            isOpen={activeFilter === 'limitSelector'}
            onToggle={() => toggleFilter('limitSelector')}/>
        </Tooltip>
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

        <button 
          className="apply-button"
          onClick={handleExport}>
          Экспорт
        </button>

        {selectedIds.size > 0 && (
          <button
            className="mass-delete-btn"
            onClick={handleDeleteSelected}
            disabled={deleting}
          >
            {deleting ? 'Удаление...' : `Удалить (${selectedIds.size})`}
          </button>
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
                  <td onClick={() => handleRowClick(doc.id)} style={{ cursor: 'pointer' }}>{doc.registrationNumber}</td>
                  <td onClick={() => handleRowClick(doc.id)} style={{ cursor: 'pointer' }}>{doc.title}</td>
                  <td onClick={() => handleRowClick(doc.id)} style={{ cursor: 'pointer' }}>{doc.senderName}</td>
                  <td onClick={() => handleRowClick(doc.id)} style={{ cursor: 'pointer' }}>{doc.uploadedAt ? new Date(doc.uploadedAt).toLocaleDateString() : '-'}</td>
                  <td onClick={() => handleRowClick(doc.id)} style={{ cursor: 'pointer' }}>{doc.documentType}</td>
                  <td onClick={() => handleRowClick(doc.id)} style={{ cursor: 'pointer' }}>{doc.category}</td>
                  <td onClick={() => handleRowClick(doc.id)} style={{ cursor: 'pointer' }}>
                    <span className={`status-badge ${getStatusColor(doc.currentStatus)}`}>
                      {translateStatus(doc.currentStatus)}
                    </span>
                  </td>
                  <td onClick={() => handleRowClick(doc.id)} style={{ cursor: 'pointer' }}>{doc.department}</td>
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