import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';

interface TemplateSummary {
  id: string;
  name: string;
  description: string;
  tags: string[];
  placeholders: { id: string; label: string; hint: string }[];
  created_at: string;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateSummary[]>([]);
  const [tagFilter, setTagFilter] = useState('');

  const load = async () => {
    const url = tagFilter ? `/templates?tag=${encodeURIComponent(tagFilter)}` : '/templates';
    const res = await api.get(url);
    setTemplates(res.data);
  };

  useEffect(() => { load(); }, [tagFilter]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this template?')) return;
    await api.delete(`/templates/${id}`);
    load();
  };

  const allTags = Array.from(new Set(templates.flatMap((t) => t.tags || [])));

  return (
    <div>
      <h2 style={{ marginBottom: '1rem' }}>Templates</h2>
      <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ color: '#888', fontSize: '0.85rem' }}>Filter:</span>
        <button
          onClick={() => setTagFilter('')}
          style={{
            padding: '0.2rem 0.5rem',
            background: tagFilter === '' ? '#ff4444' : 'transparent',
            border: '1px solid #555',
            borderRadius: '4px',
            color: tagFilter === '' ? '#fff' : '#aaa',
            cursor: 'pointer',
            fontSize: '0.8rem',
          }}
        >
          all
        </button>
        {allTags.map((t) => (
          <button
            key={t}
            onClick={() => setTagFilter(t)}
            style={{
              padding: '0.2rem 0.5rem',
              background: tagFilter === t ? '#ff4444' : 'transparent',
              border: '1px solid #555',
              borderRadius: '4px',
              color: tagFilter === t ? '#fff' : '#aaa',
              cursor: 'pointer',
              fontSize: '0.8rem',
            }}
          >
            #{t}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {templates.map((t) => (
          <div key={t.id} style={{
            padding: '0.75rem 1rem', background: '#1a1a1a', border: '1px solid #333',
            borderRadius: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <Link to={`/templates/${t.id}`} style={{ color: '#e0e0e0', textDecoration: 'none', flex: 1 }}>
              <strong>{t.name}</strong>
              <span style={{ color: '#666', marginLeft: '0.75rem', fontSize: '0.85rem' }}>{t.description}</span>
              <span style={{ color: '#888', marginLeft: '0.75rem', fontSize: '0.75rem' }}>
                {t.placeholders.length} placeholder{t.placeholders.length === 1 ? '' : 's'}
              </span>
              <div style={{ marginTop: '0.3rem' }}>
                {(t.tags || []).map((tag) => (
                  <span key={tag} style={{
                    display: 'inline-block', marginRight: '0.3rem', padding: '0.1rem 0.4rem',
                    background: '#2a2a2a', borderRadius: '3px', fontSize: '0.7rem', color: '#aaa',
                  }}>#{tag}</span>
                ))}
              </div>
            </Link>
            <button onClick={() => handleDelete(t.id)} style={{
              padding: '0.3rem 0.6rem', background: 'transparent', border: '1px solid #ff4444',
              borderRadius: '4px', color: '#ff4444', cursor: 'pointer', fontSize: '0.8rem',
            }}>
              Delete
            </button>
          </div>
        ))}
        {templates.length === 0 && <div style={{ color: '#555' }}>No templates yet.</div>}
      </div>
    </div>
  );
}
