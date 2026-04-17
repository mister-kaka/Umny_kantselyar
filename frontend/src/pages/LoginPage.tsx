import React, { useState } from 'react';
import '../styles/LoginPage.css';
import { login } from '../services/api';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [loginError, setLoginError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
    } else if (password.length < 6) {
      setPasswordError('Пароль должен быть не менее 6 символов');
      hasError = true;
    }

    // если нет ошибок формата - вызываем API
    if (!hasError) {
      try {
        const data = await login(email, password);

        if (rememberMe) {
          localStorage.setItem('access_token', data.access_token);
        } else {
          sessionStorage.setItem('access_token', data.access_token);
        }
        
        navigate('/dashboard');
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
            <h3 className="text-primary">Автоматизация обработки входящих документов с помощью ИИ</h3>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Электронная почта</label>
              <div className="input-wrapper">
                <input
                  type="email"
                  placeholder="admin@example.ru"
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
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                /> 
                Запомнить меня
              </label>
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
          <img src="../LoginPage_Images/paper.png" alt="картинка" className="info-image" />
          <h2>Умная обработка документов</h2>
          <p>Автоматическое распознавание, классификация и маршрутизация входящих документов с использованием искусственного интеллекта</p>
        </div>
        
        <div className="list">
          <li>Автоклассификация документов</li>
          <li>Интеллектуальная маршрутизация</li>
          <li>Аналитика в реальном времени</li>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;