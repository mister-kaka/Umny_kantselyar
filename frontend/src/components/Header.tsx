import "../styles/global.css";
import "../styles/Search.css";
import "../contexts/SidebarContexts";
import { useSidebar } from "../contexts/SidebarContexts";
import "../styles/Dashboard.css";
import Search from "./Search";
import { useNavigate } from "react-router-dom";
import "../styles/Header.css";
import { useState, useEffect, useRef } from "react";
import Scanner from "./Scanner";
import Tooltip from "./Tooltip";
import { getProfile, getUnreadCount, getNotifications, markAsRead, markAllAsRead } from "../services/api";
import type { Profile, UnreadCount, AppNotification } from "../types";
import { io } from 'socket.io-client';
import { getThemedIcon } from "../utils/getThemedIcon";

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
    admin_message: "Сообщение администратора",
};

const formatTimeAgo = (timeString: string): string => {
    const date = new Date(timeString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return "Только что";
    if (diffMins < 60) return `${diffMins} мин`;
    if (diffHours < 24) return `${diffHours} ч`;
    return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
};

const Header = () => {
    const { collapsed, toggleSidebar } = useSidebar();
    const navigate = useNavigate();
    const [showScanner, setShowScanner] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [unreadCount, setUnreadCount] = useState<UnreadCount | null>(null);
    const [recentNotifications, setRecentNotifications] = useState<AppNotification[]>([]);
    const [markingAllRead, setMarkingAllRead] = useState(false);
    const [themeKey, setThemeKey] = useState(0);
    const menuRef = useRef<HTMLDivElement>(null);
    const notificationsRef = useRef<HTMLDivElement>(null);

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

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const data = await getProfile();
                setProfile(data);
            } catch (error) {
                console.error('Ошибка загрузки профиля:', error);
            }
        };
        fetchProfile();
    }, []);

    useEffect(() => {
        const fetchUnread = async () => {
            try {
                const data = await getUnreadCount();
                setUnreadCount(data);
            } catch (error) {
                console.error('Ошибка загрузки счётчика уведомлений:', error);
            }
        };
        fetchUnread();

        const token = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
        let userId: number | null = null;
        if (token) {
            try {
                const payload = JSON.parse(atob(token.split('.')[1]));
                userId = payload.sub;
            } catch (e) {
                console.error('Ошибка парсинга токена:', e);
            }
        }

        const socket = io(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/notifications`, {
            query: { userId: userId?.toString() || '' },
        });

        socket.on('unreadCountChanged', () => {
            fetchUnread();
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowProfileMenu(false);
            }
            if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
                setShowNotificationsDropdown(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        sessionStorage.removeItem('access_token');
        navigate('/login');
    };

    const getAvatarUrl = () => {
        if (profile?.avatarUrl) {
            return profile.avatarUrl.startsWith('http')
                ? profile.avatarUrl
                : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${profile.avatarUrl}`;
        }
        return null;
    };

    const getInitials = (name: string) => {
        if (!name) return '?';
        const parts = name.trim().split(/\s+/);
        if (parts.length === 1) {
            return parts[0].charAt(0).toUpperCase();
        }
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    };

    const avatarUrl = getAvatarUrl();
    const initials = getInitials(profile?.fullName || '');

    const handleProfileClick = () => {
        setShowProfileMenu(!showProfileMenu);
        if (showNotificationsDropdown) setShowNotificationsDropdown(false);
    };

    const handleNavigateToProfile = () => {
        navigate('/dashboard/profile');
        setShowProfileMenu(false);
    };

    const handleNotificationsClick = async () => {
        if (!showNotificationsDropdown) {
            try {
                const data = await getNotifications(1, 5, { isRead: "false" });
                setRecentNotifications(data.items);
            } catch (error) {
                console.error('Ошибка загрузки уведомлений:', error);
            }
        }
        setShowNotificationsDropdown(!showNotificationsDropdown);
        if (showProfileMenu) setShowProfileMenu(false);
    };

    const handleNotificationItemClick = async (notif: AppNotification) => {
        setShowNotificationsDropdown(false);
        try {
            await markAsRead(notif.id);
            setUnreadCount(prev => prev ? { ...prev, total: Math.max(0, prev.total - 1) } : prev);
            setRecentNotifications(prev => prev.filter(n => n.id !== notif.id));
        } catch (err) {
            console.error('Ошибка отметки уведомления:', err);
        }
        if (notif.documentId) {
            navigate(`/dashboard/documents/${notif.documentId}`, { state: { from: 'notifications' } });
        } else {
            navigate('/dashboard/notifications');
        }
    };

    const handleMarkAllAsReadClick = async () => {
        if (!unreadCount || unreadCount.total === 0) return;
        setMarkingAllRead(true);
        try {
            await markAllAsRead();
            setUnreadCount(prev => prev ? { ...prev, total: 0 } : prev);
            setRecentNotifications([]);
        } catch (err) {
            console.error('Ошибка при отметке всех уведомлений:', err);
        } finally {
            setMarkingAllRead(false);
        }
    };

    return (
        <div className={`header ${collapsed ? 'collapsed' : ''}`}>
            {showScanner && <Scanner onClose={() => setShowScanner(false)} />}

            <button className="mobile-header-arrow" onClick={toggleSidebar}>
                <span className="burger-icon">
                    <span />
                    <span />
                    <span />
                </span>
            </button>

            <div className="header-search-wrapper">
                <Search />
            </div>

            <Tooltip text="Загрузка документов" position="bottom">
                <button className="button-primary header-action-btn" onClick={() => navigate('/dashboard/incoming')}>
                    <img key={themeKey} src={getThemedIcon("/icons/header/Upload.png")} className="Casual-icon" alt="Загрузка" />
                </button>
            </Tooltip>

            <Tooltip text="Сканировать документ с камеры" position="bottom">
                <button className="button-secondary-with-border header-action-btn" onClick={() => setShowScanner(true)}>
                    <img key={themeKey} src={getThemedIcon("/icons/header/Scan.png")} className="Casual-icon" alt="Сканировать" />
                </button>
            </Tooltip>

            <div className="header-notifications-wrapper" ref={notificationsRef}>
                <Tooltip text="Уведомления" position="bottom">
                    <button className="button-secondary header-action-btn header-notifications-btn" onClick={handleNotificationsClick}>
                        <img key={themeKey} src={getThemedIcon("/icons/header/Notifications.png")} className="Casual-icon" alt="Уведомления" />
                        {unreadCount && unreadCount.total > 0 && (
                            <span className="header-notifications-badge">{unreadCount.total > 99 ? '99+' : unreadCount.total}</span>
                        )}
                    </button>
                </Tooltip>

                {showNotificationsDropdown && (
                    <div className="notifications-dropdown">
                        <div className="notifications-dropdown-header">
                            <span>Уведомления</span>
                            <div className="notifications-dropdown-header-right">
                                {unreadCount && unreadCount.total > 0 && (
                                    <>
                                        <button
                                            className="notifications-dropdown-mark-all-btn"
                                            onClick={handleMarkAllAsReadClick}
                                            disabled={markingAllRead}
                                        >
                                            {markingAllRead ? '...' : 'Прочитать всё'}
                                        </button>
                                        <span className="notifications-dropdown-count">{unreadCount.total} новых</span>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="profile-dropdown-divider" />
                        {recentNotifications.length > 0 ? (
                            <div className="notifications-dropdown-list">
                                {recentNotifications.map(notif => (
                                    <button
                                        key={notif.id}
                                        className="notifications-dropdown-item unread"
                                        onClick={() => handleNotificationItemClick(notif)}
                                    >
                                        <div className="notifications-dropdown-item-content">
                                            <span className="notifications-dropdown-item-type">
                                                {NOTIFICATION_TYPE_LABELS[notif.type] || notif.type}
                                            </span>
                                            <span className="notifications-dropdown-item-text">
                                                {notif.message?.split('\n')[0] || notif.title}
                                            </span>
                                            <span className="notifications-dropdown-item-time">
                                                {formatTimeAgo(notif.createdAt)}
                                            </span>
                                        </div>
                                        <div className="notifications-dropdown-dot" />
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="notifications-dropdown-empty">Нет новых уведомлений</div>
                        )}
                        <div className="profile-dropdown-divider" />
                        <div className="notifications-dropdown-footer">
                            <button
                                className="notifications-dropdown-all-btn"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowNotificationsDropdown(false);
                                    navigate('/dashboard/notifications');
                                }}
                            >
                                Все уведомления
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="profile-block">
                <h5>{profile?.fullName || 'Пользователь'}</h5>
                <h6 className="text-secondary">{profile?.role || 'Роль'}</h6>
            </div>

            <div className="profile-menu-container" ref={menuRef}>
                <div className="profile-menu-trigger" onClick={handleProfileClick}>
                    {avatarUrl ? (
                        <img
                            src={avatarUrl}
                            className="profile-image"
                            alt="Профиль"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                    const initialsEl = document.createElement('span');
                                    initialsEl.className = 'profile-image-initials';
                                    initialsEl.textContent = initials;
                                    parent.appendChild(initialsEl);
                                }
                            }}
                        />
                    ) : (
                        <span className="profile-image-initials">{initials}</span>
                    )}
                </div>

                {showProfileMenu && (
                    <div className="profile-dropdown-menu">
                        <div
                            className="profile-dropdown-header"
                            onClick={handleNavigateToProfile}
                        >
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    className="profile-dropdown-avatar"
                                    alt="Аватар"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.style.display = 'none';
                                    }}
                                />
                            ) : (
                                <span className="profile-dropdown-avatar-initials">{initials}</span>
                            )}
                            <div>
                                <div className="profile-dropdown-name">{profile?.fullName || 'Пользователь'}</div>
                                <div className="profile-dropdown-email">{profile?.email || 'email@example.com'}</div>
                            </div>
                        </div>

                        <div className="profile-dropdown-divider"></div>

                        <button
                            className="profile-dropdown-item"
                            onClick={handleNavigateToProfile}
                        >
                            <img key={themeKey} src={getThemedIcon("/icons/header/User.png")} className="Casual-icon" alt="Профиль" />
                            <span>Мой профиль</span>
                        </button>

                        <button
                            className="profile-dropdown-item"
                            onClick={() => {
                                navigate('/dashboard/settings');
                                setShowProfileMenu(false);
                            }}
                        >
                            <img key={themeKey} src={getThemedIcon("/icons/sidebar/Settings.png")} className="Casual-icon" alt="Настройки" />
                            <span>Настройки</span>
                        </button>

                        {profile?.role === 'Администратор' && (
                            <button
                                className="profile-dropdown-item"
                                onClick={() => {
                                    navigate('/dashboard/admin');
                                    setShowProfileMenu(false);
                                }}
                            >
                                <img key={themeKey} src={getThemedIcon("/icons/sidebar/Admin.png")} className="Casual-icon" alt="Администрирование" />
                                <span>Администрирование</span>
                            </button>
                        )}

                        <div className="profile-dropdown-divider"></div>

                        <button
                            className="profile-dropdown-item profile-dropdown-logout"
                            onClick={handleLogout}
                        >
                            <img key={themeKey} src={getThemedIcon("/icons/sidebar/Exit.png")} className="Casual-icon" alt="Выйти" />
                            <span>Выйти</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Header;