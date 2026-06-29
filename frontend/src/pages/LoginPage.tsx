import React, { useState } from 'react';
import '../styles/LoginPage.css';
import { login } from '../services/api';
import { useNavigate } from 'react-router-dom';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

    if (!email) {
      setEmailError('Введите email');
      hasError = true;
    } else if (!email.includes('@')) {
      setEmailError('Неверный формат email');
      hasError = true;
    }

    if (!password) {
      setPasswordError('Введите пароль');
      hasError = true;
    } else if (password.length < 6) {
      setPasswordError('Пароль должен быть не менее 6 символов');
      hasError = true;
    }

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
                  type={showPassword ? 'text' : 'password'} 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={passwordError ? 'error-input' : ''}
                />
                <button
                  type="button"
                  className="login-password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8s3-5 6-5 6 5 6 5-3 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8s3-5 6-5 6 5 6 5-3 5-6 5-6-5-6-5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/><path d="M4 4l8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                  )}
                </button>
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
          <img src="../logo/logo.png" alt="картинка" className="info-image" />
          <h2>Умная обработка документов</h2>
          <p>Автоматическое распознавание, классификация и маршрутизация входящих документов с использованием искусственного интеллекта</p>
        </div>
        
        <ul className="list">
          <li>Автоклассификация документов</li>
          <li>Интеллектуальная маршрутизация</li>
          <li>Аналитика в реальном времени</li>
        </ul>
      </div>
    </div>
  );
};

export default LoginPage;