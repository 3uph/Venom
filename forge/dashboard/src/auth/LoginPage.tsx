import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthProvider';
import api from '../api/client';
import { t, space, radius, font } from '../theme/tokens';
import ThemeToggle from '../theme/ThemeToggle';

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

  const inputStyle = {
    padding: '0.65rem 0.85rem',
    background: t.surface2,
    border: `1px solid ${t.border}`,
    borderRadius: radius.md,
    color: t.text,
    fontSize: font.md,
    outline: 'none',
    transition: 'border-color 0.15s ease',
  };

  return (
    <div style={{
      display: 'flex', justifyContent: 'center', alignItems: 'center',
      height: '100vh', background: t.bg, position: 'relative',
    }}>
      <div style={{ position: 'absolute', top: space.lg, right: space.lg }}>
        <ThemeToggle />
      </div>
      <form
        onSubmit={handleSubmit}
        style={{
          background: t.surface,
          padding: '2.5rem',
          borderRadius: radius.lg,
          border: `1px solid ${t.border}`,
          width: '360px',
          display: 'flex',
          flexDirection: 'column',
          gap: space.md,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: space.md }}>
          <div style={{
            color: t.accent,
            fontSize: '1.75rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
          }}>
            VENOM
          </div>
          <div style={{ color: t.textDim, fontSize: font.sm, marginTop: '0.25rem' }}>
            Red team artifact builder
          </div>
        </div>

        {error && (
          <div style={{
            color: t.danger,
            background: t.accentSoft,
            padding: '0.55rem 0.75rem',
            borderRadius: radius.sm,
            fontSize: font.sm,
          }}>
            {error}
          </div>
        )}

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />
        <button
          type="submit"
          style={{
            padding: '0.7rem',
            background: t.accent,
            border: 'none',
            borderRadius: radius.md,
            color: '#fff',
            fontSize: font.md,
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = t.accentHover; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = t.accent; }}
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
