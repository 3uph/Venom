import { useState, useEffect, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { t, space, radius, font } from '../theme/tokens';

interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  archived: boolean;
  created_at: string;
  file_count: number;
}

export default function ProjectListPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tab, setTab] = useState<'active' | 'archived'>('active');

  const load = async () => {
    const includeArchived = tab === 'archived';
    const res = await api.get(`/projects?include_archived=${includeArchived ? 'true' : 'false'}`);
    let items = res.data as ProjectSummary[];
    if (tab === 'archived') items = items.filter((p) => p.archived);
    setProjects(items);
  };

  useEffect(() => { load(); }, [tab]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await api.post('/projects', { name, description });
    setName('');
    setDescription('');
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this project? All files and pipelines will be lost.')) return;
    await api.delete(`/projects/${id}`);
    load();
  };

  const handleArchive = async (id: string) => {
    await api.post(`/projects/${id}/archive`);
    load();
  };

  const handleRestore = async (id: string) => {
    await api.post(`/projects/${id}/restore`);
    load();
  };

  const inputStyle = {
    padding: '0.55rem 0.75rem',
    background: t.surface2,
    border: `1px solid ${t.border}`,
    borderRadius: radius.md,
    color: t.text,
    fontSize: font.md,
    outline: 'none',
  };

  return (
    <div style={{ maxWidth: '900px' }}>
      <h2 style={{ marginBottom: space.lg, fontWeight: 600, fontSize: font.xxl }}>Projects</h2>

      <div style={{ display: 'flex', gap: space.xs, marginBottom: space.lg }}>
        {(['active', 'archived'] as const).map((tabValue) => {
          const active = tab === tabValue;
          return (
            <button
              key={tabValue}
              onClick={() => setTab(tabValue)}
              style={{
                padding: '0.4rem 0.85rem',
                background: active ? t.surface2 : 'transparent',
                border: `1px solid ${active ? t.borderStrong : 'transparent'}`,
                borderRadius: radius.md,
                color: active ? t.text : t.textDim,
                cursor: 'pointer',
                fontSize: font.sm,
                textTransform: 'capitalize',
                transition: 'background 0.15s ease, color 0.15s ease',
              }}
            >
              {tabValue}
            </button>
          );
        })}
      </div>

      {tab === 'active' && (
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: space.sm, marginBottom: space.xl }}>
          <input placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          <input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
          <button
            type="submit"
            style={{
              padding: '0.55rem 1.1rem',
              background: t.accent,
              border: 'none',
              borderRadius: radius.md,
              color: '#fff',
              cursor: 'pointer',
              fontSize: font.md,
              fontWeight: 500,
            }}
          >
            Create
          </button>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: space.sm }}>
        {projects.map((p) => (
          <div
            key={p.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: `${space.md} ${space.lg}`,
              background: t.surface,
              borderRadius: radius.lg,
              border: `1px solid ${t.border}`,
              opacity: p.archived ? 0.65 : 1,
              transition: 'border-color 0.15s ease, background 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = t.borderStrong; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.border; }}
          >
            <Link to={`/projects/${p.id}`} style={{ color: t.text, textDecoration: 'none', flex: 1 }}>
              <div style={{ fontWeight: 600 }}>
                {p.name}
                {p.archived && (
                  <span style={{ marginLeft: space.sm, fontSize: font.xs, color: t.placeholder, fontWeight: 400 }}>
                    archived
                  </span>
                )}
              </div>
              {p.description && (
                <div style={{ color: t.textDim, fontSize: font.sm, marginTop: '0.15rem' }}>
                  {p.description}
                </div>
              )}
              <div style={{ color: t.textFaint, fontSize: font.xs, marginTop: '0.25rem' }}>
                {p.file_count} file{p.file_count === 1 ? '' : 's'}
              </div>
            </Link>
            <div style={{ display: 'flex', gap: space.xs }}>
              {p.archived ? (
                <button onClick={() => handleRestore(p.id)} style={ghostButton(t.success)}>
                  Restore
                </button>
              ) : (
                <button onClick={() => handleArchive(p.id)} style={ghostButton(t.warning)}>
                  Archive
                </button>
              )}
              <button onClick={() => handleDelete(p.id)} style={ghostButton(t.danger)}>
                Delete
              </button>
            </div>
          </div>
        ))}
        {projects.length === 0 && (
          <div style={{ color: t.textFaint, fontSize: font.sm, padding: space.lg, textAlign: 'center' }}>
            No {tab} projects.
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
