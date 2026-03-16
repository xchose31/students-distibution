// admin_frontend/src/components/student/Results.jsx
import React, { useState, useEffect } from 'react';
import api from '../../services/api';

function Results() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);

  useEffect(() => {
    console.log('🔵 Results: Загрузка данных...');
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      console.log('📡 Запрос: /student/profile');
      const response = await api.get('/student/profile');
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

  console.log('🔵 Results: Рендер', { data });

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

      {/* Выбранные профили */}
      {data?.profile_choices && (
        <div className="card mb-4">
          <div className="card-header">
            <h5 className="mb-0">
              <i className="bi bi-list-check me-2"></i>
              Выбранные профили
            </h5>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-4 mb-3">
                <div className="card h-100 border-primary">
                  <div className="card-header bg-primary text-white">
                    <span className="badge bg-light text-primary me-2">1</span>
                    Первый приоритет
                  </div>
                  <div className="card-body text-center">
                    <p className="card-text fs-5">
                      {data.profile_choices.first_choice || 'Не выбран'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="col-md-4 mb-3">
                <div className="card h-100 border-secondary">
                  <div className="card-header bg-secondary text-white">
                    <span className="badge bg-light text-secondary me-2">2</span>
                    Второй приоритет
                  </div>
                  <div className="card-body text-center">
                    <p className="card-text fs-5">
                      {data.profile_choices.second_choice || 'Не выбран'}
                    </p>
                  </div>
                </div>
              </div>
              <div className="col-md-4 mb-3">
                <div className="card h-100 border-secondary">
                  <div className="card-header bg-secondary text-white">
                    <span className="badge bg-light text-secondary me-2">3</span>
                    Третий приоритет
                  </div>
                  <div className="card-body text-center">
                    <p className="card-text fs-5">
                      {data.profile_choices.third_choice || 'Не выбран'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
            <>
              {data.avg_score && (
                <div className="alert alert-info mb-4">
                  <div className="d-flex justify-content-between align-items-center">
                    <span>
                      <i className="bi bi-calculator me-2"></i>
                      <strong>Средний балл:</strong>
                    </span>
                    <span className="fs-4 fw-bold">{data.avg_score.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Предмет</th>
                      <th className="text-end">Балл</th>
                      <th className="text-center">Оценка</th>
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
                          <span className={`badge ${getScoreBadge(result.result)}`}>
                            {result.result}
                          </span>
                        </td>
                        <td className="text-center">
                          <span className={`fs-5 fw-bold ${getGradeColor(getGrade(result.result))}`}>
                            {getGrade(result.result)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
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

// Вспомогательные функции
function getGrade(score) {
  if (score >= 90) return '5';
  if (score >= 75) return '4';
  if (score >= 50) return '3';
  if (score >= 0) return '2';
  return '-';
}

function getGradeColor(grade) {
  switch (grade) {
    case '5': return 'text-success';
    case '4': return 'text-primary';
    case '3': return 'text-warning';
    case '2': return 'text-danger';
    default: return 'text-muted';
  }
}

function getScoreBadge(score) {
  if (score >= 90) return 'bg-success';
  if (score >= 75) return 'bg-primary';
  if (score >= 50) return 'bg-warning text-dark';
  if (score >= 0) return 'bg-danger';
  return 'bg-secondary';
}

export default Results;