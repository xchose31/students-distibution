// admin_frontend/src/components/admin/Data.jsx

// 🔧 Регистрация модулей AG Grid
import { ModuleRegistry, AllCommunityModule } from 'ag-grid-community';
ModuleRegistry.registerModules([AllCommunityModule]);

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  const [exporting, setExporting] = useState(false);

  // Загрузка данных
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const response = await api.get(`/admin/data`);

      setRowData(response.data?.data || []);
      setSubjects(response.data?.subjects || []);
      setProfiles(response.data?.profiles || []);

    } catch (err) {
      console.error('Ошибка:', err);
      setError(err.response?.data?.error || 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  }, []);

  // Построение колонок
  useEffect(() => {
    if (!subjects?.length || !profiles?.length) return;

    const cols = [
      {
        headerName: 'ФИО',
        field: 'fio',
        pinned: 'left',
        width: 250,
        filter: true,
        editable: false,
        cellStyle: { fontWeight: '600' }
      },
      {
        headerName: 'Класс зачисления',
        field: 'enrolled_class',
        width: 130,
        filter: true,
        editable: true,
        cellEditor: 'agTextCellEditor',
        cellStyle: { backgroundColor: '#e8f5e9' }
      },
      {
        headerName: 'Профиль зачисления',
        field: 'enrolled_profile',
        width: 200,
        filter: true,
        editable: true,
        cellEditor: 'agTextCellEditor',
        cellStyle: { backgroundColor: '#e3f2fd' }
      },
      {
        headerName: '1 приоритет',
        field: 'first_choice_name',
        width: 180,
        filter: true,
        editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {
          values: ['', ...profiles.map(p => p.name).filter(Boolean)]
        }
      },
      {
        headerName: '2 приоритет',
        field: 'second_choice_name',
        width: 180,
        filter: true,
        editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {
          values: ['', ...profiles.map(p => p.name).filter(Boolean)]
        }
      },
      {
        headerName: '3 приоритет',
        field: 'third_choice_name',
        width: 180,
        filter: true,
        editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {
          values: ['', ...profiles.map(p => p.name).filter(Boolean)]
        }
      }
    ];

    // Добавляем предметы
    subjects.forEach(subject => {
      if (!subject?.id) return;
      cols.push({
        headerName: subject.name,
        field: `result_${subject.id}`,
        width: 100,
        filter: true,
        editable: true,
        cellEditor: 'agNumberCellEditor'
      });
    });

    setColumnDefs(cols);
  }, [subjects, profiles]);

  // Загрузка при монтировании
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 🔧 УДАЛЕНО: useEffect с gridApi.setRowData (строка 149)
  // В AG Grid v35 не нужно вызывать setRowData через API
  // React state (rowData) автоматически обновляет таблицу

  // Обработка изменений ячеек
  const onCellValueChanged = async (event) => {
    const personId = event.data?.person_id;
    const field = event.colDef?.field;
    const newValue = event.newValue;
    const oldValue = event.oldValue;

    if (!personId || !field) return;
    if (newValue === oldValue) return;

    let updates = {};

    if (field === 'enrolled_class') {
      updates = { enrolled_class: newValue };
    } else if (field === 'enrolled_profile') {
      updates = { enrolled_profile: newValue };
    } else if (field === 'first_choice_name') {
      const profile = profiles.find(p => p.name === newValue);
      updates = { first_choice_id: profile?.id ?? null };
    } else if (field === 'second_choice_name') {
      const profile = profiles.find(p => p.name === newValue);
      updates = { second_choice_id: profile?.id ?? null };
    } else if (field === 'third_choice_name') {
      const profile = profiles.find(p => p.name === newValue);
      updates = { third_choice_id: profile?.id ?? null };
    } else if (field.startsWith('result_')) {
      const subjectId = field.replace('result_', '');
      updates = {
        results: {
          [subjectId]: newValue === '' || newValue === null ? null : parseInt(newValue)
        }
      };
    }

    if (Object.keys(updates).length > 0) {
      try {
        await api.put('/admin/data/update', {
          person_id: personId,
          updates
        });

        // Обновляем локально для мгновенного отображения
        setRowData(prevData =>
          prevData.map(person => {
            if (person.person_id === personId) {
              if (field.startsWith('result_')) {
                return { ...person, [field]: newValue };
              }
              if (field === 'enrolled_class' || field === 'enrolled_profile') {
                return { ...person, [field]: newValue };
              }
              return { ...person, ...updates };
            }
            return person;
          })
        );

      } catch (err) {
        console.error('Ошибка сохранения:', err);
        setError(err.response?.data?.error || 'Ошибка сохранения');
        setTimeout(() => setError(''), 3000);
        await loadData();
      }
    }
  };

  // 🔧 УДАЛЕНО: onGridReady с params.api.setRowData (строка 203)
  // В AG Grid v35 это не нужно

  // Экспорт в Excel
  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await api.get('/admin/data/export', {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;

      const contentDisposition = response.headers['content-disposition'];
      let filename = 'students_data.xlsx';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?([^"]+)"?/);
        if (match && match[1]) {
          filename = match[1];
        }
      }

      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Ошибка экспорта:', err);
      setError('Ошибка при экспорте данных');
      setTimeout(() => setError(''), 3000);
    } finally {
      setExporting(false);
    }
  };

  const defaultColDef = useMemo(() => ({
    resizable: true,
    sortable: true,
    filter: true,
    minWidth: 100
  }), []);

  return (
    <div className="container-fluid py-4">
      <div className="mb-4 d-flex justify-content-between align-items-center">
        <div>
          <h2>Данные учащихся</h2>
          <p className="text-muted">Таблица с результатами экзаменов и выбором профилей</p>
        </div>
        <button
          className="btn btn-success"
          onClick={handleExport}
          disabled={exporting || loading}
        >
          {exporting ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Экспорт...
            </>
          ) : (
            <>
              <i className="bi bi-file-earmark-excel me-2"></i>
              Экспорт в Excel
            </>
          )}
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}


      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">Данные ({rowData?.length || 0} записей)</h5>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center p-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Загрузка...</span>
              </div>
            </div>
          ) : !rowData?.length ? (
            <div className="alert alert-info m-3">
              <i className="bi bi-info-circle me-2"></i>
              Нет данных для отображения
            </div>
          ) : (
            <div className="ag-theme-alpine" style={{ height: '500px', width: '100%' }}>
              <AgGridReact
                rowData={rowData}
                columnDefs={columnDefs}
                defaultColDef={defaultColDef}
                pagination={true}
                paginationPageSize={25}
                paginationPageSizeSelector={[25, 50, 100]}
                stopEditingWhenCellsLoseFocus={true}
                onCellValueChanged={onCellValueChanged}
                theme="legacy"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Data;