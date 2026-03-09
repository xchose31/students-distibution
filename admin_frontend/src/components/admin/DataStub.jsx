// admin_frontend/src/components/admin/DataStub.jsx
import React from 'react';

function DataStub() {
  return (
    <div>
      <div className="mb-4">
        <h2>Данные учащихся</h2>
        <p className="text-muted">Таблица поступающих с результатами экзаменов</p>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="stub-placeholder">
            <i className="bi bi-table"></i>
            <h5 className="mt-3">Раздел в разработке</h5>
            <p className="text-muted">Здесь будет таблица с данными учащихся</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DataStub;