import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UploadCloud, Trash2, FileSpreadsheet, RefreshCw } from 'lucide-react';

const API_BASE = 'http://localhost:8000/api';

const FileManager = () => {
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
        // Toast or notification could go here
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

  return (
    <div className="glass-card">
      <h2>Gestor de Archivos</h2>
      
      <div 
        className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-upload').click()}
      >
        {uploading ? (
          <div className="loader"></div>
        ) : (
          <>
            <UploadCloud size={48} className="upload-icon" />
            <h3>Arrastra tus archivos Excel aquí</h3>
            <p className="file-meta mt-2" style={{ marginTop: '0.5rem' }}>o haz click para seleccionarlos por lotes</p>
            <p className="file-meta" style={{ opacity: 0.7, marginTop: '1rem' }}>Si el archivo ya existe (mismo periodo/programa), se <strong>sobrescribirán</strong> los datos.</p>
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

      <div className="file-list">
        <h3>Archivos Cargados ({files.length})</h3>
        {files.map(f => (
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
      </div>
    </div>
  );
};

export default FileManager;
