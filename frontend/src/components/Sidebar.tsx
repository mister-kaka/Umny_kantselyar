import React, { useState } from "react";
import "../styles/global.css"

const Sidebar = () => {
  const [selectedButton, setSelectedButton] = useState<string>("Главная");

  const menuItems = [
    "Главная",
    "Входящие документы",
    "Очередь проверки",
    "Маршрутизация",
    "Подразделения",
    "Аналитика",
    "Настройки",
    "Уведомления",
  ];

  return (
    <div className="sidebar" style={{display:"grid", paddingTop: "12px"}}>
      <div>
        <div style={{margin: "12px"}}>
          <h3>
            Умный Канцеляр
          </h3>
          <h6 className="text-secondary">
            Автоматизация обработки документов
          </h6>
        </div>
        {menuItems.map((item) => (
          <button style={{border: "none", width: "stretch"}}
            key={item}
            className={`sidebar-item ${selectedButton === item ? "active" : ""}`}
            onClick={() => setSelectedButton(item)}>
            <img src="" style={{ width: "10px", height: "10px" }} alt="" />
            {item}
          </button>
        ))}
      </div>
      <div style={{height: "55px", borderTop: "1px solid var(--border-color)"}}>
        <button style={{border: "none", width: "stretch"}}
          onClick={() => { }}
          className="sidebar-item">
          <img src="" style={{ width: "10px", height: "10px" }} alt="" />
          Выход из системы
        </button>
        <h6 className="text-secondary" style={{margin: "12px"}}>
          Версия 1.0.2<br />© 2026 Умный Канцеляр
        </h6>
      </div>
    </div>
  );
};

export default Sidebar;
