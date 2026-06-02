import { useEffect, useState } from 'react';
import api from '../api/client';
import { t, space, radius, font } from '../theme/tokens';

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
    padding: '0.55rem 0.75rem',
    background: t.surface2,
    border: `1px solid ${t.border}`,
    borderRadius: radius.md,
    color: t.text,
    width: '100%',
    fontSize: font.sm,
    outline: 'none',
  };

  return (
    <Modal onClose={onClose}>
      <h3 style={{ marginBottom: space.md, fontWeight: 600 }}>
        Use template: <span style={{ color: t.accent }}>{templateName}</span>
      </h3>
      {error && (
        <div style={{ color: t.danger, background: t.accentSoft, padding: '0.5rem 0.75rem', borderRadius: radius.sm, fontSize: font.sm, marginBottom: space.sm }}>
          {error}
        </div>
      )}

      <label style={fieldLabel}>Target project</label>
      <select value={projectId} onChange={(e) => setProjectId(e.target.value)} style={{ ...inputStyle, marginBottom: space.md }}>
        <option value="">Select project</option>
        {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>

      <label style={fieldLabel}>Pipeline name</label>
      <input value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, marginBottom: space.lg }} />

      <div style={{ color: t.textDim, fontSize: font.xs, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: space.sm }}>
        Placeholder mappings
      </div>
      {placeholders.map((p) => (
        <div key={p.id} style={{ marginBottom: space.sm }}>
          <div style={{ fontSize: font.sm, color: t.text, marginBottom: '0.2rem' }}>
            {p.label} <span style={{ color: t.textFaint, fontSize: font.xs }}>[{p.hint || 'any'}]</span>
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

      <DialogActions
        busy={busy}
        confirmLabel={busy ? 'Creating…' : 'Create pipeline'}
        confirmDisabled={!projectId || !allMapped || busy}
        onCancel={onClose}
        onConfirm={handleSubmit}
      />
    </Modal>
  );
}

const fieldLabel: React.CSSProperties = {
  display: 'block',
  color: t.textDim,
  fontSize: font.xs,
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  marginBottom: '0.3rem',
};

export function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: t.surface,
          border: `1px solid ${t.border}`,
          padding: '1.5rem',
          borderRadius: radius.lg,
          width: '480px',
          maxHeight: '85vh',
          overflow: 'auto',
        }}
      >
        {children}
      </div>
    </div>
  );
}

export function DialogActions({
  busy, onCancel, onConfirm, confirmLabel, confirmDisabled,
}: {
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  confirmDisabled: boolean;
}) {
  return (
    <div style={{ display: 'flex', gap: space.sm, marginTop: space.lg, justifyContent: 'flex-end' }}>
      <button onClick={onCancel} disabled={busy} style={{
        padding: '0.45rem 1rem',
        background: 'transparent',
        border: `1px solid ${t.border}`,
        borderRadius: radius.md,
        color: t.textDim,
        cursor: 'pointer',
        fontSize: font.sm,
      }}>
        Cancel
      </button>
      <button
        onClick={onConfirm}
        disabled={confirmDisabled}
        style={{
          padding: '0.45rem 1rem',
          background: confirmDisabled ? t.surface2 : t.accent,
          border: 'none',
          borderRadius: radius.md,
          color: confirmDisabled ? t.textFaint : '#fff',
          cursor: confirmDisabled ? 'not-allowed' : 'pointer',
          fontSize: font.sm,
          fontWeight: 500,
        }}
      >
        {confirmLabel}
      </button>
    </div>
  );
}
