import { useState } from 'react'
import FileManager from './components/FileManager'
import Dashboard from './components/Dashboard'
import StudentDirectory from './components/StudentDirectory'

function App() {
  const [activeTab, setActiveTab] = useState('files');

  return (
    <div className="app-container">
      <nav className="sidebar">
        <div className="logo-container">
          <h1 className="logo-text">UNAD <span className="logo-highlight">Analytics</span></h1>
        </div>
        <ul className="nav-menu">
          <li 
            className={`nav-item ${activeTab === 'files' ? 'active' : ''}`}
            onClick={() => setActiveTab('files')}
          >
            Gestor de Archivos
          </li>
          <li 
            className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            Dashboard
          </li>
          <li 
            className={`nav-item ${activeTab === 'directory' ? 'active' : ''}`}
            onClick={() => setActiveTab('directory')}
          >
            Directorio
          </li>
        </ul>
      </nav>
      
      <main className="main-content">
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'files' && <FileManager />}
        {activeTab === 'directory' && <StudentDirectory />}
      </main>
    </div>
  )
}

export default App
