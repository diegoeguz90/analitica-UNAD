import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList
} from 'recharts';

const API_BASE = '/api';

const Retention = () => {
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState('');
  const [data, setData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [selectedHistoryPeriods, setSelectedHistoryPeriods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Define premium colors for the chart
  const COLORS = ['#10b981', '#6366f1', '#f43f5e']; 
  const COLORS_LIGHT = ['#d1fae5', '#e0e7ff', '#ffe4e6'];  const RADIAN = Math.PI / 180;
  
  // Custom label for Donut chart
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index }) => {
    const radius = outerRadius * 1.2;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
    return percent > 0 ? (
      <text 
        x={x} 
        y={y} 
        fill="#1e293b" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central" 
        fontSize="13" 
        fontWeight="700"
      >
        {`${(percent * 100).toFixed(1)}%`}
      </text>
    ) : null;
  };

  useEffect(() => {
    // Fetch available periods for the dropdown
    const fetchPeriods = async () => {
      try {
        const res = await axios.get(`${API_BASE}/files/`);
        const uniquePeriods = [...new Set(res.data.map(f => f.periodo).filter(p => p !== 'MAESTRO'))];
        uniquePeriods.sort();
        setPeriods(uniquePeriods);
        if (uniquePeriods.length > 0) {
          setSelectedPeriod(uniquePeriods[0]);
        }
      } catch (err) {
        console.error("Error fetching periods", err);
      }
    };
    fetchPeriods();
  }, []);

  useEffect(() => {
    // Fetch retention analytics when selectedPeriod changes
    if (!selectedPeriod) return;
    
    const fetchRetention = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get(`${API_BASE}/analytics/retention?period=${selectedPeriod}`);
        setData(res.data);
      } catch (err) {
        console.error("Error fetching retention data", err);
        setError('No se pudo cargar la información de retención. Asegúrese de que el periodo tenga cohortes iniciales.');
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchRetention();
  }, [selectedPeriod]);

  useEffect(() => {
    // Fetch historical retention data
    const fetchHistory = async () => {
      try {
        const res = await axios.get(`${API_BASE}/analytics/retention/history`);
        setHistoryData(res.data);
      } catch (err) {
        console.error("Error fetching retention history", err);
      }
    };
    fetchHistory();
  }, []);

  const handleHistoryPeriodChange = (e) => {
    const opts = e.target.options;
    const values = [];
    for (let i = 0; i < opts.length; i++) {
        if (opts[i].selected) {
            if (opts[i].value === "all") {
                setSelectedHistoryPeriods([]);
                return;
            }
            values.push(opts[i].value);
        }
    }
    setSelectedHistoryPeriods(values);
  };

  const filteredHistoryData = selectedHistoryPeriods.length === 0 
    ? historyData 
    : historyData.filter(d => selectedHistoryPeriods.includes(d.base_period));

  // Chart data formatting
  const chartData = data ? [
    { name: 'Retenidos', value: data.retained, percentage: data.retained_percentage },
    { name: 'Regresaron Tarde', value: data.returned_later, percentage: data.returned_later_percentage },
    { name: 'No Volvieron', value: data.dropped_out, percentage: data.dropped_out_percentage }
  ].filter(item => item.value > 0) : [];

  return (
    <div className="glass-card fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h2>Módulo de Retención</h2>
          <p className="file-meta" style={{ marginTop: '0.5rem' }}>Análisis de cohortes por primer semestre de matrícula</p>
        </div>
        <div className="filters-container">
          <label className="file-meta" style={{ marginRight: '1rem', color: '#fff' }}>Seleccionar Cohorte (Periodo Base):</label>
          <select 
            className="select-base" 
            onChange={(e) => setSelectedPeriod(e.target.value)}
            value={selectedPeriod}
            style={{ height: '40px', padding: '0 1rem', fontSize: '1.1rem', backgroundColor: 'var(--bg-dark)', color: 'var(--text-main)', border: '1px solid rgba(255, 255, 255, 0.2)' }}
          >
            {periods.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: '2.5rem', borderBottom: '1px solid #e2e8f0' }}></div>

      {loading && <div className="loader" style={{ margin: '4rem auto' }}></div>}
      
      {error && <div style={{ color: 'var(--danger)', textAlign: 'center', padding: '2rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>{error}</div>}

      {!loading && data && (
        <>
          <div className="kpi-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
            
            <div className="glass-card kpi-card" style={{ borderLeft: '6px solid #3b82f6', background: '#ffffff', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cohorte Inicial</span>
              <div className="kpi-value" style={{ color: '#1e293b', fontSize: '2.5rem', margin: '0.25rem 0', fontWeight: '900' }}>{data.cohort_size.toLocaleString()}</div>
              <span style={{ color: '#3b82f6', fontSize: '0.85rem', fontWeight: '600' }}>Total Estudiantes</span>
            </div>
 
            <div className="glass-card kpi-card" style={{ borderLeft: '6px solid #10b981', background: '#ffffff', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Retenidos</span>
              <div className="kpi-value" style={{ color: '#065f46', fontSize: '2.5rem', margin: '0.25rem 0', fontWeight: '900' }}>{data.retained_percentage}<span style={{ fontSize: '1.2rem' }}>%</span></div>
              <div style={{ color: '#059669', fontSize: '0.9rem', fontWeight: '600' }}>{data.retained.toLocaleString()} estudiantes</div>
            </div>
 
            <div className="glass-card kpi-card" style={{ borderLeft: '6px solid #6366f1', background: '#ffffff', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Regresaron Tarde</span>
              <div className="kpi-value" style={{ color: '#3730a3', fontSize: '2.5rem', margin: '0.25rem 0', fontWeight: '900' }}>{data.returned_later_percentage}<span style={{ fontSize: '1.2rem' }}>%</span></div>
              <div style={{ color: '#4f46e5', fontSize: '0.9rem', fontWeight: '600' }}>{data.returned_later.toLocaleString()} estudiantes</div>
            </div>
 
            <div className="glass-card kpi-card" style={{ borderLeft: '6px solid #f43f5e', background: '#ffffff', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>No Volvieron</span>
              <div className="kpi-value" style={{ color: '#9f1239', fontSize: '2.5rem', margin: '0.25rem 0', fontWeight: '900' }}>{data.dropped_out_percentage}<span style={{ fontSize: '1.2rem' }}>%</span></div>
              <div style={{ color: '#e11d48', fontSize: '0.9rem', fontWeight: '600' }}>{data.dropped_out.toLocaleString()} estudiantes</div>
            </div>
          </div>

          {data.cohort_size > 0 ? (
            <div className="chart-grid">
              <div className="glass-card chart-box" style={{ gridColumn: '1 / -1', minHeight: '400px' }}>
                <h3 style={{ textAlign: 'center', marginBottom: '1rem', color: 'var(--text-main)' }}>Distribución de Retención para la Cohorte {data.base_period}</h3>
                <div className="chart-container" style={{ height: '350px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={140}
                        paddingAngle={5}
                        dataKey="value"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        stroke="rgba(0,0,0,0.2)"
                        strokeWidth={2}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'rgba(20, 20, 20, 0.9)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }} 
                        formatter={(value, name, props) => [`${value} estudiantes (${props.payload.percentage}%)`, name]}
                      />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: 'var(--text-muted)' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="glass-card chart-box" style={{ gridColumn: '1 / -1', marginTop: '2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
                  <h3>Tendencia de Retención por Cohorte</h3>
                  <div className="filters-container">
                    <label className="file-meta" style={{ marginRight: '1rem', color: '#fff' }}>Filtrar Periodos en Gráfica:</label>
                    <select 
                      multiple 
                      className="select-base" 
                      onChange={handleHistoryPeriodChange}
                      value={selectedHistoryPeriods.length === 0 ? ["all"] : selectedHistoryPeriods}
                      style={{ height: '80px', minWidth: '150px' }}
                    >
                      <option value="all">-- Todos los Periodos --</option>
                      {periods.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="chart-container" style={{ height: '400px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={filteredHistoryData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="base_period" stroke="var(--text-muted)" />
                      <YAxis stroke="#64748b" unit="%" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                        itemStyle={{ fontSize: '0.9rem', fontWeight: '600' }}
                        formatter={(value, name) => [`${value}%`, name]}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                      <Bar dataKey="retained_percentage" name="Retenidos (Sig. Semestre)" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]}>
                         <LabelList dataKey="retained_percentage" position="center" formatter={(v) => v > 10 ? `${v}%` : ''} fill="#fff" style={{ fontWeight: 'bold' }} />
                      </Bar>
                      <Bar dataKey="returned_later_percentage" name="Regresaron Después" stackId="a" fill="#6366f1">
                         <LabelList dataKey="returned_later_percentage" position="center" formatter={(v) => v > 10 ? `${v}%` : ''} fill="#fff" style={{ fontWeight: 'bold' }} />
                      </Bar>
                      <Bar dataKey="dropped_out_percentage" name="No Volvieron (Desertores)" stackId="a" fill="#f43f5e" radius={[4, 4, 0, 0]}>
                         <LabelList dataKey="dropped_out_percentage" position="center" formatter={(v) => v > 10 ? `${v}%` : ''} fill="#fff" style={{ fontWeight: 'bold' }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
              <h3>No hay estudiantes en la cohorte seleccionada.</h3>
              <p>Por favor seleccione otro periodo base.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Retention;
