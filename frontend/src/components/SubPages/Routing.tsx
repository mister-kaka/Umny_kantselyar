import "../../styles/global.css";
import "../../styles/Dashboard.css";
import "../../styles/DocumentsListPage.css";
import "../../styles/Routing.css";

import React, { useEffect, useState } from "react";
import Card from "../Card";
import DropdownButton from "../DropdownButton";
import Pagination from "../Pagination";
import Tooltip from "../Tooltip";
import Table from "../Table";

import {
    RoutingDocumentItem,
    RoutingStats,
    Department
} from "../../types";

import {
    getRoutingDocumentsNew,
    getDepartments
} from "../../services/api";

import { useNavigate } from "react-router-dom";
import { translateStatus, getStatusColorClass } from "../../constants/statuses";
import { formatMoscowDate } from "../../utils/moscowTime";
import { useSettings } from "../../contexts/SettingsContext";

const Routing = () => {
    const navigate = useNavigate();
    const { defaultPageLimit } = useSettings();

    const [items, setItems] = useState<RoutingDocumentItem[]>([]);
    const [stats, setStats] = useState<RoutingStats | null>(null);
    const [operators, setOperators] = useState<{ id: number; fullName: string }[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);
    const [limit, setLimit] = useState(defaultPageLimit);

    const [filterType, setFilterType] = useState<"all" | "matched" | "mismatched">("all");
    const [departmentId, setDepartmentId] = useState<number | undefined>(undefined);
    const [operatorId, setOperatorId] = useState<number | undefined>(undefined);

    const [activeFilter, setActiveFilter] = useState<string | null>(null);
    const toggleFilter = (filterId: string) => {
        setActiveFilter(prev => (prev === filterId ? null : filterId));
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            setError("");

            const [routingRes, depsRes] = await Promise.all([
                getRoutingDocumentsNew({
                    departmentId,
                    operatorId,
                    filter: filterType,
                    page,
                    limit,
                }),
                getDepartments(),
            ]);

            setItems(routingRes.items);
            setStats(routingRes.stats);
            setOperators(routingRes.operators);
            setTotalPages(routingRes.totalPages);
            setTotalItems(routingRes.totalItems);
            setDepartments(depsRes);
        } catch (err) {
            console.error(err);
            setError("Ошибка загрузки маршрутизации");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setPage(1);
    }, [filterType, departmentId, operatorId, limit]);

    useEffect(() => {
        fetchData();
    }, [page, filterType, departmentId, operatorId, limit]);

    const filterLabels: Record<string, string> = {
        all: "Все",
        matched: "Совпадения",
        mismatched: "Расхождения",
    };

    const departmentOptions = ["Все отделы", ...departments.map(d => d.name)];
    const operatorOptions = ["Все операторы", ...operators.map(o => o.fullName)];

    const selectedDepartmentLabel = departmentId
        ? departments.find(d => d.id === departmentId)?.name || "Все отделы"
        : "Все отделы";

    const selectedOperatorLabel = operatorId
        ? operators.find(o => o.id === operatorId)?.fullName || "Все операторы"
        : "Все операторы";

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

    const getShortName = (name: string): string => {
        if (!name) return 'Неизвестно';
        const parts = name.trim().split(/\s+/);
        if (parts.length < 2) return parts[0];
        return `${parts[0]} ${parts[1].charAt(0)}.${parts.length > 2 ? parts[2].charAt(0) + '.' : ''}`;
    };

    const handleRowClick = (id: number) => {
        navigate(`/dashboard/documents/${id}`, { state: { from: 'routing' } });
    };

    const handleDepartmentClick = (e: React.MouseEvent, departmentName: string) => {
        e.stopPropagation();
        const dept = departments.find(d => d.name === departmentName);
        if (dept) {
            navigate(`/dashboard/departments/${dept.id}`, { state: { from: 'routing' } });
        }
    };

    const formatDate = (dateString: string) => formatMoscowDate(dateString);

    const hasActiveFilters = filterType !== "all" || departmentId || operatorId;

    const isMatched = (item: RoutingDocumentItem) => item.currentDepartment === item.suggestedDepartment;

    if (loading) {
        return (
            <div className="routing-page">
                <h2 className="page-title">Контроль маршрутизации</h2>
                <p className="page-subtitle">Сравнение рекомендаций AI с решениями операторов</p>
                <div className="routing-stats">
                    {[1, 2, 3].map(i => (
                        <Card key={i}>
                            <div className="routing-stat-icon-wrap">
                                <div className="skeleton-icon-stat" />
                            </div>
                            <div className="routing-stat-content">
                                <div className="skeleton-text-stat" />
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="routing-page">
                <div className="routing-error">
                    <p>{error}</p>
                    <button className="apply-button" onClick={fetchData}>Повторить</button>
                </div>
            </div>
        );
    }

    return (
        <div className="routing-page">
            <h2 className="page-title">Контроль маршрутизации</h2>
            <p className="page-subtitle">Сравнение рекомендаций AI с решениями операторов</p>

            {stats && (
                <div className="routing-stats">
                    <Card>
                        <div className="routing-stat-icon-wrap">
                            <img src="/icons/routing/total.png" className="routing-stat-icon" alt="Всего" />
                        </div>
                        <div className="routing-stat-content">
                            <div className="routing-stat-value">{stats.total}</div>
                            <div className="routing-stat-label">Всего направлено</div>
                        </div>
                    </Card>
                    <Card>
                        <div className="routing-stat-icon-wrap">
                            <img src="/icons/routing/matched.png" className="routing-stat-icon" alt="Совпадения" />
                        </div>
                        <div className="routing-stat-content">
                            <div className="routing-stat-value">{stats.matched}</div>
                            <div className="routing-stat-label">Совпадает с AI</div>
                        </div>
                    </Card>
                    <Card>
                        <div className="routing-stat-icon-wrap">
                            <img src="/icons/routing/mismatched.png" className="routing-stat-icon" alt="Расхождения" />
                        </div>
                        <div className="routing-stat-content">
                            <div className="routing-stat-value">{stats.mismatched}</div>
                            <div className="routing-stat-label">Расходится с AI</div>
                        </div>
                    </Card>
                </div>
            )}

            <Card className="filtersButtsWrapper">
                <Tooltip text="Фильтр по типу совпадения">
                    <DropdownButton
                        options={["Все", "Совпадения", "Расхождения"]}
                        selectedLabel={filterLabels[filterType]}
                        onSelect={(label) => {
                            const map: Record<string, "all" | "matched" | "mismatched"> = {
                                "Все": "all",
                                "Совпадения": "matched",
                                "Расхождения": "mismatched",
                            };
                            setFilterType(map[label] || "all");
                        }}
                        icon={<img src="/icons/filters/Status.png" alt="Тип" />}
                        defaultLabel="Все"
                        isOpen={activeFilter === 'type'}
                        onToggle={() => toggleFilter('type')}/>
                </Tooltip>

                <Tooltip text="Фильтр по отделу">
                    <DropdownButton
                        options={departmentOptions}
                        selectedLabel={selectedDepartmentLabel}
                        onSelect={(name) => {
                            if (name === "Все отделы") {
                                setDepartmentId(undefined);
                            } else {
                                const dep = departments.find(d => d.name === name);
                                setDepartmentId(dep?.id);
                            }
                        }}
                        icon={<img src="/icons/filters/Document_type.png" alt="Отдел" />}
                        defaultLabel="Все отделы"
                        isOpen={activeFilter === 'department'}
                        onToggle={() => toggleFilter('department')}/>
                </Tooltip>

                <Tooltip text="Фильтр по оператору">
                    <DropdownButton
                        options={operatorOptions}
                        selectedLabel={selectedOperatorLabel}
                        onSelect={(name) => {
                            if (name === "Все операторы") {
                                setOperatorId(undefined);
                            } else {
                                const op = operators.find(o => o.fullName === name);
                                setOperatorId(op?.id);
                            }
                        }}
                        icon={<img src="/icons/filters/Category.png" alt="Оператор" />}
                        defaultLabel="Все операторы"
                        isOpen={activeFilter === 'operator'}
                        onToggle={() => toggleFilter('operator')}/>
                </Tooltip>

                <Tooltip text="Количество документов на странице">
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
                            setFilterType("all");
                            setDepartmentId(undefined);
                            setOperatorId(undefined);
                            setPage(1);
                        }}>
                        Сбросить фильтры
                    </button>
                </Tooltip>
            </Card>

            <Card className="cuttinPaddin">
                {items.length === 0 ? (
                    <div className="routing-empty">Нет документов</div>
                ) : (
                    <Table
                        title={<h4 className="table-title">Документы в маршрутизации ({totalItems})</h4>}
                        rightTitle={totalPages > 1 && (
                            <span className="UltimatePaginationWrapper">
                                <Pagination
                                    page={page}
                                    totalPages={totalPages}
                                    onPageChange={(newPage) => setPage(newPage)}
                                />
                            </span>
                        )}
                    >
                        <thead>
                            <tr>
                                <th>Рег. номер</th>
                                <th>Название</th>
                                <th>Дата</th>
                                <th>Рекомендован (AI)</th>
                                <th>Направлен</th>
                                <th>Статус</th>
                                <th>Оператор</th>
                                <th>Комментарий</th>
                            </tr>
                        </thead>
                        <tbody>
                            {items.map(item => (
                                <tr
                                    key={item.id}
                                    onClick={() => handleRowClick(item.id)}
                                    className={`routing-row ${isMatched(item) ? 'routing-row--matched' : 'routing-row--mismatched'}`}
                                >
                                    <td className="routing-cell-reg">{item.registrationNumber}</td>
                                    <td className="routing-cell-title">{item.title}</td>
                                    <td className="routing-cell-date">{formatDate(item.routedAt)}</td>
                                    <td>{item.suggestedDepartment || '—'}</td>
                                    <td>
                                        <span
                                            className="routing-department-cell"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {item.currentDepartment}
                                            <Tooltip text="Перейти в отдел">
                                                <button
                                                    className="routing-table-dept-link"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDepartmentClick(e, item.currentDepartment);
                                                    }}
                                                >
                                                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                                        <path d="M5 2v3H2v5h5V7h3V2H5z" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                </button>
                                            </Tooltip>
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${getStatusColorClass(item.routeStatus)}`}>
                                            {translateStatus(item.routeStatus)}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="routing-operator-name">
                                            {item.operatorAvatarUrl ? (
                                                <img
                                                    src={getAvatarUrl(item.operatorAvatarUrl)!}
                                                    className="routing-avatar"
                                                    alt={item.operatorName}
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                />
                                            ) : (
                                                <span className="routing-avatar routing-avatar--initials">
                                                    {getInitials(item.operatorName)}
                                                </span>
                                            )}
                                            {getShortName(item.operatorName)}
                                        </span>
                                    </td>
                                    <td>
                                        {item.routeReason ? (
                                            <Tooltip text={item.routeReason}>
                                                <span className="routing-reason-text">Комментарий</span>
                                            </Tooltip>
                                        ) : (
                                            <span className="routing-reason-empty">—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                )}
            </Card>
        </div>
    );
};

export default Routing;