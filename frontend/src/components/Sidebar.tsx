import React, { useState } from "react";

const Sidebar = () => {
  const styles = `
    .butt {
      display: flex;
      flex: 1;
      height: auto;
      margin-top: 2.5px;
      margin-bottom: 2.5px;
      border-radius: 10px;
      align-items: center;
      border: none;
      cursor: pointer;
    }
    .butt.unselected:hover {
      background-color: rgba(0, 0, 0, 0.04);
      transition: 0.2s;
    }
    .butt.selected {
      background-color: rgba(129, 216, 207, 0.62);
      color: #6BCCC3;
      transition: 0.1s;
    }
    .butt.unselected {
      color: black;
      background-color: white;
      transition: 0.1s;
    }
    .buttaway {
      display: flex;
      flex: 1;
      height: auto;
      margin-top: 2.5px;
      margin-bottom: 2.5px;
      border-radius: 10px;
      align-items: center;
      border: none;
      cursor: pointer;
      color: black;
      background-color: white;
      height: 45px;
      width: 200px;
    }
    .buttaway:hover {
      background-color: rgba(0, 0, 0, 0.04);
      transition: 0.2s;
  `;

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
    <React.Fragment>
      <style>{styles}</style>
      <div
        style={{
          display: "grid",
          width: "200px",
          gridTemplateRows: "1fr 100px",
          height: "100vh",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateRows: "90px auto",
            border: "solid lightgray 1px",
            paddingLeft: "20px",
            paddingRight: "20px",
          }}>
          <div style={{ paddingTop: "25px" }}>
            <div style={{ fontSize: "20px" }}>
              <b>Умный Канцеляр</b>
            </div>
            <div style={{ fontSize: "11px", color: "gray" }}>
              Автоматизация обработки документов
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "200px",
              gridAutoRows: "45px",
            }}>
            {menuItems.map((item) => (
              <button
                key={item}
                className={`butt ${selectedButton === item ? "selected" : "unselected"}`}
                onClick={() => setSelectedButton(item)}>
                <img src="" style={{ width: "10px", height: "10px" }} alt="" />
                {item}
              </button>
            ))}
          </div>
        </div>
        <div
          style={{
            borderRight: "solid lightgray 1px",
            borderLeft: "solid lightgray 1px",
            paddingTop: "20px",
            paddingBottom: "5px",
            paddingLeft: "20px",
            paddingRight: "20px",
          }}>
          <button
            onClick={() => { }}
            className="buttaway">
            <img src="" style={{ width: "10px", height: "10px" }} alt="" />
            Выход из системы
          </button>
          <div style={{ fontSize: "12px", color: "gray" }}>
            Версия 1.0.2<br />© 2026 Умный Канцеляр
          </div>
        </div>
      </div>
    </React.Fragment>
  );
};

export default Sidebar;
