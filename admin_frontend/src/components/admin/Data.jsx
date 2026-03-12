// admin_frontend/src/components/admin/Data.jsx
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
ModuleRegistry.registerModules([AllCommunityModule]);
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AgGridReact } from 'ag-grid-react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import api from '../../services/api';

function Data() {
  const [rowData, setRowData] = useState([]);
  const [columnDefs, setColumnDefs] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    profile: '',
    subject: '',
    min_score: '',
    sort_by: 'surname',
    sort_order: 'asc'
  });
  const [gridApi, setGridApi] = useState(null);

  // Загрузка данных
  const loadData = async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.profile) params.append('profile', filters.profile);
      if (filters.subject) params.append('subject', filters.subject);
      if (filters.min_score) params.append('min_score', filters.min_score);
      if (filters.sort_by) params.append('sort_by', filters.sort_by);
      if (filters.sort_order) params.append('sort_order', filters.sort_order);

      console.log('📡 Запрос:', `/admin/data?${params.toString()}`);

      const response = await api.get(`/admin/data?${params.toString()}`);

      console.log('📦 Ответ API:', response.data);
      console.log('📊 Данные:', response.data.data);
      console.log('📚 Предметы:', response.data.subjects);
      console.log('📁 Профили:', response.data.profiles);

      const data = response.data.data || [];
      const subjectsData = response.data.subjects || [];
      const profilesData = response.data.profiles || [];

      setRowData(data);
      setSubjects(subjectsData);
      setProfiles(profilesData);

      console.log('✅ rowData установлено:', data.length, 'записей');
    } catch (err) {
      console.error('❌ Ошибка загрузки:', err);
      setError(err.response?.data?.error || 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  // Построение колонок таблицы
  useEffect(() => {
    console.log('🔧 useEffect для колонок');
    console.log('Subjects:', subjects);
    console.log('Profiles:', profiles);

    if (subjects.length === 0 || profiles.length === 0) {
      console.log('⚠️ Subjects или Profiles пусты, пропускаем построение колонок');
      return;
    }

    const cols = [
      {
        headerName: 'ФИО',
        field: 'fio',
        pinned: 'left',
        width: 250,
        filter: 'agTextColumnFilter',
        editable: false,
        cellStyle: { fontWeight: '600' }
      },
      {
        headerName: '1 приоритет',
        field: 'first_choice_name',
        width: 200,
        filter: 'agTextColumnFilter',
        editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {
          values: ['', ...profiles.map(p => p.name)]
        }
      },
      {
        headerName: '2 приоритет',
        field: 'second_choice_name',
        width: 200,
        filter: 'agTextColumnFilter',
        editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {
          values: ['', ...profiles.map(p => p.name)]
        }
      },
    ];

    // Добавляем колонки предметов
    subjects.forEach(subject => {
      console.log('➕ Добавляем предмет:', subject);
      cols.push({
        headerName: subject.name,
        field: `result_${subject.id}`,
        width: 110,
        filter: 'agNumberColumnFilter',
        editable: true,
        cellEditor: 'agNumberCellEditor',
        cellEditorParams: {
          min: 0,
          max: 100,
          step: 1
        },
        valueGetter: (params) => {
          const score = params.data.results ? params.data.results[subject.id] : null;
          console.log('valueGetter:', subject.name, 'person_id:', params.data.person_id, 'score:', score);
          return score;
        }
      });
    });

    console.log('📋 Итоговые колонки:', cols.length);
    setColumnDefs(cols);
  }, [subjects, profiles]);

  // Загрузка при монтировании
  useEffect(() => {
    console.log('🚀 componentDidMount');
    loadData();
  }, []);

  // Обработчики событий AG Grid
  const onCellValueChanged = async (event) => {
    console.log('✏️ Изменение ячейки:', event);
    const personId = event.data.person_id;
    const field = event.colDef.field;
    const newValue = event.newValue;

    let updates = {};

    if (field === 'snils') {
      updates = { snils: newValue };
    } else if (field === 'first_choice_name') {
      const profile = profiles.find(p => p.name === newValue);
      updates = { first_choice_id: profile ? profile.id : null };
    } else if (field === 'second_choice_name') {
      const profile = profiles.find(p => p.name === newValue);
      updates = { second_choice_id: profile ? profile.id : null };
    } else if (field.startsWith('result_')) {
      const subjectId = field.replace('result_', '');
      updates = {
        results: {
          [subjectId]: newValue === '' ? null : parseInt(newValue)
        }
      };
    }

    if (Object.keys(updates).length > 0) {
      try {
        await api.put('/admin/data/update', {
          person_id: personId,
          updates
        });
        await loadData();
      } catch (err) {
        setError(err.response?.data?.error || 'Ошибка сохранения');
        setTimeout(() => setError(''), 3000);
        await loadData();
      }
    }
  };

  const onGridReady = (params) => {
    console.log('📊 Grid готов:', params);
    setGridApi(params.api);
  };

  const applyFilters = () => {
    loadData();
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      profile: '',
      subject: '',
      min_score: '',
      sort_by: 'surname',
      sort_order: 'asc'
    });
  };

  const handleExport = () => {
    if (gridApi) {
      gridApi.exportDataAsExcel({
        fileName: 'students_data.xlsx',
        sheetName: 'Данные учащихся'
      });
    }
  };

  const defaultColDef = useMemo(() => ({
    resizable: true,
    sortable: true,
    filter: true,
    minWidth: 100
  }), []);

  return (
    <div>
      <div className="mb-4">
        <h2>Данные учащихся</h2>
        <p className="text-muted">Таблица с результатами экзаменов и выбором профилей</p>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Фильтры */}
      <div className="card mb-4">
        <div className="card-header">
          <h5 className="mb-0">Фильтры</h5>
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">Поиск по ФИО</label>
              <input
                type="text"
                className="form-control"
                placeholder="Фамилия или имя"
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Профиль</label>
              <select
                className="form-select"
                value={filters.profile}
                onChange={(e) => setFilters(prev => ({ ...prev, profile: e.target.value }))}
              >
                <option value="">Все профили</option>
                {profiles.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Предмет</label>
              <select
                className="form-select"
                value={filters.subject}
                onChange={(e) => setFilters(prev => ({ ...prev, subject: e.target.value }))}
              >
                <option value="">Все предметы</option>
                {subjects.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Мин. балл</label>
              <input
                type="number"
                className="form-control"
                placeholder="0"
                value={filters.min_score}
                onChange={(e) => setFilters(prev => ({ ...prev, min_score: e.target.value }))}
              />
            </div>
            <div className="col-md-3 d-flex align-items-end gap-2">
              <button className="btn btn-primary" onClick={applyFilters}>
                Применить
              </button>
              <button className="btn btn-outline-secondary" onClick={resetFilters}>
                Сброс
              </button>
              <button className="btn btn-success" onClick={handleExport}>
                Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Таблица */}
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">Данные ({rowData.length} записей)</h5>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="loading-spinner p-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Загрузка...</span>
              </div>
            </div>
          ) : rowData.length === 0 ? (
            <div className="alert alert-info m-3">
              <i className="bi bi-info-circle me-2"></i>
              Нет данных для отображения. Убедитесь, что в базе есть ученики с результатами.
            </div>
          ) : (
            <div
              className="ag-theme-alpine"
              style={{ height: '600px', width: '100%' }}
            >
              <AgGridReact
                rowData={rowData}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                pagination={true}
                paginationPageSize={50}
                stopEditingWhenGridLosesFocus={true}
                onGridReady={onGridReady}
                onCellValueChanged={onCellValueChanged}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Data;