import { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import { getDocumentTypes, getDocumentCategories, getDocuments, getAnalyticsData } from '../../services/api';
import { DocumentType, DocumentCategory, DocumentListItem, AnalyticsData } from '../../types';
import '../../styles/Analytics.css';
import { getStatusHexColor, translateStatus } from '../../constants/statuses';
import '../../styles/global.css';
const Chart = lazy(() => import('react-apexcharts'));

const CLEAN_PALETTE = ['#81D8D0', '#5DBFBB', '#7EADE2', '#3BA6A5', '#BBDFFB', '#A2C5C3', '#C7D9D8', '#E1EDED'];
const ACCENT = '#81D8D0';

const getThemeColors = () => {
  const styles = getComputedStyle(document.documentElement);
  return {
    textPrimary: styles.getPropertyValue('--text-primary').trim() || '#000000',
    textSecondary: styles.getPropertyValue('--text-secondary').trim() || '#4b4b4b',
    borderColor: styles.getPropertyValue('--border-color').trim() || '#E5E5E5',
  };
};

const Analytics = () => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [docTypes, setDocTypes] = useState<DocumentType[]>([]);
  const [docCategories, setDocCategories] = useState<DocumentCategory[]>([]);
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isChartReady, setIsChartReady] = useState(false);
  const [themeKey, setThemeKey] = useState(0);

  useEffect(() => {
    Promise.all([
      getAnalyticsData(),
      getDocumentTypes(),
      getDocumentCategories(),
      getDocuments({ limit: 1000 }),
    ])
      .then(([analytics, types, categories, docsResponse]) => {
        setAnalyticsData(analytics);
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsChartReady(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setThemeKey(prev => prev + 1);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  const last14Days = useMemo(() => {
    return [...Array(14)].map((_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }).reverse();
  }, []);

  const { typeStats, categoryStats, statusStats, dailyData } = useMemo(() => {
    const validTypeNames = new Set(docTypes.map(t => t.name));
    const classifiedDocs = documents.filter(doc => validTypeNames.has(doc.documentType));

    const tStats = docTypes
      .map(type => ({
        name: type.name,
        value: classifiedDocs.filter(doc => doc.documentType === type.name).length,
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);

    const cStats = docCategories
      .map(cat => ({
        name: cat.name,
        value: classifiedDocs.filter(doc => doc.category === cat.name).length,
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);

    const sStats = Object.entries(
      documents.reduce((acc, doc) => {
        acc[doc.currentStatus] = (acc[doc.currentStatus] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    )
      .map(([status, count]) => ({
        status,
        label: translateStatus(status),
        count,
        color: getStatusHexColor(status),
      }))
      .sort((a, b) => b.count - a.count);

    const dData = last14Days.map(date =>
      documents.filter(doc => (doc.uploadedAt || doc.receivedDate)?.startsWith(date)).length
    );

    return {
      typeStats: tStats,
      categoryStats: cStats,
      statusStats: sStats,
      dailyData: dData,
    };
  }, [documents, docTypes, docCategories, last14Days]);

  if (loading) {
    return (
      <div className="analytics-loading">
        <div className="analytics-spinner" />
        Загрузка аналитики...
      </div>
    );
  }

  if (error) {
    return <div className="analytics-error">{error}</div>;
  }

  const themeColors = getThemeColors();
  const currentTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';

  const donutOptions: ApexCharts.ApexOptions = {
    labels: typeStats.map(t => t.name),
    colors: CLEAN_PALETTE,
    legend: {
      position: 'bottom',
      fontSize: '12px',
      fontFamily: 'Inter, sans-serif',
      markers: { size: 6, strokeWidth: 0 },
      itemMargin: { horizontal: 10, vertical: 4 },
      labels: {
        colors: themeColors.textSecondary
      }
    },
    plotOptions: {
      pie: {
        donut: {
          size: '65%',
          labels: {
            show: true,
            name: { fontSize: '11px', color: themeColors.textSecondary },
            value: { fontSize: '24px', fontWeight: 600, color: themeColors.textPrimary },
            total: {
              show: true,
              label: 'Всего',
              color: themeColors.textPrimary,
              formatter: () => `${typeStats.reduce((a, b) => a + b.value, 0)}`
            }
          }
        }
      }
    },
    dataLabels: { enabled: false },
    stroke: { width: 0 },
    tooltip: {
      theme: currentTheme,
      y: { formatter: val => `${val} шт.` }
    },
    states: {
      hover: { filter: { type: 'none' } }
    }
  };

  const barOptions: ApexCharts.ApexOptions = {
  chart: { toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
  plotOptions: {
    bar: {
      horizontal: true,
      borderRadius: 4,
      barHeight: '40%',
      distributed: true,
      dataLabels: {
        position: 'top', // ← жёстко ставим подписи сверху столбца
      }
    }
  },
  colors: CLEAN_PALETTE,
  dataLabels: {
    enabled: true,
    textAnchor: 'start',
    style: {
      colors: [themeColors.textPrimary],
      fontSize: '11px',
      fontWeight: 500
    },
    formatter: (val) => val.toString(),
    offsetX: 8,      // ← фиксированный отступ от конца линии
    offsetY: 0,       // ← не смещаем по вертикали
    dropShadow: {
      enabled: false, // ← отключаем тень, чтобы не плыло
    }
  },
  xaxis: {
    categories: categoryStats.map(c => c.name),
    labels: {
      show: true,
      style: { colors: themeColors.textSecondary },
    },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: {
    labels: {
      style: { colors: themeColors.textSecondary, fontWeight: 500 },
      maxWidth: 200
    }
  },
  grid: {
    borderColor: themeColors.borderColor,
    xaxis: { lines: { show: true } },
    yaxis: { lines: { show: false } }
  },
  legend: { show: false },
  tooltip: {
    theme: currentTheme,
    y: { formatter: val => `${val} шт.` }
  }
};

  const areaOptions: ApexCharts.ApexOptions = {
    chart: { toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
    stroke: { curve: 'smooth', width: 2.5 },
    fill: {
      type: 'gradient',
      gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] }
    },
    markers: { size: 0, hover: { size: 6 } },
    colors: [ACCENT],
    xaxis: {
      categories: last14Days.map(d => {
        const [, m, day] = d.split('-');
        return `${day}.${m}`;
      }),
      labels: { style: { colors: themeColors.textSecondary } },
      axisBorder: { show: false },
      axisTicks: { show: false }
    },
    yaxis: {
      min: 0,
      tickAmount: 4,
      labels: { formatter: val => Math.floor(val).toString(), style: { colors: themeColors.textSecondary } }
    },
    grid: { borderColor: themeColors.borderColor, strokeDashArray: 4 },
    tooltip: { 
      theme: currentTheme,
      y: { formatter: val => `${val} шт.` } 
    }
  };

  const statusBarOptions: ApexCharts.ApexOptions = {
  chart: { toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
  plotOptions: {
    bar: {
      horizontal: true,
      borderRadius: 4,
      barHeight: '40%',
      distributed: true,
      dataLabels: {
        position: 'top',
      }
    }
  },
  colors: statusStats.map(s => s.color),
  dataLabels: {
    enabled: true,
    textAnchor: 'start',
    style: {
      colors: [themeColors.textPrimary],
      fontSize: '11px',
      fontWeight: 500
    },
    formatter: val => val.toString(),
    offsetX: 8,
    offsetY: 0,
    dropShadow: {
      enabled: false,
    }
  },
  xaxis: {
    categories: statusStats.map(s => s.label),
    labels: {
      show: true,
      style: { colors: themeColors.textSecondary },
    },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: {
    labels: {
      style: { colors: themeColors.textSecondary, fontWeight: 500 },
      maxWidth: 200
    }
  },
  grid: {
    borderColor: themeColors.borderColor,
    xaxis: { lines: { show: true } },
    yaxis: { lines: { show: false } }
  },
  legend: { show: false },
  tooltip: {
    theme: currentTheme,
    y: { formatter: val => `${val} шт.` }
  }
};

  const statCards = [
    { value: analyticsData?.totalDocuments || 0, label: 'Всего документов', icon: '/icons/analytics/total.png' },
    { value: analyticsData?.avgConfidence || 0, label: 'Средняя уверенность', icon: '/icons/analytics/confidence.png', suffix: '%' },
    { value: analyticsData?.pendingVerificationCount || 0, label: 'Требуют проверки', icon: '/icons/analytics/pending.png' },
    { value: analyticsData?.aiProcessedCount || 0, label: 'AI обработано', icon: '/icons/analytics/ai.png' },
    { value: analyticsData?.rejectedCount || 0, label: 'Отклонено', icon: '/icons/analytics/rejected.png' },
    { value: analyticsData?.last7Days || 0, label: 'За 7 дней', icon: '/icons/analytics/last7days.png' },
  ];

  return (
    <div>
      <h2 className="page-title">Аналитика</h2>
      <p className="page-subtitle">{documents.length} документов в системе</p>

      <div className="analytics-stats-cards-container">
        {statCards.map((card, i) => (
          <div className="analytics-stat-card" key={i}>
            <div className="analytics-stat-card-icon-wrap">
              <img src={card.icon} className="analytics-stat-icon" alt={card.label} />
            </div>
            <div className="analytics-stat-card-content">
              <div className="analytics-stat-card-value">
                {card.value}
                {card.suffix && <span className="analytics-stat-card-suffix">{card.suffix}</span>}
              </div>
              <div className="analytics-stat-card-label">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <div className="chart-card-header">
            <h3>Типы документов</h3>
            <span className="chart-card-count">{typeStats.length}</span>
          </div>
          <div className="chart-container">
            {typeof window !== 'undefined' && isChartReady && typeStats.length > 0 ? (
              <Suspense fallback={<div className="empty-chart">Загрузка графика...</div>}>
                <Chart
                  key={`donut-${themeKey}`}
                  options={donutOptions}
                  series={typeStats.map(t => t.value)}
                  type="donut"
                  height={300}
                />
              </Suspense>
            ) : (
              <div className="empty-chart">{typeStats.length === 0 ? 'Нет данных' : 'Загрузка графика...'}</div>
            )}
          </div>
        </div>

        <div className="chart-card">
          <div className="chart-card-header">
            <h3>Категории</h3>
            <span className="chart-card-count">{categoryStats.length}</span>
          </div>
          <div className="chart-container">
            {typeof window !== 'undefined' && isChartReady && categoryStats.length > 0 ? (
              <Suspense fallback={<div className="empty-chart">Загрузка графика...</div>}>
                <Chart
                  key={`categories-${themeKey}`}
                  options={barOptions}
                  series={[{ name: 'Документы', data: categoryStats.map(c => c.value) }]}
                  type="bar"
                  height={300}
                />
              </Suspense>
            ) : (
              <div className="empty-chart">{categoryStats.length === 0 ? 'Нет данных' : 'Загрузка графика...'}</div>
            )}
          </div>
        </div>

        <div className="chart-card full-width">
          <div className="chart-card-header">
            <h3>Динамика поступлений</h3>
            <span className="chart-card-count">14 дней</span>
          </div>
          <div className="chart-container">
            {typeof window !== 'undefined' && isChartReady && (
              <Suspense fallback={<div className="empty-chart">Загрузка графика...</div>}>
                <Chart
                  key={`area-${themeKey}`}
                  options={areaOptions}
                  series={[{ name: 'Загружено', data: dailyData }]}
                  type="area"
                  height={280}
                />
              </Suspense>
            )}
          </div>
        </div>

        <div className="chart-card full-width">
          <div className="chart-card-header">
            <h3>Статусы обработки</h3>
          </div>
          <div className="chart-container">
            {typeof window !== 'undefined' && isChartReady && statusStats.length > 0 ? (
              <Suspense fallback={<div className="empty-chart">Загрузка графика...</div>}>
                <Chart
                  key={`statuses-${themeKey}`}
                  options={statusBarOptions}
                  series={[{ name: 'Документы', data: statusStats.map(s => s.count) }]}
                  type="bar"
                  height={Math.max(260, statusStats.length * 40)}
                />
              </Suspense>
            ) : (
              <div className="empty-chart">{statusStats.length === 0 ? 'Нет данных' : 'Загрузка графика...'}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;