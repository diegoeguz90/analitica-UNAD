import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronDown, ChevronUp, FileUp, Users, UserCheck, UserMinus, GraduationCap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import FileManager from './FileManager';

const API_BASE = '/api';

const StudentDirectory = () => {
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [filterSemestre, setFilterSemestre] = useState('');
  const [maxSemester, setMaxSemester] = useState(10);
  
  // Pagination
  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(20);
  
  // Expanded rows
  const [expandedRow, setExpandedRow] = useState(null);
  const [showFileManager, setShowFileManager] = useState(false);
  const [kpis, setKpis] = useState(null);

  useEffect(() => {
    fetchStudents();
  }, [skip, limit, search, filterEstado, filterSemestre]);

  useEffect(() => {
    fetchKpis();
  }, []);

  const fetchKpis = async () => {
    try {
      const res = await axios.get(`${API_BASE}/analytics/students/kpis`);
      setKpis(res.data);
    } catch (error) {
      console.error("Error fetching KPIs:", error);
    }
  };

  const fetchStudents = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE}/analytics/students?skip=${skip}&limit=${limit}`;
      if (search) url += `&q=${encodeURIComponent(search)}`;
      if (filterEstado) url += `&estado=${encodeURIComponent(filterEstado)}`;
      if (filterSemestre) url += `&semestre=${filterSemestre}`;
      
      const res = await axios.get(url);
      setTotal(res.data.total);
      setStudents(res.data.items);
      if (res.data.max_semester) setMaxSemester(res.data.max_semester);
    } catch (error) {
      console.error("Error fetching students:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRow = (docId) => {
    if (expandedRow === docId) {
      setExpandedRow(null);
    } else {
      setExpandedRow(docId);
    }
  };

  const handleNext = () => {
    if (skip + limit < total) {
      setSkip(skip + limit);
      setExpandedRow(null);
    }
  };

  const handlePrev = () => {
    if (skip - limit >= 0) {
      setSkip(skip - limit);
      setExpandedRow(null);
    }
  };

  const handleDownload = () => {
    window.open(`${API_BASE}/analytics/export_students`, '_blank');
  };

  const handleSearchChange = (e) => {
    setSearch(e.target.value);
    setSkip(0); 
    setExpandedRow(null);
  };
  
  const handleEstadoChange = (e) => {
    setFilterEstado(e.target.value);
    setSkip(0);
    setExpandedRow(null);
  };

  const handleSemestreChange = (e) => {
    setFilterSemestre(e.target.value);
    setSkip(0);
    setExpandedRow(null);
  };

  return (
    <div className="glass-card" style={{ padding: '2rem 3rem' }}>
      {/* File Manager Toggle Section */}
      <div style={{ marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '1.5rem' }}>
        <button 
          className="btn" 
          onClick={() => setShowFileManager(!showFileManager)}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-sidebar)', color: 'var(--accent-primary)', border: '1px solid var(--border)' }}
        >
          <FileUp size={18} />
          {showFileManager ? 'Ocultar Gestión de Reportes' : 'Gestionar reportes'}
          {showFileManager ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        
        {showFileManager && (
          <div className="fade-in" style={{ marginTop: '1.5rem' }}>
            <FileManager mode="maestro" />
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>Estudiantes del programa</h2>
          <p className="file-meta" style={{ marginTop: '-1.5rem', color: 'var(--text-muted)' }}>
            Listado general con detalle de historial académico.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', flex: 1, justifyContent: 'flex-end', minWidth: '300px' }}>
          <select 
            className="select-base"
            style={{ height: '42px', minWidth: '150px' }}
            value={filterEstado}
            onChange={handleEstadoChange}
          >
            <option value="">-- Estado --</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
            <option value="Egresando">Egresando</option>
          </select>
          
          <select 
            className="select-base"
            style={{ height: '42px', minWidth: '120px' }}
            value={filterSemestre}
            onChange={handleSemestreChange}
          >
            <option value="">-- Semestre --</option>
            {[...Array(maxSemester)].map((_, i) => (
              <option key={i+1} value={i+1}>Semestre {i+1}</option>
            ))}
          </select>

          <input 
            type="text" 
            placeholder="Buscar por nombre o documento..." 
            className="select-base"
            style={{ width: '100%', maxWidth: '300px', height: '42px' }}
            value={search}
            onChange={handleSearchChange}
          />
          <button className="btn btn-primary" onClick={handleDownload} style={{ whiteSpace: 'nowrap', height: '42px' }}>
            Descargar (.csv)
          </button>
        </div>
      </div>

      {/* KPI Section */}
      {kpis && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: '#f1f5f9', padding: '1rem', borderRadius: '12px', color: 'var(--accent-primary)' }}>
                <Users size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Total Estudiantes</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-main)' }}>
                  {kpis.total_activos + kpis.total_inactivos + kpis.total_egresando || total}
                </div>
              </div>
            </div>
            <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: '#dcfce7', padding: '1rem', borderRadius: '12px', color: '#166534' }}>
                <UserCheck size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Activos</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-main)' }}>{kpis.total_activos}</div>
              </div>
            </div>
            <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: '#fee2e2', padding: '1rem', borderRadius: '12px', color: '#991b1b' }}>
                <UserMinus size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Inactivos</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-main)' }}>{kpis.total_inactivos}</div>
              </div>
            </div>
            <div className="glass-card" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <div style={{ background: '#fef08a', padding: '1rem', borderRadius: '12px', color: '#854d0e' }}>
                <GraduationCap size={24} />
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Egresando</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 700, color: 'var(--text-main)' }}>{kpis.total_egresando}</div>
              </div>
            </div>
          </div>
          <div className="glass-card" style={{ padding: '1.5rem', height: '300px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1rem', color: 'var(--text-main)' }}>Estudiantes por Semestre</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kpis.by_semester}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="semestre" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Bar dataKey="count" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
            <div className="loader"></div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto', background: 'white', borderRadius: '12px', border: '1px solid var(--border)' }}>
          <table className="directory-table">
            <thead style={{ background: '#f8fafc' }}>
              <tr>
                <th>Documento</th>
                <th>Nombre</th>
                <th>Estado</th>
                <th>Semestre</th>
                <th>Centro / Zona</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <React.Fragment key={student.documento}>
                  <tr 
                    className="directory-row" 
                    onClick={() => toggleRow(student.documento)}
                    style={{ background: expandedRow === student.documento ? '#f0f9ff' : 'transparent' }}
                  >
                    <td><strong>{student.documento}</strong></td>
                    <td>
                      <div>{student.nombre}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--accent-primary)', marginTop: '4px' }}>{student.correo}</div>
                    </td>
                    <td>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600,
                        background: student.estado === 'Activo' ? '#dcfce7' : student.estado === 'Egresando' ? '#fef08a' : '#f1f5f9',
                        color: student.estado === 'Activo' ? '#166534' : student.estado === 'Egresando' ? '#854d0e' : '#475569'
                      }}>
                        {student.estado}
                      </span>
                    </td>
                    <td>
                      {student.semestre_relativo ? (
                        <strong>{student.semestre_relativo}°</strong>
                      ) : (
                        <span style={{color: 'var(--text-muted)'}}>-</span>
                      )}
                    </td>
                    <td>
                      <div>{student.ultimo_centro}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>{student.ultima_zona}</div>
                    </td>
                  </tr>
                  
                  {/* Expandable Content */}
                  <tr>
                    <td colSpan="5" style={{ padding: 0, borderBottom: expandedRow === student.documento ? '1px solid var(--border)' : 'none' }}>
                      <div className={`expandable-content ${expandedRow === student.documento ? 'expanded' : ''}`}>
                        <div className="history-card" style={{ background: '#f8fafc' }}>
                          <div style={{ gridColumn: '1 / -1', paddingBottom: '1rem', borderBottom: '1px solid var(--border)', marginBottom: '0.5rem', display: 'flex', gap: '2rem' }}>
                            <div>
                                <span className="file-meta">Fecha de Ingreso:</span> <strong>{student.fecha_matricula_inicial}</strong>
                            </div>
                            <div>
                                <span className="file-meta">Periodo Inicial:</span> <strong>{student.periodo_matricula_inicial}</strong>
                            </div>
                          </div>
                          {student.historial && student.historial.length > 0 ? (
                            student.historial.map((hist, idx) => (
                              <div key={idx} className="history-item">
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '4px' }}>PERIODO {hist.periodo}</div>
                                <div style={{ fontSize: '0.9rem', color: 'var(--text-main)', marginBottom: '8px', lineHeight: '1.4' }}>
                                  {hist.programa || 'Programa No Especificado'}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)' }}></span>
                                  <strong style={{ fontSize: '0.9rem' }}>{hist.creditos_totales} Créditos</strong>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div style={{ padding: '1rem', color: 'var(--text-muted)' }}>Sin historial de matrícula registrado.</div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                </React.Fragment>
              ))}
              
              {students.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                    No se encontraron estudiantes con los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination component */}
      {!loading && students.length > 0 && (
        <div className="pagination-controls">
          <span>Mostrando {skip + 1} a {Math.min(skip + limit, total)} de {total} estudiantes</span>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button 
              className="btn" 
              style={{ background: skip === 0 ? '#f1f5f9' : 'white', border: '1px solid var(--border)', color: skip === 0 ? '#94a3b8' : 'var(--text-main)', cursor: skip === 0 ? 'not-allowed' : 'pointer' }}
              onClick={handlePrev}
              disabled={skip === 0}
            >
              Anterior
            </button>
            <button 
              className="btn" 
              style={{ background: skip + limit >= total ? '#f1f5f9' : 'white', border: '1px solid var(--border)', color: skip + limit >= total ? '#94a3b8' : 'var(--text-main)', cursor: skip + limit >= total ? 'not-allowed' : 'pointer' }}
              onClick={handleNext}
              disabled={skip + limit >= total}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentDirectory;
