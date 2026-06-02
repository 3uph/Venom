import { t, space, radius, font } from '../theme/tokens';

interface Module {
  id: string;
  name: string;
  manifest_cache?: { category?: string } | null;
}

interface Props {
  modules: Module[];
  onAddNode: (moduleId: string, moduleName: string) => void;
  onSave: () => void;
  onExecute: () => void;
  onSaveAsTemplate: () => void;
  onAutoLayout: () => void;
  executing: boolean;
  canExecute: boolean;
  validationCount: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  loader: '#ff6644',
  obfuscator: '#a855f7',
  packager: '#f59e0b',
  delivery: '#22d3ee',
  stager: '#10b981',
  other: '#94a3b8',
};

function getCategory(m: Module): string {
  return m.manifest_cache?.category || 'other';
}

export default function PipelineToolbar({
  modules, onAddNode, onSave, onExecute, onSaveAsTemplate, onAutoLayout,
  executing, canExecute, validationCount,
}: Props) {
  const executeDisabled = executing || !canExecute;
  const executeTitle = !canExecute
    ? `Pipeline has ${validationCount} validation issue${validationCount === 1 ? '' : 's'}`
    : executing
    ? 'Pipeline running…'
    : 'Run pipeline';

  const grouped: Record<string, Module[]> = {};
  for (const m of modules) {
    const c = getCategory(m);
    if (!grouped[c]) grouped[c] = [];
    grouped[c].push(m);
  }
  const categoryOrder = ['loader', 'obfuscator', 'packager', 'delivery', 'stager', 'other']
    .filter((c) => grouped[c]?.length);

  return (
    <div style={{
      display: 'flex', gap: space.md, padding: `${space.sm} ${space.lg}`,
      background: t.surface, borderBottom: `1px solid ${t.border}`,
      alignItems: 'center', flexWrap: 'wrap',
    }}>
      {categoryOrder.length === 0 && (
        <span style={{ color: t.textFaint, fontSize: font.xs }}>No modules registered.</span>
      )}
      {categoryOrder.map((cat) => (
        <div key={cat} style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
          <span style={{
            fontSize: font.xs,
            color: CATEGORY_COLORS[cat] || t.textDim,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginRight: '0.3rem',
          }}>
            {cat}
          </span>
          {grouped[cat].map((m) => (
            <button key={m.id} onClick={() => onAddNode(m.id, m.name)}
              style={{
                padding: '0.3rem 0.6rem',
                background: t.surface2,
                border: `1px solid ${t.border}`,
                borderRadius: radius.sm,
                color: t.text,
                cursor: 'pointer',
                fontSize: font.xs,
                transition: 'border-color 0.15s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = CATEGORY_COLORS[cat] || t.borderStrong; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.border; }}
            >
              + {m.name}
            </button>
          ))}
        </div>
      ))}
      <div style={{ flex: 1 }} />
      <button onClick={onAutoLayout} title="Auto-layout (dagre)" style={secondaryBtn()}>
        Auto-layout
      </button>
      <button onClick={onSaveAsTemplate} style={secondaryBtn()}>
        Save as Template
      </button>
      <button onClick={onSave} style={secondaryBtn()}>
        Save
      </button>
      <button
        onClick={onExecute}
        disabled={executeDisabled}
        title={executeTitle}
        style={{
          padding: '0.35rem 1rem',
          background: executeDisabled ? t.surface2 : t.accent,
          border: 'none',
          borderRadius: radius.md,
          color: executeDisabled ? t.textFaint : '#fff',
          cursor: executeDisabled ? 'not-allowed' : 'pointer',
          fontSize: font.sm,
          fontWeight: 500,
          transition: 'background 0.15s ease',
        }}
      >
        {executing ? 'Running…' : 'Execute'}
      </button>
    </div>
  );
}

function secondaryBtn(): React.CSSProperties {
  return {
    padding: '0.35rem 0.8rem',
    background: 'transparent',
    border: `1px solid ${t.border}`,
    borderRadius: radius.md,
    color: t.textDim,
    cursor: 'pointer',
    fontSize: font.xs,
  };
}
