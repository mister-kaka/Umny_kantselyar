import React, { useState } from 'react';
import { useParams } from 'react-router-dom'; 
import "../styles/global.css";
import "../styles/DocumentCard.css";
import { getDocumentById } from '../services/api';
import { DocumentCard } from '../types';

const DocumentCardPage: React.FC = () => {
  const { id } = useParams<{ id: string }>(); 
  const [activeTab, setActiveTab] = useState<"overview" | "ocr" | "entities" | "history" >("overview");
  
  return (
    <div className="document-page">
      <div className="doc-header">
        <div>
          <h1>Проверка документа</h1>
          <div className="doc-number">ВХ-2026-001234</div>
        </div>
        <div className="confidence-badge">Уверенность: 94%</div>
      </div>

      <div className="two-columns">
        <div className="document-preview">
          <h2>ДОГОВОР ПОСТАВКИ № 2026/ТТ-145</h2>
          <p className="doc-date">От 20 марта 2026 года</p>
          <p>Настоящий договор заключен между:</p>

          <div className="party">
            <strong>Заказчик:</strong>
            <p>АО "Московский Метрополитен"<br />Адрес: г. Москва, ул. Каланчевская, д. 13<br />ИНН: 7702005605</p>
          </div>

          <div className="party">
            <strong>Поставщик:</strong>
            <p>ООО "Транспортные Технологии"<br />Адрес: г. Москва, Варшавское шоссе, д. 47<br />ИНН: 7725123456</p>
          </div>

          <p><strong>Предмет договора:</strong> Поставка запасных частей для вагонов метро модели 81-765/766/767 "Москва" в количестве согласно спецификации.</p>
          <p><strong>Сумма договора:</strong> 12 450 000 (Двенадцать миллионов четыреста пятьдесят тысяч) рублей 00 копеек, включая НДС 20%.</p>
          <p><strong>Срок поставки:</strong> до 30 июня 2026 года.</p>
        </div>

        <div className="right-panel">
          <div className="tabs">
            <button className={`tab ${activeTab === "overview" ? "active" : ""}`} onClick={() => setActiveTab("overview")}>Обзор</button>
            <button className={`tab ${activeTab === "ocr" ? "active" : ""}`} onClick={() => setActiveTab("ocr")}>Текст OCR</button>
            <button className={`tab ${activeTab === "entities" ? "active" : ""}`} onClick={() => setActiveTab("entities")}>Сущности</button>
            <button className={`tab ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>История</button>
          </div>

          <div className="tab-content">
            {activeTab === "overview" && (
              <>
                <div className="info-block">
                  <h3>Общая информация</h3>
                  <div className="info-row"><span>Регистрационный номер:</span><strong>ВХ-2026-001234</strong></div>
                  <div className="info-row"><span>Тема документа:</span><strong>Договор поставки товаров №45/23</strong></div>
                  <div className="info-row"><span>Отправитель:</span><strong>ООО "Ромашка", Иванов И.И.</strong></div>
                  <div className="info-row"><span>Дата поступления:</span><strong>23.04.2026</strong></div>
                  <div className="info-row"><span>Текущий статус:</span><strong>На согласовании</strong></div>
                  <div className="info-row"><span>Тип документа:</span><strong>Договор</strong></div>
                  <div className="info-row"><span>Категория:</span><strong>Коммерческий</strong></div>
                  <div className="info-row"><span>Кто создал запись:</span><strong>Петрова Анна Сергеевна</strong></div>
                  <div className="info-row"><span>Текущий отдел:</span><strong>Юридический отдел</strong></div>
                </div>

                <div className="info-block">
                  <h3>Связанные файлы</h3>
                  <div className="file-row"><span>📄</span> dogovor_45.pdf <span className="file-size">2.3 МБ</span></div>
                  <div className="file-row"><span>📊</span> specifikaciya.xlsx <span className="file-size">1.1 МБ</span></div>
                  <div className="file-row"><span>🖊️</span> podpis.pdf <span className="file-size">0.8 МБ</span></div>
                </div>

                <div className="info-block">
                  <h3>Классификация</h3>
                  <div className="classif-row">
                    <span>Тип документа:</span>
                    <span className="classif-value">Договор</span>
                    <span className="confidence-chip confidence-high">94%</span>
                  </div>
                  <div className="classif-row">
                    <span>Категория:</span>
                    <span className="classif-value">Коммерческий</span>
                    <span className="confidence-chip confidence-medium">91%</span>
                  </div>
                </div>

                <div className="action-buttons">
                  <button className="btn-primary">Подтвердить классификацию</button>
                  <button className="btn-secondary">Редактировать поля</button>
                </div>
              </>
            )}

           
            {activeTab === "ocr" && (
              <>
                <div className="ocr-block">
                  <h3>Raw text</h3>
                  <pre> ДОГОВОР ПОСТАВКИ № 2026/ТТ-145
                        От 20 марта 2026 года

                        Настоящий договор заключен между:
                        Заказчик: АО "Московский Метрополитен"

                        Адрес: г. Москва, ул. Каланчевская, д. 13
                        ИНН: 7702005605

                        Поставщик: ООО "Транспортные Технологии"
                        Адрес: г. Москва, Варшавское шоссе, д. 47
                        ИНН: 7725123456

                        Предмет договора: Поставка запасных частей для вагонов метро модели 81-765/766/767 "Москва" в количестве согласно спецификации.

                        Сумма договора: 12 450 000 (Двенадцать миллионов четыреста пятьдесят тысяч) рублей 00 копеек, включая НДС 20%.

                        Срок поставки: до 30 июня 2026 года.</pre>
                </div>
                <div className="ocr-block">
                  <h3>Normalized text</h3>
                  <p>Договор поставки №2026/ТТ-145 от 20.03.2026 между АО "Московский Метрополитен" и ООО "Транспортные Технологии". Предмет: поставка запасных частей для вагонов метро. Сумма: 12 450 000 руб. Срок: 30.06.2026.</p>
                </div>
              </>
            )}

            {activeTab === "entities" && (
              <div className="entities-list">
                <div className="entity-row"><span className="entity-label">Организация</span><span className="entity-value">ООО "Транспортные Технологии"</span><span className="entity-count">3x</span></div>
                <div className="entity-row"><span className="entity-label">Организация</span><span className="entity-value">АО "Московский Метрополитен"</span><span className="entity-count">2x</span></div>
                <div className="entity-row"><span className="entity-label">Дата</span><span className="entity-value">20.03.2026</span><span className="entity-count">1x</span></div>
                <div className="entity-row"><span className="entity-label">Дата</span><span className="entity-value">30.06.2026</span><span className="entity-count">1x</span></div>
                <div className="entity-row"><span className="entity-label">Деньги</span><span className="entity-value">12 450 000 руб.</span><span className="entity-count">1x</span></div>
                <div className="entity-row"><span className="entity-label">ИНН</span><span className="entity-value">7702005605</span><span className="entity-count">1x</span></div>
                <div className="entity-row"><span className="entity-label">ИНН</span><span className="entity-value">7725123456</span><span className="entity-count">1x</span></div>
              </div>
            )}

            {activeTab === "history" && (
              <table className="history-table">
                <thead>
                  <tr><th>Отдел</th><th>Статус</th><th>Причина</th><th>Дата</th></tr>
                </thead>
                <tbody>
                  <tr><td>Канцелярия</td><td><span className="status-badge green">Завершено</span></td><td>Регистрация входящего документа</td><td>23.04.2026 09:15</td></tr>
                  <tr><td>Юридический отдел</td><td><span className="status-badge orange">На рассмотрении</span></td><td>Проверка договора на соответствие законодательству</td><td>23.04.2026 11:30</td></tr>
                  <tr><td>Отдел закупок</td><td><span className="status-badge blue">Ожидает</span></td><td>Согласование бюджета и условий поставки</td><td>24.04.2026</td></tr>
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentCardPage;