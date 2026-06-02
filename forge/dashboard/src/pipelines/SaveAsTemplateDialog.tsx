import { useState } from 'react';
import api from '../api/client';
import { Modal, DialogActions } from '../templates/InstantiateTemplateDialog';
import { t, space, radius, font } from '../theme/tokens';

interface Props {
  pipelineId: string;
  onClose: () => void;
  onSaved: (templateId: string) => void;
}

export default function SaveAsTemplateDialog({ pipelineId, onClose, onSaved }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tagsRaw, setTagsRaw] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) {
      setError('Name required');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const tags = tagsRaw.split(',').map((s) => s.trim()).filter(Boolean);
      const res = await api.post(`/pipelines/${pipelineId}/save_as_template`, {
        name, description, tags,
      });
      onSaved(res.data.id);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Failed to save');
    } finally {
      setBusy(false);
    }
  };

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
      <h3 style={{ marginBottom: space.md, fontWeight: 600 }}>Save pipeline as template</h3>
      {error && (
        <div style={{ color: t.danger, background: t.accentSoft, padding: '0.5rem 0.75rem', borderRadius: radius.sm, fontSize: font.sm, marginBottom: space.sm }}>
          {error}
        </div>
      )}

      <label style={labelStyle}>Name</label>
      <input value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, marginBottom: space.md }} />

      <label style={labelStyle}>Description</label>
      <input value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inputStyle, marginBottom: space.md }} />

      <label style={labelStyle}>Tags (comma-separated)</label>
      <input value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} placeholder="loader, evasion, syscall" style={inputStyle} />

      <DialogActions
        busy={busy}
        confirmLabel={busy ? 'Saving…' : 'Save template'}
        confirmDisabled={busy}
        onCancel={onClose}
        onConfirm={handleSubmit}
      />
    </Modal>
  );
}
