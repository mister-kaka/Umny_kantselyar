import "../../styles/global.css";
import React, { useState, useEffect } from 'react';
import Card from "../Card";
import Table from "../Table";
import "../../styles/Dashboard.css";
import "../../styles/DocumentsListPage.css"
import { getDashboard } from "../../services/api";
import { DashboardData, GroupedDepartment } from "../../types";
import { NavLink, useNavigate } from 'react-router-dom';
import "../../styles/MainMenu.css";
import { translateStatus, getStatusColorClass } from "../../constants/statuses";
import { formatMoscowDate } from "../../utils/moscowTime";

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

    const formatDate = (dateString: string): string => formatMoscowDate(dateString);

    if (loading) return <p>Загрузка...</p>;
    if (error) return (
        <div>
            <span>{error} </span>
            <button className="apply-button" onClick={fetchDashboard}>Повторить</button>
        </div>
    );

    return (
        <div>
            <div className="Heading-main-text">
                <h2>Добро пожаловать!</h2>
                <h4 className="text-secondary">Сегодня {date}</h4>
            </div>
            
            <div className="stats-cards-container">
                <Card className="stat-card">
                    <div className="stat-card-icon-wrap">
                    <img src="/icons/dashboard/Total_incoming.png" className="stat-card-icon" alt="Всего входящих" />
                    </div>
                    <div className="stat-card-content">
                    <div className="stat-card-value">{data?.totalDocuments}</div>
                    <div className="stat-card-label">Всего входящих</div>
                    </div>
                </Card>

                <Card className="stat-card">
                    <div className="stat-card-icon-wrap">
                    <img src="/icons/dashboard/In_processing.png" className="stat-card-icon" alt="Направлено в отдел" />
                    </div>
                    <div className="stat-card-content">
                    <div className="stat-card-value">{data?.routedCount || 0}</div>
                    <div className="stat-card-label">Направлено в отдел</div>
                    </div>
                </Card>

                <Card className="stat-card">
                    <div className="stat-card-icon-wrap">
                    <img src="/icons/dashboard/Require_verification.png" className="stat-card-icon" alt="Ожидают проверки" />
                    </div>
                    <div className="stat-card-content">
                    <div className="stat-card-value">{data?.pendingCheck}</div>
                    <div className="stat-card-label">Ожидают проверки</div>
                    </div>
                </Card>
                </div>
            
            <div className="tableAndSubCardsContainer">
                <Card>
                    <Table
                        title={<h3>Последние документы</h3>}
                        rightTitle={<h4><NavLink
                            key="/dashboard/documents"
                            to="/dashboard/documents"
                            className="bluesrc">Все документы →</NavLink></h4>}>
                        <thead>
                            <tr>
                                <th>Рег. номер</th>
                                <th>Название файла</th>
                                <th>Статус</th>
                                <th>Дата загрузки</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data?.recentDocuments.map((doc) => (
                                <tr 
                                    key={doc.id} 
                                    onClick={() => navigate(`/dashboard/documents/${doc.id}`, { state: { from: 'main' } })}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <td>{doc.registrationNumber}</td>
                                    <td>{doc.title}</td>
                                    <td>
                                        <span className={`status-badge ${getStatusColorClass(doc.status)}`}>
                                            {translateStatus(doc.status)}
                                        </span>
                                    </td>
                                    <td>{formatDate(String(doc.uploadedAt || doc.date))}</td>
                                </tr>
                            ))}
                        </tbody>
                    </Table>
                </Card>
                
                <div className="subCards-container">
                    <Card title={<h4>Статусы маршрутов по отделам</h4>}>
                        {groupedDepartments.map((dept) => {
                            const filteredStatuses = dept.statuses.filter(s => s.routeStatus === 'routed');
                            if (filteredStatuses.length === 0) return null;
                            return (
                                <Card key={dept.departmentId} title={<h5>{dept.departmentName}</h5>} className="card-in-card-blue-cortisol">
                                    {filteredStatuses.map((status, idx) => (
                                        <h6 key={idx} className="text-tertiary">
                                            {translateStatus(status.routeStatus)} ({status.count}) 
                                        </h6>
                                    ))}
                                </Card>
                            );
                        })}
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default MainMenu;