import "./../styles/global.css";
import "./../styles/Search.css";
import "./../styles/DocumentsListPage.css";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchDocuments, searchAi } from './../services/api';
import { DocumentListItem, AiSearchResponse } from './../types';
import { translateStatus, getStatusColor } from './SubPages/MainMenu';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

const SUGGESTIONS = [
  'договор', 'счёт', 'акт', 'письмо', 'обращение', 'уведомление',
  'жалоба', 'заявление', 'приказ', 'протокол', 'предписание',
  'бухгалтерия', 'технический отдел', 'юридический', 'кадры', 'закупки',
];

const HISTORY_KEY = 'search_history';
const MAX_HISTORY = 5;

const getHistory = (): string[] => {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveToHistory = (query: string) => {
  const trimmed = query.trim();
  if (!trimmed) return;
  const history = getHistory().filter(h => h !== trimmed);
  history.unshift(trimmed);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
};

const FAST_TOOLTIP = `Быстрый поиск

Рекомендуем начинать с него.

Ищет точные совпадения по всему содержимому.
Не понимает смысл запроса.
Работает мгновенно.

Примеры:
• ВХ-2026-005 - найдёт по номеру
• договор поставки - все документы с этими словами
• бухгалтерия - документы, уже назначенные в отдел
• Лукойл - все документы от этого отправителя

Если не нашли документ - переключитесь на умный.`;

const AI_TOOLTIP = `Умный поиск (AI)

Используйте когда быстрый не дал результата
или ищете по смыслу, а не по точным словам.

• Понимает суть запроса
• Исправляет опечатки и раскладку клавиатуры
• Определяет тип, категорию, отдел из запроса
• В большинстве случаев находит точнее

Примеры:
• счета от Лукойла - поймёт тип + отправителя
• бухгалтерия - все документы для отдела,
  даже если ещё не назначены оператором
• ДТП март - акты о происшествиях в марте
• ГИБДД - поймёт аббревиатуру госоргана

Работает медленнее быстрого.
AI не гарантирует 100% точность.`;

const Search: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'fast' | 'ai'>('fast');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [totalResults, setTotalResults] = useState(0);
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>(getHistory);
  const [showHistory, setShowHistory] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(query, mode === 'fast' ? 400 : 600);

  const fetchFastSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setError(null);
      setIsOpen(false);
      return;
    }
    setLoading(true);
    setError(null);
    setFallbackMessage(null);
    setIsOpen(true);
    try {
      const data = await searchDocuments(searchQuery);
      setResults(data);
      setTotalResults(data.length);
      if (data.length === 0) {
        setFallbackMessage('Ничего не найдено. Попробуйте умный поиск - он понимает смысл запроса.');
      }
    } catch {
      setError('Ошибка поиска');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchAiSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setError(null);
      setIsOpen(false);
      return;
    }
    setLoading(true);
    setError(null);
    setFallbackMessage(null);
    setIsOpen(true);
    try {
      const data: AiSearchResponse = await searchAi(searchQuery);
      setResults(data.items || []);
      setTotalResults(data.total || 0);
      if (data.total === 0) {
        setFallbackMessage('Умный поиск не нашёл совпадений. Попробуйте изменить запрос.');
      }
    } catch {
      setError('Ошибка умного поиска');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const executeSearch = useCallback((searchQuery: string, searchMode: 'fast' | 'ai') => {
    if (!searchQuery.trim()) return;

    saveToHistory(searchQuery);
    setHistory(getHistory());
    setQuery(searchQuery);
    setShowSuggestions(false);
    setShowHistory(false);
    setResults([]);
    setError(null);
    setFallbackMessage(null);
    setLoading(true);
    setIsOpen(true);

    if (searchMode === 'fast') {
      fetchFastSearch(searchQuery);
    } else {
      fetchAiSearch(searchQuery);
    }
  }, [fetchFastSearch, fetchAiSearch]);

  useEffect(() => {
    if (!debouncedQuery.trim()) return;
    saveToHistory(debouncedQuery);
    setHistory(getHistory());
    setShowSuggestions(false);
    setShowHistory(false);
    setResults([]);
    setError(null);
    setFallbackMessage(null);
    setLoading(true);
    setIsOpen(true);

    if (mode === 'fast') {
      fetchFastSearch(debouncedQuery);
    } else {
      fetchAiSearch(debouncedQuery);
    }
  }, [debouncedQuery, mode, fetchFastSearch, fetchAiSearch]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setShowSuggestions(false);
        setShowHistory(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    if (value.trim().length > 0) {
      const filtered = SUGGESTIONS.filter(s =>
        s.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 6);
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setShowHistory(false);
    } else {
      setFilteredSuggestions([]);
      setShowSuggestions(false);
      setShowHistory(history.length > 0);
      setIsOpen(false);
    }
  };

  const handleSelect = (id: number) => {
    setIsOpen(false);
    setShowSuggestions(false);
    setShowHistory(false);
    setQuery('');
    navigate(`/dashboard/documents/${id}`, { state: { from: 'search' } });
  };

  const handleSuggestionClick = (suggestion: string) => {
    executeSearch(suggestion, mode);
  };

  const handleHistoryClick = (historyItem: string) => {
    executeSearch(historyItem, mode);
  };

  const handleEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && query.trim()) {
      saveToHistory(query);
      setHistory(getHistory());
      if (results.length > 0) {
        navigate(`/dashboard/documents/${results[0].id}`, { state: { from: 'search' } });
        setIsOpen(false);
        setShowSuggestions(false);
        setShowHistory(false);
      } else {
        navigate(`/dashboard/documents?search=${encodeURIComponent(query.trim())}`);
        setIsOpen(false);
        setShowSuggestions(false);
        setShowHistory(false);
      }
    }
  };

  const handleRetry = () => {
    if (mode === 'fast') {
      fetchFastSearch(debouncedQuery);
    } else {
      fetchAiSearch(debouncedQuery);
    }
  };

  const switchToAi = () => {
    setMode('ai');
    if (query.trim()) {
      executeSearch(query.trim(), 'ai');
    }
  };

  const toggleMode = () => {
    setMode(prev => prev === 'fast' ? 'ai' : 'fast');
  };

  const currentTooltip = mode === 'fast' ? FAST_TOOLTIP : AI_TOOLTIP;
  const modeLabel = mode === 'fast' ? 'Быстрый' : 'Умный';

  return (
    <div ref={containerRef} className="Search-dropdown">
      <div className="Search">
        <span className="Search-icon">
          <img src="/icons/header/Search.png" alt="🔍" className="Search-icon" />
        </span>
        <input
          ref={inputRef}
          type="text"
          className="Search-input"
          placeholder="Введите запрос для поиска..."
          value={query}
          onChange={handleChange}
          onKeyDown={handleEnter}
          onFocus={() => {
            if (query.trim().length > 0 && filteredSuggestions.length > 0) {
              setShowSuggestions(true);
            } else if (!query.trim() && history.length > 0) {
              setShowHistory(true);
            }
          }}
        />
        <div className="Search-controls">
          <span
            className="search-help-icon"
            data-tooltip={currentTooltip}
          >ⓘ</span>
          <button
            className={`search-mode-btn ${mode === 'ai' ? 'ai-active' : ''}`}
            onClick={toggleMode}
            title={mode === 'fast' ? 'Переключить на умный поиск' : 'Переключить на быстрый поиск'}
          >
            {modeLabel}
          </button>
        </div>
      </div>

      {showHistory && history.length > 0 && (
        <ul className="Search-dropdown-menu search-history">
          <li className="search-history-title">Недавние запросы</li>
          {history.map((item, idx) => (
            <li
              key={idx}
              className="search-history-item"
              onClick={() => handleHistoryClick(item)}
            >
              <span className="search-history-icon">↻</span>
              {item}
            </li>
          ))}
        </ul>
      )}

      {showSuggestions && filteredSuggestions.length > 0 && (
        <ul className="Search-dropdown-menu search-suggestions">
          {filteredSuggestions.map((suggestion, idx) => (
            <li
              key={idx}
              className="search-suggestion-item"
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <span className="search-suggestion-icon">⌕</span>
              {suggestion}
            </li>
          ))}
        </ul>
      )}

      {isOpen && (
        <ul className="Search-dropdown-menu document-search-results">
          {loading && (
            <li className="Search-loading">
              {mode === 'ai' ? (
                <div className="search-ai-loading">
                  <span className="search-ai-loading-text">AI анализирует запрос</span>
                  <span className="search-ai-dots">
                    <span>.</span><span>.</span><span>.</span>
                  </span>
                </div>
              ) : (
                'Поиск...'
              )}
            </li>
          )}
          {!loading && error && (
            <li className="Search-error">
              <span>{error} — </span>
              <button className="apply-button" onClick={handleRetry}>
                Повторить
              </button>
            </li>
          )}
          {!loading && !error && results.length === 0 && (
            <li className="Search-empty">
              <p>{fallbackMessage || 'Ничего не найдено'}</p>
              {mode === 'fast' && fallbackMessage && (
                <button className="apply-button search-ai-try-btn" onClick={switchToAi}>
                  Попробовать умный поиск
                </button>
              )}
            </li>
          )}
          {!loading && !error && results.map((doc) => (
            <li
              key={doc.id}
              onClick={() => handleSelect(doc.id)}
              className="document-search-item">
              <div className="doc-search-main">
                <span className="doc-search-reg">{doc.registrationNumber}</span>
                <span className="doc-search-title">{doc.title}</span>
                <span className="doc-search-sender">{doc.senderName}</span>
              </div>
              <span className={`status-badge ${getStatusColor(doc.currentStatus)}`}>
                {translateStatus(doc.currentStatus)}
              </span>
            </li>
          ))}
          {!loading && !error && results.length > 0 && (
            <li className="Search-footer">
              Найдено: {totalResults} · {modeLabel} поиск
            </li>
          )}
        </ul>
      )}
    </div>
  );
};

export default Search;