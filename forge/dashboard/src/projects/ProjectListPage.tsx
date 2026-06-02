import { useState, useEffect, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

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
    padding: '0.5rem', background: '#2a2a2a', border: '1px solid #333',
    borderRadius: '4px', color: '#e0e0e0', fontSize: '0.9rem',
  };

  return (
    <div>
      <h2 style={{ marginBottom: '1rem' }}>Projects</h2>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        {(['active', 'archived'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '0.3rem 0.8rem',
              background: tab === t ? '#ff4444' : 'transparent',
              border: '1px solid #444',
              borderRadius: '4px',
              color: tab === t ? '#fff' : '#aaa',
              cursor: 'pointer',
              fontSize: '0.85rem',
              textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'active' && (
        <form onSubmit={handleCreate} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <input placeholder="Project name" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
          <input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
          <button type="submit" style={{
            padding: '0.5rem 1rem', background: '#ff4444', border: 'none',
            borderRadius: '4px', color: '#fff', cursor: 'pointer',
          }}>
            Create
          </button>
        </form>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {projects.map((p) => (
          <div key={p.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0.75rem 1rem', background: '#1a1a1a', borderRadius: '6px',
            border: '1px solid #333', opacity: p.archived ? 0.7 : 1,
          }}>
            <Link to={`/projects/${p.id}`} style={{ color: '#e0e0e0', textDecoration: 'none', flex: 1 }}>
              <strong>{p.name}</strong>
              {p.archived && <span style={{ marginLeft: '0.5rem', fontSize: '0.7rem', color: '#cc8844' }}>[archived]</span>}
              <span style={{ color: '#666', marginLeft: '1rem' }}>{p.description}</span>
              <span style={{ color: '#555', marginLeft: '1rem', fontSize: '0.8rem' }}>{p.file_count} files</span>
            </Link>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              {p.archived ? (
                <button onClick={() => handleRestore(p.id)} style={{
                  padding: '0.3rem 0.6rem', background: 'transparent', border: '1px solid #44dd44',
                  borderRadius: '4px', color: '#88ff88', cursor: 'pointer', fontSize: '0.8rem',
                }}>
                  Restore
                </button>
              ) : (
                <button onClick={() => handleArchive(p.id)} style={{
                  padding: '0.3rem 0.6rem', background: 'transparent', border: '1px solid #cc8844',
                  borderRadius: '4px', color: '#cc8844', cursor: 'pointer', fontSize: '0.8rem',
                }}>
                  Archive
                </button>
              )}
              <button onClick={() => handleDelete(p.id)} style={{
                padding: '0.3rem 0.6rem', background: 'transparent', border: '1px solid #ff4444',
                borderRadius: '4px', color: '#ff4444', cursor: 'pointer', fontSize: '0.8rem',
              }}>
                Delete
              </button>
            </div>
          </div>
        ))}
        {projects.length === 0 && <div style={{ color: '#555' }}>No {tab} projects.</div>}
      </div>
    </div>
  );
}
