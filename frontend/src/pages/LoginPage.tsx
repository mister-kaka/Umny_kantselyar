
import React, { useState } from 'react';
import './LoginPage.css';
import { login } from '../services/api';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loginError, setLoginError] = useState('');


const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();

  // Сбрасываем ошибки
  setEmailError('');
  setPasswordError('');
  setLoginError('');

  let hasError = false;

  // проверка почты
  if (!email) {
    setEmailError('Введите email');
    hasError = true;
  } else if (!email.includes('@')) {
    setEmailError('Неверный формат email');
    hasError = true;
  }

  // проверка пароля
  if (!password) {
    setPasswordError('Введите пароль');
    hasError = true;
  } else if (password.length < 4) {
    setPasswordError('Пароль должен быть не менее 4 символов');
    hasError = true;
  }

// если нет ошибок формата - вызываем API
if (!hasError) {
  try {
    const data = await login(email, password); // вызываем твой API login
    localStorage.setItem('access_token', data.token); // сохраняем токен
    window.location.href = '/dashboard'; // переходим на дашборд
  } catch (error) {
    setLoginError('Ошибка логина: неверный email/пароль или сервер недоступен');
  }
}
  };


  return (
    <div className="login-page">
      <div className="login-left">
        <div className="logo-block">
        </div>

        <div className="login-card">
          <div>
            <h2>
              <span className="square"></span>
            Умный Канцеляр
            </h2>
            <h3>Автоматизация обработки входящих документов с помощью ИИ</h3>
          </div>
          <form onSubmit={handleSubmit}>

            
<div className="form-group">
  <label>Электронная почта</label>
  <div className="input-wrapper">
    <input
      type="email"
      placeholder="йоу@example.ru"
      value={email}
      onChange={(e) => setEmail(e.target.value)}
      className={emailError ? 'error-input' : ''}
    />
    {emailError && (
      <div className="error-message-top-right">
         {emailError}
      </div>
    )}
  </div>
</div>

<div className="form-group">
  <label>Пароль</label>
  <div className="input-wrapper">
    <input
      type="password" 
      placeholder="••••••••"
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      className={passwordError ? 'error-input' : ''}
    />
    {passwordError && (
      <div className="error-message-top-right">
        {passwordError}
      </div>
    )}
  </div>
</div>

            <div className="checkbox-wrapper">
              <label>
                <input type="checkbox" /> Запомнить меня
              </label>
              <button type="button" className="forgot-link">Забыли пароль?</button>
            </div>

            {loginError && <div className="error-message">{loginError}</div>}
            <button type="submit" className="login-btn">Войти</button>
          </form>

          <div className="footer-text">
            Система предназначена для автоматизации документооборота транспортных предприятий
          </div>
        </div>
      </div>

      <div className="login-right">
        <div className="info-card">
          <img src="https://icon-icons.com/ko/icon/happy-emoji-smile-document-page/218637" alt="картинка" className="info-image" />
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