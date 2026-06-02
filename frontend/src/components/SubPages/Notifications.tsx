import "../../styles/global.css";
import "../../styles/Notifications.css";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../Card";

// API функции (раскомментировать, когда API будет готов)
// import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, getNotificationsStats } from "../../services/api";

interface Notification {
    id: number;
    type: "new_document" | "ai_complete" | "extract_error" | "pending_verification" | "routed" | "low_confidence" | "route_error" | "overdue" | "success" | "rejected";
    title: string;
    message: string;
    time: string;
    read: boolean;
    documentId?: number;
}

interface NotificationsStats {
    total: number;
    unread: number;
    today: number;
    byType: {
        new_document: number;
        ai_complete: number;
        extract_error: number;
        pending_verification: number;
        routed: number;
        low_confidence: number;
        route_error: number;
        overdue: number;
        success: number;
        rejected: number;
    };
}

// Мок-данные для статистики (удалить, когда API готов)
const mockStats: NotificationsStats = {
    total: 25,
    unread: 6,
    today: 4,
    byType: {
        new_document: 6,
        ai_complete: 5,
        extract_error: 2,
        pending_verification: 3,
        routed: 4,
        low_confidence: 2,
        route_error: 1,
        overdue: 1,
        success: 0,
        rejected: 1,
    },
};

// Мок-данные для уведомлений (удалить, когда API готов)
const mockNotifications: Notification[] = [
{
        id: 1,
        type: "new_document",
        title: "Новый документ",
        message: "Поступил новый документ «Договор поставки №45» от ООО «Ромашка»",
        time: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
        read: false,
        documentId: 101,
    },
    {
        id: 2,
        type: "ai_complete",
        title: "AI завершил анализ",
        message: "Документ «Счёт-фактура №123» обработан. Уверенность: 94%",
        time: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        read: false,
        documentId: 102,
    },
    {
        id: 3,
        type: "pending_verification",
        title: "Требуется проверка",
        message: "Документ «Акт выполненных работ» ожидает верификации",
        time: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
        read: true,
        documentId: 103,
    },
    {
        id: 4,
        type: "extract_error",
        title: "Ошибка извлечения",
        message: "Не удалось распознать текст в файле «сканированный_документ.pdf»",
        time: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        read: true,
        documentId: 104,
    },
    {
        id: 5,
        type: "routed",
        title: "Направлен в отдел",
        message: "Документ «Заявка №567» направлен в юридический отдел",
        time: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        read: true,
        documentId: 105,
    },
    {
        id: 6,
        type: "low_confidence",
        title: "Низкая уверенность",
        message: "Документ «Счёт №890» распознан с низкой уверенностью (56%)",
        time: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(),
        read: false,
        documentId: 106,
    },
    {
        id: 7,
        type: "route_error",
        title: "Ошибка маршрутизации",
        message: "Не удалось определить отдел для документа «Запрос №234»",
        time: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(),
        read: true,
        documentId: 107,
    },
    {
        id: 8,
        type: "overdue",
        title: "Просроченный документ",
        message: "Документ «Договор №789» просрочен на 3 дня",
        time: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(),
        read: false,
        documentId: 108,
    },
    {
        id: 9,
        type: "success",
        title: "Успешная обработка",
        message: "Документ «Отчёт №456» успешно обработан и направлен",
        time: new Date(Date.now() - 1000 * 60 * 60 * 144).toISOString(),
        read: true,
        documentId: 109,
    },
    {
        id: 10,
        type: "rejected",
        title: "Документ отклонён",
        message: "Документ «Договор №123» был отклонён оператором",
        time: new Date(Date.now() - 1000 * 60 * 60 * 168).toISOString(),
        read: false,
        documentId: 110,
    },
];

const Notifications = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [stats, setStats] = useState<NotificationsStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {

      // API ВЕРСИЯ (раскомментировать, когда API готов)
      // const [statsData, notificationsData] = await Promise.all([
      //   getNotificationsStats(),
      //   getNotifications(),
      // ]);
      // setStats(statsData);
      // setNotifications(notificationsData);


      //  мок вепсия (удалить, когда API готов) 
        await new Promise(resolve => setTimeout(resolve, 500));
        setStats(mockStats);
        setNotifications(mockNotifications);


    } catch (err) {
        console.error("Ошибка загрузки уведомлений:", err);
        setError("Не удалось загрузить уведомления");
    } finally {
        setLoading(false);
    }
  };

    useEffect(() => {
        fetchData();
  }, []);

  const getIconByType = (type: Notification["type"]): string => {
    switch (type) {
        case "new_document":
            return "";
        case "ai_complete":
            return "";
        case "extract_error":
            return "";
        case "pending_verification":
            return "";
        case "routed":
            return "";
        case "low_confidence":
            return "";
        case "route_error":
            return "";
        case "overdue":
            return "";
        case "success":
            return "";
        case "rejected":
            return "";
        default:
            return "";
        }
    };

    const getIconClassByType = (type: Notification["type"]): string => {
        switch (type) {
            case "new_document":
                return "notification-icon new-document";
            case "ai_complete":
                return "notification-icon ai-complete";
            case "extract_error":
                return "notification-icon extract-error";
            case "pending_verification":
                return "notification-icon pending-verification";
            case "routed":
                return "notification-icon routed";
            case "low_confidence":
                return "notification-icon low-confidence";
            case "route_error":
                return "notification-icon route-error";
            case "overdue":
                return "notification-icon overdue";
            case "success":
                return "notification-icon success";
            case "rejected":
                return "notification-icon rejected";
            default:
                return "notification-icon";
        }
    };

    const formatTime = (timeString: string): string => {
        const date = new Date(timeString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return "Только что";
        if (diffMins < 60) return `${diffMins} мин назад`;
        if (diffHours < 24) return `${diffHours} ч назад`;
        return `${diffDays} д назад`;
    };

  const markAsRead = async (id: number) => {
        setNotifications(prev => prev.map(notif => notif.id === id ? { ...notif, read: true } : notif ));
        setStats(prev => prev ? { ...prev, unread: prev.unread - 1 } : prev);

    try {
      // ========== API ВЕРСИЯ (раскомментировать, когда API готов) ==========
      // await markNotificationAsRead(id);
      // ======================================================================

      // ========== МОК-ВЕРСИЯ (удалить, когда API готов) ==========
      console.log(`[MOCK] Уведомление ${id} помечено как прочитанное`);
      // ======================================================================
    } catch (err) {
      console.error("Ошибка при отметке уведомления:", err);
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === id ? { ...notif, read: false } : notif
        )
      );
      setStats(prev => prev ? { ...prev, unread: prev.unread + 1 } : prev);
    }
  };

  const markAllAsRead = async () => {
    if (stats?.unread === 0) return;

    setNotifications(prev =>
        prev.map(notif => ({ ...notif, read: true }))
    );
    setStats(prev => prev ? { ...prev, unread: 0 } : prev);

    try {
      // API ВЕРСИЯ (раскомментировать, когда API готов)
      // await markAllNotificationsAsRead();

      //  МОК-ВЕРСИЯ (удалить, когда API готов) 
      console.log(`[MOCK] Все уведомления помечены как прочитанные`);

    } catch (err) {
        console.error("Ошибка при отметке всех уведомлений:", err);
        await fetchData();
    }
  };

    const handleNotificationClick = (notif: Notification) => {
        if (!notif.read) {
        markAsRead(notif.id);
        }
        if (notif.documentId) {
        navigate(`/dashboard/documents/${notif.documentId}`);
    }
  };

    const handleRetry = () => {
        fetchData();
    };

    if (loading) {
        return (
        <div className="notifications-page">
        <div className="notifications-stats-cards-container">
          {[1, 2, 3, 4].map(i => (
            <Card key={i} className="notifications-stat-card skeleton-card">
              <div className="skeleton-icon" />
              <div className="skeleton-text" />
            </Card>
          ))}
        </div>

        <Card className="notifications-card">
          <div className="notifications-header">
            <div className="skeleton-title" />
            <div className="skeleton-button" />
          </div>
          <div className="notifications-list">
            {[1, 2, 3].map(i => (
              <div key={i} className="notification-item skeleton">
                <div className="notification-icon skeleton-icon" />
                <div className="notification-content">
                  <div className="notification-title skeleton-text" />
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
        <Card className="error-state-card">
          <div className="error-state">
            <div className="error-icon"></div>
            <p className="error-text">{error}</p>
            <button className="upload-btn-primary" onClick={handleRetry}>
              Повторить
            </button>
          </div>
        </Card>
      </div>
    );
  }

    return (
    <div className="notifications-page">
        <div className="notifications-stats-cards-container">
            <Card className="notifications-stat-card">
                <img src="/icons/notifications/Unread.png" className="notifications-stat-card-icon" alt="📄" />
                <div className="notifications-stat-card-content">
                <h1 className="notifications-stat-card-value">{stats?.unread ?? 0}</h1>
                <h5 className="notifications-stat-card-label text-secondary">Непрочитанные</h5>
                </div>
            </Card>

            <Card className="notifications-stat-card">
                <img src="/icons/notifications/Low_confidence.png" className="notifications-stat-card-icon" alt="✔️" />
                <div className="notifications-stat-card-content">
                <h1 className="notifications-stat-card-value">{stats?.byType.low_confidence ?? 0}</h1>
                <h5 className="notifications-stat-card-label text-secondary">Низкая уверенность</h5>
                </div>
            </Card>

            <Card className="notifications-stat-card">
                <img src="/icons/notifications/Error.png" className="notifications-stat-card-icon" alt="❕" />
                <div className="notifications-stat-card-content">
                <h1 className="notifications-stat-card-value">{stats?.byType.extract_error ?? 0}</h1>
                <h5 className="notifications-stat-card-label text-secondary">Ошибки</h5>
                </div>
            </Card>

            <Card className="notifications-stat-card">
                <img src="/icons/notifications/Overdue.png" className="notifications-stat-card-icon" alt="✔️" />
                <div className="notifications-stat-card-content">
                <h1 className="notifications-stat-card-value">{stats?.byType.overdue ?? 0}</h1>
                <h5 className="notifications-stat-card-label text-secondary">Просроченные</h5>
                </div>
            </Card>
            </div>

            <Card className="notifications-card">
            <div className="notifications-header">
                <div className="notifications-title-wrap">
                <h2 className="notifications-title">Уведомления</h2>
                {stats && stats.unread > 0 && (
                    <span className="unread-count-badge">{stats.unread} новых</span>
                )}
                </div>
                {notifications.length > 0 && stats && stats.unread > 0 && (
                <button className="mark-all-read-btn" onClick={markAllAsRead}>
                    Отметить все как прочитанные
                </button>
                )}
            </div>

            {notifications.length === 0 ? (
                <div className="empty-state">
                    <img src="/icons/dashboard/Total_incoming.png" className="empty-icon-img" alt="Нет уведомлений" />
                    <p className="empty-text">Нет уведомлений</p>
                </div>
            ) : (
                <div className="notifications-list">
                {notifications.map(notif => (
                    <div
                    key={notif.id}
                    className={`notification-item ${!notif.read ? "unread" : ""}`}
                    onClick={() => handleNotificationClick(notif)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && handleNotificationClick(notif)}
                    >
                    <div className={getIconClassByType(notif.type)}>
                        {getIconByType(notif.type)}
                    </div>
                    <div className="notification-content">
                        <div className="notification-title">{notif.title}</div>
                        <div className="notification-message">{notif.message}</div>
                        <div className="notification-time">{formatTime(notif.time)}</div>
                    </div>
                    {!notif.read && <div className="unread-dot" />}
                    </div>
                ))}
                </div>
            )}
            </Card>
        </div>
    );
};

export default Notifications;