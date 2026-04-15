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
            <h2>Добро пожаловать! </h2>
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
                <h5 className="text-secondary">В обработке</h5>
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
                            <td><a href="">ВХ-2026-015</a></td>
                            <td>Акт сверки взаимных расчётов</td>
                            <td>Завершён</td>
                            <td>2026-04-11</td>
                        </tr>
                        <tr>
                            <td><a href="">ВХ-2026-014</a></td>
                            <td>Счёт на оплату услуг связи</td>
                            <td>Одобрен</td>
                            <td>2026-04-10</td>
                        </tr>
                        <tr>
                            <td><a href="">ВХ-2026-013</a></td>
                            <td>Уведомление о повышении цен</td>
                            <td>На рассмотрении</td>
                            <td>2026-04-10</td>
                        </tr>
                        <tr>
                            <td><a href="">ВХ-2026-012</a></td>
                            <td>Обращение сотрудника по кадровому вопросу</td>
                            <td>На проверке</td>
                            <td>2026-04-09</td>
                        </tr>
                        <tr>
                            <td><a href="">ВХ-2026-011</a></td>
                            <td>Письмо о продлении гарантии</td>
                            <td>На проверке</td>
                            <td>2026-04-09</td>
                        </tr>
                        <tr>
                            <td><a href="">ВХ-2026-010</a></td>
                            <td>Договор аренды помещения</td>
                            <td>Одобрен</td>
                            <td>2026-04-08</td>
                        </tr>
                    </tbody>
                </Table>
            </Card>
            <div className="subCards-container">
                <Card title={<h4>Статусы маршрутов по отделам</h4>}>
                    <Card title={<h5>Управление</h5>}
                    className="card-in-card-blue-cortisol">
                        <h6 className="text-tertiary">3 в работе</h6>
                        <h6 className="text-tertiary">2 на проверке</h6>
                        <h6 className="text-tertiary">1 завершено</h6>
                    </Card>
                    <Card title={<h5>Технический отдел</h5>}
                    className="card-in-card-blue-cortisol">
                        <h6 className="text-tertiary">3 в работе</h6>
                        <h6 className="text-tertiary">2 на проверке</h6>
                        <h6 className="text-tertiary">1 завершено</h6>
                    </Card>
                    <Card title={<h5>Бухгалтерия</h5>}
                    className="card-in-card-blue-cortisol">
                        <h6 className="text-tertiary">3 в работе</h6>
                        <h6 className="text-tertiary">2 на проверке</h6>
                        <h6 className="text-tertiary">1 завершено</h6>
                    </Card>
                    <Card title={<h5>Отдел закупок</h5>}
                    className="card-in-card-blue-cortisol">
                        <h6 className="text-tertiary">3 в работе</h6>
                        <h6 className="text-tertiary">2 на проверке</h6>
                        <h6 className="text-tertiary">1 завершено</h6>
                    </Card>
                    <Card title={<h5>Юридический отдел</h5>}
                    className="card-in-card-blue-cortisol">
                        <h6 className="text-tertiary">3 в работе</h6>
                        <h6 className="text-tertiary">2 на проверке</h6>
                        <h6 className="text-tertiary">1 завершено</h6>
                    </Card>
                    <Card title={<h5>Отдел кадров</h5>}
                    className="card-in-card-blue-cortisol">
                        <h6 className="text-tertiary">3 в работе</h6>
                        <h6 className="text-tertiary">2 на проверке</h6>
                        <h6 className="text-tertiary">1 завершено</h6>
                    </Card>
                </Card>
            </div>
        </div>
    </div>
    )
}

export default MainMenu
