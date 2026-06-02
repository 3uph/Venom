import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { t, space, radius, font } from '../theme/tokens';

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

  const allTags = Array.from(new Set(templates.flatMap((tmp) => tmp.tags || [])));

  return (
    <div style={{ maxWidth: '900px' }}>
      <h2 style={{ marginBottom: space.lg, fontWeight: 600, fontSize: font.xxl }}>Templates</h2>

      {allTags.length > 0 && (
        <div style={{ marginBottom: space.lg, display: 'flex', gap: space.xs, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: t.textDim, fontSize: font.xs, textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: space.xs }}>
            Filter
          </span>
          <button
            onClick={() => setTagFilter('')}
            style={tagButton(tagFilter === '')}
          >
            all
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setTagFilter(tag)}
              style={tagButton(tagFilter === tag)}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: space.sm }}>
        {templates.map((tmp) => (
          <div key={tmp.id} style={{
            padding: `${space.md} ${space.lg}`,
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: radius.lg,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <Link to={`/templates/${tmp.id}`} style={{ color: t.text, textDecoration: 'none', flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{tmp.name}</div>
              {tmp.description && (
                <div style={{ color: t.textDim, fontSize: font.sm, marginTop: '0.15rem' }}>
                  {tmp.description}
                </div>
              )}
              <div style={{ marginTop: '0.4rem', display: 'flex', gap: space.xs, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ color: t.textFaint, fontSize: font.xs }}>
                  {tmp.placeholders.length} placeholder{tmp.placeholders.length === 1 ? '' : 's'}
                </span>
                {(tmp.tags || []).map((tag) => (
                  <span key={tag} style={{
                    fontSize: font.xs,
                    color: t.textDim,
                    background: t.surface2,
                    padding: '0.1rem 0.45rem',
                    borderRadius: radius.sm,
                  }}>#{tag}</span>
                ))}
              </div>
            </Link>
            <button onClick={() => handleDelete(tmp.id)} style={ghostButton(t.danger)}>
              Delete
            </button>
          </div>
        ))}
        {templates.length === 0 && (
          <div style={{ color: t.textFaint, fontSize: font.sm, padding: space.lg, textAlign: 'center' }}>
            No templates yet. Save a pipeline as template from the editor.
          </div>
        )}
      </div>
    </div>
  );
}

function tagButton(active: boolean): React.CSSProperties {
  return {
    padding: '0.25rem 0.7rem',
    background: active ? t.accent : 'transparent',
    border: `1px solid ${active ? t.accent : t.border}`,
    borderRadius: radius.sm,
    color: active ? '#fff' : t.textDim,
    cursor: 'pointer',
    fontSize: font.xs,
  };
}

function ghostButton(color: string): React.CSSProperties {
  return {
    padding: '0.3rem 0.7rem',
    background: 'transparent',
    border: `1px solid ${t.border}`,
    borderRadius: radius.sm,
    color,
    cursor: 'pointer',
    fontSize: font.xs,
  };
}
