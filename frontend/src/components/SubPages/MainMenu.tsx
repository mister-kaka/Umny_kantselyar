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
                <h6 className="text-tertiary">{}+12% за месяц</h6>
            </Card>
            <Card className="main-card">
                <img src="" className="Main-cards-image" alt="✔️"/>
                <h1>{}47</h1>
                <h5 className="text-secondary">Обработано сегодня</h5>
                <h6 className="text-tertiary">{}8 в процессе</h6>
            </Card>
            <Card className="main-card">
                <img src="" className="Main-cards-image" alt="🔝"/>
                <h1>{}92,4</h1>
                <h5 className="text-secondary">Автоклассифицировано</h5>
                <h6 className="text-tertiary">{}+2.1% за неделю</h6>
            </Card>
            <Card className="main-card">
                <img src="" className="Main-cards-image" alt="❕"/>
                <h1>{}8</h1>
                <h5 className="text-secondary">Низкая уверенность</h5>
                <h6 className="text-tertiary">{}требуют проверки</h6>
            </Card>
        </div>
        <div className="tableAndSubCardsContainer">
            <Card>
                <Table
                title={<h3>Недавние документы</h3>}
                rightTitle={<h4><a className="bluesrc" href="">Все документы &#8594;</a></h4>}
                className="main-table">
                    <thead>
                        <tr>
                            <th>Рег. номер</th>
                            <th>Отправитель</th>
                            <th>Тип документа</th>
                            <th>Уверенность</th>
                            <th>Статус</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>данные</td>
                            <td>данные</td>
                            <td>данные</td>
                            <td>
                                <div className="container-for-table-bar">
                                    <div className="progress-table-bar">
                                        <div className="progress-bar-fill" style={{width: "92.1%"}}></div>
                                    </div>
                                    <h6 className="confidence-percent">92.1%</h6>
                                </div>
                            </td>
                            <td>данные</td>
                        </tr>
                        <tr>
                            <td>данные</td>
                            <td>данные</td>
                            <td>данные</td>
                            <td>
                                <div className="container-for-table-bar">
                                    <div className="progress-table-bar">
                                        <div className="progress-bar-fill" style={{width: "92.1%"}}></div>
                                    </div>
                                    <h6 className="confidence-percent">92.1%</h6>
                                </div>
                            </td>
                            <td>данные</td>
                        </tr>
                        <tr>
                            <td>данные</td>
                            <td>данные</td>
                            <td>данные</td>
                            <td>
                                <div className="container-for-table-bar">
                                    <div className="progress-table-bar">
                                        <div className="progress-bar-fill" style={{width: "92.1%"}}></div>
                                    </div>
                                    <h6 className="confidence-percent">92.1%</h6>
                                </div>
                            </td>
                            <td>данные</td>
                        </tr>
                        <tr>
                            <td>данные</td>
                            <td>данные</td>
                            <td>данные</td>
                            <td>
                                <div className="container-for-table-bar">
                                    <div className="progress-table-bar">
                                        <div className="progress-bar-fill" style={{width: "92.1%"}}></div>
                                    </div>
                                    <h6 className="confidence-percent">92.1%</h6>
                                </div>
                            </td>
                            <td>данные</td>
                        </tr>
                        <tr>
                            <td>данные</td>
                            <td>данные</td>
                            <td>данные</td>
                            <td>
                                <div className="container-for-table-bar">
                                    <div className="progress-table-bar">
                                        <div className="progress-bar-fill" style={{width: "92.1%"}}></div>
                                    </div>
                                    <h6 className="confidence-percent">92.1%</h6>
                                </div>
                            </td>
                            <td>данные</td>
                        </tr>
                        <tr>
                            <td>данные</td>
                            <td>данные</td>
                            <td>данные</td>
                            <td>
                                <div className="container-for-table-bar">
                                    <div className="progress-table-bar">
                                        <div className="progress-bar-fill" style={{width: "92.1%"}}></div>
                                    </div>
                                    <h6 className="confidence-percent">92.1%</h6>
                                </div>
                            </td>
                            <td>данные</td>
                        </tr>
                    </tbody>
                </Table>
            </Card>
            <div className="subCards-container">
                <Card title={<h4>Рекомендации</h4>}>
                    <Card title={<h5>Высокая нагрузка на Юридический отдел</h5>}
                    className="card-in-card-medium-cortisol">
                        <h6 className="text-tertiary">15 документов ожидают обработки более 6 часов</h6>
                        <h6><a href="" className="bluesrc">Перераспределить &#8594;</a></h6>
                    </Card>
                    <Card title={<h5>Низкая уверенность классификации</h5>}
                    className="card-in-card-low-cortisol">
                        <h6 className="text-tertiary">8 документов требуют ручной проверки</h6>
                        <h6><a href="" className="bluesrc">Проверить &#8594;</a></h6>
                    </Card>
                    <Card title={<h5>Отличная производительность</h5>}
                    className="card-in-card-lowest-cortisol">
                        <h6 className="text-tertiary">Точность маршрутизации выросла до 94.1%</h6>
                        <h6><a href="" className="bluesrc">Подробнее &#8594;</a></h6>
                    </Card>
                </Card>
                <Card title={<h4>Качество обработки</h4>}>
                    <div className="container-for-bar-card">
                        <div className="bar-card-container-block-left"><h5 className="text-secondary">Точность классификации</h5></div>
                        <div className="bar-card-container-block-right"><h4>92.4%</h4></div>
                    </div>
                    <div className="progress-bar">
                        <div className="progress-bar-fill" style={{width: "92.4%"}}></div>
                    </div>
                    <div className="container-for-bar-card">
                        <div className="bar-card-container-block-left"><h5 className="text-secondary">Точность извлечения</h5></div>
                        <div className="bar-card-container-block-right"><h4>89.7%</h4></div>
                    </div>
                    <div className="progress-bar">
                        <div className="progress-bar-fill" style={{width: "89.7%"}}></div>
                    </div>
                    <div className="container-for-bar-card">
                        <div className="bar-card-container-block-left"><h5 className="text-secondary">Корректность маршрутизации</h5></div>
                        <div className="bar-card-container-block-right"><h4>92.1%</h4></div>
                    </div>
                    <div className="progress-bar">
                        <div className="progress-bar-fill" style={{width: "92.1%"}}></div>
                    </div>
                </Card>
                <Card className="card-blue">
                    <img className="Main-cards-image" alt="🕓"/>
                    <h4>Очередь проверки</h4>
                    <h5>8 документов требуют вашего внимания</h5>
                    <h5><a href="">Перейти к проверке</a></h5>
                </Card>
            </div>
        </div>
    </div>
    )
}


export default MainMenu
