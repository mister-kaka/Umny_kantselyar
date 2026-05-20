import "./../styles/global.css";
import "./../styles/Search.css";
import "./../styles/DocumentsListPage.css";
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchDocuments } from './../services/api';
import { DocumentListItem } from './../types';
import { translateStatus, getStatusColor } from './SubPages/MainMenu';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

const Search: React.FC = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const debouncedQuery = useDebounce(query, 400);

  const fetchResults = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setError(null);
      setIsOpen(false);
      return;
    }
    setLoading(true);
    try {
      const data = await searchDocuments(searchQuery);
      setResults(data);
      setError(null);
      setIsOpen(true);
    } catch (e) {
      setError('Ошибка поиска');
      setResults([]);
      setIsOpen(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResults(debouncedQuery);
  }, [debouncedQuery, fetchResults]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  const handleSelect = (id: number) => {
    setIsOpen(false);
    setQuery('');
    navigate(`/dashboard/documents/${id}`);
  };

const handleEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === 'Enter' && query.trim()) {
    if (results.length > 0) {
      navigate(`/dashboard/documents/${results[0].id}`);
      setIsOpen(false);
    }
  }
};

  const handleRetry = () => {
    fetchResults(debouncedQuery);
  };

  return (
    <div ref={containerRef} className="Search-dropdown">
      <div className="Search">
        <span className="Search-icon">
          <img src="/DashboardPage_Images/Search.jpg" alt="🔍" className="Search-icon" />
        </span>
        <input
          ref={inputRef}
          type="text"
          className="Search-input"
          placeholder="Поиск по документам, номерам, отправителям"
          value={query}
          onChange={handleChange}
          onKeyDown={handleEnter}/>
      </div>

      {isOpen && (
        <ul className="Search-dropdown-menu document-search-results">
          {loading && (
            <li className="Search-loading">Загрузка...</li>
          )}
          {!loading && error && (
            <li className="Search-error">
              <span>{error} - </span>
              <button className="apply-button" onClick={handleRetry}>
                Повторить
              </button>
            </li>
          )}
          {!loading && !error && results.length === 0 && (
            <li className="Search-loading">Ничего не найдено</li>
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
        </ul>
      )}
    </div>
  );
};

export default Search;