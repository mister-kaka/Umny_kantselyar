import React, { useState, useEffect, useRef } from 'react';
import { getProfile, updateProfile, uploadAvatar, changePassword } from '../services/api';
import type { Profile, UpdateProfileData, ChangePasswordData } from '../types';
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

    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const data = await getProfile();
            setProfile(data);
            setFullName(data.fullName);
            setEmail(data.email);
        } catch (err) {
            setError('Ошибка загрузки профиля');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        try {
            setSaving(true);
            setError('');
            setSuccessMessage('');

            const updateData: UpdateProfileData = {};
            if (fullName !== profile?.fullName) updateData.fullName = fullName;
            if (email !== profile?.email) updateData.email = email;

            if (Object.keys(updateData).length === 0) {
                setSuccessMessage('Нет изменений для сохранения');
                return;
            }

            const updated = await updateProfile(updateData);
            setProfile(updated);
            setSuccessMessage('Профиль успешно обновлён');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Ошибка обновления профиля');
        } finally {
            setSaving(false);
        }
    };

    const handleChangePassword = async () => {
        try {
            setChangingPassword(true);
            setError('');
            setSuccessMessage('');

            if (!oldPassword || !newPassword) {
                setError('Заполните все поля пароля');
                return;
            }

            if (newPassword.length < 6) {
                setError('Новый пароль должен быть не менее 6 символов');
                return;
            }

            const data: ChangePasswordData = { oldPassword, newPassword };
            await changePassword(data);
            setSuccessMessage('Пароль успешно изменён');
            setOldPassword('');
            setNewPassword('');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Ошибка смены пароля');
        } finally {
            setChangingPassword(false);
        }
    };

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

    const getAvatarUrl = () => {
        if (profile?.avatarUrl) {
            return profile.avatarUrl.startsWith('http')
                ? profile.avatarUrl
                : `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}${profile.avatarUrl}`;
        }
        return "/icons/header/User.png";
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('ru-RU', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

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
                            <div className="profile-avatar-wrapper" onClick={handleAvatarClick}>
                                <img
                                    src={getAvatarUrl()}
                                    alt="Аватар пользователя"
                                    className="profile-avatar"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        target.src = "/icons/header/User.png";
                                    }}
                                />
                                {uploadingAvatar && (
                                    <div className="profile-avatar-overlay">
                                        <div className="loader"></div>
                                    </div>
                                )}
                                {!uploadingAvatar && (
                                    <div className="profile-avatar-hover">
                                        <span>Изменить фото</span>
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
                                disabled={saving}
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
                                <input
                                    type="password"
                                    className="profile-input"
                                    value={oldPassword}
                                    onChange={(e) => setOldPassword(e.target.value)}
                                    placeholder="Введите текущий пароль"
                                />
                            </div>
                            <div className="profile-form-group">
                                <label className="profile-label">Новый пароль</label>
                                <input
                                    type="password"
                                    className="profile-input"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="Минимум 6 символов"
                                />
                            </div>
                            <button
                                className="profile-password-button"
                                onClick={handleChangePassword}
                                disabled={changingPassword}
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
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;