import "../styles/global.css";
import "../styles/Search.css";
import "../contexts/SidebarContexts";
import { useSidebar } from "../contexts/SidebarContexts";
import "../styles/Dashboard.css";
import Search from "./Search";
import { useNavigate } from "react-router-dom";
import "../styles/Header.css";
import { useState, useEffect, useRef } from "react";
import Scanner from "./SubPages/Scanner";
import Tooltip from "./Tooltip";
import { getProfile } from "../services/api";
import type { Profile } from "../types";

const Header = () => {
    const { collapsed, toggleSidebar } = useSidebar();
    const navigate = useNavigate();
    const [showScanner, setShowScanner] = useState(false);
    const [showProfileMenu, setShowProfileMenu] = useState(false);
    const [profile, setProfile] = useState<Profile | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

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
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowProfileMenu(false);
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
    };

    const handleNavigateToProfile = () => {
        navigate('/dashboard/profile');
        setShowProfileMenu(false);
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
                    <img src="/icons/header/Upload.png" className="Casual-icon" alt="Загрузка" />
                </button>
            </Tooltip>

            <Tooltip text="Сканировать документ с камеры" position="bottom">
                <button className="button-secondary-with-border header-action-btn" onClick={() => setShowScanner(true)}>
                    <img src="/icons/header/Scan.png" className="Casual-icon" alt="Сканировать" />
                </button>
            </Tooltip>

            <Tooltip text="Уведомления" position="bottom">
                <button className="button-secondary header-action-btn" onClick={() => navigate('/dashboard/notifications')}>
                    <img src="/icons/header/Notifications.png" className="Casual-icon" alt="Уведомления" />
                </button>
            </Tooltip>

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
                            <img src="/icons/header/User.png" className="Casual-icon" alt="Профиль" />
                            <span>Мой профиль</span>
                        </button>

                        <button
                            className="profile-dropdown-item"
                            onClick={() => {
                                navigate('/dashboard/settings');
                                setShowProfileMenu(false);
                            }}
                        >
                            <img src="/icons/sidebar/Settings.png" className="Casual-icon" alt="Настройки" />
                            <span>Настройки</span>
                        </button>

                        <div className="profile-dropdown-divider"></div>

                        <button
                            className="profile-dropdown-item profile-dropdown-logout"
                            onClick={handleLogout}
                        >
                            <img src="/icons/sidebar/Exit.png" className="Casual-icon" alt="Выйти" />
                            <span>Выйти</span>
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Header;