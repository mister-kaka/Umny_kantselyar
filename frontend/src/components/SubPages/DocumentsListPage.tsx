import "../../styles/global.css";
import React, { useState, useEffect } from 'react';
import Card from "../Card";
import Table from "../Table";
import "../../styles/Dashboard.css";
import "../../styles/DocumentsListPage.css";
import { DocumentsListResponse, DocumentListItem, DocumentType, DocumentCategory } from "../../types";
import { getDocuments, getDocumentTypes, getDocumentCategories } from "../../services/api";
import { useNavigate } from 'react-router-dom';
import { translateStatus, statusMap } from "./MainMenu";
import DropdownButton from "../DropdownButton";
// import { DateFilterDropdown } from "../DropdownButton";
import Pagination from "../Pagination"; 

const DocumentsListPage = () => {
  const navigate = useNavigate();

  const [data, setData] = useState<DocumentsListResponse | null>(null);
  const [loading, setLoading] = useState(false);
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

  const hasActiveFilters = (filters.typeId || filters.categoryId || filters.status);

  const handleRowClick = (id: number) => {
    navigate(`/documents/${id}`);
  };
  
  useEffect(() => {
    setPage(1);
  }, [filters]);

  const fetchDocumentsfilters = async () => {
    try {
      const [types, categories] = await Promise.all([
        getDocumentTypes(),
        getDocumentCategories()
      ]);
      setTypes(types);
      setCategories(categories);
      setFiltersError('');
    } catch (e) {
      console.error(e)
      setFiltersError('Ошибка загрузки фильтров');
    }
  };
  useEffect(() => {
      fetchDocumentsfilters();
  }, []); 

  const fetchDocuments = async () => {
      try {
          setLoading(true);
          const response = await getDocuments({ page, limit: 10, ...filters });
          setData(response);
          setError('');
      } catch (e) {
          setError('Ошибка загрузки документов');
      } finally {
          setLoading(false)
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

  const typeOptions = types.length > 0 ?
  types.map(c => c.name)
  : (error ? ['Ошибка загрузки']
  : filtersError ? ['Ошибка загрузки']
  : []);

  const categotyOptions = categories.length > 0 ?
  categories.map(c => c.name)
  : (error ? ['Ошибка загрузки']
  : filtersError ? ['Ошибка загрузки']
  : []);

  const statusOptions = error ? ['Ошибка загрузки'] : filtersError? ['Ошибка загрузки'] : RUSStatuses ;

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'in_progress':
        return 'status-assigned'; 
      case 'pending':
        return 'status-clarify'; 
      case 'completed':
        return 'status-loaded'; 
      case 'approved':
        return 'status-loaded';
      case 'in_review':
        return 'status-data-refinement';
      case 'sent':
        return 'status-assigned';
      case 'rejected':
        return 'status-rejected';
      default:
        return ''; 
    }
  };

  return (
    <div>
      <Card className="filtersButtsWrapper">
        {/* <DateFilterDropdown
          onFilterChange={(range) => console.log('Фильтр по дате:', range)}
          icon={<img src="/DashboardPage_Images/Date.png" alt="📅" />}
          isOpen={activeFilter === 'date'}
          onToggle={() => toggleFilter('date')}/> */}
        {/* <DropdownButton
          options={['Вариант 1', 'Вариант 2', 'Вариант 3']}
          onSelect={(option) => console.log('Источник:', option)}
          icon={<img src="/DashboardPage_Images/Source.png" alt="⛲" />}
          defaultLabel="Источник"
          isOpen={activeFilter === 'source'}
          onToggle={() => toggleFilter('source')}/> */}
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
          onToggle={() => toggleFilter('docType')}/>
        <DropdownButton
          options={categotyOptions}
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
          onToggle={() => toggleFilter('category')}/>
        {/* <DropdownButton
          options={['100%', '99% - 90%', '89% - 80%', '79% - 0%']}
          onSelect={(option) => console.log('Уверенность:', option)}
          icon={<img src="/DashboardPage_Images/Confidence.png" alt="💯" />}
          defaultLabel="Уверенность"
          isOpen={activeFilter === 'confidence'}
          onToggle={() => toggleFilter('confidence')}/> */}
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
          onToggle={() => toggleFilter('status')}/>
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
          }}>
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
            onPageChange={(newPage) => setPage(newPage)}/>
        )}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Рег. номер</th>
              <th>Тема</th>
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
              <tr><td colSpan={9}>Загрузка...</td></tr>
            ) : data?.items?.length ? (
              data.items.map((doc: DocumentListItem) => (
                <tr key={doc.id} onClick={() => handleRowClick(doc.id)} style={{ cursor: 'pointer' }}>
                  <td>{doc.id}</td>
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
            ) : error ? (
              <tr><td colSpan={9}> {error} <button className="apply-button" onClick={() =>
              { fetchDocumentsfilters(); fetchDocuments(); }}>Повторить</button></td></tr>
            ) : (<tr><td colSpan={9}>Нет документов</td></tr>)}
          </tbody>
        </Table>
      </Card>
    </div>
  );
};

export default DocumentsListPage;
