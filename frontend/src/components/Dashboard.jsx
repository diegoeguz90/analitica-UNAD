import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList
} from 'recharts';

const API_BASE = '/api';

const Dashboard = () => {
  const [files, setFiles] = useState([]);
  const [selectedPeriods, setSelectedPeriods] = useState([]);
  const [zonePeriods, setZonePeriods] = useState([]);
  const [data, setData] = useState(null);
  const [zoneData, setZoneData] = useState([]);

  useEffect(() => {
    // Fetch available periods
    const getFiles = async () => {
      try {
        const res = await axios.get(`${API_BASE}/files/`);
        const uniquePeriods = [...new Set(res.data.map(f => f.periodo))];
        setFiles(uniquePeriods.sort());
      } catch (e) {
        console.error(e);
      }
    };
    getFiles();
  }, []);

  useEffect(() => {
    // Fetch analytics when global periods change
    const getAnalytics = async () => {
      try {
        let url = `${API_BASE}/analytics/summary`;
        if (selectedPeriods.length > 0) {
          const params = new URLSearchParams();
          selectedPeriods.forEach(p => params.append('periods', p));
          url += `?${params.toString()}`;
        }
        const res = await axios.get(url);
        setData(res.data);
        // Default zone data comes from initial summary
        if (zonePeriods.length === 0) setZoneData(res.data.distribution_by_zone);
      } catch (e) {
        console.error(e);
      }
    };
    getAnalytics();
  }, [selectedPeriods]);

  useEffect(() => {
    // Fetch specific zone analytics when zone periods change
    const getZoneAnalytics = async () => {
      if (zonePeriods.length === 0 && data) {
        setZoneData(data.distribution_by_zone);
        return;
      }
      try {
        let url = `${API_BASE}/analytics/zones`;
        const params = new URLSearchParams();
        zonePeriods.forEach(p => params.append('periods', p));
        url += `?${params.toString()}`;
        const res = await axios.get(url);
        setZoneData(res.data);
      } catch (e) {
        console.error(e);
      }
    };
    getZoneAnalytics();
  }, [zonePeriods]);

  const handlePeriodChange = (e) => {
    const opts = e.target.options;
    const values = [];
    for (let i = 0; i < opts.length; i++) {
        if (opts[i].selected) {
            if (opts[i].value === "all") {
                setSelectedPeriods([]);
                return;
            }
            values.push(opts[i].value);
        }
    }
    setSelectedPeriods(values);
  };

  const handleZonePeriodChange = (e) => {
    const opts = e.target.options;
    const values = [];
    for (let i = 0; i < opts.length; i++) {
        if (opts[i].selected) {
            if (opts[i].value === "all") {
                setZonePeriods([]);
                return;
            }
            values.push(opts[i].value);
        }
    }
    setZonePeriods(values);
  };



  return (
    <div className="glass-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h2>Dashboard Analítico</h2>
        </div>
        <div className="filters-container">
          <label className="file-meta" style={{ marginRight: '1rem', color: '#fff' }}>Filtrar Periodos Globales:</label>
          <select 
            multiple 
            className="select-base" 
            onChange={handlePeriodChange}
            value={selectedPeriods.length === 0 ? ["all"] : selectedPeriods}
            style={{ height: '80px' }}
          >
            <option value="all">-- Todos los Periodos --</option>
            {files.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {!data && <div className="loader"></div>}

      {data && (
        <>
          {/* KPI Row */}
          <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            <div className="glass-card kpi-card">
              <span className="file-meta">Matrículas Totales</span>
              <div className="kpi-value">{data.total_enrollments}</div>
            </div>
            <div className="glass-card kpi-card" style={{ borderLeft: '4px solid var(--accent-primary)' }}>
              <span className="file-meta">Estudiantes Únicos (Global)</span>
              <div className="kpi-value">{data.unique_students_total}</div>
            </div>
            <div className="glass-card kpi-card" style={{ borderLeft: '4px solid var(--success)' }}>
              <span className="file-meta">Total Créditos</span>
              <div className="kpi-value">
                {data.total_credits_per_period.reduce((acc, curr) => acc + curr.value, 0).toLocaleString()}
              </div>
            </div>
          </div>

          <div className="chart-grid">
            <div className="glass-card chart-box">
              <h3>Estudiantes Únicos por Periodo</h3>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.unique_students_per_period} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="periodo" stroke="var(--text-muted)" />
                    <YAxis stroke="var(--text-muted)" />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-dark)', borderRadius: '8px' }} />
                    <Bar dataKey="value" name="Estudiantes" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} opacity={0.8}>
                      <LabelList dataKey="value" position="top" style={{ fill: 'var(--text-muted)', fontSize: '12px', fontWeight: 'bold' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="glass-card chart-box">
              <h3>Créditos Totales por Periodo</h3>
              <div className="chart-container">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.total_credits_per_period} margin={{ top: 10, right: 30, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="periodo" stroke="var(--text-muted)" />
                    <YAxis stroke="var(--text-muted)" />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-dark)', borderRadius: '8px' }} />
                    <Bar dataKey="value" name="Créditos" fill="var(--success)" radius={[4, 4, 0, 0]} opacity={0.7}>
                       <LabelList dataKey="value" position="top" style={{ fill: 'var(--text-muted)', fontSize: '11px' }} formatter={(v) => v.toLocaleString()} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Zone Distribution as a Standalone Highlight */}
          <div className="glass-card chart-box" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <h3>Distribución de Estudiantes por Zona</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="file-meta">Filtro Zona:</span>
                  <select 
                    multiple 
                    className="select-base" 
                    onChange={handleZonePeriodChange}
                    value={zonePeriods.length === 0 ? ["all"] : zonePeriods}
                    style={{ height: '60px', minWidth: '150px' }}
                  >
                    <option value="all">Sincronizar Global</option>
                    {files.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
              </div>
            </div>
            <div className="chart-container" style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart layout="vertical" data={zoneData} margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" stroke="var(--text-muted)" />
                  <YAxis dataKey="label" type="category" stroke="var(--text-main)" width={120} />
                  <Tooltip contentStyle={{ backgroundColor: 'var(--bg-dark)', borderRadius: '8px' }} />
                  <Bar dataKey="value" name="Estudiantes" fill="var(--accent-secondary)" radius={[0, 4, 4, 0]} opacity={0.8}>
                    <LabelList dataKey="value" position="right" style={{ fill: 'var(--text-muted)', fontSize: '11px', fontWeight: 'bold' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tables Row */}
          <div className="chart-grid">
            <div className="glass-card chart-box">
              <h3>Top Zonas (Estudiantes)</h3>
              <div className="table-wrapper">
                <table className="analysis-table">
                  <thead>
                    <tr><th>Zona</th><th align="right">Estudiantes</th></tr>
                  </thead>
                  <tbody>
                    {data.top_zones.map((z, idx) => (
                      <tr key={idx}><td>{z.label}</td><td align="right"><strong>{z.value}</strong></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="glass-card chart-box">
              <h3>Top Centros (Estudiantes)</h3>
              <div className="table-wrapper">
                <table className="analysis-table">
                  <thead>
                    <tr><th>Centro</th><th align="right">Estudiantes</th></tr>
                  </thead>
                  <tbody>
                    {data.top_centers.map((c, idx) => (
                      <tr key={idx}><td>{c.label}</td><td align="right"><strong>{c.value}</strong></td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Dashboard;
