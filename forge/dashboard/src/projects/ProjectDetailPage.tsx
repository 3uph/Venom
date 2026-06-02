import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import FileUpload from './FileUpload';

interface ProjectFile {
  id: string;
  filename: string;
  file_type: string;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  files: ProjectFile[];
}

interface PipelineSummary {
  id: string;
  name: string;
  created_at: string;
}

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [pipelines, setPipelines] = useState<PipelineSummary[]>([]);
  const [newPipelineName, setNewPipelineName] = useState('');

  const load = async () => {
    const [projRes, pipRes] = await Promise.all([
      api.get(`/projects/${projectId}`),
      api.get(`/pipelines?project_id=${projectId}`),
    ]);
    setProject(projRes.data);
    setPipelines(pipRes.data);
  };

  useEffect(() => { load(); }, [projectId]);

  const handleDeleteFile = async (fileId: string) => {
    await api.delete(`/projects/${projectId}/files/${fileId}`);
    load();
  };

  const handleDownloadFile = async (fileId: string, filename: string) => {
    const res = await api.get(`/projects/${projectId}/files/${fileId}/download`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleCreatePipeline = async () => {
    if (!newPipelineName.trim()) return;
    await api.post('/pipelines', { name: newPipelineName, project_id: projectId, graph: { nodes: [], edges: [] } });
    setNewPipelineName('');
    load();
  };

  if (!project) return <div>Loading...</div>;

  return (
    <div>
      <Link to="/projects" style={{ color: '#888', textDecoration: 'none', fontSize: '0.9rem' }}>
        &larr; Back to Projects
      </Link>
      <h2 style={{ margin: '0.5rem 0' }}>{project.name}</h2>
      <p style={{ color: '#888', marginBottom: '1.5rem' }}>{project.description}</p>

      <h3 style={{ marginBottom: '0.5rem' }}>Files</h3>
      <FileUpload projectId={project.id} onUploaded={load} />
      <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        {project.files.map((f) => (
          <div key={f.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0.5rem 0.75rem', background: '#1a1a1a', borderRadius: '4px',
          }}>
            <span>
              <span style={{ color: f.file_type === 'output' ? '#44ff44' : '#e0e0e0' }}>{f.filename}</span>
              <span style={{ color: '#555', marginLeft: '0.5rem', fontSize: '0.8rem' }}>[{f.file_type}]</span>
            </span>
            <div style={{ display: 'flex', gap: '0.3rem' }}>
              <button onClick={() => handleDownloadFile(f.id, f.filename)}
                style={{ padding: '0.2rem 0.5rem', background: '#333', border: 'none', borderRadius: '3px', color: '#aaa', cursor: 'pointer', fontSize: '0.8rem' }}>
                Download
              </button>
              <button onClick={() => handleDeleteFile(f.id)}
                style={{ padding: '0.2rem 0.5rem', background: 'transparent', border: '1px solid #ff4444', borderRadius: '3px', color: '#ff4444', cursor: 'pointer', fontSize: '0.8rem' }}>
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <h3 style={{ margin: '1.5rem 0 0.5rem' }}>Pipelines</h3>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem' }}>
        <input
          placeholder="Pipeline name" value={newPipelineName}
          onChange={(e) => setNewPipelineName(e.target.value)}
          style={{ padding: '0.4rem', background: '#2a2a2a', border: '1px solid #333', borderRadius: '4px', color: '#e0e0e0' }}
        />
        <button onClick={handleCreatePipeline} style={{
          padding: '0.4rem 0.8rem', background: '#ff4444', border: 'none',
          borderRadius: '4px', color: '#fff', cursor: 'pointer',
        }}>
          New Pipeline
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        {pipelines.map((p) => (
          <Link key={p.id} to={`/projects/${projectId}/pipelines/${p.id}`}
            style={{
              display: 'block', padding: '0.5rem 0.75rem', background: '#1a1a1a',
              borderRadius: '4px', color: '#e0e0e0', textDecoration: 'none',
            }}>
            {p.name}
          </Link>
        ))}
        {pipelines.length === 0 && <div style={{ color: '#555' }}>No pipelines yet.</div>}
      </div>
    </div>
  );
}
