
import React from 'react';
import './LoginPage.css';

const LoginPage = () => {
  return (
    <div className="login-page">
      <div className="login-left">
        <div className="logo-block">
          <div className="logo-placeholder"></div>
        </div>

        <div className="login-card">
          <div>
            <h2>
              <span className="square"></span>
            Умный Канцеляр
            </h2>
            <h3>Автоматизация обработки входящих документов с помощью ИИ</h3>
          </div>
          <form>
            <div className="form-group">
              <label>Электронная почта</label>
              <input type="email" placeholder="йоу@example.ru" />
            </div>

            <div className="form-group">
              <label>Пароль</label>
              <input type="password" placeholder="••••••••" />
            </div>

            <div className="checkbox-wrapper">
              <label>
                <input type="checkbox" /> Запомнить меня
              </label>
              <button type="button" className="forgot-link">Забыли пароль?</button>
            </div>

            <button type="submit" className="login-btn">Войти</button>
          </form>

          <div className="footer-text">
            Система предназначена для автоматизации документооборота транспортных предприятий
          </div>
        </div>
      </div>



        /*правая сторона*/

      <div className="login-right">
        <div className="info-card">
          <div className="info-image">картиночка</div>
          <h2>Умная обработка документов</h2>
          <p>Автоматическое распознавание, классификация и маршрутизация входящих документов с использованием искусственного интеллекта</p>
        </div>
        <p>OCR и извлечение данных</p>
        <p>Автоклассификация документов</p>
        <p>Интеллектуальная маршрутизация</p>
        <p>Аналитика в реальном времени</p>
      </div>
    </div>
  );
};

export default LoginPage;