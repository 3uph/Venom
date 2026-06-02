import { useState, useEffect, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

interface ProjectSummary {
  id: string;
  name: string;
  description: string;
  created_at: string;
  file_count: number;
}

export default function ProjectListPage() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  const load = async () => {
    const res = await api.get('/projects');
    setProjects(res.data);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await api.post('/projects', { name, description });
    setName('');
    setDescription('');
    load();
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/projects/${id}`);
    load();
  };

  const inputStyle = {
    padding: '0.5rem', background: '#2a2a2a', border: '1px solid #333',
    borderRadius: '4px', color: '#e0e0e0', fontSize: '0.9rem',
  };

  return (
    <div>
      <h2 style={{ marginBottom: '1rem' }}>Projects</h2>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {projects.map((p) => (
          <div key={p.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0.75rem 1rem', background: '#1a1a1a', borderRadius: '6px',
            border: '1px solid #333',
          }}>
            <Link to={`/projects/${p.id}`} style={{ color: '#e0e0e0', textDecoration: 'none', flex: 1 }}>
              <strong>{p.name}</strong>
              <span style={{ color: '#666', marginLeft: '1rem' }}>{p.description}</span>
              <span style={{ color: '#555', marginLeft: '1rem', fontSize: '0.8rem' }}>{p.file_count} files</span>
            </Link>
            <button onClick={() => handleDelete(p.id)} style={{
              padding: '0.3rem 0.6rem', background: 'transparent', border: '1px solid #ff4444',
              borderRadius: '4px', color: '#ff4444', cursor: 'pointer', fontSize: '0.8rem',
            }}>
              Delete
            </button>
          </div>
        ))}
        {projects.length === 0 && <div style={{ color: '#555' }}>No projects yet.</div>}
      </div>
    </div>
  );
}
