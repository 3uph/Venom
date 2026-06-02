import { useState } from 'react';
import api from '../api/client';

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
    padding: '0.4rem', background: '#2a2a2a', border: '1px solid #333',
    borderRadius: '4px', color: '#e0e0e0', width: '100%', fontSize: '0.85rem',
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div style={{ background: '#1a1a1a', padding: '1.5rem', borderRadius: '8px', width: '420px' }}>
        <h3 style={{ marginBottom: '1rem' }}>Save pipeline as template</h3>
        {error && <div style={{ color: '#ff4444', marginBottom: '0.75rem', fontSize: '0.85rem' }}>{error}</div>}

        <label style={{ color: '#888', fontSize: '0.8rem' }}>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} style={{ ...inputStyle, marginBottom: '0.75rem' }} />

        <label style={{ color: '#888', fontSize: '0.8rem' }}>Description</label>
        <input value={description} onChange={(e) => setDescription(e.target.value)} style={{ ...inputStyle, marginBottom: '0.75rem' }} />

        <label style={{ color: '#888', fontSize: '0.8rem' }}>Tags (comma-separated)</label>
        <input value={tagsRaw} onChange={(e) => setTagsRaw(e.target.value)} placeholder="loader, evasion, syscall" style={{ ...inputStyle, marginBottom: '1rem' }} />

        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
          <button onClick={onClose} disabled={busy} style={{
            padding: '0.4rem 0.9rem', background: '#333', border: '1px solid #555',
            borderRadius: '4px', color: '#aaa', cursor: 'pointer',
          }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={busy} style={{
            padding: '0.4rem 0.9rem', background: busy ? '#444' : '#ff4444',
            border: 'none', borderRadius: '4px', color: '#fff', cursor: busy ? 'not-allowed' : 'pointer',
          }}>
            {busy ? 'Saving...' : 'Save template'}
          </button>
        </div>
      </div>
    </div>
  );
}
