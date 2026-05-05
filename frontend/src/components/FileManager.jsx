import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UploadCloud, Trash2, FileSpreadsheet, RefreshCw } from 'lucide-react';

const API_BASE = '/api';

const FileManager = ({ mode = 'full' }) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const fetchFiles = async () => {
    try {
      const res = await axios.get(`${API_BASE}/files/`);
      setFiles(res.data);
    } catch (err) {
      console.error('Error fetching files:', err);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const processUpload = async (uploadFiles) => {
    setUploading(true);
    for (const file of uploadFiles) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        await axios.post(`${API_BASE}/files/upload`, formData);
      } catch (err) {
        console.error('Upload failed for', file.name, err);
        alert(`Failed to upload ${file.name}. Ensure it matches the nomenclature.`);
      }
    }
    setUploading(false);
    fetchFiles();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processUpload(e.dataTransfer.files);
    }
  };

  const handleChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processUpload(e.target.files);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Seguro que deseas eliminar este archivo y todos sus registros asociados?')) return;
    try {
      await axios.delete(`${API_BASE}/files/${id}`);
      fetchFiles();
    } catch (err) {
      console.error(err);
      alert('Falló al eliminar el archivo');
    }
  };

  const showMatricula = mode === 'full' || mode === 'matricula';
  const showMaestro = mode === 'full' || mode === 'maestro';

  return (
    <div className="glass-card">
      <div style={{ display: 'grid', gridTemplateColumns: mode === 'full' ? 'repeat(auto-fit, minmax(300px, 1fr))' : '1fr', gap: '2rem' }}>
        {/* Regular Upload Zone (Matrículas Históricas) */}
        {showMatricula && (
          <div 
            className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
            style={{ marginBottom: '1rem' }}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-upload').click()}
          >
            {uploading ? (
              <div className="loader" style={{ margin: '0 auto' }}></div>
            ) : (
              <>
                <UploadCloud size={48} className="upload-icon" />
                <h3 style={{ marginTop: '1rem' }}>Matrículas Históricas</h3>
                <p className="file-meta mt-2" style={{ marginTop: '0.5rem' }}>Arrastra archivos Excel aquí</p>
              </>
            )}
            <input 
              id="file-upload" 
              type="file" 
              multiple 
              accept=".xlsx" 
              style={{ display: 'none' }} 
              onChange={handleChange}
            />
          </div>
        )}

        {/* Enrichment Upload Zone (Archivo Maestro) */}
        {showMaestro && (
          <div 
            className="upload-zone"
            style={{ marginBottom: '1rem', borderColor: 'var(--accent-secondary)', backgroundColor: '#fffbf0' }}
            onClick={() => document.getElementById('enrichment-upload').click()}
          >
            {uploading ? (
              <div className="loader" style={{ margin: '0 auto', borderTopColor: 'var(--accent-secondary)' }}></div>
            ) : (
              <>
                <UploadCloud size={48} style={{ color: 'var(--accent-secondary)' }} />
                <h3 style={{ marginTop: '1rem' }}>Archivo Maestro (Estado)</h3>
                <p className="file-meta mt-2" style={{ marginTop: '0.5rem' }}>Sube el archivo actual para enriquecer el directorio</p>
              </>
            )}
            <input 
              id="enrichment-upload" 
              type="file" 
              accept=".xlsx" 
              style={{ display: 'none' }} 
              onChange={async (e) => {
                if (e.target.files && e.target.files[0]) {
                  const formData = new FormData();
                  formData.append('file', e.target.files[0]);
                  setUploading(true);
                  try {
                    const res = await axios.post(`${API_BASE}/files/upload_enrichment`, formData);
                    alert(res.data.message);
                  } catch (err) {
                    alert('Error al procesar archivo maestro');
                  }
                  setUploading(false);
                  fetchFiles();
                }
              }}
            />
          </div>
        )}
      </div>

      <div className="file-list" style={{ marginTop: '2rem' }}>
        {/* Master File Status Card */}
        {showMaestro && files.find(f => f.periodo === 'MAESTRO') && (
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ color: 'var(--accent-secondary)' }}>Archivo Maestro Activo</h3>
            {files.filter(f => f.periodo === 'MAESTRO').map(f => (
              <div key={f.id} className="file-item" style={{ borderColor: 'var(--accent-secondary)', backgroundColor: '#fffbf0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <FileSpreadsheet size={24} style={{ color: 'var(--accent-secondary)' }} />
                  <div className="file-info">
                    <h4>{f.filename}</h4>
                    <p className="file-meta">
                      Cargado el: <strong>{new Date(f.uploaded_at).toLocaleDateString()}</strong> • Estado Actual
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="btn btn-primary" 
                    style={{ backgroundColor: 'var(--accent-secondary)', borderColor: 'var(--accent-secondary)' }}
                    onClick={() => document.getElementById('enrichment-upload').click()}
                  >
                    <RefreshCw size={16} /> Sobrescribir
                  </button>
                  <button className="btn btn-danger" onClick={() => handleDelete(f.id)}>
                    <Trash2 size={16} /> Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Enrollment Files List */}
        {showMatricula && (
          <>
            <h3>Historial de Matrículas ({files.filter(f => f.periodo !== 'MAESTRO').length})</h3>
            {files.filter(f => f.periodo !== 'MAESTRO').map(f => (
              <div key={f.id} className="file-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <FileSpreadsheet size={24} style={{ color: 'var(--success)' }} />
                  <div className="file-info">
                    <h4>{f.filename}</h4>
                    <p className="file-meta">
                      Periodo: <strong>{f.periodo}</strong> | Programa: <strong>{f.programa}</strong> • {f.record_count} registros
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button 
                    className="btn btn-primary" 
                    title="Sube archivo con mismo nombre para sobrescribir"
                    onClick={() => document.getElementById('file-upload').click()}
                  >
                    <RefreshCw size={16} /> Sobrescribir
                  </button>
                  <button className="btn btn-danger" onClick={() => handleDelete(f.id)}>
                    <Trash2 size={16} /> Eliminar
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
};

export default FileManager;
