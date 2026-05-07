import "../../styles/global.css";
import React, { useState, useEffect } from 'react';
import Card from "../Card";
import Table from "../Table";
import "../../styles/Dashboard.css";
import { getDashboard } from "../../services/api";
import { DashboardData, GroupedDepartment } from "../../types";
import { NavLink, useNavigate } from 'react-router-dom';

export const statusMap: Record<string, string> = {
    'in_progress': 'В работе',
    'pending': 'На проверке',
    'completed': 'Завершено',
    'approved': 'Одобрено',
    'in_review': 'На рассмотрении',
    'sent': 'Отправлено',
    'rejected': 'Отклонено'
};

export const translateStatus = (status: string): string => {
    return statusMap[status] || status;
};

export const getStatusColor = (status: string): string => {
    switch (status) {
        case 'completed':
        case 'approved':
            return 'status-loaded';
        case 'in_review':
            return 'status-data-refinement';
        case 'pending':
            return 'status-clarify';
        case 'in_progress':
        case 'sent':
            return 'status-assigned';
        case 'rejected':
            return 'status-rejected';
        default:
            return 'status-assigned';
    }
};

export const groupByDepartment = (data: DashboardData | null): GroupedDepartment[] => {
  if (!data?.departmentRouteStatuses) return [];
  
  const departmentMap = new Map<number, GroupedDepartment>();
  
  data.departmentRouteStatuses.forEach(item => {
    if (!departmentMap.has(item.departmentId)) {
      departmentMap.set(item.departmentId, {
        departmentId: item.departmentId,
        departmentName: item.departmentName,
        statuses: []
      });
    }
    departmentMap.get(item.departmentId)!.statuses.push({
      routeStatus: item.routeStatus,
      count: item.count
    });
  });
  
  return Array.from(departmentMap.values());
};

const MainMenu = () => {
    const [date, setDate] = useState<string>('');
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const now = new Date();
        const formatted = now.toLocaleDateString('ru-RU', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        setDate(formatted);
    }, []);

    const fetchDashboard = async () => {
        try {
            setLoading(true);
            const response = await getDashboard();
            setData(response);
            setError('');
        } catch (e) {
            setError('Ошибка загрузки дашборда');
        } finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchDashboard();
    }, []); 

    const groupedDepartments = groupByDepartment(data);

    /* Форматирование даты в ДД.ММ.ГГГГ */
    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU');
    };

    if (loading) return <p>Загрузка...</p>;
    if (error) return (
        <div>
            <button onClick={fetchDashboard}>Повторить</button>
        </div>
    );

    return (
        <div>
            <div className="Heading-main-text">
                <h2>Добро пожаловать!</h2>
                <h4 className="text-secondary">Сегодня {date}</h4>
            </div>
            
            <div className="Main-cards-container">
                <Card className="main-card">
                    <img src="/DashboardPage_Images/Docs.png"
                        className="Main-cards-image" alt="📄"/>
                    <h1>{data?.totalDocuments}</h1>
                    <h5 className="text-secondary">Всего входящих</h5>
                </Card>
                <Card className="main-card">
                    <img src="/DashboardPage_Images/check-mark-icon.png"
                        className="Main-cards-image" alt="✔️"/>
                    <h1>{data?.inProgress}</h1>
                    <h5 className="text-secondary">В обработке</h5>
                </Card>
                <Card className="main-card">
                    <img src=
                        "/DashboardPage_Images/exclamation-mark-icon.png"
                        className="Main-cards-image" alt="❕"/>
                    <h1>{data?.pendingCheck}</h1>
                    <h5 className="text-secondary">Требуют проверки</h5>
                </Card>
            </div>
            
            <div className="tableAndSubCardsContainer">
                <Card>
                    <Table
                        title={<h3>Последние документы</h3>}
                        rightTitle={<h4>
                           <NavLink
                                key="/dashboard/documents"
                                to="/dashboard/documents"
                                className="bluesrc" >
                                Все документы →
                            </NavLink>
                        </h4>}>
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Тема</th>
                                <th>Статус</th>
                                <th>Дата</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data?.recentDocuments.map((doc) => (
                                <tr 
                                    key={doc.id} 
                                    onClick={() => navigate(`/dashboard/documents/${doc.id}`)}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <td>{doc.id}</td>
                                    <td>{doc.title}</td>
                                    <td>
                                        <span className={`status-badge ${getStatusColor(doc.status)}`}>
                                            {translateStatus(doc.status)}
                                        </span>
                                    </td>
                                    <td>{formatDate(String(doc.date))}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Card>
                
                <div className="subCards-container">
                    <Card title={<h4>Статусы маршрутов по отделам</h4>}>
                        {groupedDepartments.map((dept) => (
                            <Card key={dept.departmentId} title={<h5>{dept.departmentName}</h5>} className="card-in-card-blue-cortisol">
                                {dept.statuses.map((status, idx) => (
                                    <h6 key={idx} className="text-tertiary">
                                        {translateStatus(status.routeStatus)} ({status.count}) 
                                    </h6>
                                ))}
                            </Card>
                        ))}
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default MainMenu;