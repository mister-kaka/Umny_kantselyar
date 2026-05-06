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
    getDocumentTypes().then(setTypes).catch(console.error);
    getDocumentCategories().then(setCategories).catch(console.error);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    setLoading(true);
    getDocuments({ page, limit: 10, ...filters })
      .then(res => setData(res))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [page, filters]);

  const findTypeId = (name: string) => types.find(t => t.name === name)?.id;
  const findCategoryId = (name: string) => categories.find(c => c.name === name)?.id;

  const RUSStatuses = Object.values(statusMap);
  const reverseStatusMap = Object.fromEntries(
    Object.entries(statusMap).map(([eng, rus]) => [rus, eng])
  );

  const statusOptions = RUSStatuses;

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
          options={types.map(t => t.name)}
          selectedLabel={selectedLabels.docType}
          onSelect={(name) => {
            const id = findTypeId(name);
            setFilters(prev => ({ ...prev, typeId: id }));
            setSelectedLabels(prev => ({ ...prev, docType: name }));
          }}
          icon={<img src="/DashboardPage_Images/DocumentType.png" alt="📄" />}
          defaultLabel="Тип документа"
          isOpen={activeFilter === 'docType'}
          onToggle={() => toggleFilter('docType')}/>
        <DropdownButton
          options={categories.map(c => c.name)}
          selectedLabel={selectedLabels.category}
          onSelect={(name) => {
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
              <tr><td colSpan={8}>Загрузка...</td></tr>
            ) : data?.items?.length ? (
              data.items.map((doc: DocumentListItem) => (
                <tr key={doc.id} onClick={() => handleRowClick(doc.id)} style={{ cursor: 'pointer' }}>
                  <td>{doc.id}</td>
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
