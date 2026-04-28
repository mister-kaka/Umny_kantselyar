import "../../styles/global.css";
import React, { useState, useEffect } from 'react';
import Card from "../Card";
import Table from "../Table";
import "../../styles/Dashboard.css";
import "../../styles/DocumentsListPage.css";
import { DashboardData } from "../../types";
import { translateStatus } from "./MainMenu";
import { useNavigate } from 'react-router-dom';
import { DropdownButton, DateFilterDropdown } from "../DropdownButton";

const DocumentsListPage = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const navigate = useNavigate();

  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const toggleFilter = (filterId: string) => {
    setActiveFilter(prev => (prev === filterId ? null : filterId));
  };

  const handleRowClick = (id: number) => {
    navigate(`/documents/${id}`);
  };

  return (
    <div>
      <div className="Go_Back_And_Filters_Container">
        <Card>
          <DateFilterDropdown
            onFilterChange={(range) => console.log('Фильтр:', range)}
            icon={<img src="/DashboardPage_Images/Date.png" alt="📅" />}
            isOpen={activeFilter === 'date'}
            onToggle={() => toggleFilter('date')}/>
          <DropdownButton
            options={['Вариант 1', 'Вариант 2', 'Вариант 3']}
            onSelect={(option) => console.log(option)}
            icon={<img src="/DashboardPage_Images/Source.png" alt="⛲" />}
            defaultLabel="Источник"
            isOpen={activeFilter === 'source'}
            onToggle={() => toggleFilter('source')}/>
          <DropdownButton
            options={['Договор', 'Письмо', 'Счёт-фактура', 'Обращение', 'Акт', 'Предписание', 'Счёт', 'Уведомление']}
            onSelect={(option) => console.log(option)}
            icon={<img src="/DashboardPage_Images/DocumentType.png" alt="📄" />}
            defaultLabel="Тип документа"
            isOpen={activeFilter === 'docType'}
            onToggle={() => toggleFilter('docType')}/>
          <DropdownButton
            options={['Поставка оборудования', 'Административная переписка', 'Финансовые документы', 'Кадровые вопросы', 'Техническое обслуживание', 'Юридические документы']}
            onSelect={(option) => console.log(option)}
            icon={<img src="/DashboardPage_Images/Category.png" alt="🗂️" />}
            defaultLabel="Категория"
            isOpen={activeFilter === 'category'}
            onToggle={() => toggleFilter('category')}/>
          {/* <DropdownButton
            options={['100%', '99% - 90%', '89% - 80%', '79% - 0%']}
            onSelect={(option) => console.log(option)}
            icon={<img src="/DashboardPage_Images/Confidence.png" alt="💯" />}
            defaultLabel="Уверенность"
            isOpen={activeFilter === 'confidence'}
            onToggle={() => toggleFilter('confidence')}/> */}
          <DropdownButton
            options={['Маршрутизирован', 'Готов к проверке', 'В работе', 'Завершено']}
            onSelect={(option) => console.log(option)}
            icon={<img src="/DashboardPage_Images/Status.png" alt="🟢🟡🔴" />}
            defaultLabel="Статус"
            isOpen={activeFilter === 'status'}
            onToggle={() => toggleFilter('status')}/>
        </Card>
      </div>
      <Card>
        <Table title={<h4>Все документы ()</h4>}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Тема</th>
              <th>Отправитель</th>
              <th>Дата</th>
              <th>Тип</th>
              <th>Категория</th>
              <th>Статус</th>
              <th>Отдел</th>
            </tr>
          </thead>
          <tbody>
            <tr onClick={() => handleRowClick(1)} style={{ cursor: 'pointer' }}>
              <td><a href="#">Данные</a></td>
              <td>Данные</td>
              <td>Данные</td>
              <td>Данные</td>
              <td>Данные</td>
              <td>Данные</td>
              <td>Данные</td>
              <td>Данные</td>
            </tr>
          </tbody>
        </Table>
      </Card>
    </div>
  );
};

export default DocumentsListPage;
