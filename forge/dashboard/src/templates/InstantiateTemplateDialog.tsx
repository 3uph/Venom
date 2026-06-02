import { useEffect, useState } from 'react';
import api from '../api/client';

interface Placeholder {
  id: string;
  label: string;
  hint: string;
}

interface ProjectSummary {
  id: string;
  name: string;
}

interface ProjectFile {
  id: string;
  filename: string;
  file_type: string;
}

interface Props {
  templateId: string;
  placeholders: Placeholder[];
  templateName: string;
  onClose: () => void;
  onCreated: (pipelineId: string, projectId: string) => void;
}

export default function InstantiateTemplateDialog({
  templateId, placeholders, templateName, onClose, onCreated,
}: Props) {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [projectId, setProjectId] = useState('');
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [name, setName] = useState(`${templateName} (instance)`);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/projects?include_archived=false').then((r) => setProjects(r.data));
  }, []);

  useEffect(() => {
    if (!projectId) {
      setFiles([]);
      return;
    }
    api.get(`/projects/${projectId}`).then((r) => setFiles(r.data.files || []));
  }, [projectId]);

  const handleSubmit = async () => {
    setError('');
    setBusy(true);
    try {
      const res = await api.post(`/templates/${templateId}/instantiate`, {
        project_id: projectId,
        name,
        file_mappings: mappings,
      });
      onCreated(res.data.id, res.data.project_id);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to instantiate');
    } finally {
      setBusy(false);
    }
  };

  const allMapped = placeholders.every((p) => !!mappings[p.id]);
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
        <h3 style={{ marginBottom: '1rem' }}>Use template: {templateName}</h3>
        {error && <div style={{ color: '#ff4444', marginBottom: '0.75rem', fontSize: '0.85rem' }}>{error}</div>}

        <label style={{ color: '#888', fontSize: '0.8rem' }}>Target project</label>
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)} style={{ ...inputStyle, marginBottom: '0.75rem' }}>
          <option value="">Select project</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>

        <label style={{ color: '#888', fontSize: '0.8rem' }}>Pipeline name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, marginBottom: '1rem' }} />

        <div style={{ color: '#888', fontSize: '0.8rem', marginBottom: '0.4rem' }}>Placeholders → files</div>
        {placeholders.map((p) => (
          <div key={p.id} style={{ marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.8rem', color: '#aaa' }}>
              {p.label} <span style={{ color: '#666' }}>[{p.hint || 'any'}]</span>
            </div>
            <select
              value={mappings[p.id] || ''}
              onChange={(e) => setMappings({ ...mappings, [p.id]: e.target.value })}
              style={inputStyle}
              disabled={!projectId}
            >
              <option value="">Select file</option>
              {files.map((f) => <option key={f.id} value={f.id}>{f.filename}</option>)}
            </select>
          </div>
        ))}

        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={busy} style={{
            padding: '0.4rem 0.9rem', background: '#333', border: '1px solid #555',
            borderRadius: '4px', color: '#aaa', cursor: 'pointer',
          }}>
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!projectId || !allMapped || busy}
            style={{
              padding: '0.4rem 0.9rem',
              background: !projectId || !allMapped || busy ? '#444' : '#ff4444',
              border: 'none', borderRadius: '4px', color: '#fff',
              cursor: !projectId || !allMapped || busy ? 'not-allowed' : 'pointer',
            }}
          >
            {busy ? 'Creating...' : 'Create pipeline'}
          </button>
        </div>
      </div>
    </div>
  );
}
