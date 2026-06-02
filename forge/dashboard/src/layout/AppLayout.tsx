import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

const navItems = [
  { path: '/projects', label: 'Projects' },
  { path: '/modules', label: 'Modules' },
];

export default function AppLayout() {
  const { logout } = useAuth();
  const location = useLocation();

  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <nav style={{
        width: '200px', background: '#1a1a1a', padding: '1rem',
        display: 'flex', flexDirection: 'column', gap: '0.5rem',
        borderRight: '1px solid #333',
      }}>
        <h2 style={{ color: '#ff4444', marginBottom: '1rem' }}>FORGE</h2>
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            style={{
              color: location.pathname.startsWith(item.path) ? '#ff4444' : '#888',
              textDecoration: 'none', padding: '0.5rem',
              borderRadius: '4px',
              background: location.pathname.startsWith(item.path) ? '#2a2a2a' : 'transparent',
            }}
          >
            {item.label}
          </Link>
        ))}
        <div style={{ flex: 1 }} />
        <button
          onClick={logout}
          style={{
            padding: '0.5rem', background: 'transparent', border: '1px solid #333',
            borderRadius: '4px', color: '#888', cursor: 'pointer',
          }}
        >
          Logout
        </button>
      </nav>
      <main style={{ flex: 1, padding: '1.5rem', overflow: 'auto' }}>
        <Routes>
          <Route path="/" element={<div>Select a section from the sidebar.</div>} />
          <Route path="/projects" element={<div>Projects (next task)</div>} />
          <Route path="/modules" element={<div>Modules (next task)</div>} />
        </Routes>
      </main>
    </div>
  );
}
