import "../../styles/global.css";
import "../../styles/Dashboard.css";
import "../../styles/Departments.css";

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../Card";
import Tooltip from "../Tooltip";
import { getDepartmentStats, createDepartment, deleteDepartment, restoreDepartment } from "../../services/api";
import { DepartmentStats } from "../../types";
import { formatMoscowDate } from "../../utils/moscowTime";

const Departments = () => {
    const navigate = useNavigate();

    const [departments, setDepartments] = useState<DepartmentStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [sortBy, setSortBy] = useState<"name" | "count">("count");
    const [showArchived, setShowArchived] = useState(false);

    const [showAddModal, setShowAddModal] = useState(false);
    const [newDepartmentName, setNewDepartmentName] = useState("");
    const [adding, setAdding] = useState(false);
    const [addError, setAddError] = useState("");

    const [showArchiveModal, setShowArchiveModal] = useState(false);
    const [archivingDept, setArchivingDept] = useState<DepartmentStats | null>(null);
    const [archiving, setArchiving] = useState(false);
    const [archiveError, setArchiveError] = useState("");

    const [showRestoreModal, setShowRestoreModal] = useState(false);
    const [restoringDept, setRestoringDept] = useState<DepartmentStats | null>(null);
    const [restoring, setRestoring] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError("");
            const data = await getDepartmentStats(showArchived);
            setDepartments(data);
        } catch (err) {
            console.error(err);
            setError("Ошибка загрузки подразделений");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [showArchived]);

    const sortedDepartments = [...departments].sort((a, b) => {
        if (sortBy === "name") {
            return a.name.localeCompare(b.name, 'ru');
        }
        return b.routedCount - a.routedCount;
    });

    const totalDocs = departments.reduce((sum, d) => sum + d.routedCount, 0);

    const getLoadClass = (count: number) => {
        if (count <= 25) return "department-load-fill--low";
        if (count <= 50) return "department-load-fill--medium";
        return "department-load-fill--high";
    };

    const getDocWord = (count: number): string => {
        if (count === 1) return 'документ';
        if (count < 5) return 'документа';
        return 'документов';
    };

    const getLoadTooltip = (count: number) => {
        if (count === 0) return "Нет направленных документов";
        if (count <= 25) return `Низкая загруженность. ${count} ${getDocWord(count)} направлено в этот отдел`;
        if (count <= 50) return `Средняя загруженность. ${count} ${getDocWord(count)} направлено в этот отдел`;
        return `Высокая загруженность. ${count} ${getDocWord(count)} направлено в этот отдел`;
    };

    const formatDate = (dateString: string | null) => formatMoscowDate(dateString);

    const handleCardClick = (id: number) => {
        navigate(`/dashboard/departments/${id}`);
    };

    const handleAddDepartment = async () => {
        if (!newDepartmentName.trim()) {
            setAddError("Введите название отдела");
            return;
        }

        try {
            setAdding(true);
            setAddError("");
            await createDepartment(newDepartmentName.trim());
            setNewDepartmentName("");
            setShowAddModal(false);
            await fetchData();
        } catch (err: any) {
            const message = err?.response?.data?.message || "Ошибка при создании отдела";
            setAddError(message);
        } finally {
            setAdding(false);
        }
    };

    const handleArchiveClick = (e: React.MouseEvent, dept: DepartmentStats) => {
        e.stopPropagation();
        setArchivingDept(dept);
        setArchiveError("");
        setShowArchiveModal(true);
    };

    const handleArchiveConfirm = async () => {
        if (!archivingDept) return;

        try {
            setArchiving(true);
            setArchiveError("");
            await deleteDepartment(archivingDept.id);
            setShowArchiveModal(false);
            setArchivingDept(null);
            await fetchData();
        } catch (err: any) {
            const message = err?.response?.data?.message || "Ошибка при архивации отдела";
            setArchiveError(message);
        } finally {
            setArchiving(false);
        }
    };

    const handleRestoreClick = (e: React.MouseEvent, dept: DepartmentStats) => {
        e.stopPropagation();
        setRestoringDept(dept);
        setShowRestoreModal(true);
    };

    const handleRestoreConfirm = async () => {
        if (!restoringDept) return;

        try {
            setRestoring(true);
            await restoreDepartment(restoringDept.id);
            setShowRestoreModal(false);
            setRestoringDept(null);
            await fetchData();
        } catch (err: any) {
            console.error(err);
        } finally {
            setRestoring(false);
        }
    };

    if (loading) {
        return (
            <div className="departments-page">
                <div className="departments-header">
                    <div>
                        <h2 className="departments-title">Подразделения</h2>
                        <span className="departments-count">0 отделов</span>
                    </div>
                </div>
                <div className="departments-skeleton">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <Card key={i}>
                            <div className="skeleton-icon"></div>
                            <div className="skeleton-line skeleton-line--name"></div>
                            <div className="skeleton-line skeleton-line--count"></div>
                            <div className="skeleton-line skeleton-line--bar"></div>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="departments-page">
                <div className="departments-error">
                    <p>{error}</p>
                    <button className="apply-button" onClick={fetchData}>Повторить</button>
                </div>
            </div>
        );
    }

    return (
        <div className="departments-page">
            <div className="departments-header">
                <div>
                    <h2 className="departments-title">
                        {showArchived ? 'Архивные подразделения' : 'Подразделения'}
                    </h2>
                    <span className="departments-count">
                        {departments.length} {departments.length === 1 ? 'отдел' : departments.length < 5 ? 'отдела' : 'отделов'}
                    </span>
                </div>
                {!showArchived && (
                    <button className="departments-add-btn" onClick={() => setShowAddModal(true)}>
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M7 3v8M3 7h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        Добавить отдел
                    </button>
                )}
            </div>

            <div className="departments-filter-row">
                <span className="departments-sort-label">Отделы:</span>
                <Tooltip text="Показать активные подразделения">
                    <button
                        className={`departments-filter-btn ${!showArchived ? "active" : ""}`}
                        onClick={() => setShowArchived(false)}
                    >
                        Активные
                    </button>
                </Tooltip>
                <Tooltip text="Показать архивные подразделения">
                    <button
                        className={`departments-filter-btn ${showArchived ? "active" : ""}`}
                        onClick={() => setShowArchived(true)}
                    >
                        Архивные
                    </button>
                </Tooltip>
            </div>

            <div className="departments-sort">
                <span className="departments-sort-label">Сортировка:</span>
                <Tooltip text="Сортировать по количеству направленных документов">
                    <button
                        className={`departments-sort-btn ${sortBy === "count" ? "active" : ""}`}
                        onClick={() => setSortBy("count")}
                    >
                        По загруженности
                    </button>
                </Tooltip>
                <Tooltip text="Сортировать по алфавиту">
                    <button
                        className={`departments-sort-btn ${sortBy === "name" ? "active" : ""}`}
                        onClick={() => setSortBy("name")}
                    >
                        По названию
                    </button>
                </Tooltip>
            </div>

            {departments.length > 0 ? (
                <div className="departments-grid">
                    {sortedDepartments.map(dept => (
                        <Card
                            key={dept.id}
                            onClick={() => handleCardClick(dept.id)}
                        >
                            <div className="department-card-icon">
                                <img
                                    src={`/icons/departments/${dept.code}.png`}
                                    alt={dept.name}
                                    className="department-card-icon-img"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                        const parent = target.parentElement;
                                        if (parent) {
                                            parent.innerHTML = `<span class="department-card-icon-fallback">${dept.name.charAt(0)}</span>`;
                                        }
                                    }}
                                />
                            </div>

                            <h3 className="department-card-name">{dept.name}</h3>

                            <div className="department-card-stats">
                                <span className="department-card-stats-value">{dept.routedCount}</span>
                                <span className="department-card-stats-label">
                                    {dept.routedCount === 1 ? 'документ' : dept.routedCount < 5 ? 'документа' : 'документов'}
                                </span>
                            </div>

                            {!showArchived && (
                                <div 
                                    className="department-card-load tooltip-wrapper tooltip-bottom"
                                    data-tooltip={getLoadTooltip(dept.routedCount)}
                                >
                                    <div className="department-load-bar">
                                        <div
                                            className={`department-load-fill ${getLoadClass(dept.routedCount)}`}
                                            style={{ width: `${Math.min((dept.routedCount / 75) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {dept.lastRoutedTitle && (
                                <div className="department-card-last">
                                    <span className="department-card-last-label">Последний:</span>
                                    <span className="department-card-last-title">{dept.lastRoutedTitle}</span>
                                    <span className="department-card-last-date">{formatDate(dept.lastRoutedAt)}</span>
                                </div>
                            )}

                            <div className="department-card-footer">
                                {showArchived ? (
                                    <Tooltip text="Восстановить отдел из архива">
                                        <button
                                            className="department-card-restore-btn"
                                            onClick={(e) => handleRestoreClick(e, dept)}
                                        >
                                            Восстановить
                                        </button>
                                    </Tooltip>
                                ) : (
                                    <Tooltip text="Архивировать отдел">
                                        <button
                                            className="department-card-archive-btn"
                                            onClick={(e) => handleArchiveClick(e, dept)}
                                        >
                                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                                <path d="M2 4h10M5 4V2h4v2M4 4v8h6V4M5.5 6.5v3M8.5 6.5v3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        </button>
                                    </Tooltip>
                                )}
                                <div className="department-card-action">
                                    <span className="department-card-action-text">Подробнее</span>
                                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                        <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="departments-empty">
                    <p className="departments-empty-text">
                        {showArchived ? 'Нет архивных подразделений' : 'Нет подразделений'}
                    </p>
                    {showArchived && (
                        <button className="departments-sort-btn" onClick={() => setShowArchived(false)}>
                            К активным подразделениям
                        </button>
                    )}
                </div>
            )}

            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Добавить отдел</h3>
                            <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <label className="modal-label">Название отдела</label>
                            <input
                                type="text"
                                className="profile-input"
                                value={newDepartmentName}
                                onChange={(e) => {
                                    setNewDepartmentName(e.target.value);
                                    setAddError("");
                                }}
                                placeholder="например, Транспортный отдел"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !adding) {
                                        handleAddDepartment();
                                    }
                                }}
                            />
                            {addError && (
                                <p style={{ color: 'var(--color-status-rejected)', fontSize: '13px', marginTop: '8px' }}>
                                    {addError}
                                </p>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="modal-btn-cancel" onClick={() => setShowAddModal(false)}>
                                Отмена
                            </button>
                            <button
                                className="modal-btn-confirm"
                                onClick={handleAddDepartment}
                                disabled={adding || !newDepartmentName.trim()}
                            >
                                {adding ? 'Добавление...' : 'Добавить'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showArchiveModal && archivingDept && (
                <div className="modal-overlay" onClick={() => setShowArchiveModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Архивировать отдел</h3>
                            <button className="modal-close" onClick={() => setShowArchiveModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p className="archive-modal-name">«{archivingDept.name}»</p>
                            <p className="archive-modal-description">
                                Отдел будет скрыт из общего списка подразделений.
                            </p>
                            <div className="archive-modal-info">
                                <div className="archive-modal-info-row">
                                    <span className="archive-modal-info-label">Документов в истории</span>
                                    <span className="archive-modal-info-value">{archivingDept.routedCount}</span>
                                </div>
                                <div className="archive-modal-info-row">
                                    <span className="archive-modal-info-label">Последний документ</span>
                                    <span className="archive-modal-info-value archive-modal-info-value--small">
                                        {archivingDept.lastRoutedTitle || '—'}
                                    </span>
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
                                onClick={handleArchiveConfirm}
                                disabled={archiving}
                            >
                                {archiving ? 'Архивация...' : 'Архивировать'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showRestoreModal && restoringDept && (
                <div className="modal-overlay" onClick={() => setShowRestoreModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Восстановить отдел</h3>
                            <button className="modal-close" onClick={() => setShowRestoreModal(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <p className="archive-modal-name">«{restoringDept.name}»</p>
                            <p className="archive-modal-description">
                                Отдел снова появится в общем списке подразделений.
                            </p>
                            <div className="archive-modal-info">
                                <div className="archive-modal-info-row">
                                    <span className="archive-modal-info-label">Документов в истории</span>
                                    <span className="archive-modal-info-value">{restoringDept.routedCount}</span>
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
                                onClick={handleRestoreConfirm}
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

export default Departments;