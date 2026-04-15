import "../../styles/global.css";
import React, { useState, useEffect } from 'react';
import Card from "../Card";
import Table from "../Table";
import "../../styles/Dashboard.css"
const MainMenu = () => {
    const [date, setDate] = useState<string>('');

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
    return (
    <div>
        <div className="Heading-main-text">
            <h2>Добро пожаловать, {}</h2>
            <h4 className="text-secondary">
                Сегодня {date}
            </h4>
        </div>
        <div className="Main-cards-container">
            <Card className="main-card">
                <img src="" className="Main-cards-image" alt="📄"/>
                <h1>{}1,284</h1>
                <h5 className="text-secondary">Всего входящих</h5>
            </Card>
            <Card className="main-card">
                <img src="" className="Main-cards-image" alt="✔️"/>
                <h1>{}47</h1>
                <h5 className="text-secondary">Обработано за всё время</h5>
            </Card>
            <Card className="main-card">
                <img src="" className="Main-cards-image" alt="❕"/>
                <h1>{}8</h1>
                <h5 className="text-secondary">Требуют проверки</h5>
            </Card>
        </div>
        <div className="tableAndSubCardsContainer">
            <Card>
                <Table
                title={<h3>Недавние документы</h3>}
                rightTitle={<h4><a className="bluesrc" href="">Все документы &#8594;</a></h4>}>
                    <thead>
                        <tr>
                            <th>Номер</th>
                            <th>Название</th>
                            <th>Статус</th>
                            <th>Дата</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><span>данные</span></td>
                            <td>данные</td>
                            <td>данные</td>
                            <td>данные</td>
                        </tr>
                        <tr>
                            <td><span>данные</span></td>
                            <td>данные</td>
                            <td>данные</td>
                            <td>данные</td>
                        </tr>
                        <tr>
                            <td><span>данные</span></td>
                            <td>данные</td>
                            <td>данные</td>
                            <td>данные</td>
                        </tr>
                        <tr>
                            <td><span>данные</span></td>
                            <td>данные</td>
                            <td>данные</td>
                            <td>данные</td>
                        </tr>
                        <tr>
                            <td><span>данные</span></td>
                            <td>данные</td>
                            <td>данные</td>
                            <td>данные</td>
                        </tr>
                        <tr>
                            <td><span>данные</span></td>
                            <td>данные</td>
                            <td>данные</td>
                            <td>данные</td>
                        </tr>
                    </tbody>
                </Table>
            </Card>
            <div className="subCards-container">
                <Card title={<h4>Статусы маршрутов по отделам</h4>}>
                    <Card title={<h5>Управление</h5>}
                    className="card-in-card-blue-cortisol">
                        <h6 className="text-tertiary">3 в работе</h6>
                        <h6 className="text-tertiary">2 на проверки</h6>
                        <h6 className="text-tertiary">1 завершено</h6>
                    </Card>
                    <Card title={<h5>Технический отдел</h5>}
                    className="card-in-card-blue-cortisol">
                        <h6 className="text-tertiary">3 в работе</h6>
                        <h6 className="text-tertiary">2 на проверки</h6>
                        <h6 className="text-tertiary">1 завершено</h6>
                    </Card>
                    <Card title={<h5>Бухгалтерия</h5>}
                    className="card-in-card-blue-cortisol">
                        <h6 className="text-tertiary">3 в работе</h6>
                        <h6 className="text-tertiary">2 на проверки</h6>
                        <h6 className="text-tertiary">1 завершено</h6>
                    </Card>
                    <Card title={<h5>Отдел закупок</h5>}
                    className="card-in-card-blue-cortisol">
                        <h6 className="text-tertiary">3 в работе</h6>
                        <h6 className="text-tertiary">2 на проверки</h6>
                        <h6 className="text-tertiary">1 завершено</h6>
                    </Card>
                    <Card title={<h5>Юридический отдел</h5>}
                    className="card-in-card-blue-cortisol">
                        <h6 className="text-tertiary">3 в работе</h6>
                        <h6 className="text-tertiary">2 на проверки</h6>
                        <h6 className="text-tertiary">1 завершено</h6>
                    </Card>
                    <Card title={<h5>Отдел кадров</h5>}
                    className="card-in-card-blue-cortisol">
                        <h6 className="text-tertiary">3 в работе</h6>
                        <h6 className="text-tertiary">2 на проверки</h6>
                        <h6 className="text-tertiary">1 завершено</h6>
                    </Card>
                </Card>
            </div>
        </div>
    </div>
    )
}

export default MainMenu
