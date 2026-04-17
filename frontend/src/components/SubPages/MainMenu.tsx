import "../../styles/global.css";
import React, { useState, useEffect } from 'react';
import Card from "../Card";
import Table from "../Table";
import "../../styles/Dashboard.css";
import { getDashboard } from "../../services/api";
import { DashboardData, GroupedDepartment } from "../../types";

const translateStatus = (status: string): string => {
    const statusMap: Record<string, string> = {
        'in_progress': 'в работе',
        'pending': 'на проверке',
        'completed': 'завершено',
        'approved': 'одобрено',
        'in_review': 'на рассмотрении',
        'sent': 'отправлено',
        'rejected': 'отклонено'
    };
    return statusMap[status] || status;
};

const groupByDepartment = (data: DashboardData | null): GroupedDepartment[] => {
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
                    <img src="/Dashboard_Images/Docs.png"
                        className="Main-cards-image" alt="📄"/>
                    <h1>{data?.totalDocuments}</h1>
                    <h5 className="text-secondary">Всего входящих</h5>
                </Card>
                <Card className="main-card">
                    <img src="/Dashboard_Images/check-mark-icon.png"
                        className="Main-cards-image" alt="✔️"/>
                    <h1>{data?.inProgress}</h1>
                    <h5 className="text-secondary">В обработке</h5>
                </Card>
                <Card className="main-card">
                    <img src=
                        "/Dashboard_Images/exclamation-mark-icon.png"
                        className="Main-cards-image" alt="❕"/>
                    <h1>{data?.pendingCheck}</h1>
                    <h5 className="text-secondary">Требуют проверки</h5>
                </Card>
            </div>
            
            <div className="tableAndSubCardsContainer">
                <Card>
                    <Table
                        title={<h3>Последние документы</h3>}
                        rightTitle={<h4><a className="bluesrc" href="">Все документы →</a></h4>}
                    >
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Название</th>
                                <th>Статус</th>
                                <th>Дата</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data?.recentDocuments.map((doc) => (
                                <tr key={doc.id}>
                                    <td><a href="#">{doc.id}</a></td>
                                    <td>{doc.title}</td>
                                    <td>{translateStatus(doc.status)}</td> 
                                    <td>{doc.date}</td>
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
