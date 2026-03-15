// admin_frontend/src/components/admin/ExamResults.jsx
import React, { useState } from 'react';
import api from '../../services/api';

function ExamResults() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];

    if (selectedFile) {
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];

      if (!validTypes.includes(selectedFile.type) &&
          !selectedFile.name.endsWith('.xlsx') &&
          !selectedFile.name.endsWith('.xls')) {
        setError('Неверный формат файла. Поддерживаются только .xlsx и .xls');
        setFile(null);
        return;
      }

      setFile(selectedFile);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Выберите файл для загрузки');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/admin/exam-results/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setResult(response.data);
      setSuccess('Импорт завершён успешно!');

      // Очистить поле файла
      setFile(null);
      document.getElementById('fileInput').value = '';
    } catch (err) {
      setError(err.response?.data?.error || 'Ошибка при загрузке файла');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadTemplate = () => {
    // Создаём пример файла для скачивания (информация)
    const template = `Пример формата файла Excel:

Столбцы:
- ФИО (обязательно, формат: Фамилия Имя Отчество)
- Математика (оценка, можно пустое)
- Русский язык (оценка, можно пустое)
- Физика (оценка, можно пустое)
- и т.д.

Пример:
ФИО | Математика | Русский язык | Физика
Иван Иванов Иванович | 85 | 90 | 78
Петр Петров Петрович | 92 | 88 |

Важно:
- ФИО должно точно совпадать с данными в базе
- Пустые ячейки пропускаются
- Дополнительные столбцы игнорируются`;

    alert(template);
  };

  return (
    <div>
      <div className="mb-4">
        <h2>Загрузка результатов экзаменов</h2>
        <p className="text-muted">Импорт результатов из Excel файла</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Инструкция */}
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">
            <i className="bi bi-info-circle me-2"></i>
            Требования к файлу
          </h5>
        </div>
        <div className="card-body">
          <ul className="mb-0">
            <li>Формат: <strong>.xlsx</strong> или <strong>.xls</strong></li>
            <li>Обязательный столбец: <strong>ФИО</strong> (формат: Фамилия Имя Отчество)</li>
            <li>Столбцы с предметами: любые названия (например: "Математика", "Русский язык")</li>
            <li>Пустые ячейки с оценками пропускаются</li>
            <li>Дополнительные столбцы игнорируются</li>
            <li>ФИО должно точно совпадать с данными в базе</li>
          </ul>
          <button
            className="btn btn-outline-primary btn-sm mt-3"
            onClick={handleDownloadTemplate}
          >
            <i className="bi bi-download me-1"></i>
            Показать пример
          </button>
        </div>
      </div>

      {/* Загрузка файла */}
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">
            <i className="bi bi-upload me-2"></i>
            Загрузить файл
          </h5>
        </div>
        <div className="card-body">
          <div className="mb-3">
            <label className="form-label">Выберите Excel файл</label>
            <input
              type="file"
              className="form-control"
              id="fileInput"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={uploading}
            />
            {file && (
              <div className="form-text">
                Выбран файл: <strong>{file.name}</strong> ({(file.size / 1024).toFixed(2)} KB)
              </div>
            )}
          </div>

          <button
            className="btn btn-primary"
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            {uploading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Загрузка...
              </>
            ) : (
              <>
                <i className="bi bi-cloud-upload me-2"></i>
                Загрузить результаты
              </>
            )}
          </button>
        </div>
      </div>

      {/* Результаты импорта */}
      {result && (
        <>
          {/* Общая статистика */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="bi bi-graph-up me-2"></i>
                Итоги импорта
              </h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-2">
                  <div className="text-center">
                    <h3 className="text-primary">{result.summary.total_rows}</h3>
                    <p className="text-muted">Всего строк</p>
                  </div>
                </div>
                <div className="col-md-2">
                  <div className="text-center">
                    <h3 className="text-success">{result.summary.success}</h3>
                    <p className="text-muted">Успешно</p>
                  </div>
                </div>
                <div className="col-md-2">
                  <div className="text-center">
                    <h3 className="text-danger">{result.summary.failed}</h3>
                    <p className="text-muted">Ошибок</p>
                  </div>
                </div>
                <div className="col-md-2">
                  <div className="text-center">
                    <h3 className="text-info">{result.summary.results_added}</h3>
                    <p className="text-muted">Оценок добавлено</p>
                  </div>
                </div>
                <div className="col-md-2">
                  <div className="text-center">
                    <h3 className="text-warning">{result.summary.duplicates_found || 0}</h3>
                    <p className="text-muted">Дубликатов</p>
                  </div>
                </div>
                <div className="col-md-2">
                  <div className="text-center">
                    <h3 className="text-success">{result.summary.subjects_created}</h3>
                    <p className="text-muted">Предметов</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Дубликаты результатов */}
          {result.duplicate_details && result.duplicate_details.length > 0 && (
            <div className="card mb-4">
              <div className="card-header bg-warning text-dark">
                <h5 className="mb-0">
                  <i className="bi bi-exclamation-circle me-2"></i>
                  Дубликаты результатов ({result.duplicate_details.length})
                </h5>
              </div>
              <div className="card-body">
                <div className="alert alert-warning">
                  <i className="bi bi-info-circle me-2"></i>
                  У этих учеников уже есть результаты по указанным предметам.
                  Существующие оценки <strong>не были изменены</strong>.
                </div>
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Строка</th>
                        <th>ФИО</th>
                        <th>Предмет</th>
                        <th>Текущая оценка</th>
                        <th>Новая оценка</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.duplicate_details.map((student, sIndex) => (
                        student.duplicates.map((dup, dIndex) => (
                          <tr key={`${sIndex}-${dIndex}`}>
                            {dIndex === 0 && (
                              <>
                                <td rowSpan={student.duplicates.length}>{student.row}</td>
                                <td rowSpan={student.duplicates.length}>{student.fio}</td>
                              </>
                            )}
                            <td>
                              <span className="badge bg-secondary">{dup.subject}</span>
                            </td>
                            <td>
                              <span className="badge bg-info">{dup.existing_score}</span>
                            </td>
                            <td>
                              <span className="badge bg-warning text-dark">{dup.new_score}</span>
                            </td>
                          </tr>
                        ))
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Ошибки (ученики не найдены и т.д.) */}
          {result.failed_details && result.failed_details.length > 0 && (
            <div className="card">
              <div className="card-header bg-danger text-white">
                <h5 className="mb-0">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  Ошибки импорта ({result.failed_details.length})
                </h5>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Строка</th>
                        <th>ФИО</th>
                        <th>Ошибка</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.failed_details.map((item, index) => (
                        <tr key={index}>
                          <td>{item.row}</td>
                          <td>{item.fio}</td>
                          <td>
                            <span className="badge bg-danger">{item.error}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Созданные предметы */}
          {result.stats.subjects_created && result.stats.subjects_created.length > 0 && (
            <div className="card mt-4">
              <div className="card-header bg-success text-white">
                <h5 className="mb-0">
                  <i className="bi bi-plus-circle me-2"></i>
                  Новые предметы ({result.stats.subjects_created.length})
                </h5>
              </div>
              <div className="card-body">
                <div className="d-flex flex-wrap gap-2">
                  {result.stats.subjects_created.map((subject, index) => (
                    <span key={index} className="badge bg-success">
                      {subject}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default ExamResults;