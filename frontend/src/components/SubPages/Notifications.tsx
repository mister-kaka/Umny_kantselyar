import "../../styles/global.css";
import "../../styles/Notifications.css";
import "../../styles/DocumentsListPage.css";
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../Card";
import DropdownButton from "../DropdownButton";
import { DateFilterDropdown } from "../DropdownButton";
import Tooltip from "../Tooltip";
import {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
} from "../../services/api";
import type { AppNotification, UnreadCount } from "../../types";
import { toMoscowTime } from "../../utils/moscowTime";
import { useSettings } from "../../contexts/SettingsContext";
import { getThemedIcon } from "../../utils/getThemedIcon";

const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
    new_document: "Загружен",
    document_ready: "Документ обработан",
    extract_error: "Ошибка распознавания",
    pending_verification: "Требуется проверка",
    routed: "Маршрутизация",
    rejected: "Отклонён",
    verified: "Проверен",
    low_confidence: "Низкая уверенность",
    password_changed: "Пароль изменён",
    profile_updated: "Профиль обновлён",
    settings_changed: "Настройки изменены",
    new_login: "Новый вход",
    comment_added: "Комментарий",
    document_deleted: "Документ удалён",
    reference_created: "Справочник изменён",
    reference_deleted: "Справочник изменён",
};

const FILTER_TYPE_OPTIONS = [
    "Все",
    "Непрочитанные",
    "Документ обработан",
    "Ошибка распознавания",
    "Требуется проверка",
    "Маршрутизация",
    "Отклонён",
    "Проверен",
    "Низкая уверенность",
    "Пароль изменён",
    "Профиль обновлён",
    "Настройки изменены",
    "Новый вход",
    "Комментарий",
    "Документ удалён",
    "Справочник изменён",
];

const FILTER_TYPE_MAP: Record<string, string> = {
    "Все": "all",
    "Непрочитанные": "unread",
    "Документ обработан": "document_ready",
    "Ошибка распознавания": "extract_error",
    "Требуется проверка": "pending_verification",
    "Маршрутизация": "routed",
    "Отклонён": "rejected",
    "Проверен": "verified",
    "Низкая уверенность": "low_confidence",
    "Пароль изменён": "password_changed",
    "Профиль обновлён": "profile_updated",
    "Настройки изменены": "settings_changed",
    "Новый вход": "new_login",
    "Комментарий": "comment_added",
    "Документ удалён": "document_deleted",
    "Справочник изменён": "reference_created",
};

const REVERSE_FILTER_TYPE_MAP: Record<string, string> = Object.fromEntries(
    Object.entries(FILTER_TYPE_MAP).map(([k, v]) => [v, k])
);

const getTypeLabel = (type: string): string => {
    return NOTIFICATION_TYPE_LABELS[type] || type;
};

const formatTime = (timeString: string): string => {
    const date = toMoscowTime(timeString);
    const now = toMoscowTime(new Date().toISOString());
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Только что";
    if (diffMins < 60) return `${diffMins} мин назад`;
    if (diffHours < 24) return `${diffHours} ч назад`;
    if (diffDays < 7) return `${diffDays} д назад`;
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
};

const formatGroupDate = (timeString: string): string => {
    const date = toMoscowTime(timeString);
    const now = toMoscowTime(new Date().toISOString());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today.getTime() - 86400000);
    const weekAgo = new Date(today.getTime() - 7 * 86400000);

    if (date >= today) return "Сегодня";
    if (date >= yesterday) return "Вчера";
    if (date >= weekAgo) return "На этой неделе";
    return "Ранее";
};

const getDocTitle = (items: AppNotification[]): string => {
    for (const n of items) {
        const match = n.message?.match(/«(.+?)»/);
        if (match) return match[1];
    }
    return items[0]?.message?.split('\n')[0] || 'Документ';
};

const getTimelineEvents = (items: AppNotification[]): AppNotification[] => {
    return [...items].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
};

const POLLING_INTERVAL = 30000;

const Notifications = () => {
    const navigate = useNavigate();
    const { defaultPageLimit } = useSettings();

    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [stats, setStats] = useState<UnreadCount | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [expandedId, setExpandedId] = useState<number | null>(null);
    const [expandedDocId, setExpandedDocId] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [deleting, setDeleting] = useState(false);
    const [deletingRead, setDeletingRead] = useState(false);
    const [filterType, setFilterType] = useState<string>("all");
    const [dateFilter, setDateFilter] = useState<{ from: string | null; to: string | null }>({ from: null, to: null });
    const [dateFilterLabel, setDateFilterLabel] = useState<string>('Дата');
    const [isFirstLoad, setIsFirstLoad] = useState(true);
    const [groupMode, setGroupMode] = useState<'date' | 'document'>(() => {
        return (localStorage.getItem('notifications_group_mode') as 'date' | 'document') || 'date';
    });
    const [limit, setLimit] = useState(defaultPageLimit);

    const [themeKey, setThemeKey] = useState(0);
    
    useEffect(() => {
        const observer = new MutationObserver(() => setThemeKey(prev => prev + 1));
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);

    const [activeFilter, setActiveFilter] = useState<string | null>(null);
    const toggleFilter = (filterId: string) => {
        setActiveFilter(prev => (prev === filterId ? null : filterId));
    };

    const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const isFilterActive = filterType !== "all" || dateFilter.from !== null || dateFilter.to !== null;

    const fetchStats = async () => {
        try {
            const data = await getUnreadCount();
            setStats(data);
        } catch (err) {
            console.error("Ошибка загрузки статистики:", err);
        }
    };

    const fetchNotifications = async (pageNum: number = 1, append: boolean = false) => {
        try {
            if (pageNum === 1 && !append) {
                setLoading(true);
            } else {
                setLoadingMore(true);
            }
            setError(null);

            const filters: any = {};

            if (filterType === "unread") {
                filters.isRead = "false";
            } else if (filterType !== "all") {
                filters.type = filterType;
            }

            if (dateFilter.from) {
                filters.dateFrom = dateFilter.from;
            }
            if (dateFilter.to) {
                filters.dateTo = dateFilter.to;
            }

            const data = await getNotifications(pageNum, limit, filters);

            if (append) {
                setNotifications(prev => [...prev, ...data.items]);
            } else {
                setNotifications(data.items);
            }
            setPage(data.page);
            setTotalPages(data.totalPages);
        } catch (err) {
            console.error("Ошибка загрузки уведомлений:", err);
            setError("Не удалось загрузить уведомления");
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const fetchData = async () => {
        await Promise.all([fetchStats(), fetchNotifications(1)]);
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (isFirstLoad) {
            setIsFirstLoad(false);
            return;
        }
        setPage(1);
        setNotifications([]);
        fetchNotifications(1);
    }, [filterType, dateFilter, limit]);

    useEffect(() => {
        pollingRef.current = setInterval(() => {
            fetchStats();
        }, POLLING_INTERVAL);

        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
            }
        };
    }, []);

    const handleGroupModeChange = (mode: 'date' | 'document') => {
        setGroupMode(mode);
        localStorage.setItem('notifications_group_mode', mode);
        setExpandedId(null);
        setExpandedDocId(null);
    };

    const handleFilterChange = (label: string) => {
        const newFilter = FILTER_TYPE_MAP[label] || "all";
        setFilterType(newFilter);
        setSelectedIds(new Set());
        setExpandedId(null);
        setExpandedDocId(null);
    };

    const handleDateFilterChange = (range: { from: string | null; to: string | null }) => {
        setDateFilter(range);
        if (range.from && range.to) {
            const fromDate = new Date(range.from);
            const toDate = new Date(range.to);
            const diffDays = Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays === 0) {
                setDateFilterLabel('Сегодня');
            } else if (diffDays <= 7) {
                setDateFilterLabel('Последние 7 дней');
            } else {
                setDateFilterLabel('Диапазон');
            }
        } else if (!range.from && !range.to) {
            setDateFilterLabel('Дата');
        }
        setSelectedIds(new Set());
        setExpandedId(null);
        setExpandedDocId(null);
    };

    const handleNotificationClick = async (notif: AppNotification) => {
        if (expandedId === notif.id) {
            setExpandedId(null);
        } else {
            setExpandedId(notif.id);
            if (!notif.isRead) {
                setNotifications(prev =>
                    prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n)
                );
                setStats(prev => {
                    if (!prev) return prev;
                    const updated = { ...prev, total: Math.max(0, prev.total - 1) };
                    const typeMap: Record<string, keyof UnreadCount> = {
                        'new_document': 'newDocument',
                        'document_ready': 'documentReady',
                        'extract_error': 'extractError',
                        'pending_verification': 'pendingVerification',
                        'routed': 'routedToDepartment',
                        'rejected': 'rejected',
                        'verified': 'verified',
                        'low_confidence': 'lowConfidence',
                    };
                    const key = typeMap[notif.type];
                    if (key && typeof updated[key] === 'number') {
                        updated[key] = Math.max(0, (updated[key] as number) - 1);
                    }
                    return updated;
                });

                try {
                    await markAsRead(notif.id);
                } catch (err) {
                    console.error("Ошибка при отметке уведомления:", err);
                    setNotifications(prev =>
                        prev.map(n => n.id === notif.id ? { ...n, isRead: false } : n)
                    );
                    fetchStats();
                }
            }
        }
    };

    const handleDocGroupClick = (docKey: string) => {
        if (expandedDocId === docKey) {
            setExpandedDocId(null);
        } else {
            setExpandedDocId(docKey);
        }
    };

    const handleGoToDocument = (documentId: number, e: React.MouseEvent) => {
        e.stopPropagation();
        navigate(`/dashboard/documents/${documentId}`, { state: { from: 'notifications' } });
    };

    const handleMarkAllAsRead = async () => {
        if (!stats || stats.total === 0) return;

        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setStats(prev => prev ? {
            ...prev,
            total: 0,
            newDocument: 0,
            documentReady: 0,
            extractError: 0,
            pendingVerification: 0,
            routedToDepartment: 0,
            rejected: 0,
            verified: 0,
            lowConfidence: 0,
        } : prev);

        try {
            await markAllAsRead();
        } catch (err) {
            console.error("Ошибка при отметке всех уведомлений:", err);
            fetchStats();
            fetchNotifications(1);
        }
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
        if (notifications.length === 0) return;
        const allSelected = notifications.every(n => selectedIds.has(n.id));
        if (allSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(notifications.map(n => n.id)));
        }
    };

    const toggleSelectDocGroup = (items: AppNotification[]) => {
        const allSelected = items.every(n => selectedIds.has(n.id));
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (allSelected) {
                items.forEach(n => next.delete(n.id));
            } else {
                items.forEach(n => next.add(n.id));
            }
            return next;
        });
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0 || deleting) return;
        if (!window.confirm(`Удалить ${selectedIds.size} выбранных уведомлений?`)) return;

        setDeleting(true);
        let errorCount = 0;
        for (const id of selectedIds) {
            try {
                await deleteNotification(id);
            } catch {
                errorCount++;
            }
        }
        setDeleting(false);
        setSelectedIds(new Set());
        setExpandedId(null);
        setExpandedDocId(null);
        await Promise.all([fetchStats(), fetchNotifications(1)]);
    };

    const handleDeleteAllRead = async () => {
        const readCount = notifications.filter(n => n.isRead).length;
        if (readCount === 0) return;
        if (!window.confirm(`Удалить все прочитанные уведомления (${readCount} шт.)?`)) return;

        try {
            setDeletingRead(true);
            await deleteAllRead();
            setSelectedIds(new Set());
            setExpandedId(null);
            setExpandedDocId(null);
            await Promise.all([fetchStats(), fetchNotifications(1)]);
        } catch (err) {
            console.error("Ошибка при удалении прочитанных уведомлений:", err);
        } finally {
            setDeletingRead(false);
        }
    };

    const handleLoadMore = () => {
        if (page < totalPages) {
            fetchNotifications(page + 1, true);
        }
    };

    const groupedByDate = notifications.reduce<Record<string, AppNotification[]>>((groups, notif) => {
        const group = formatGroupDate(notif.createdAt);
        if (!groups[group]) groups[group] = [];
        groups[group].push(notif);
        return groups;
    }, {});

    const groupedByDocument = (() => {
        const groups: { key: string; label: string; items: AppNotification[] }[] = [];
        let currentKey = '';
        let currentLabel = '';
        let currentItems: AppNotification[] = [];
        let currentDocId: number | null = null;

        for (const notif of notifications) {
            if (notif.documentId) {
                if (currentDocId !== notif.documentId) {
                    if (currentItems.length > 0) {
                        groups.push({ key: currentKey, label: currentLabel, items: [...currentItems] });
                    }
                    currentKey = `doc_${notif.documentId}_${groups.length}`;
                    currentDocId = notif.documentId;
                    currentLabel = getDocTitle([notif]);
                    currentItems = [notif];
                } else {
                    currentItems.push(notif);
                }
            } else {
                if (currentDocId !== null) {
                    if (currentItems.length > 0) {
                        groups.push({ key: currentKey, label: currentLabel, items: [...currentItems] });
                    }
                    currentKey = `system_${groups.length}`;
                    currentDocId = null;
                    currentLabel = 'Системные';
                    currentItems = [notif];
                } else if (currentKey.startsWith('system')) {
                    currentItems.push(notif);
                } else {
                    if (currentItems.length > 0) {
                        groups.push({ key: currentKey, label: currentLabel, items: [...currentItems] });
                    }
                    currentKey = `system_${groups.length}`;
                    currentDocId = null;
                    currentLabel = 'Системные';
                    currentItems = [notif];
                }
            }
        }
        if (currentItems.length > 0) {
            groups.push({ key: currentKey, label: currentLabel, items: [...currentItems] });
        }
        return groups;
    })();

    const allFilteredSelected = notifications.length > 0 && notifications.every(n => selectedIds.has(n.id));
    const hasReadNotifications = notifications.some(n => n.isRead);
    const hasActiveFilters = filterType !== "all" || dateFilter.from !== null || dateFilter.to !== null;

    if (loading) {
        return (
            <div className="notifications-page">
                <div className="notifications-top-row">
                    <h2 className="page-title">Уведомления</h2>
                </div>
                <p className="page-subtitle">Системные уведомления</p>
                <div className="notifications-stats-cards-container">
                    {[1, 2, 3, 4].map(i => (
                        <Card key={i} className="notifications-stat-card skeleton-card">
                            <div className="skeleton-icon-stat" />
                            <div className="skeleton-text-stat" />
                        </Card>
                    ))}
                </div>
                <Card className="notifications-card">
                    <div className="notifications-filters-row">
                        <div className="skeleton-title" />
                    </div>
                    <div className="notifications-list">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="notification-item skeleton">
                                <div className="notification-icon-dot skeleton-icon-dot" />
                                <div className="notification-content">
                                    <div className="notification-title-text skeleton-text" />
                                    <div className="notification-message skeleton-text short" />
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="notifications-page">
                <div className="notifications-top-row">
                    <h2 className="page-title">Уведомления</h2>
                </div>
                <Card className="error-state-card">
                    <div className="error-state">
                        <p className="error-text">{error}</p>
                        <button className="apply-button" onClick={fetchData}>
                            Повторить
                        </button>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="notifications-page">
            <div className="notifications-top-row">
                <h2 className="page-title">Уведомления</h2>
                <div className="notifications-header-actions">
                    <Tooltip text="Перейти к настройкам уведомлений">
                        <button
                            className="mark-all-read-btn"
                            onClick={() => navigate('/dashboard/settings?tab=notifications')}
                        >
                            Настройки
                        </button>
                    </Tooltip>
                </div>
            </div>
            <p className="page-subtitle">Системные уведомления</p>

            <div className="notifications-stats-cards-container">
                <Card className="notifications-stat-card">
                    <img src="/icons/notifications/Unread.png" className="notifications-stat-card-icon" alt="Непрочитанные" />
                    <div className="notifications-stat-card-content">
                        <h1 className="notifications-stat-card-value">{stats?.total ?? 0}</h1>
                        <h5 className="notifications-stat-card-label text-secondary">Непрочитанные</h5>
                    </div>
                </Card>

                <Card className="notifications-stat-card">
                    <img src="/icons/notifications/pending.png" className="notifications-stat-card-icon" alt="Требуют проверки" />
                    <div className="notifications-stat-card-content">
                        <h1 className="notifications-stat-card-value">{stats?.pendingVerification ?? 0}</h1>
                        <h5 className="notifications-stat-card-label text-secondary">Требуют проверки</h5>
                    </div>
                </Card>

                <Card className="notifications-stat-card">
                    <img src="/icons/notifications/Low_confidence.png" className="notifications-stat-card-icon" alt="Низкая уверенность" />
                    <div className="notifications-stat-card-content">
                        <h1 className="notifications-stat-card-value">{stats?.lowConfidence ?? 0}</h1>
                        <h5 className="notifications-stat-card-label text-secondary">Низ. уверенность</h5>
                    </div>
                </Card>

                <Card className="notifications-stat-card">
                    <img src="/icons/notifications/eror.png" className="notifications-stat-card-icon" alt="Ошибки" />
                    <div className="notifications-stat-card-content">
                        <h1 className="notifications-stat-card-value">{stats?.extractError ?? 0}</h1>
                        <h5 className="notifications-stat-card-label text-secondary">Ошибки</h5>
                    </div>
                </Card>
            </div>

            <Card className="filtersButtsWrapper">
                <Tooltip text="Фильтр по типу уведомления">
                    <DropdownButton
                        options={FILTER_TYPE_OPTIONS}
                        selectedLabel={REVERSE_FILTER_TYPE_MAP[filterType] || "Все"}
                        onSelect={handleFilterChange}
                        icon={<img src={getThemedIcon("/icons/filters/Category.png")} key={themeKey} alt="Тип" />}
                        defaultLabel="Все"
                        isOpen={activeFilter === 'type'}
                        onToggle={() => toggleFilter('type')}/>
                </Tooltip>

                <Tooltip text="Фильтр по дате">
                    <DateFilterDropdown
                        onFilterChange={handleDateFilterChange}
                        icon={<img src={getThemedIcon("/icons/filters/data.png")} key={themeKey} alt="Дата" />}
                        isOpen={activeFilter === 'date'}
                        onToggle={() => toggleFilter('date')}
                        selectedLabel={dateFilterLabel}/>
                </Tooltip>

                <Tooltip text="Количество уведомлений на странице">
                    <DropdownButton
                        options={['5', '10', '20', '50']}
                        selectedLabel={String(limit)}
                        onSelect={(value) => {
                            const newLimit = parseInt(value, 10);
                            if (!isNaN(newLimit)) setLimit(newLimit);
                        }}
                        defaultLabel={String(defaultPageLimit)}
                        isOpen={activeFilter === 'limitSelector'}
                        onToggle={() => toggleFilter('limitSelector')}/>
                </Tooltip>

                <Tooltip text="Сбросить все фильтры">
                    <button
                        className={`removeFiltersButt ${!hasActiveFilters ? 'disabled' : ''}`}
                        disabled={!hasActiveFilters}
                        onClick={() => {
                            if (!hasActiveFilters) return;
                            setFilterType("all");
                            setDateFilter({ from: null, to: null });
                            setDateFilterLabel('Дата');
                        }}>
                        Сбросить фильтры
                    </button>
                </Tooltip>

                <div className="notifications-group-row-inline">
                    <span className="notifications-group-label-text">Группировка:</span>
                    <Tooltip text="Группировать по датам">
                        <button
                            className={`notifications-group-btn ${groupMode === 'date' ? 'active' : ''}`}
                            onClick={() => handleGroupModeChange('date')}
                        >
                            По датам
                        </button>
                    </Tooltip>
                    <Tooltip text="Группировать по документам">
                        <button
                            className={`notifications-group-btn ${groupMode === 'document' ? 'active' : ''}`}
                            onClick={() => handleGroupModeChange('document')}
                        >
                            По документам
                        </button>
                    </Tooltip>
                </div>
            </Card>
            
            <Card className="cuttinPaddin">
                <div className={`notifications-actions-bar ${selectedIds.size > 0 ? 'selection-mode' : ''}`}>
                    {selectedIds.size === 0 ? (
                        <>
                            <Tooltip text="Отметить все уведомления как прочитанные">
                                <button
                                    className="mark-all-read-btn"
                                    onClick={handleMarkAllAsRead}
                                    disabled={!stats || stats.total === 0}
                                >
                                    Прочитать все
                                </button>
                            </Tooltip>
                            {hasReadNotifications && (
                                <Tooltip text="Удалить все прочитанные уведомления">
                                    <button
                                        className="delete-read-btn"
                                        onClick={handleDeleteAllRead}
                                        disabled={deletingRead}
                                    >
                                        {deletingRead ? "Удаление..." : "Удалить прочитанные"}
                                    </button>
                                </Tooltip>
                            )}
                        </>
                    ) : (
                        <>
                            <div className="selection-controls">
                                <label className="file-queue-checkbox">
                                    <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAll} />
                                    <span className="file-queue-checkmark" />
                                </label>
                                <span className="selected-count">
                                    Выбрано <strong>{selectedIds.size}</strong>
                                </span>
                            </div>

                            <Tooltip text="Удалить выбранные уведомления">
                                <button
                                    className="mass-delete-btn"
                                    onClick={handleDeleteSelected}
                                    disabled={deleting}
                                >
                                    {deleting ? "Удаление..." : `Удалить (${selectedIds.size})`}
                                </button>
                            </Tooltip>
                        </>
                    )}
                </div>

                {notifications.length === 0 ? (
                    <div className="empty-state">
                        <p className="empty-text">
                            {filterType === "unread" ? "Нет непрочитанных уведомлений" : "Нет уведомлений"}
                        </p>
                    </div>
                ) : groupMode === 'date' ? (
                    <>
                        {Object.entries(groupedByDate).map(([group, items]) => (
                            <div key={group} className="notifications-group">
                                <div className="notifications-group-label">{group}</div>
                                <div className="notifications-list">
                                    {items.map(notif => (
                                        <div
                                            key={notif.id}
                                            className={`notification-item ${!notif.isRead ? "unread" : ""} ${notif.type === "extract_error" && !notif.isRead ? "extract_error" : ""} ${expandedId === notif.id ? "expanded" : ""}`}
                                            onClick={() => handleNotificationClick(notif)}
                                            role="button"
                                            tabIndex={0}
                                            onKeyDown={(e) => e.key === "Enter" && handleNotificationClick(notif)}
                                        >
                                            <div className="notification-checkbox" onClick={(e) => e.stopPropagation()}>
                                                <label className="file-queue-checkbox">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.has(notif.id)}
                                                        onChange={() => toggleSelect(notif.id)}
                                                    />
                                                    <span className="file-queue-checkmark" />
                                                </label>
                                            </div>
                                            <div className="notification-content">
                                                <div className="notification-title-row">
                                                    <span className="notification-type-badge">
                                                        {getTypeLabel(notif.type)}
                                                    </span>
                                                    <span className="notification-time">{formatTime(notif.createdAt)}</span>
                                                    {notif.documentId && (
                                                        <button
                                                            className="notification-doc-btn notification-doc-btn-inline"
                                                            onClick={(e) => handleGoToDocument(notif.documentId!, e)}
                                                        >
                                                            К документу
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="notification-message">
                                                    {expandedId === notif.id
                                                        ? notif.message
                                                        : notif.message?.split('\n')[0]
                                                    }
                                                </div>
                                            </div>
                                            {!notif.isRead && <div className="unread-dot" />}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </>
                ) : (
                    <>
                        {groupedByDocument.map((group) => {
                            const isDocGroup = group.key.startsWith('doc_');
                            const hasUnread = group.items.some(n => !n.isRead);
                            const timeline = getTimelineEvents(group.items);

                            if (isDocGroup) {
                                return (
                                    <div key={group.key} className="notifications-group">
                                        <div className="notifications-group-label">{group.label}</div>
                                        <div className="notifications-list">
                                            {isFilterActive && group.items.length === 1 ? (
                                                <div
                                                    className={`notification-item ${!group.items[0].isRead ? "unread" : ""} ${group.items[0].type === "extract_error" && !group.items[0].isRead ? "extract_error" : ""} ${expandedId === group.items[0].id ? "expanded" : ""}`}
                                                    onClick={() => handleNotificationClick(group.items[0])}
                                                    role="button"
                                                    tabIndex={0}
                                                    onKeyDown={(e) => e.key === "Enter" && handleNotificationClick(group.items[0])}
                                                >
                                                    <div className="notification-checkbox" onClick={(e) => e.stopPropagation()}>
                                                        <label className="file-queue-checkbox">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedIds.has(group.items[0].id)}
                                                                onChange={() => toggleSelect(group.items[0].id)}
                                                            />
                                                            <span className="file-queue-checkmark" />
                                                        </label>
                                                    </div>
                                                    <div className="notification-content">
                                                        <div className="notification-title-row">
                                                            <span className="notification-type-badge">
                                                                {getTypeLabel(group.items[0].type)}
                                                            </span>
                                                            <span className="notification-time">{formatTime(group.items[0].createdAt)}</span>
                                                            <button
                                                                className="notification-doc-btn notification-doc-btn-inline"
                                                                onClick={(e) => handleGoToDocument(group.items[0]!.documentId!, e)}
                                                            >
                                                                К документу
                                                            </button>
                                                        </div>
                                                        <div className="notification-message">
                                                            {expandedId === group.items[0].id
                                                                ? group.items[0].message
                                                                : group.items[0].message?.split('\n')[0]
                                                            }
                                                        </div>
                                                    </div>
                                                    {!group.items[0].isRead && <div className="unread-dot" />}
                                                </div>
                                            ) : (
                                                <div
                                                    className={`notification-item notification-doc-group ${hasUnread ? "unread" : ""} ${expandedDocId === group.key ? "expanded" : ""}`}
                                                    onClick={() => handleDocGroupClick(group.key)}
                                                    role="button"
                                                    tabIndex={0}
                                                    onKeyDown={(e) => e.key === "Enter" && handleDocGroupClick(group.key)}
                                                >
                                                    <div className="notification-checkbox" onClick={(e) => e.stopPropagation()}>
                                                        <label className="file-queue-checkbox">
                                                            <input
                                                                type="checkbox"
                                                                checked={group.items.every(n => selectedIds.has(n.id))}
                                                                onChange={() => toggleSelectDocGroup(group.items)}
                                                            />
                                                            <span className="file-queue-checkmark" />
                                                        </label>
                                                    </div>
                                                    <div className="notification-content">
                                                        <div className="notification-title-row">
                                                            <span className="notification-type-badge">
                                                                {group.items.length} {group.items.length === 1 ? 'событие' : group.items.length < 5 ? 'события' : 'событий'}
                                                            </span>
                                                            <span className="notification-time">{formatTime(group.items[group.items.length - 1]?.createdAt)}</span>
                                                            <button
                                                                className="notification-doc-btn notification-doc-btn-inline"
                                                                onClick={(e) => handleGoToDocument(group.items[0]!.documentId!, e)}
                                                            >
                                                                К документу
                                                            </button>
                                                        </div>
                                                        {expandedDocId === group.key ? (
                                                            <div className="notification-timeline">
                                                                {timeline.map(event => (
                                                                    <div key={event.id} className="timeline-event">
                                                                        <span className="timeline-event-time">{formatTime(event.createdAt)}</span>
                                                                        <span className="timeline-event-text">{getTypeLabel(event.type)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        ) : (
                                                            <div className="notification-message">
                                                                {timeline.map(e => getTypeLabel(e.type)).join(' → ')}
                                                            </div>
                                                        )}
                                                    </div>
                                                    {hasUnread && <div className="unread-dot" />}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            } else {
                                return (
                                    <div key={group.key} className="notifications-group">
                                        <div className="notifications-group-label">{group.label}</div>
                                        <div className="notifications-list">
                                            {group.items.map(notif => (
                                                <div
                                                    key={notif.id}
                                                    className={`notification-item ${!notif.isRead ? "unread" : ""} ${notif.type === "extract_error" && !notif.isRead ? "extract_error" : ""} ${expandedId === notif.id ? "expanded" : ""}`}
                                                    onClick={() => handleNotificationClick(notif)}
                                                    role="button"
                                                    tabIndex={0}
                                                    onKeyDown={(e) => e.key === "Enter" && handleNotificationClick(notif)}
                                                >
                                                    <div className="notification-checkbox" onClick={(e) => e.stopPropagation()}>
                                                        <label className="file-queue-checkbox">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedIds.has(notif.id)}
                                                                onChange={() => toggleSelect(notif.id)}
                                                            />
                                                            <span className="file-queue-checkmark" />
                                                        </label>
                                                    </div>
                                                    <div className="notification-content">
                                                        <div className="notification-title-row">
                                                            <span className="notification-type-badge">
                                                                {getTypeLabel(notif.type)}
                                                            </span>
                                                            <span className="notification-time">{formatTime(notif.createdAt)}</span>
                                                        </div>
                                                        <div className="notification-message">
                                                            {expandedId === notif.id
                                                                ? notif.message
                                                                : notif.message?.split('\n')[0]
                                                            }
                                                        </div>
                                                    </div>
                                                    {!notif.isRead && <div className="unread-dot" />}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            }
                        })}
                    </>
                )}

                {page < totalPages && (
                    <div className="notifications-load-more">
                        <button
                            className="upload-btn-secondary"
                            onClick={handleLoadMore}
                            disabled={loadingMore}
                        >
                            {loadingMore ? "Загрузка..." : "Загрузить ещё"}
                        </button>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default Notifications;