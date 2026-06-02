import { useState, useEffect, FormEvent } from 'react';
import api from '../api/client';

interface ModuleFunction {
  name: string;
  description: string;
  params: { name: string; type: string; required: boolean; options?: string[] }[];
}

interface Module {
  id: string;
  name: string;
  host: string;
  port: number;
  platform: string;
  status: string;
  last_health_check: string | null;
  manifest_cache: { functions?: ModuleFunction[] } | null;
}

export default function ModuleRegistryPage() {
  const [modules, setModules] = useState<Module[]>([]);
  const [host, setHost] = useState('');
  const [port, setPort] = useState('');
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    const res = await api.get('/modules');
    setModules(res.data);
  };

  useEffect(() => { load(); }, []);

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/modules', { host, port: parseInt(port) });
      setHost('');
      setPort('');
      load();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to register module');
    }
  };

  const handleRefresh = async (id: string) => {
    await api.post(`/modules/${id}/refresh`);
    load();
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/modules/${id}`);
    load();
  };

  const inputStyle = {
    padding: '0.5rem', background: '#2a2a2a', border: '1px solid #333',
    borderRadius: '4px', color: '#e0e0e0', fontSize: '0.9rem',
  };

  return (
    <div>
      <h2 style={{ marginBottom: '1rem' }}>Modules</h2>
      <form onSubmit={handleRegister} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <input placeholder="Host (IP)" value={host} onChange={(e) => setHost(e.target.value)} style={inputStyle} />
        <input placeholder="Port" value={port} onChange={(e) => setPort(e.target.value)} style={{ ...inputStyle, width: '100px' }} />
        <button type="submit" style={{
          padding: '0.5rem 1rem', background: '#ff4444', border: 'none',
          borderRadius: '4px', color: '#fff', cursor: 'pointer',
        }}>
          Register
        </button>
      </form>
      {error && <div style={{ color: '#ff4444', marginBottom: '1rem' }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {modules.map((m) => (
          <div key={m.id} style={{
            padding: '0.75rem 1rem', background: '#1a1a1a', borderRadius: '6px',
            border: '1px solid #333',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ cursor: 'pointer' }} onClick={() => setExpanded(expanded === m.id ? null : m.id)}>
                <strong>{m.name}</strong>
                <span style={{ color: '#555', marginLeft: '0.5rem' }}>{m.host}:{m.port}</span>
                <span style={{
                  marginLeft: '0.5rem', fontSize: '0.8rem',
                  color: m.status === 'online' ? '#44ff44' : '#ff4444',
                }}>
                  [{m.status}]
                </span>
                <span style={{ color: '#555', marginLeft: '0.5rem', fontSize: '0.8rem' }}>{m.platform}</span>
              </div>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                <button onClick={() => handleRefresh(m.id)}
                  style={{ padding: '0.2rem 0.5rem', background: '#333', border: 'none', borderRadius: '3px', color: '#aaa', cursor: 'pointer', fontSize: '0.8rem' }}>
                  Refresh
                </button>
                <button onClick={() => handleDelete(m.id)}
                  style={{ padding: '0.2rem 0.5rem', background: 'transparent', border: '1px solid #ff4444', borderRadius: '3px', color: '#ff4444', cursor: 'pointer', fontSize: '0.8rem' }}>
                  Remove
                </button>
              </div>
            </div>
            {expanded === m.id && m.manifest_cache?.functions && (
              <div style={{ marginTop: '0.75rem', paddingLeft: '1rem', borderLeft: '2px solid #333' }}>
                <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '0.5rem' }}>Functions:</div>
                {m.manifest_cache.functions.map((fn) => (
                  <div key={fn.name} style={{ marginBottom: '0.5rem' }}>
                    <div style={{ color: '#ff8844' }}>{fn.name}</div>
                    <div style={{ color: '#666', fontSize: '0.8rem' }}>{fn.description}</div>
                    <div style={{ color: '#555', fontSize: '0.8rem', marginTop: '0.2rem' }}>
                      Params: {fn.params.map((p) => `${p.name}(${p.type}${p.required ? '*' : ''})`).join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {modules.length === 0 && <div style={{ color: '#555' }}>No modules registered.</div>}
      </div>
    </div>
  );
}
