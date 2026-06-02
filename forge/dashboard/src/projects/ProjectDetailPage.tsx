import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import FileUpload from './FileUpload';
import ClonePipelineDialog from './ClonePipelineDialog';

interface ProjectFile {
  id: string;
  filename: string;
  file_type: string;
  sha256: string;
  size_bytes: number;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  notes: string;
  archived: boolean;
  files: ProjectFile[];
}

interface PipelineSummary {
  id: string;
  name: string;
  created_at: string;
}

function humanSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [pipelines, setPipelines] = useState<PipelineSummary[]>([]);
  const [newPipelineName, setNewPipelineName] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [cloneTarget, setCloneTarget] = useState<string | null>(null);
  const navigate = useNavigate();

  const load = async () => {
    const [projRes, pipRes] = await Promise.all([
      api.get(`/projects/${projectId}`),
      api.get(`/pipelines?project_id=${projectId}`),
    ]);
    setProject(projRes.data);
    setPipelines(pipRes.data);
    setNotesDraft(projRes.data.notes || '');
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

  const handleDuplicatePipeline = async (pid: string) => {
    await api.post(`/pipelines/${pid}/duplicate`, {});
    load();
  };

  const handleDeletePipeline = async (pid: string) => {
    if (!confirm('Delete pipeline?')) return;
    await api.delete(`/pipelines/${pid}`);
    load();
  };

  const handleSaveNotes = async () => {
    if (notesDraft === project?.notes) return;
    await api.patch(`/projects/${projectId}`, { notes: notesDraft });
    load();
  };

  const handleArchive = async () => {
    if (!project) return;
    await api.post(`/projects/${projectId}/${project.archived ? 'restore' : 'archive'}`);
    load();
  };

  if (!project) return <div>Loading...</div>;

  return (
    <div>
      <Link to="/projects" style={{ color: '#888', textDecoration: 'none', fontSize: '0.9rem' }}>
        &larr; Back to Projects
      </Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '0.5rem 0' }}>
        <h2>
          {project.name}
          {project.archived && <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: '#cc8844' }}>[archived]</span>}
        </h2>
        <button onClick={handleArchive} style={{
          padding: '0.3rem 0.7rem',
          background: 'transparent',
          border: `1px solid ${project.archived ? '#44dd44' : '#cc8844'}`,
          borderRadius: '4px',
          color: project.archived ? '#88ff88' : '#cc8844',
          cursor: 'pointer',
          fontSize: '0.8rem',
        }}>
          {project.archived ? 'Restore' : 'Archive'}
        </button>
      </div>
      <p style={{ color: '#888', marginBottom: '1rem' }}>{project.description}</p>

      <h3 style={{ marginBottom: '0.4rem', fontSize: '0.95rem' }}>Notes</h3>
      <textarea
        value={notesDraft}
        onChange={(e) => setNotesDraft(e.target.value)}
        onBlur={handleSaveNotes}
        placeholder="Operator notes (TTPs, targets, observations)..."
        style={{
          width: '100%', minHeight: '80px',
          padding: '0.5rem', background: '#1a1a1a', border: '1px solid #333',
          borderRadius: '4px', color: '#e0e0e0', fontSize: '0.85rem', fontFamily: 'monospace',
          resize: 'vertical', marginBottom: '1.25rem',
        }}
      />

      <h3 style={{ marginBottom: '0.5rem' }}>Files</h3>
      <FileUpload projectId={project.id} onUploaded={load} />
      <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        {project.files.map((f) => (
          <div key={f.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '0.5rem 0.75rem', background: '#1a1a1a', borderRadius: '4px',
          }}>
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ color: f.file_type === 'output' ? '#44ff44' : '#e0e0e0' }}>{f.filename}</span>
              <span style={{ color: '#555', marginLeft: '0.5rem', fontSize: '0.75rem' }}>[{f.file_type}]</span>
              {f.sha256 && (
                <span style={{ color: '#666', marginLeft: '0.5rem', fontSize: '0.7rem', fontFamily: 'monospace' }}>
                  {f.sha256.slice(0, 10)}…
                </span>
              )}
              {f.size_bytes > 0 && (
                <span style={{ color: '#666', marginLeft: '0.5rem', fontSize: '0.7rem' }}>
                  {humanSize(f.size_bytes)}
                </span>
              )}
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
          <div key={p.id} style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 0.75rem', background: '#1a1a1a', borderRadius: '4px',
          }}>
            <Link to={`/projects/${projectId}/pipelines/${p.id}`}
              style={{ color: '#e0e0e0', textDecoration: 'none', flex: 1 }}>
              {p.name}
            </Link>
            <button onClick={() => handleDuplicatePipeline(p.id)} style={{
              padding: '0.2rem 0.5rem', background: '#222', border: '1px solid #444',
              borderRadius: '3px', color: '#aaa', cursor: 'pointer', fontSize: '0.75rem',
            }}>
              Duplicate
            </button>
            <button onClick={() => setCloneTarget(p.id)} style={{
              padding: '0.2rem 0.5rem', background: '#222', border: '1px solid #557',
              borderRadius: '3px', color: '#bcd', cursor: 'pointer', fontSize: '0.75rem',
            }}>
              Clone to project
            </button>
            <button onClick={() => handleDeletePipeline(p.id)} style={{
              padding: '0.2rem 0.5rem', background: 'transparent', border: '1px solid #ff4444',
              borderRadius: '3px', color: '#ff4444', cursor: 'pointer', fontSize: '0.75rem',
            }}>
              Delete
            </button>
          </div>
        ))}
        {pipelines.length === 0 && <div style={{ color: '#555' }}>No pipelines yet.</div>}
      </div>

      {cloneTarget && projectId && (
        <ClonePipelineDialog
          pipelineId={cloneTarget}
          currentProjectId={projectId}
          onClose={() => setCloneTarget(null)}
          onCloned={(newId, targetProjectId) => {
            setCloneTarget(null);
            navigate(`/projects/${targetProjectId}/pipelines/${newId}`);
          }}
        />
      )}
    </div>
  );
}
