import { useState, useEffect, FormEvent } from 'react';
import api from '../api/client';
import { t, space, radius, font } from '../theme/tokens';

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
  manifest_cache: { functions?: ModuleFunction[]; category?: string } | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  loader: '#ff6644',
  obfuscator: '#aa66ff',
  packager: '#ffaa44',
  delivery: '#44ddff',
  stager: '#66ddaa',
  other: '#888888',
};

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
    padding: '0.55rem 0.75rem',
    background: t.surface2,
    border: `1px solid ${t.border}`,
    borderRadius: radius.md,
    color: t.text,
    fontSize: font.sm,
    outline: 'none',
  };

  return (
    <div style={{ maxWidth: '960px' }}>
      <h2 style={{ marginBottom: space.lg, fontWeight: 600, fontSize: font.xxl }}>Modules</h2>

      <form onSubmit={handleRegister} style={{ display: 'flex', gap: space.sm, marginBottom: space.lg }}>
        <input placeholder="Host (IP or hostname)" value={host} onChange={(e) => setHost(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
        <input placeholder="Port" value={port} onChange={(e) => setPort(e.target.value)} style={{ ...inputStyle, width: '110px' }} />
        <button type="submit" style={{
          padding: '0.55rem 1.1rem',
          background: t.accent,
          border: 'none',
          borderRadius: radius.md,
          color: '#fff',
          cursor: 'pointer',
          fontSize: font.sm,
          fontWeight: 500,
        }}>
          Register
        </button>
      </form>
      {error && (
        <div style={{
          color: t.danger,
          background: t.accentSoft,
          padding: '0.55rem 0.75rem',
          borderRadius: radius.sm,
          fontSize: font.sm,
          marginBottom: space.md,
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: space.sm }}>
        {modules.map((m) => {
          const category = m.manifest_cache?.category || 'other';
          const catColor = CATEGORY_COLORS[category] || CATEGORY_COLORS.other;
          return (
            <div key={m.id} style={{
              padding: `${space.md} ${space.lg}`,
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: radius.lg,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div
                  style={{ cursor: 'pointer', flex: 1, display: 'flex', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}
                  onClick={() => setExpanded(expanded === m.id ? null : m.id)}
                >
                  <span style={{ fontWeight: 600 }}>{m.name}</span>
                  <span style={{
                    color: catColor, fontSize: font.xs, textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    border: `1px solid ${catColor}`,
                    padding: '0.05rem 0.4rem',
                    borderRadius: radius.sm,
                  }}>
                    {category}
                  </span>
                  <span style={{ color: t.textDim, fontSize: font.sm }}>{m.host}:{m.port}</span>
                  <span style={{
                    fontSize: font.xs,
                    color: m.status === 'online' || m.status === 'ok' ? t.success : t.danger,
                  }}>
                    ● {m.status}
                  </span>
                  <span style={{ color: t.textFaint, fontSize: font.xs }}>{m.platform}</span>
                </div>
                <div style={{ display: 'flex', gap: space.xs }}>
                  <button onClick={() => handleRefresh(m.id)} style={ghostButton(t.info)}>Refresh</button>
                  <button onClick={() => handleDelete(m.id)} style={ghostButton(t.danger)}>Remove</button>
                </div>
              </div>
              {expanded === m.id && m.manifest_cache?.functions && (
                <div style={{
                  marginTop: space.md,
                  paddingTop: space.md,
                  borderTop: `1px solid ${t.border}`,
                }}>
                  <div style={{ color: t.textDim, fontSize: font.xs, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: space.sm }}>
                    Functions
                  </div>
                  {m.manifest_cache.functions.map((fn) => (
                    <div key={fn.name} style={{ marginBottom: space.sm }}>
                      <div style={{ color: t.text, fontSize: font.sm, fontWeight: 500 }}>{fn.name}</div>
                      {fn.description && (
                        <div style={{ color: t.textDim, fontSize: font.xs, marginTop: '0.15rem' }}>{fn.description}</div>
                      )}
                      <div style={{ color: t.textFaint, fontSize: font.xs, marginTop: '0.2rem', fontFamily: 'ui-monospace, monospace' }}>
                        {fn.params.map((p) => `${p.name}: ${p.type}${p.required ? '*' : ''}`).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {modules.length === 0 && (
          <div style={{ color: t.textFaint, fontSize: font.sm, padding: space.lg, textAlign: 'center' }}>
            No modules registered.
          </div>
        )}
      </div>
    </div>
  );
}

function ghostButton(color: string): React.CSSProperties {
  return {
    padding: '0.3rem 0.7rem',
    background: 'transparent',
    border: `1px solid ${t.border}`,
    borderRadius: radius.sm,
    color,
    cursor: 'pointer',
    fontSize: font.xs,
  };
}
