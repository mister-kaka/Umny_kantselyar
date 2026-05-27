import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getRoutingDocuments, getDepartments } from '../../services/api';
import { RoutingDocument, Department } from '../../types';
import './Routing.css';

const Routing: React.FC = () => {
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<RoutingDocument[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<number | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchRoutingDocuments();
  }, [selectedDepartment]);

  const fetchDepartments = async () => {
    try {
      const data = await getDepartments();
      setDepartments(data);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchRoutingDocuments = async () => {
    try {
      setLoading(true);
      const data = await getRoutingDocuments(selectedDepartment);
      setDocuments(data);
      setError(null);
    } catch (error) {
      setError('Не удалось загрузить документы');
    } finally {
      setLoading(false);
    }
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'delivered': return 'status-delivered';
      case 'read': return 'status-read';
      case 'rejected': return 'status-rejected';
      default: return 'status-pending';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'delivered': return 'Доставлен';
      case 'read': return 'Прочитан';
      case 'rejected': return 'Отклонён';
      default: return 'В пути';
    }
  };

  if (loading) return <div className="loading">Загрузка...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="routing-page">
      <div className="routing-header">
        <h1>Маршрутизация документов</h1>
        <select
          value={selectedDepartment || ''}
          onChange={(e) => setSelectedDepartment(e.target.value ? Number(e.target.value) : undefined)}
          className="filter-select"
        >
          <option value="">Все отделы</option>
          {departments.map(dept => (
            <option key={dept.id} value={dept.id}>{dept.name}</option>
          ))}
        </select>
      </div>

      {documents.length === 0 ? (
        <div className="routing-empty">Нет документов в маршрутизации</div>
      ) : (
        <div className="routing-table-container">
          <table className="routing-table">
            <thead>
              <tr><th>Рег. номер</th><th>Название</th><th>Текущий отдел</th><th>Рекомендованный отдел</th><th>Статус</th></tr>
            </thead>
            <tbody>
              {documents.map(doc => (
                <tr key={doc.id} onClick={() => navigate(`/dashboard/documents/${doc.id}`)} className="routing-row">
                  <td>{doc.registrationNumber}</td>
                  <td>{doc.title}</td>
                  <td>{doc.currentDepartment}</td>
                  <td>{doc.suggestedDepartment}</td>
                  <td><span className={`status-badge ${getStatusClass(doc.routeStatus)}`}>{getStatusText(doc.routeStatus)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Routing;