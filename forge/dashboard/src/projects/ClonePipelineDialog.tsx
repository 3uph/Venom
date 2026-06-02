import { useEffect, useState } from 'react';
import api from '../api/client';

interface Pipeline {
  id: string;
  name: string;
  graph: { nodes: any[]; edges: any[] };
}

interface ProjectSummary {
  id: string;
  name: string;
}

interface ProjectFile {
  id: string;
  filename: string;
}

interface Props {
  pipelineId: string;
  currentProjectId: string;
  onClose: () => void;
  onCloned: (newPipelineId: string, projectId: string) => void;
}

export default function ClonePipelineDialog({ pipelineId, currentProjectId, onClose, onCloned }: Props) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [targetProjectId, setTargetProjectId] = useState('');
  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [targetFiles, setTargetFiles] = useState<ProjectFile[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/projects?include_archived=false').then((r) => {
      setProjects(r.data.filter((p: ProjectSummary) => p.id !== currentProjectId));
    });
    api.get(`/pipelines/${pipelineId}`).then((r) => {
      setPipeline(r.data);
      setName(`${r.data.name} (cloned)`);
    });
  }, [pipelineId, currentProjectId]);

  useEffect(() => {
    if (!targetProjectId) {
      setTargetFiles([]);
      return;
    }
    api.get(`/projects/${targetProjectId}`).then((r) => setTargetFiles(r.data.files || []));
  }, [targetProjectId]);

  const sourceFileNodes = (pipeline?.graph.nodes || []).filter((n: any) => n.type === 'projectFileNode');

  const handleSubmit = async () => {
    setError('');
    setBusy(true);
    try {
      const res = await api.post(`/pipelines/${pipelineId}/clone`, {
        project_id: targetProjectId,
        name,
        file_mappings: mappings,
      });
      onCloned(res.data.id, res.data.project_id);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to clone');
    } finally {
      setBusy(false);
    }
  };

  const allMapped = sourceFileNodes.every((n: any) => !!mappings[n.data?.file_id]);

  const inputStyle = {
    padding: '0.4rem', background: '#2a2a2a', border: '1px solid #333',
    borderRadius: '4px', color: '#e0e0e0', width: '100%', fontSize: '0.85rem',
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{
        background: '#1a1a1a', padding: '1.5rem', borderRadius: '8px',
        width: '480px', maxHeight: '80vh', overflow: 'auto',
      }}>
        <h3 style={{ marginBottom: '1rem' }}>Clone pipeline to project</h3>
        {error && <div style={{ color: '#ff4444', marginBottom: '0.75rem', fontSize: '0.85rem' }}>{error}</div>}

        <label style={{ color: '#888', fontSize: '0.8rem' }}>Target project</label>
        <select value={targetProjectId} onChange={(e) => setTargetProjectId(e.target.value)} style={{ ...inputStyle, marginBottom: '0.75rem' }}>
          <option value="">Select project</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <label style={{ color: '#888', fontSize: '0.8rem' }}>New pipeline name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, marginBottom: '1rem' }} />

        {sourceFileNodes.length > 0 && (
          <>
            <div style={{ color: '#888', fontSize: '0.8rem', marginBottom: '0.4rem' }}>Map source files → target files</div>
            {sourceFileNodes.map((n: any) => (
              <div key={n.id} style={{ marginBottom: '0.5rem' }}>
                <div style={{ fontSize: '0.8rem', color: '#aaa' }}>{n.data.filename}</div>
                <select
                  value={mappings[n.data.file_id] || ''}
                  onChange={(e) => setMappings({ ...mappings, [n.data.file_id]: e.target.value })}
                  style={inputStyle}
                  disabled={!targetProjectId}
                >
                  <option value="">Select target file</option>
                  {targetFiles.map((f) => <option key={f.id} value={f.id}>{f.filename}</option>)}
                </select>
              </div>
            ))}
          </>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={busy} style={{
            padding: '0.4rem 0.9rem', background: '#333', border: '1px solid #555',
            borderRadius: '4px', color: '#aaa', cursor: 'pointer',
          }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!targetProjectId || !allMapped || busy}
            style={{
              padding: '0.4rem 0.9rem',
              background: !targetProjectId || !allMapped || busy ? '#444' : '#ff4444',
              border: 'none', borderRadius: '4px', color: '#fff',
              cursor: !targetProjectId || !allMapped || busy ? 'not-allowed' : 'pointer',
            }}
          >
            {busy ? 'Cloning...' : 'Clone'}
          </button>
        </div>
      </div>
    </div>
  );
}
