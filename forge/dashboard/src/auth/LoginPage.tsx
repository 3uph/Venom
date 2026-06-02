import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import api from '../api/client';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.post('/auth/login', { username, password });
      login(res.data.token);
      navigate('/');
    } catch {
      setError('Invalid credentials');
    }
  };

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      height: '100vh', background: '#0f0f0f',
    }}>
      <form onSubmit={handleSubmit} style={{
        background: '#1a1a1a', padding: '2rem', borderRadius: '8px',
        width: '320px', display: 'flex', flexDirection: 'column', gap: '1rem',
      }}>
        <h1 style={{ color: '#ff4444', textAlign: 'center', fontSize: '1.5rem' }}>
          FORGE
        </h1>
        {error && <div style={{ color: '#ff4444', fontSize: '0.9rem' }}>{error}</div>}
        <input
          type="text" placeholder="Username" value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={{
            padding: '0.6rem', background: '#2a2a2a', border: '1px solid #333',
            borderRadius: '4px', color: '#e0e0e0', fontSize: '1rem',
          }}
        />
        <input
          type="password" placeholder="Password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            padding: '0.6rem', background: '#2a2a2a', border: '1px solid #333',
            borderRadius: '4px', color: '#e0e0e0', fontSize: '1rem',
          }}
        />
        <button type="submit" style={{
          padding: '0.6rem', background: '#ff4444', border: 'none',
          borderRadius: '4px', color: '#fff', fontSize: '1rem', cursor: 'pointer',
        }}>
          Login
        </button>
      </form>
    </div>
  );
}
