import React, { useEffect, useState } from 'react';
import { getDepartments, getDashboard } from '../../services/api';
import { Department, DashboardData } from '../../types';
import './Departments.css';

const Departments: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDepartments();
  }, []);

const fetchDepartments = async () => {
  try {
    setLoading(true);

    const [departmentsData, dashboardData] = await Promise.all([
      getDepartments(),
      getDashboard()
    ]);

    setDepartments(departmentsData);
    setDashboard(dashboardData);

    setError(null);
  } catch (error) {
    console.error(error);
    setError('Не удалось загрузить список отделов');
  } finally {
    setLoading(false);
  }
};

const getDocumentsCount = (departmentId: number): number => {
  if (!dashboard) return 0;

  return dashboard.departmentRouteStatuses
    .filter((item) => item.departmentId === departmentId)
    .reduce((sum, item) => sum + item.count, 0);
};

if (loading) {
  return (
    <div className="departments-loading">
      Загрузка подразделений...
    </div>
  );
}

if (error) {
  return (
    <div className="departments-error">
      {error}
    </div>
  );
}

return (
  <div className="departments-page">
    <div className="departments-header">
      <h1>Подразделения</h1>
      <p className="departments-subtitle">
        Список подразделений и текущая нагрузка
      </p>
    </div>

    <div className="departments-grid">
      {departments.map((dept) => (
        <div key={dept.id} className="department-card">

          <div className="department-card-header">
            <h3 className="department-name">{dept.name}</h3>

            <span
              className={`department-status ${
                dept.isActive
                  ? 'status-active'
                  : 'status-inactive'
              }`}
            >
              {dept.isActive ? 'Активен' : 'Неактивен'}
            </span>
          </div>

          <div className="department-card-body">

            <div className="department-code">
              <span className="label">Код</span>
              <span className="value">{dept.code}</span>
            </div>

            <div className="department-documents">
              <span className="label">Документов</span>

              <span className="documents-count">
                {getDocumentsCount(dept.id)}
              </span>
            </div>

          </div>
        </div>
      ))}
    </div>
  </div>
);
};

export default Departments;