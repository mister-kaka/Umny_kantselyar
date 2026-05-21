import "../../styles/global.css";
import React, { useState, useEffect } from 'react';
import Card from "../Card";
import Table from "../Table";
import "../../styles/Dashboard.css";
import "../../styles/DocumentsListPage.css";
import { DocumentsListResponse, DocumentListItem, DocumentType, DocumentCategory } from "../../types";
import { getDocuments, getDocumentTypes, getDocumentCategories } from "../../services/api";
import { useNavigate } from 'react-router-dom';
import { translateStatus, statusMap, getStatusColor } from "./MainMenu";
import DropdownButton from "../DropdownButton";
import Pagination from "../Pagination"; 

const DocumentsListPage = () => {
  const navigate = useNavigate();

  const [data, setData] = useState<DocumentsListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtersError, setFiltersError] = useState('');
  const [page, setPage] = useState(1); 

  const [types, setTypes] = useState<DocumentType[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);

  const [filters, setFilters] = useState({
    typeId: undefined as number | undefined,
    categoryId: undefined as number | undefined,
    status: undefined as string | undefined,
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

  const hasActiveFilters = !!(filters.typeId || filters.categoryId || filters.status);

  const handleRowClick = (id: number) => {
    navigate(`/dashboard/documents/${id}`);
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
      const response = await getDocuments({ page, limit: 10, ...filters });
      setData(response);
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
  }, [page, filters]); 

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

  return (
    <div>
      <Card className="filtersButtsWrapper">
        <DropdownButton
          options={typeOptions}
          selectedLabel={selectedLabels.docType}
          onSelect={(name) => {
            if (name === 'Ошибка загрузки') return;
            const id = findTypeId(name);
            setFilters(prev => ({ ...prev, typeId: id }));
            setSelectedLabels(prev => ({ ...prev, docType: name }));
          }}
          icon={<img src="/DashboardPage_Images/DocumentType.png" alt="📄" />}
          defaultLabel="Тип документа"
          isOpen={activeFilter === 'docType'}
          onToggle={() => toggleFilter('docType')}
        />
        <DropdownButton
          options={categoryOptions}
          selectedLabel={selectedLabels.category}
          onSelect={(name) => {
            if (name === 'Ошибка загрузки') return;
            const id = findCategoryId(name);
            setFilters(prev => ({ ...prev, categoryId: id }));
            setSelectedLabels(prev => ({ ...prev, category: name }));
          }}
          icon={<img src="/DashboardPage_Images/Category.png" alt="🗂️" />}
          defaultLabel="Категория"
          isOpen={activeFilter === 'category'}
          onToggle={() => toggleFilter('category')}
        />
        <DropdownButton
          options={statusOptions}
          selectedLabel={selectedLabels.status}
          onSelect={(RUSStatus) => {
            if (RUSStatus === 'Ошибка загрузки') return;
            const ENGStatus = reverseStatusMap[RUSStatus] || RUSStatus;
            setFilters(prev => ({ ...prev, status: ENGStatus }));
            setSelectedLabels(prev => ({ ...prev, status: RUSStatus }));
          }}
          icon={<img src="/DashboardPage_Images/Status.png" alt="🟢🟡🔴" />}
          defaultLabel="Статус"
          isOpen={activeFilter === 'status'}
          onToggle={() => toggleFilter('status')}
        />
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
            setPage(1);
            setSelectedLabels({
              docType: 'Тип документа',
              category: 'Категория',
              status: 'Статус',
            });
          }}
        >
          Сбросить фильтры
        </button>
      </Card>

      <Card>
        <Table
          title={<h4>Все документы ({data?.total ?? 0})</h4>}
          rightTitle={data && (
            <Pagination
              page={page}
              totalPages={data.totalPages}
              onPageChange={(newPage) => setPage(newPage)}
            />
          )}
        >
          <thead>
            <tr>
              <th>Рег. номер</th>
              <th>Название файла</th>
              <th>Отправитель</th>
              <th>Дата</th>
              <th>Тип</th>
              <th>Категория</th>
              <th>Статус</th>
              <th>Отдел</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8}>Загрузка...</td></tr>
            ) : error ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: 'var(--color-status-rejected)', padding: '20px' }}>
                  {error} — <button className="apply-button" onClick={handleRetry}>Повторить</button>
                </td>
              </tr>
            ) : filtersError && !types.length && !categories.length ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', color: 'var(--color-status-rejected)', padding: '20px' }}>
                  {filtersError} — <button className="apply-button" onClick={handleRetry}>Повторить</button>
                </td>
              </tr>
            ) : data?.items?.length ? (
              data.items.map((doc: DocumentListItem) => (
                <tr key={doc.id} onClick={() => handleRowClick(doc.id)} style={{ cursor: 'pointer' }}>
                  <td>{doc.registrationNumber}</td>
                  <td>{doc.title}</td>
                  <td>{doc.senderName}</td>
                  <td>{new Date(doc.receivedDate).toLocaleDateString()}</td>
                  <td>{doc.documentType}</td>
                  <td>{doc.category}</td>
                  <td>
                    <span className={`status-badge ${getStatusColor(doc.currentStatus)}`}>
                      {translateStatus(doc.currentStatus)}
                    </span>
                  </td>
                  <td>{doc.department}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={8}>Нет документов</td></tr>
            )}
          </tbody>
        </Table>
      </Card>
    </div>
  );
};

export default DocumentsListPage;
