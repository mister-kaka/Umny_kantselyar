import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import Card from "../components/Card";
import Table from "../components/Table";
import Pagination from "../components/Pagination";
import "../styles/global.css";
import "../styles/DepartmentDetail.css";
import { getDepartmentDetail, deleteDepartment, restoreDepartment, getProfile } from "../services/api";
import { DepartmentDetail } from "../types";
import { formatMoscowDate, formatMoscowDateTime } from "../utils/moscowTime";
import { useSettings } from "../contexts/SettingsContext";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer,
} from 'recharts';

const DepartmentDetailPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const from = (location.state as any)?.from;
    const documentId = (location.state as any)?.documentId;

    const [data, setData] = useState<DepartmentDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [page, setPage] = useState(1);
    const limit = 10;

    const [userRole, setUserRole] = useState<string>("");
    const isAdmin = userRole === "Администратор";

    const { theme } = useSettings();
    const isDark = theme === 'dark';
    const gridColor = isDark ? '#334155' : '#f0f0f0';
    const textColor = isDark ? '#94a3b8' : '#696969';
    const tooltipBg = isDark ? '#1e293b' : '#ffffff';

    const [showArchiveModal, setShowArchiveModal] = useState(false);
    const [archiving, setArchiving] = useState(false);
    const [archiveError, setArchiveError] = useState("");

    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [restoring, setRestoring] = useState(false);

    const [chartPeriod, setChartPeriod] = useState<number | 'all'>('all');
    const [showCustomRange, setShowCustomRange] = useState(false);
    const [customFrom, setCustomFrom] = useState<string>('');
    const [customTo, setCustomTo] = useState<string>('');

    useEffect(() => {
        const loadProfile = async () => {
            try {
                const profile = await getProfile();
                setUserRole(profile.role);
            } catch {}
        };
        loadProfile();
    }, []);

    const getBackLabel = (): string => {
        if (from === 'routing') return 'К маршрутизации';
        if (from === 'document-card') return 'К карточке документа';
        return 'К подразделениям';
    };

    const handleBackClick = () => {
        if (from === 'document-card' && documentId) {
            navigate(`/dashboard/documents/${documentId}`, { state: { tab: 'history' } });
        } else if (from === 'routing') {
            navigate('/dashboard/routing');
        } else {
            navigate('/dashboard/departments');
        }
    };

    const fetchData = async () => {
        if (!id) return;
        try {
            setLoading(true);
            setError("");

            let dateFrom: string | undefined;
            let dateTo: string | undefined;

            if (showCustomRange) {
                dateFrom = customFrom || undefined;
                dateTo = customTo || undefined;
            } else if (chartPeriod !== 'all') {
                const now = new Date();
                const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                const from = new Date(to);
                from.setMonth(from.getMonth() - chartPeriod + 1);
                from.setDate(1);

                dateFrom = `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, '0')}`;
                dateTo = `${to.getFullYear()}-${String(to.getMonth() + 1).padStart(2, '0')}`;
            }

            const result = await getDepartmentDetail(Number(id), page, limit, dateFrom, dateTo);
            setData(result);
        } catch (err) {
            console.error(err);
            setError("Ошибка загрузки данных отдела");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id, page, chartPeriod, showCustomRange, customFrom, customTo]);

    const handleDocumentClick = (docId: number) => {
        navigate(`/dashboard/documents/${docId}`, {
            state: {
                from: 'departments',
                departmentId: data?.id
            }
        });
    };

    const handleArchive = async () => {
        if (!id) return;
        try {
            setArchiving(true);
            setArchiveError("");
            await deleteDepartment(Number(id));
            setShowArchiveModal(false);
            await fetchData();
        } catch (err: any) {
            const message = err?.response?.data?.message || "Ошибка при архивации отдела";
            setArchiveError(message);
        } finally {
            setArchiving(false);
        }
    };

    const handleRestore = async () => {
        if (!id) return;
        try {
            setRestoring(true);
            await restoreDepartment(Number(id));
            setShowRestoreModal(false);
            await fetchData();
        } catch (err: any) {
            console.error(err);
        } finally {
            setRestoring(false);
        }
    };

    const formatDate = (dateString: string | null) => formatMoscowDate(dateString);
    const formatDateTime = (dateString: string | null) => formatMoscowDateTime(dateString);

    const getAvatarUrl = (url: string | null) => {
        if (!url) return null;
        return url.startsWith('http') ? url : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${url}`;
    };

    const getInitials = (name: string) => {
        if (!name) return '?';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    };

    const chartData = (data?.monthlyStats || []).map(item => ({
        month: item.month,
        count: item.count,
    }));

    const handlePeriodChange = (period: number | 'all') => {
        setChartPeriod(period);
        setShowCustomRange(false);
        setCustomFrom('');
        setCustomTo('');
    };

    const handleCustomRangeToggle = () => {
        setShowCustomRange(!showCustomRange);
        if (!showCustomRange) {
            setChartPeriod('all');
        } else {
            setCustomFrom('');
            setCustomTo('');
        }
    };

    if (loading) {
        return (
            <div>
                <div className="dept-detail-header">
                    <div className="skeleton-line" style={{ width: "200px", height: "28px", marginBottom: "8px" }}></div>
                </div>
                <div className="stats-card-container">
                    {[1, 2, 3].map(i => (
                        <Card className="stat-card" key={i}>
                            <div className="stat-card-icon-wrap">
                                <div className="skeleton-icon-stat" />
                            </div>
                            <div>
                                <div className="skeleton-text-stat" />
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div>
                <div className="dept-detail-error">
                    <p>{error || "Отдел не найден"}</p>
                    <button className="apply-button" onClick={fetchData}>Повторить</button>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="dept-detail-top-row">
                <button className="dept-detail-back" onClick={handleBackClick}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <path d="M9 3l-4 4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {getBackLabel()}
                </button>

                {isAdmin && (
                    <div className="dept-detail-actions">
                        {data.isActive ? (
                            <button className="dept-detail-archive-btn" onClick={() => setShowArchiveModal(true)}>
                                Архивировать
                            </button>
                        ) : (
                            <button className="dept-detail-restore-btn" onClick={() => setShowRestoreModal(true)}>
                                Восстановить
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="dept-detail-header">
                <div className="dept-detail-header-icon">
                    <img
                        src={`/icons/departments/${data.code}.png`}
                        alt={data.name}
                        className="dept-detail-header-icon-img"
                        onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                                parent.innerHTML = `<span class="dept-detail-header-icon-text">${data.name.charAt(0)}</span>`;
                            }
                        }}
                    />
                </div>
                <h2 className="dept-detail-title">{data.name}</h2>
            </div>

            <div className="dept-detail-stats">
                <Card className="stat-card">
                    <div className="stat-card-icon-wrap">
                        <img src="/icons/departments/Total_incoming.png" className="stat-card-icon" alt="Всего" />
                    </div>
                    <div>
                        <div className="dept-stat-value">{data.totalRouted}</div>
                        <div className="stat-card-label">Всего направлено</div>
                    </div>
                </Card>
                <Card className="stat-card">
                    <div className="stat-card-icon-wrap">
                        <img src="/icons/departments/first.png" className="stat-card-icon" alt="Первое" />
                    </div>
                    <div>
                        <div className="dept-stat-value">{formatDate(data.firstRoutedAt)}</div>
                        <div className="stat-card-label">Первое поступление</div>
                    </div>
                </Card>
                <Card className="stat-card">
                    <div className="stat-card-icon-wrap">
                        <img src="/icons/departments/last.png" className="stat-card-icon" alt="Последнее" />
                    </div>
                    <div className="stat-card-content">
                        <div className="dept-stat-value">{formatDate(data.lastRoutedAt)}</div>
                        <div className="stat-card-label">Последнее поступление</div>
                    </div>
                </Card>
            </div>

            {data.employees.length > 0 && (
                <Card className="dept-section-card">
                    <h3 className="dept-section-title">Сотрудники отдела</h3>
                    <div className="dept-employees-list">
                        {data.employees.map(emp => (
                            <div key={emp.id} className="dept-employee-item">
                                {emp.avatarUrl ? (
                                    <img
                                        src={getAvatarUrl(emp.avatarUrl)!}
                                        className="dept-employee-avatar"
                                        alt={emp.fullName}
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).style.display = 'none';
                                        }}
                                    />
                                ) : (
                                    <span className="dept-employee-avatar dept-employee-avatar--initials">
                                        {getInitials(emp.fullName)}
                                    </span>
                                )}
                                <div className="dept-employee-info">
                                    <span className="dept-employee-name">{emp.fullName}</span>
                                    <span className="dept-employee-email">{emp.email}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            <Card className="dept-chart-card">
                <div className="chart-card-header">
                    <h3 className="dept-section-title" style={{ marginBottom: 0 }}>Динамика поступлений</h3>
                </div>

                <div className="chart-period-selector">
                    <button
                        className={`chart-period-btn ${chartPeriod === 1 && !showCustomRange ? 'active' : ''}`}
                        onClick={() => handlePeriodChange(1)}
                    >
                        1 мес
                    </button>
                    <button
                        className={`chart-period-btn ${chartPeriod === 3 && !showCustomRange ? 'active' : ''}`}
                        onClick={() => handlePeriodChange(3)}
                    >
                        3 мес
                    </button>
                    <button
                        className={`chart-period-btn ${chartPeriod === 6 && !showCustomRange ? 'active' : ''}`}
                        onClick={() => handlePeriodChange(6)}
                    >
                        6 мес
                    </button>
                    <button
                        className={`chart-period-btn ${chartPeriod === 12 && !showCustomRange ? 'active' : ''}`}
                        onClick={() => handlePeriodChange(12)}
                    >
                        12 мес
                    </button>
                    <button
                        className={`chart-period-btn ${chartPeriod === 'all' && !showCustomRange ? 'active' : ''}`}
                        onClick={() => handlePeriodChange('all')}
                    >
                        Всё время
                    </button>
                    <button
                        className={`chart-period-btn ${showCustomRange ? 'active' : ''}`}
                        onClick={handleCustomRangeToggle}
                    >
                        Свой
                    </button>
                </div>

                {showCustomRange && (
                    <div className="chart-custom-range">
                        <label>С</label>
                        <input
                            type="month"
                            value={customFrom}
                            onChange={(e) => setCustomFrom(e.target.value)}
                        />
                        <label>По</label>
                        <input
                            type="month"
                            value={customTo}
                            onChange={(e) => setCustomTo(e.target.value)}
                        />
                    </div>
                )}

                {chartData.length > 0 ? (
                    <div className="dept-chart-container">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 20, left: 10 }}>
                                <defs>
                                    <linearGradient id="deptAreaGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#81D8D0" stopOpacity={0.4} />
                                        <stop offset="100%" stopColor="#81D8D0" stopOpacity={0.05} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="4" stroke={gridColor} />
                                <XAxis
                                    dataKey="month"
                                    tick={{ fontSize: 12, fill: textColor }}
                                    tickFormatter={(val: string) => {
                                        const [y, m] = val.split('-');
                                        const date = new Date(Number(y), Number(m) - 1);
                                        return date.toLocaleDateString('ru-RU', { month: 'short' });
                                    }}
                                    label={{ value: 'Месяц', position: 'insideBottom', offset: -5, style: { fill: textColor, fontSize: 12 } }}
                                />
                                <YAxis
                                    min={0}
                                    allowDecimals={false}
                                    tickCount={4}
                                    tick={{ fontSize: 12, fill: textColor }}
                                    label={{ value: 'Документов', angle: -90, position: 'insideLeft', offset: 10, style: { fill: textColor, fontSize: 12 } }}
                                />
                                <RechartsTooltip
                                    contentStyle={{
                                        border: 'none',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                                        fontSize: '12px',
                                        backgroundColor: tooltipBg,
                                    }}
                                    labelFormatter={(val: any) => {
                                        const str = String(val);
                                        const [y, m] = str.split('-');
                                        const date = new Date(Number(y), Number(m) - 1);
                                        return date.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
                                    }}
                                    formatter={(val: any) => [`${val} шт.`, 'Документов']}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="count"
                                    stroke="#81D8D0"
                                    strokeWidth={2.5}
                                    fill="url(#deptAreaGradient)"
                                    name="Документов"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="dept-detail-empty">Нет данных за выбранный период</div>
                )}
            </Card>

            <Card className="dept-section-card">
                <h3 className="dept-section-title">
                    Документы, направленные в отдел
                    {data.documents.total > 0 && (
                        <span className="dept-section-count">{data.documents.total}</span>
                    )}
                </h3>

                {data.documents.items.length > 0 ? (
                    <Table
                        title={<h4 className="table-title"></h4>}
                        rightTitle={data.documents.totalPages > 1 && (
                            <span className="UltimatePaginationWrapper">
                                <Pagination
                                    page={page}
                                    totalPages={data.documents.totalPages}
                                    onPageChange={(newPage) => setPage(newPage)}
                                />
                            </span>
                        )}
                    >
                        <thead>
                            <tr>
                                <th>Рег. номер</th>
                                <th>Название</th>
                                <th>Тип</th>
                                <th>Оператор</th>
                                <th>Причина</th>
                                <th>Дата направления</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.documents.items.map(doc => (
                                <tr key={doc.id} onClick={() => handleDocumentClick(doc.id)} className="dept-doc-row">
                                    <td>{doc.registrationNumber}</td>
                                    <td>{doc.title}</td>
                                    <td>{doc.documentType || '-'}</td>
                                    <td>
                                        <span className="dept-operator-name">
                                            {doc.operatorAvatarUrl ? (
                                                <img
                                                    src={getAvatarUrl(doc.operatorAvatarUrl)!}
                                                    className="dept-avatar"
                                                    alt={doc.operatorName}
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                />
                                            ) : (
                                                <span className="dept-avatar dept-avatar--initials">
                                                    {getInitials(doc.operatorName || '')}
                                                </span>
                                            )}
                                            {doc.operatorName || 'Неизвестно'}
                                        </span>
                                    </td>
                                    <td>{doc.routeReason || '-'}</td>
                                    <td>{formatDateTime(doc.routedAt)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                ) : (
                    <div className="dept-detail-empty">Нет документов, направленных в этот отдел</div>
                )}
            </Card>

            {showArchiveModal && (
                <div className="modal-overlay" onClick={() => setShowArchiveModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Архивировать отдел</h3>
                            <button className="modal-close" onClick={() => setShowArchiveModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p className="archive-modal-name">«{data.name}»</p>
                            <p className="archive-modal-description">
                                Отдел будет скрыт из общего списка подразделений.
                            </p>
                            <div className="archive-modal-info">
                                <div className="archive-modal-info-row">
                                    <span className="archive-modal-info-label">Документов в истории</span>
                                    <span className="archive-modal-info-value">{data.totalRouted}</span>
                                </div>
                            </div>
                            <p className="archive-modal-note">
                                История маршрутов сохранится. Отдел можно будет восстановить в любой момент.
                            </p>
                            {archiveError && (
                                <p className="archive-modal-error">{archiveError}</p>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="modal-btn-cancel" onClick={() => setShowArchiveModal(false)}>
                                Отмена
                            </button>
                            <button
                                className="modal-btn-confirm"
                                onClick={handleArchive}
                                disabled={archiving}
                            >
                                {archiving ? 'Архивация...' : 'Архивировать'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showRestoreModal && (
                <div className="modal-overlay" onClick={() => setShowRestoreModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Восстановить отдел</h3>
                            <button className="modal-close" onClick={() => setShowRestoreModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p className="archive-modal-name">«{data.name}»</p>
                            <p className="archive-modal-description">
                                Отдел снова появится в общем списке подразделений.
                            </p>
                            <div className="archive-modal-info">
                                <div className="archive-modal-info-row">
                                    <span className="archive-modal-info-label">Документов в истории</span>
                                    <span className="archive-modal-info-value">{data.totalRouted}</span>
                                </div>
                            </div>
                            <p className="archive-modal-note">
                                Все данные и история маршрутов сохранены.
                            </p>
                        </div>
                        <div className="modal-footer">
                            <button className="modal-btn-cancel" onClick={() => setShowRestoreModal(false)}>
                                Отмена
                            </button>
                            <button
                                className="modal-btn-confirm"
                                onClick={handleRestore}
                                disabled={restoring}
                            >
                                {restoring ? 'Восстановление...' : 'Восстановить'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DepartmentDetailPage;