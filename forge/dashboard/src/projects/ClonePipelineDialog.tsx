import { useEffect, useState } from 'react';
import api from '../api/client';
import { Modal, DialogActions } from '../templates/InstantiateTemplateDialog';
import { t, space, radius, font } from '../theme/tokens';

interface Pipeline {
  id: string;
  name: string;
  graph: { nodes: any[]; edges: any[] };
}

interface ProjectSummary { id: string; name: string }
interface ProjectFile { id: string; filename: string }

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
    padding: '0.55rem 0.75rem',
    background: t.surface2,
    border: `1px solid ${t.border}`,
    borderRadius: radius.md,
    color: t.text,
    width: '100%',
    fontSize: font.sm,
    outline: 'none',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block',
    color: t.textDim,
    fontSize: font.xs,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.3rem',
  };

  return (
    <Modal onClose={onClose}>
      <h3 style={{ marginBottom: space.md, fontWeight: 600 }}>Clone pipeline to project</h3>
      {error && (
        <div style={{ color: t.danger, background: t.accentSoft, padding: '0.5rem 0.75rem', borderRadius: radius.sm, fontSize: font.sm, marginBottom: space.sm }}>
          {error}
        </div>
      )}

      <label style={labelStyle}>Target project</label>
      <select value={targetProjectId} onChange={(e) => setTargetProjectId(e.target.value)} style={{ ...inputStyle, marginBottom: space.md }}>
        <option value="">Select project</option>
        {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>

      <label style={labelStyle}>New pipeline name</label>
      <input value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, marginBottom: space.lg }} />

      {sourceFileNodes.length > 0 && (
        <>
          <div style={{ color: t.textDim, fontSize: font.xs, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: space.sm }}>
            Map source files → target files
          </div>
          {sourceFileNodes.map((n: any) => (
            <div key={n.id} style={{ marginBottom: space.sm }}>
              <div style={{ fontSize: font.sm, color: t.text, marginBottom: '0.2rem' }}>
                {n.data.filename}
              </div>
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

      <DialogActions
        busy={busy}
        confirmLabel={busy ? 'Cloning…' : 'Clone'}
        confirmDisabled={!targetProjectId || !allMapped || busy}
        onCancel={onClose}
        onConfirm={handleSubmit}
      />
    </Modal>
  );
}
