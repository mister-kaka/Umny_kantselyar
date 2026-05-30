import { useEffect, useState } from 'react';
import { getDashboard, getDocumentTypes, getDocumentCategories, getDocuments } from '../../services/api';
import { DashboardData, DocumentType, DocumentCategory, DocumentListItem } from '../../types';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement } from 'chart.js';
import { Pie, Bar, Line } from 'react-chartjs-2';
import '../../styles/Analytics.css';

// Регистрация компонентов Chart.js
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement);

const Analytics = () => {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [docTypes, setDocTypes] = useState<DocumentType[]>([]);
  const [docCategories, setDocCategories] = useState<DocumentCategory[]>([]);
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      getDashboard(),
      getDocumentTypes(),
      getDocumentCategories(),
      getDocuments({ limit: 100 })
    ])
      .then(([dashboardData, types, categories, docsResponse]) => {
        setDashboard(dashboardData);
        setDocTypes(types);
        setDocCategories(categories);
        setDocuments(docsResponse.items);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Ошибка загрузки аналитики:', err);
        setError('Не удалось загрузить данные аналитики');
        setLoading(false);
      });
  }, []);

  if (loading) return <div className="analytics-loading">Загрузка аналитики...</div>;
  if (error) return <div className="analytics-error">{error}</div>;

  // Данные для круговой диаграммы по типам документов
  const typeStats = docTypes
    .map(type => ({
      name: type.name,
      value: documents.filter(doc => doc.documentType === type.name).length,
    }))
    .filter(item => item.value > 0);

  // Данные для столбчатой диаграммы по категориям
  const categoryStats = docCategories
    .map(cat => ({
      name: cat.name,
      value: documents.filter(doc => doc.category === cat.name).length,
    }))
    .filter(item => item.value > 0);

  // Данные для линейного графика (последние 7 дней)
  const last7Days = [...Array(7)].map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split('T')[0];
  }).reverse();

  const dailyData = {
    labels: last7Days.map(date => date.slice(5)),
    datasets: [{
      label: 'Количество документов',
      data: last7Days.map(date => documents.filter(doc => doc.receivedDate?.startsWith(date)).length),
      fill: false,
      borderColor: '#81D8D0',
      backgroundColor: '#81D8D0',
      tension: 0.1,
    }]
  };

  // Цвета для круговой диаграммы
  const pieColors = ['#81D8D0', '#7EE29F', '#FAB25F', '#E87373', '#7EADE2', '#C27EE2', '#BBDFFB', '#979797'];

  const pieData = {
    labels: typeStats.map(item => item.name),
    datasets: [{
      data: typeStats.map(item => item.value),
      backgroundColor: pieColors.slice(0, typeStats.length),
      borderWidth: 0,
    }]
  };

  const barData = {
    labels: categoryStats.map(item => item.name),
    datasets: [{
      label: 'Количество документов',
      data: categoryStats.map(item => item.value),
      backgroundColor: '#81D8D0',
      borderRadius: 8,
    }]
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const },
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right' as const },
    },
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: { beginAtZero: true, grid: { color: '#e5e5e5' } },
      x: { grid: { display: false } }
    },
    plugins: {
      legend: { position: 'top' as const },
    },
  };

  return (
    <div className="analytics-page">
      <h1 className="analytics-title">Аналитика</h1>

      {/* 4 карточки */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{dashboard?.totalDocuments || 0}</div>
          <div className="stat-title">Всего документов</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{dashboard?.inProgress || 0}</div>
          <div className="stat-title">В обработке</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{dashboard?.pendingCheck || 0}</div>
          <div className="stat-title">На проверке</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {documents.filter(d => d.currentStatus === 'processed').length}
          </div>
          <div className="stat-title">AI обработано</div>
        </div>
      </div>

      {/* Диаграммы */}
      <div className="charts-grid">
        {/* Круговая диаграмма по типам */}
        <div className="chart-card">
          <h3>Типы документов</h3>
          <div className="chart-container">
            {typeStats.length > 0 ? (
              <Pie data={pieData} options={pieOptions} />
            ) : (
              <div className="empty-chart">Нет данных</div>
            )}
          </div>
        </div>

        {/* Столбчатая диаграмма по категориям */}
        <div className="chart-card">
          <h3>Категории документов</h3>
          <div className="chart-container">
            {categoryStats.length > 0 ? (
              <Bar data={barData} options={barOptions} />
            ) : (
              <div className="empty-chart">Нет данных</div>
            )}
          </div>
        </div>

        {/* Линейный график поступления по дням */}
        <div className="chart-card full-width">
          <h3>Поступление документов по дням</h3>
          <div className="chart-container">
            <Line data={dailyData} options={lineOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;