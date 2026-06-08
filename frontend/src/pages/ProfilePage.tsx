import React, { useState, useEffect, useRef } from 'react';
import { getProfile, updateProfile, uploadAvatar, changePassword, logoutAll, getSessions, getLoginHistory } from '../services/api';
import type { Profile, UpdateProfileData, ChangePasswordData, Session, LoginHistoryItem } from '../types';
import Card from '../components/Card';
import '../styles/ProfilePage.css';
import '../styles/global.css';

const ProfilePage = () => {
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [initialFullName, setInitialFullName] = useState('');
    const [initialEmail, setInitialEmail] = useState('');

    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    const [sessions, setSessions] = useState<Session[]>([]);
    const [lastLogin, setLastLogin] = useState<LoginHistoryItem | null>(null);
    const [loggingOutAll, setLoggingOutAll] = useState(false);
    const [loggingOutSessionId, setLoggingOutSessionId] = useState<number | null>(null);
    const [currentToken] = useState(() => {
        return localStorage.getItem('access_token') || sessionStorage.getItem('access_token') || '';
    });

    useEffect(() => {
        fetchProfile();
        fetchSessions();
        fetchLastLogin();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const data = await getProfile();
            setProfile(data);
            setFullName(data.fullName);
            setEmail(data.email);
            setInitialFullName(data.fullName);
            setInitialEmail(data.email);
        } catch (err) {
            setError('Ошибка загрузки профиля');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const fetchSessions = async () => {
        try {
            const data = await getSessions();
            setSessions(data);
        } catch (err) {
            console.error('Ошибка загрузки сессий:', err);
        }
    };

    const fetchLastLogin = async () => {
        try {
            const data = await getLoginHistory(1, 1);
            if (data.items.length > 0) {
                setLastLogin(data.items[0]);
            }
        } catch (err) {
            console.error('Ошибка загрузки истории входов:', err);
        }
    };

    const isCurrentSession = (session: Session): boolean => {
        if (!currentToken) return false;
        const tokenEnd = currentToken.slice(-20);
        return session.token.includes(tokenEnd);
    };

    const otherSessionsCount = sessions.filter(s => !isCurrentSession(s)).length;

    const hasChanges = fullName.trim() !== initialFullName.trim() || email.trim() !== initialEmail.trim();

    const handleSaveProfile = async () => {
        try {
            setSaving(true);
            setError('');
            setSuccessMessage('');

            if (!fullName.trim()) {
                setError('ФИО не может быть пустым');
                return;
            }

            if (!email.trim()) {
                setError('Email не может быть пустым');
                return;
            }

            const updateData: UpdateProfileData = {};
            if (fullName.trim() !== initialFullName.trim()) updateData.fullName = fullName.trim();
            if (email.trim() !== initialEmail.trim()) updateData.email = email.trim();

            if (Object.keys(updateData).length === 0) {
                setSuccessMessage('Нет изменений для сохранения');
                return;
            }

            const updated = await updateProfile(updateData);
            setProfile(updated);
            setInitialFullName(updated.fullName);
            setInitialEmail(updated.email);
            setFullName(updated.fullName);
            setEmail(updated.email);
            setSuccessMessage('Профиль успешно обновлён');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Ошибка обновления профиля');
        } finally {
            setSaving(false);
        }
    };

    const passwordsMatch = newPassword === confirmNewPassword;
    const showPasswordMismatch = confirmNewPassword.length > 0 && !passwordsMatch;

    const handleChangePassword = async () => {
        try {
            setChangingPassword(true);
            setError('');
            setSuccessMessage('');

            if (!oldPassword || !newPassword || !confirmNewPassword) {
                setError('Заполните все поля пароля');
                return;
            }

            if (newPassword.length < 6) {
                setError('Новый пароль должен быть не менее 6 символов');
                return;
            }

            if (!passwordsMatch) {
                setError('Пароли не совпадают');
                return;
            }

            const confirmed = window.confirm('Вы уверены, что хотите сменить пароль?');
            if (!confirmed) return;

            const data: ChangePasswordData = { oldPassword, newPassword };
            await changePassword(data);
            setSuccessMessage('Пароль успешно изменён');
            setOldPassword('');
            setNewPassword('');
            setConfirmNewPassword('');
            setShowOldPassword(false);
            setShowNewPassword(false);
            setShowConfirmPassword(false);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Ошибка смены пароля');
        } finally {
            setChangingPassword(false);
        }
    };

    const isPasswordFormValid = oldPassword.trim().length > 0 && newPassword.trim().length >= 6 && passwordsMatch;

    const handleAvatarClick = () => {
        fileInputRef.current?.click();
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            setError('Неподдерживаемый формат. Используйте JPG, PNG или WEBP');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            setError('Размер файла не должен превышать 5 МБ');
            return;
        }

        const confirmed = window.confirm('Вы уверены, что хотите изменить аватар?');
        if (!confirmed) {
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            return;
        }

        try {
            setUploadingAvatar(true);
            setError('');
            const result = await uploadAvatar(file);
            setProfile(prev => prev ? { ...prev, avatarUrl: result.avatarUrl } : null);
            setSuccessMessage('Аватар успешно обновлён');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Ошибка загрузки аватара');
        } finally {
            setUploadingAvatar(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleLogoutSession = async (sessionId: number) => {
        const confirmed = window.confirm('Завершить эту сессию? Пользователь будет выведен из системы на этом устройстве.');
        if (!confirmed) return;

        try {
            setLoggingOutSessionId(sessionId);
            setError('');
            await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/security/sessions/${sessionId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${currentToken}`,
                    'Content-Type': 'application/json',
                },
            });
            setSessions(prev => prev.filter(s => s.id !== sessionId));
            setSuccessMessage('Сессия завершена');
        } catch (err: any) {
            setError('Ошибка при завершении сессии');
        } finally {
            setLoggingOutSessionId(null);
        }
    };

    const handleLogoutAll = async () => {
        if (otherSessionsCount === 0) return;

        const confirmed = window.confirm(
            `Вы действительно хотите завершить все остальные сессии (${otherSessionsCount} шт.)? Текущая сессия останется активной.`
        );
        if (!confirmed) return;

        try {
            setLoggingOutAll(true);
            setError('');
            await logoutAll();
            setSessions(prev => prev.filter(s => isCurrentSession(s)));
            setSuccessMessage(`Завершено сессий: ${otherSessionsCount}`);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Ошибка при выходе со всех устройств');
        } finally {
            setLoggingOutAll(false);
        }
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

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString('ru-RU', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const truncateUserAgent = (ua: string | null): string => {
        if (!ua) return 'Неизвестное устройство';
        if (ua.length <= 50) return ua;
        return ua.substring(0, 50) + '...';
    };

    const avatarUrl = getAvatarUrl();
    const initials = getInitials(profile?.fullName || '');

    if (loading) {
        return (
            <div className="profile-page">
                <div className="profile-skeleton">
                    <div className="skeleton-avatar"></div>
                    <div className="skeleton-text"></div>
                    <div className="skeleton-text short"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="profile-page">
            <h2 className="profile-page-title">Профиль пользователя</h2>

            {error && (
                <div className="profile-message profile-message-error">
                    {error}
                    <button onClick={() => setError('')} className="profile-message-close">×</button>
                </div>
            )}

            {successMessage && (
                <div className="profile-message profile-message-success">
                    {successMessage}
                    <button onClick={() => setSuccessMessage('')} className="profile-message-close">×</button>
                </div>
            )}

            <div className="profile-layout">
                <div className="profile-left-column">
                    <Card>
                        <div className="profile-avatar-section">
                            <div
                                className={`profile-avatar-wrapper ${avatarUrl ? 'has-avatar' : 'no-avatar'}`}
                                onClick={handleAvatarClick}
                            >
                                {avatarUrl ? (
                                    <>
                                        <img
                                            src={avatarUrl}
                                            alt="Аватар пользователя"
                                            className="profile-avatar"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = 'none';
                                            }}
                                        />
                                        {!uploadingAvatar && (
                                            <div className="profile-avatar-hover">
                                                <span>Изменить фото</span>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <span className="profile-avatar-initials">{initials}</span>
                                        {!uploadingAvatar && (
                                            <div className="profile-avatar-hover">
                                                <span>Добавить фото</span>
                                            </div>
                                        )}
                                    </>
                                )}
                                {uploadingAvatar && (
                                    <div className="profile-avatar-overlay">
                                        <div className="loader"></div>
                                    </div>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={handleAvatarUpload}
                                style={{ display: 'none' }}
                            />
                            <h3 className="profile-name">{profile?.fullName}</h3>
                            <p className="profile-role">{profile?.role}</p>
                            {profile?.department && (
                                <span className="profile-department-badge">
                                    {profile.department}
                                </span>
                            )}
                        </div>

                        <div className="profile-divider"></div>

                        <div className="profile-info-list">
                            <div className="profile-info-item">
                                <span className="profile-info-label">Email</span>
                                <span className="profile-info-value">{profile?.email}</span>
                            </div>
                            <div className="profile-info-item">
                                <span className="profile-info-label">Дата регистрации</span>
                                <span className="profile-info-value">
                                    {profile?.createdAt ? formatDate(profile.createdAt) : '-'}
                                </span>
                            </div>
                            {lastLogin && (
                                <div className="profile-info-item">
                                    <span className="profile-info-label">Последний вход</span>
                                    <span className="profile-info-value">
                                        {formatDateTime(lastLogin.loginTime)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </Card>
                </div>

                <div className="profile-right-column">
                    <Card>
                        <h3 className="profile-form-title">Редактирование профиля</h3>
                        <div className="profile-form">
                            <div className="profile-form-group">
                                <label className="profile-label">ФИО</label>
                                <input
                                    type="text"
                                    className="profile-input"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="Введите ваше полное имя"
                                />
                            </div>
                            <div className="profile-form-group">
                                <label className="profile-label">Email</label>
                                <input
                                    type="email"
                                    className="profile-input"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Введите ваш email"
                                />
                            </div>
                            <button
                                className="profile-save-button"
                                onClick={handleSaveProfile}
                                disabled={saving || !hasChanges}
                            >
                                {saving ? (
                                    <>
                                        <span className="loader-small"></span>
                                        Сохранение...
                                    </>
                                ) : (
                                    'Сохранить изменения'
                                )}
                            </button>
                        </div>
                    </Card>

                    <Card>
                        <h3 className="profile-form-title">Смена пароля</h3>
                        <div className="profile-form">
                            <div className="profile-form-group">
                                <label className="profile-label">Текущий пароль</label>
                                <div className="profile-password-input-wrapper">
                                    <input
                                        type={showOldPassword ? 'text' : 'password'}
                                        className="profile-input"
                                        value={oldPassword}
                                        onChange={(e) => setOldPassword(e.target.value)}
                                        placeholder="Введите текущий пароль"
                                    />
                                    <button
                                        type="button"
                                        className="profile-password-toggle"
                                        onClick={() => setShowOldPassword(!showOldPassword)}
                                        tabIndex={-1}
                                    >
                                        {showOldPassword ? (
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8s3-5 6-5 6 5 6 5-3 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/></svg>
                                        ) : (
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8s3-5 6-5 6 5 6 5-3 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 4l8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                            <div className="profile-form-group">
                                <label className="profile-label">Новый пароль</label>
                                <div className="profile-password-input-wrapper">
                                    <input
                                        type={showNewPassword ? 'text' : 'password'}
                                        className={`profile-input ${showPasswordMismatch ? 'error' : ''}`}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Минимум 6 символов"
                                    />
                                    <button
                                        type="button"
                                        className="profile-password-toggle"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                        tabIndex={-1}
                                    >
                                        {showNewPassword ? (
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8s3-5 6-5 6 5 6 5-3 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/></svg>
                                        ) : (
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8s3-5 6-5 6 5 6 5-3 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 4l8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                                        )}
                                    </button>
                                </div>
                            </div>
                            <div className="profile-form-group">
                                <label className="profile-label">Подтверждение нового пароля</label>
                                <div className="profile-password-input-wrapper">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        className={`profile-input ${showPasswordMismatch ? 'error' : ''}`}
                                        value={confirmNewPassword}
                                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                                        placeholder="Повторите новый пароль"
                                    />
                                    <button
                                        type="button"
                                        className="profile-password-toggle"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        tabIndex={-1}
                                    >
                                        {showConfirmPassword ? (
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8s3-5 6-5 6 5 6 5-3 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/></svg>
                                        ) : (
                                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8s3-5 6-5 6 5 6 5-3 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 4l8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                                        )}
                                    </button>
                                </div>
                                {showPasswordMismatch && (
                                    <span className="profile-input-match-error">Пароли не совпадают</span>
                                )}
                            </div>
                            <button
                                className="profile-password-button"
                                onClick={handleChangePassword}
                                disabled={changingPassword || !isPasswordFormValid}
                            >
                                {changingPassword ? (
                                    <>
                                        <span className="loader-small"></span>
                                        Смена пароля...
                                    </>
                                ) : (
                                    'Сменить пароль'
                                )}
                            </button>
                        </div>
                    </Card>

                    <Card>
                        <h3 className="profile-form-title">Активные сессии</h3>
                        <div className="profile-form">
                            {sessions.length > 0 ? (
                                <>
                                    <div className="profile-sessions-header">
                                        <span className="profile-sessions-count">
                                            Всего сессий: {sessions.length}
                                            {otherSessionsCount > 0 && (
                                                <span style={{ color: 'var(--text-tertiary)', marginLeft: 4 }}>
                                                    (других: {otherSessionsCount})
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                    <div className="profile-sessions-list">
                                        {sessions.map((session) => (
                                            <div
                                                key={session.id}
                                                className={`profile-session-item ${loggingOutSessionId === session.id ? 'logging-out' : ''}`}
                                            >
                                                <div className="profile-session-info">
                                                    <span className="profile-session-device">
                                                        {truncateUserAgent(session.userAgent)}
                                                    </span>
                                                    {session.ipAddress && (
                                                        <span className="profile-session-ip">{session.ipAddress}</span>
                                                    )}
                                                </div>
                                                <span className="profile-session-date">
                                                    {formatDateTime(session.createdAt)}
                                                </span>
                                                {isCurrentSession(session) ? (
                                                    <span className="profile-session-current">Текущий</span>
                                                ) : (
                                                    <button
                                                        className="profile-session-logout-btn"
                                                        onClick={() => handleLogoutSession(session.id)}
                                                        disabled={loggingOutSessionId === session.id}
                                                        title="Завершить сессию"
                                                    >
                                                        {loggingOutSessionId === session.id ? (
                                                            <span className="profile-session-logout-spinner" />
                                                        ) : (
                                                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                                                <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                                                            </svg>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                                    Нет активных сессий
                                </p>
                            )}
                            <button
                                className="profile-logout-all-button"
                                onClick={handleLogoutAll}
                                disabled={loggingOutAll || otherSessionsCount === 0}
                            >
                                {loggingOutAll ? (
                                    <>
                                        <span className="loader-small"></span>
                                        Завершение сессий...
                                    </>
                                ) : otherSessionsCount > 0 ? (
                                    `Выйти со всех устройств (${otherSessionsCount})`
                                ) : (
                                    'Выйти со всех устройств'
                                )}
                            </button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;