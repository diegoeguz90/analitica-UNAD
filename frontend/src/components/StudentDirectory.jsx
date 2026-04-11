import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_BASE = 'http://localhost:8000/api';

const StudentDirectory = () => {
  const [students, setStudents] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Pagination
  const [skip, setSkip] = useState(0);
  const [limit, setLimit] = useState(20);
  
  // Expanded rows
  const [expandedRow, setExpandedRow] = useState(null);

  useEffect(() => {
    fetchStudents();
  }, [skip, limit, search]);

  const fetchStudents = async () => {
    setLoading(true);
    try {
      const q = search ? `&q=${encodeURIComponent(search)}` : '';
      const res = await axios.get(`${API_BASE}/analytics/students?skip=${skip}&limit=${limit}${q}`);
      setTotal(res.data.total);
      setStudents(res.data.items);
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
    setSkip(0); // Reset to first page
    setExpandedRow(null);
  };

  return (
    <div className="glass-card" style={{ padding: '2rem 3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>Directorio de Estudiantes</h2>
          <p className="file-meta" style={{ marginTop: '-1.5rem', color: 'var(--text-muted)' }}>
            Listado general con detalle de historial académico.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1, justifyContent: 'flex-end', minWidth: '300px' }}>
          <input 
            type="text" 
            placeholder="Buscar por nombre o documento..." 
            className="select-base"
            style={{ width: '100%', maxWidth: '400px', height: '42px' }}
            value={search}
            onChange={handleSearchChange}
          />
          <button className="btn btn-primary" onClick={handleDownload} style={{ whiteSpace: 'nowrap' }}>
            Descargar (.csv)
          </button>
        </div>
      </div>

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
                <th>Correo Institucional</th>
                <th>Centro</th>
                <th>Zona</th>
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
                    <td>{student.nombre}</td>
                    <td style={{ color: 'var(--accent-primary)' }}>{student.correo}</td>
                    <td>{student.ultimo_centro}</td>
                    <td>{student.ultima_zona}</td>
                  </tr>
                  
                  {/* Expandable Content */}
                  <tr>
                    <td colSpan="5" style={{ padding: 0, borderBottom: expandedRow === student.documento ? '1px solid var(--border)' : 'none' }}>
                      <div className={`expandable-content ${expandedRow === student.documento ? 'expanded' : ''}`}>
                        <div className="history-card">
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
                    No se encontraron estudiantes registrados.
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
