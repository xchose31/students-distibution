// admin_frontend/src/components/student/Results.jsx
import React, { useState, useEffect } from 'react';
import api from '../../services/api';

function Results() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await api.get('/profile');
      console.log('✅ Ответ:', response.data);
      setData(response.data);
    } catch (err) {
      console.error('❌ Ошибка загрузки:', err);
      setError(err.response?.data?.error || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center p-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Загрузка...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger">❌ {error}</div>;
  }

  return (
    <div className="container-fluid py-4">
      <div className="mb-4">
        <h2>Личный кабинет</h2>
        <p className="text-muted">{data?.person?.fio || 'Загрузка...'}</p>
      </div>

      {/* Информация о зачислении */}
      {data?.enrollment?.class || data?.enrollment?.profile ? (
        <div className="card mb-4">
          <div className="card-header bg-success text-white">
            <h5 className="mb-0">
              <i className="bi bi-mortarboard-fill me-2"></i>
              Информация о зачислении
            </h5>
          </div>
          <div className="card-body">
            <div className="row">
              {data.enrollment.class && (
                <div className="col-md-6 mb-3">
                  <div className="d-flex align-items-center">
                    <i className="bi bi-building fs-3 text-primary me-3"></i>
                    <div>
                      <h6 className="mb-1">Класс зачисления</h6>
                      <p className="mb-0 fs-4 fw-bold">{data.enrollment.class}</p>
                    </div>
                  </div>
                </div>
              )}
              {data.enrollment.profile && (
                <div className="col-md-6 mb-3">
                  <div className="d-flex align-items-center">
                    <i className="bi bi-award fs-3 text-success me-3"></i>
                    <div>
                      <h6 className="mb-1">Профиль зачисления</h6>
                      <p className="mb-0 fs-4 fw-bold">{data.enrollment.profile}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="alert alert-info mb-4">
          <i className="bi bi-info-circle me-2"></i>
          Информация о зачислении пока не доступна
        </div>
      )}

      {/* Результаты экзаменов */}
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">
            <i className="bi bi-file-earmark-text me-2"></i>
            Результаты экзаменов
          </h5>
        </div>
        <div className="card-body">
          {data?.exam_results?.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Предмет</th>
                    <th className="text-end">Балл</th>
                  </tr>
                </thead>
                <tbody>
                  {data.exam_results.map((result, index) => (
                    <tr key={index}>
                      <td>
                        <i className="bi bi-book me-2 text-muted"></i>
                        {result.subject_name}
                      </td>
                      <td className="text-end">
                        <span className="score-badge">
                          {result.result}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="alert alert-warning">
              <i className="bi bi-exclamation-circle me-2"></i>
              Результаты экзаменов ещё не добавлены
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Results;