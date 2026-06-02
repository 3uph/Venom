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
  obfuscator: '#aa66ff',
  packager: '#ffaa44',
  delivery: '#44ddff',
  stager: '#66ddaa',
  other: '#888888',
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
    ? 'Pipeline running...'
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
      display: 'flex', gap: '0.75rem', padding: '0.5rem 1rem',
      background: '#1a1a1a', borderBottom: '1px solid #333', alignItems: 'center',
      flexWrap: 'wrap',
    }}>
      {categoryOrder.map((cat) => (
        <div key={cat} style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
          <span style={{
            fontSize: '0.7rem',
            color: CATEGORY_COLORS[cat] || '#888',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            marginRight: '0.2rem',
          }}>
            {cat}
          </span>
          {grouped[cat].map((m) => (
            <button key={m.id} onClick={() => onAddNode(m.id, m.name)}
              style={{
                padding: '0.3rem 0.5rem',
                background: '#2a2a2a',
                border: `1px solid ${CATEGORY_COLORS[cat] || '#444'}`,
                borderRadius: '4px',
                color: '#e0e0e0',
                cursor: 'pointer',
                fontSize: '0.78rem',
              }}>
              + {m.name}
            </button>
          ))}
        </div>
      ))}
      <div style={{ flex: 1 }} />
      <button onClick={onAutoLayout} title="Auto-layout (dagre)" style={{
        padding: '0.3rem 0.6rem', background: '#222', border: '1px solid #444',
        borderRadius: '4px', color: '#aaa', cursor: 'pointer', fontSize: '0.78rem',
      }}>
        Auto-layout
      </button>
      <button onClick={onSaveAsTemplate} style={{
        padding: '0.3rem 0.8rem', background: '#2a2a3a', border: '1px solid #557',
        borderRadius: '4px', color: '#bcd', cursor: 'pointer', fontSize: '0.8rem',
      }}>
        Save as Template
      </button>
      <button onClick={onSave} style={{
        padding: '0.3rem 0.8rem', background: '#333', border: '1px solid #555',
        borderRadius: '4px', color: '#e0e0e0', cursor: 'pointer',
      }}>
        Save
      </button>
      <button
        onClick={onExecute}
        disabled={executeDisabled}
        title={executeTitle}
        style={{
          padding: '0.3rem 0.8rem',
          background: executeDisabled ? '#444' : '#ff4444',
          border: 'none',
          borderRadius: '4px',
          color: executeDisabled ? '#888' : '#fff',
          cursor: executeDisabled ? 'not-allowed' : 'pointer',
        }}
      >
        {executing ? 'Running...' : 'Execute'}
      </button>
    </div>
  );
}
