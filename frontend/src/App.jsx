import { useState } from 'react'
import FileManager from './components/FileManager'
import Dashboard from './components/Dashboard'
import StudentDirectory from './components/StudentDirectory'
import DegreeWork from './components/DegreeWork'
import Retention from './components/Retention'

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="app-container">
      <nav className="sidebar">
        <div className="logo-container">
          <h1 className="logo-text">UNAD <span className="logo-highlight">Analytics</span></h1>
        </div>
        <ul className="nav-menu">
          <li 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Matricula
          </li>
          <li 
            className={`nav-item ${activeTab === 'directory' ? 'active' : ''}`}
            onClick={() => setActiveTab('directory')}
          >
            Estudiantes del programa
          </li>
          <li 
            className={`nav-item ${activeTab === 'degreework' ? 'active' : ''}`}
            onClick={() => setActiveTab('degreework')}
          >
            Opciones de trabajo de grado
          </li>
          <li 
            className={`nav-item ${activeTab === 'retention' ? 'active' : ''}`}
            onClick={() => setActiveTab('retention')}
          >
            Retención
          </li>
        </ul>
      </nav>
      
      <main className="main-content">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'directory' && <StudentDirectory />}
        {activeTab === 'degreework' && <DegreeWork />}
        {activeTab === 'retention' && <Retention />}
      </main>
    </div>
  )
}

export default App
