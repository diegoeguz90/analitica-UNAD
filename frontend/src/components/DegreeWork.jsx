import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Upload, Trash2, RefreshCw, BarChart3, AlertCircle, 
  FileText, Users, Calendar, CheckCircle2, X, Filter,
  ChevronDown, ChevronUp
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const API_BASE = '/api/degree-work';

// Distinct colors for the stacked bars
const COLORS = [
  '#004b93', '#fbb034', '#34d399', '#f87171', 
  '#818cf8', '#fb7185', '#fbbf24', '#2dd4bf', 
  '#a78bfa', '#4ade80', '#2563eb', '#db2777'
];

const DegreeWork = () => {
  const [files, setFiles] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [records, setRecords] = useState([]);
  const [showFileManagement, setShowFileManagement] = useState(false);
  
  // Filter states
  const [selectedPrograms, setSelectedPrograms] = useState(() => {
    const saved = localStorage.getItem('degree_selectedPrograms');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedPeriods, setSelectedPeriods] = useState(() => {
    const saved = localStorage.getItem('degree_selectedPeriods');
    return saved ? JSON.parse(saved) : [];
  });
  const [continuityFilter, setContinuityFilter] = useState(() => {
    return localStorage.getItem('degree_continuityFilter') || 'all';
  });
  const [showFilters, setShowFilters] = useState(true);

  // Persistence effects
  useEffect(() => {
    localStorage.setItem('degree_selectedPrograms', JSON.stringify(selectedPrograms));
  }, [selectedPrograms]);

  useEffect(() => {
    localStorage.setItem('degree_selectedPeriods', JSON.stringify(selectedPeriods));
  }, [selectedPeriods]);

  useEffect(() => {
    localStorage.setItem('degree_continuityFilter', continuityFilter);
  }, [continuityFilter]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [filesRes, analyticsRes, recordsRes] = await Promise.all([
        axios.get(`${API_BASE}/files`),
        axios.get(`${API_BASE}/analytics`),
        axios.get(`${API_BASE}/records`)
      ]);
      setFiles(filesRes.data);
      setAnalytics(analyticsRes.data);
      setRecords(recordsRes.data);
      
      // Initialize filters with all options if first time
      const allPrograms = Array.from(new Set(analyticsRes.data.map(a => a.programa_origen))).sort();
      const allPeriods = Array.from(new Set(analyticsRes.data.map(a => a.periodo))).sort();
      
      setSelectedPrograms(prev => prev.length === 0 ? allPrograms : prev);
      setSelectedPeriods(prev => prev.length === 0 ? allPeriods : prev);
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al cargar los datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleFileSelect = (event) => {
    setSelectedFiles(Array.from(event.target.files));
  };

  const removeSelectedFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;
    
    setUploading(true);
    setError(null);
    let successCount = 0;
    
    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const formData = new FormData();
        formData.append('file', selectedFiles[i]);
        
        await axios.post(`${API_BASE}/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        
        successCount++;
        setUploadProgress(Math.round(((i + 1) / selectedFiles.length) * 100));
      }
      
      setSelectedFiles([]);
      if (document.getElementById('degree-file-upload')) {
        document.getElementById('degree-file-upload').value = '';
      }
      fetchData();
    } catch (err) {
      setError(`Error al subir archivos (${successCount} completados): ` + (err.response?.data?.detail || err.message));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm('¿Deseas eliminar este archivo y todos sus registros asociados?')) return;
    
    try {
      await axios.delete(`${API_BASE}/files/${fileId}`);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.detail || 'Error al eliminar');
    }
  };

  // Unique lists for filters
  const allPrograms = Array.from(new Set(analytics.map(a => a.programa_origen))).sort();
  const allPeriods = Array.from(new Set(analytics.map(a => a.periodo))).sort();

  const toggleProgram = (prog) => {
    setSelectedPrograms(prev => 
      prev.includes(prog) ? prev.filter(p => p !== prog) : [...prev, prog]
    );
  };

  const togglePeriod = (per) => {
    setSelectedPeriods(prev => 
      prev.includes(per) ? prev.filter(p => p !== per) : [...prev, per]
    );
  };

  const selectAllPrograms = () => setSelectedPrograms(allPrograms);
  const deselectAllPrograms = () => setSelectedPrograms([]);
  const selectAllPeriods = () => setSelectedPeriods(allPeriods);
  const deselectAllPeriods = () => setSelectedPeriods([]);

  const downloadCSV = () => {
    if (filteredRecords.length === 0) return;

    const headers = ['Documento', 'Estudiante', 'Correo', 'Zona', 'Centro', 'Programa Origen', 'Periodo', 'Curso'];
    const csvContent = [
      headers.join(','),
      ...filteredRecords.map(r => [
        `"${r.documento}"`,
        `"${r.estudiante}"`,
        `"${r.correo}"`,
        `"${r.zona}"`,
        `"${r.centro}"`,
        `"${r.programa_origen}"`,
        `"${r.periodo}"`,
        `"${r.curso}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Estudiantes_Grado_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Transform analytics data for Recharts StackedBarChart
  const getChartData = () => {
    if (!records.length) return { data: [], programs: [] };

    const periodsMap = {};
    const visiblePrograms = new Set();
    const processedStudentsPerPeriod = {}; // To ensure unique students per period/program in the chart

    records.forEach(item => {
      // Filter by period and program
      if (selectedPeriods.includes(item.periodo) && selectedPrograms.includes(item.programa_origen)) {
        const key = `${item.periodo}-${item.programa_origen}`;
        if (!processedStudentsPerPeriod[key]) {
          processedStudentsPerPeriod[key] = new Set();
        }
        
        if (!processedStudentsPerPeriod[key].has(item.documento)) {
          processedStudentsPerPeriod[key].add(item.documento);
          
          if (!periodsMap[item.periodo]) {
            periodsMap[item.periodo] = { periodo: item.periodo };
          }
          
          periodsMap[item.periodo][item.programa_origen] = (periodsMap[item.periodo][item.programa_origen] || 0) + 1;
          visiblePrograms.add(item.programa_origen);
        }
      }
    });

    const data = Object.values(periodsMap).sort((a, b) => a.periodo.localeCompare(b.periodo));
    const programs = Array.from(visiblePrograms).sort();

    return { data, programs };
  };

  const { data: chartData, programs: chartPrograms } = getChartData();

  // Deduplicate records by document for the table and KPIs
  const getUniqueRecords = () => {
    const uniqueMap = new Map();
    records.forEach(r => {
      if (!uniqueMap.has(r.documento)) {
        uniqueMap.set(r.documento, r);
      }
    });
    return Array.from(uniqueMap.values());
  };

  const uniqueRecords = getUniqueRecords();
  const filteredRecords = uniqueRecords.filter(r => {
    const matchesPeriod = selectedPeriods.includes(r.periodo);
    const matchesProgram = selectedPrograms.includes(r.programa_origen);
    const matchesContinuity = continuityFilter === 'all' || 
                             (continuityFilter === 'yes' && r.continuidad) || 
                             (continuityFilter === 'no' && !r.continuidad);
    return matchesPeriod && matchesProgram && matchesContinuity;
  });

  // Summary statistics (based on unique filtered records)
  const totalStudents = filteredRecords.length;
  const totalPeriods = new Set(filteredRecords.map(a => a.periodo)).size;
  const totalPrograms = new Set(filteredRecords.map(a => a.programa_origen)).size;
  const continuityCount = filteredRecords.filter(r => r.continuidad).length;

  return (
    <div className="dashboard-content">
      {/* File Management Collapsible Section */}
      <div className="glass-card" style={{ marginBottom: '2rem', padding: '1rem' }}>
        <button 
          className="btn" 
          onClick={() => setShowFileManagement(!showFileManagement)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-sidebar)', color: 'var(--accent-primary)', border: '1px solid var(--border)' }}
        >
          <Upload size={18} />
          {showFileManagement ? 'Ocultar Gestión de Reportes' : 'Gestionar Reportes (Carga)'}
          {showFileManagement ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {showFileManagement && (
          <div className="fade-in" style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Upload Section */}
            <div className="upload-zone" style={{ padding: '1.5rem' }}>
              <Upload size={24} color="var(--accent-primary)" style={{ marginBottom: '0.5rem' }} />
              <p style={{ fontSize: '0.85rem', fontWeight: 600 }}>Carga nuevos reportes</p>
              <p className="text-muted" style={{ fontSize: '0.7rem', marginBottom: '1rem' }}>Formato: Reporte_Matricula_PERIODO_CURSO.xlsx</p>
              
              <label className="btn btn-primary" style={{ cursor: 'pointer', marginBottom: '0.5rem', width: '100%', fontSize: '0.8rem' }}>
                <span>Seleccionar Archivos</span>
                <input 
                  id="degree-file-upload"
                  type="file" 
                  accept=".xlsx,.xls" 
                  multiple 
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
              </label>

              {selectedFiles.length > 0 && (
                <div style={{ textAlign: 'left', marginTop: '0.5rem', background: '#ffffff', borderRadius: '8px', padding: '0.8rem', border: '1px solid var(--border)' }}>
                  <div style={{ maxHeight: '80px', overflowY: 'auto', fontSize: '0.7rem' }}>
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0' }}>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
                        <X size={12} style={{ cursor: 'pointer', color: 'var(--danger)' }} onClick={() => removeSelectedFile(idx)} />
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem', fontSize: '0.8rem' }} onClick={handleUpload} disabled={uploading}>
                    {uploading ? `Subiendo... ${uploadProgress}%` : 'Comenzar Carga'}
                  </button>
                </div>
              )}
            </div>

            {/* History Section */}
            <div style={{ background: '#f8fafc', borderRadius: '12px', padding: '1.5rem', border: '1px solid var(--border)', overflowY: 'auto', maxHeight: '300px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.85rem' }}>Historial de Cargas</h4>
                <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: '10px', fontSize: '0.7rem' }}>{files.length}</span>
              </div>
              {files.map(f => (
                <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px', background: 'white', borderRadius: '8px', marginBottom: '8px', border: '1px solid #e2e8f0' }}>
                  <div style={{ overflow: 'hidden' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.filename}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{f.periodo} • {f.record_count} reg.</div>
                  </div>
                  <button className="btn btn-danger" style={{ padding: '4px', minWidth: 'auto' }} onClick={() => handleDelete(f.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ marginBottom: '0.5rem' }}>Opción de Trabajo de Grado</h2>
          <p className="text-muted">Análisis histórico de estudiantes por programa de origen</p>
        </div>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <button 
            className="btn" 
            onClick={() => setShowFilters(!showFilters)} 
            style={{ 
              background: showFilters ? '#eff6ff' : 'var(--bg-sidebar)', 
              color: showFilters ? 'var(--accent-primary)' : 'var(--text-muted)',
              border: '1px solid var(--border)' 
            }}
          >
            <Filter size={18} />
            {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
          </button>
          <button className="btn btn-primary" onClick={fetchData} disabled={loading} style={{ background: 'var(--bg-sidebar)', color: 'var(--accent-primary)', border: '1px solid var(--border)' }}>
            <RefreshCw className={loading ? "spin" : ""} size={18} />
            {loading ? 'Cargando...' : 'Actualizar Datos'}
          </button>
        </div>
      </div>

      {error && (
        <div className="glass-card" style={{ padding: '1rem', borderLeft: '4px solid var(--danger)', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <AlertCircle color="var(--danger)" />
          <span style={{ color: 'var(--danger)', fontWeight: 500 }}>{error}</span>
          <X size={18} style={{ marginLeft: 'auto', cursor: 'pointer' }} onClick={() => setError(null)} />
        </div>
      )}

      {/* KPI Section */}
      <div className="chart-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="glass-card kpi-card" style={{ padding: '1.5rem', marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--accent-primary)' }}>
            <Users size={20} />
            <span style={{ fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Estudiantes</span>
          </div>
          <div className="kpi-value">{totalStudents.toLocaleString()}</div>
        </div>
        <div className="glass-card kpi-card" style={{ padding: '1.5rem', marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--accent-secondary)' }}>
            <Calendar size={20} />
            <span style={{ fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Periodos</span>
          </div>
          <div className="kpi-value">{totalPeriods}</div>
        </div>
        <div className="glass-card kpi-card" style={{ padding: '1.5rem', marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#10b981' }}>
            <FileText size={20} />
            <span style={{ fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Programas</span>
          </div>
          <div className="kpi-value">{totalPrograms}</div>
        </div>
        <div className="glass-card kpi-card" style={{ padding: '1.5rem', marginBottom: 0, borderTop: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#8b5cf6' }}>
            <CheckCircle2 size={20} />
            <span style={{ fontWeight: 600, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Continuidad</span>
          </div>
          <div className="kpi-value">{continuityCount}</div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>Estudiantes en directorio principal</p>
        </div>
      </div>

      {/* Filters Section */}
      {showFilters && analytics.length > 0 && (
        <div className="glass-card" style={{ marginBottom: '2rem', padding: '1.5rem' }}>
          <div style={{ display: 'flex', gap: '2.5rem' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>Filtrar Programas</h4>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={selectAllPrograms} className="btn-text" style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', border: 'none', background: 'none', cursor: 'pointer' }}>Todos</button>
                  <button onClick={deselectAllPrograms} className="btn-text" style={{ fontSize: '0.7rem', color: 'var(--danger)', border: 'none', background: 'none', cursor: 'pointer' }}>Ninguno</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto', padding: '0.5rem', border: '1px solid #f1f5f9', borderRadius: '8px' }}>
                {allPrograms.map(prog => (
                  <label key={prog} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedPrograms.includes(prog)} 
                      onChange={() => toggleProgram(prog)}
                    />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{prog}</span>
                  </label>
                ))}
              </div>
            </div>
            
            <div style={{ width: '250px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-main)' }}>Filtrar Periodos</h4>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={selectAllPeriods} className="btn-text" style={{ fontSize: '0.7rem', color: 'var(--accent-primary)', border: 'none', background: 'none', cursor: 'pointer' }}>Todos</button>
                  <button onClick={deselectAllPeriods} className="btn-text" style={{ fontSize: '0.7rem', color: 'var(--danger)', border: 'none', background: 'none', cursor: 'pointer' }}>Ninguno</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto', padding: '0.5rem', border: '1px solid #f1f5f9', borderRadius: '8px' }}>
                {allPeriods.map(per => (
                  <label key={per} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={selectedPeriods.includes(per)} 
                      onChange={() => togglePeriod(per)}
                    />
                    {per}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

        {/* Main Chart Section */}
        <div className="glass-card" style={{ padding: '2rem', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
            <div style={{ background: '#eff6ff', padding: '0.75rem', borderRadius: '12px' }}>
              <BarChart3 size={24} color="var(--accent-primary)" />
            </div>
            <h3>Distribución por Programa y Periodo</h3>
          </div>
          
          {chartData.length === 0 ? (
            <div style={{ height: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <div style={{ background: '#f8fafc', padding: '2rem', borderRadius: '50%', marginBottom: '1.5rem' }}>
                <BarChart3 size={48} opacity={0.3} />
              </div>
              <p>{analytics.length === 0 ? 'Sube archivos para generar el análisis visual' : 'No hay datos que coincidan con los filtros seleccionados'}</p>
            </div>
          ) : (
            <div style={{ width: '100%', height: 400 }}>
              <ResponsiveContainer>
                <BarChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="periodo" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12, fontWeight: 500 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#64748b', fontSize: 12 }}
                  />
                  <Tooltip 
                    cursor={{ fill: '#f1f5f9' }}
                    contentStyle={{ 
                      borderRadius: '12px', 
                      border: 'none', 
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                      padding: '12px'
                    }}
                  />
                  <Legend 
                    verticalAlign="top" 
                    align="right" 
                    iconType="circle"
                    wrapperStyle={{ paddingBottom: '20px' }}
                  />
                  {chartPrograms.map((program, index) => (
                    <Bar 
                      key={program} 
                      dataKey={program} 
                      stackId="a" 
                      fill={COLORS[index % COLORS.length]} 
                      radius={index === chartPrograms.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                      barSize={40}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

      {/* Student List Section */}
      <div className="glass-card" style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ background: '#f0fdf4', padding: '0.75rem', borderRadius: '12px' }}>
              <Users size={24} color="#16a34a" />
            </div>
            <div>
              <h3 style={{ marginBottom: '0.25rem' }}>Directorio de Estudiantes</h3>
              <p className="text-muted" style={{ fontSize: '0.8rem' }}>Lista de registros activos según filtros</p>
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            {/* Continuity Filter Toggle */}
            <div style={{ display: 'flex', background: '#f1f5f9', padding: '0.25rem', borderRadius: '8px', gap: '0.25rem' }}>
              <button 
                onClick={() => setContinuityFilter('all')}
                style={{ 
                  padding: '0.4rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
                  background: continuityFilter === 'all' ? '#ffffff' : 'transparent',
                  boxShadow: continuityFilter === 'all' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  fontWeight: continuityFilter === 'all' ? 600 : 400
                }}
              >
                Todos
              </button>
              <button 
                onClick={() => setContinuityFilter('yes')}
                style={{ 
                  padding: '0.4rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
                  background: continuityFilter === 'yes' ? '#ffffff' : 'transparent',
                  boxShadow: continuityFilter === 'yes' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  fontWeight: continuityFilter === 'yes' ? 600 : 400
                }}
              >
                Con Continuidad
              </button>
              <button 
                onClick={() => setContinuityFilter('no')}
                style={{ 
                  padding: '0.4rem 0.75rem', fontSize: '0.75rem', borderRadius: '6px', border: 'none', cursor: 'pointer',
                  background: continuityFilter === 'no' ? '#ffffff' : 'transparent',
                  boxShadow: continuityFilter === 'no' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  fontWeight: continuityFilter === 'no' ? 600 : 400
                }}
              >
                Sin Continuidad
              </button>
            </div>

            <button 
            className="btn" 
            onClick={downloadCSV} 
            disabled={filteredRecords.length === 0}
            style={{ 
              background: '#ffffff', 
              color: '#16a34a', 
              border: '1px solid #16a34a',
              opacity: filteredRecords.length === 0 ? 0.5 : 1
            }}
          >
            <FileText size={18} />
            Descargar CSV
          </button>
        </div>
      </div>

        <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
          <table className="analysis-table">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Estudiante</th>
                <th>Correo</th>
                <th>Zona / Centro</th>
                <th>Programa Origen</th>
                <th>Periodo</th>
                <th>Curso</th>
                <th>Continuidad</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No hay registros que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r, idx) => (
                  <tr 
                    key={`${r.documento}-${idx}`}
                    style={{ 
                      background: r.continuidad ? '#f5f3ff' : 'transparent',
                      transition: 'background 0.2s ease'
                    }}
                  >
                    <td style={{ fontWeight: 600 }}>{r.documento}</td>
                    <td>{r.estudiante}</td>
                    <td>{r.correo}</td>
                    <td>
                      <div style={{ fontSize: '0.85rem' }}>{r.zona}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{r.centro}</div>
                    </td>
                    <td>{r.programa_origen}</td>
                    <td><span className="badge" style={{ background: '#f1f5f9', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem' }}>{r.periodo}</span></td>
                    <td>{r.curso}</td>
                    <td>
                      {r.continuidad ? (
                        <span className="badge" style={{ background: '#8b5cf6', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 600 }}>
                          Continuidad
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>N/A</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DegreeWork;
