import { useEffect, useState } from 'react';
import { getDashboard, getDocumentTypes, getDocumentCategories, getDocuments } from '../../services/api';
import { DashboardData, DocumentType, DocumentCategory, DocumentListItem } from '../../types';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, ResponsiveContainer
} from 'recharts';
import '../../styles/Analytics.css';

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
  const typeStats = docTypes.map(type => ({
    name: type.name,
    value: documents.filter(doc => doc.documentType === type.name).length,
    id: type.id
  })).filter(item => item.value > 0);

  // Данные для столбчатой диаграммы по категориям
  const categoryStats = docCategories.map(cat => ({
    name: cat.name,
    value: documents.filter(doc => doc.category === cat.name).length,
    id: cat.id
  })).filter(item => item.value > 0);

  // Данные для линейного графика поступления по дням (последние 7 дней)
  const last7Days = [...Array(7)].map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split('T')[0];
  }).reverse();

  const dailyStats = last7Days.map(date => ({
    date: date.slice(5),
    count: documents.filter(doc => doc.receivedDate?.startsWith(date)).length
  }));

  // Цвета для диаграмм
  const COLORS = ['#81D8D0', '#7EE29F', '#FAB25F', '#E87373', '#7EADE2', '#C27EE2', '#BBDFFB', '#979797'];

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

      {/*диаграммы*/}
      <div className="charts-grid">
        {/*круговая диаграмма*/}
        <div className="chart-card">
          <h3>Типы документов</h3>
          <div className="chart-container">
            {typeStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={typeStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {typeStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
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
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#81D8D0" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart">Нет данных</div>
            )}
          </div>
        </div>

        {/* Линейный график поступления по дням */}
        <div className="chart-card full-width">
          <h3>Поступление документов по дням</h3>
          <div className="chart-container">
            {dailyStats.some(d => d.count > 0) ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="count" stroke="#81D8D0" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="empty-chart">Нет данных</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;