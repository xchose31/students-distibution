// admin_frontend/src/components/student/ResultsStub.jsx
import React from 'react';

function ResultsStub() {
  return (
    <div>
      <div className="mb-4">
        <h2>Результаты экзаменов</h2>
        <p className="text-muted">Ваши результаты по предметам</p>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="stub-placeholder">
            <i className="bi bi-file-earmark-text"></i>
            <h5 className="mt-3">Раздел в разработке</h5>
            <p className="text-muted">Здесь будут результаты экзаменов</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResultsStub;