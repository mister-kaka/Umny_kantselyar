import React from 'react';
import "../styles/global.css";
import "../styles/DocumentsListPage.css"

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
}

const Pagination: React.FC<PaginationProps> = ({ page, totalPages, onPageChange }) => {
  if (totalPages <= 1) return null; 

  return (
    <div className='paginationWrapper'>
      <button disabled={page <= 1} onClick={() => onPageChange(page - 1)} className='apply-button'>
        ← Назад
      </button>
      <span>Страница {page} из {totalPages}</span>
      <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className='apply-button'>
        Вперёд →
      </button>
    </div>
  );
};

export default Pagination;