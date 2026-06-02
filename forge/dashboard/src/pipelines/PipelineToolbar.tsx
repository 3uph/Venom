interface Module {
  id: string;
  name: string;
}

interface Props {
  modules: Module[];
  onAddNode: (moduleId: string, moduleName: string) => void;
  onSave: () => void;
  onExecute: () => void;
  executing: boolean;
}

export default function PipelineToolbar({ modules, onAddNode, onSave, onExecute, executing }: Props) {
  return (
    <div style={{
      display: 'flex', gap: '0.5rem', padding: '0.5rem 1rem',
      background: '#1a1a1a', borderBottom: '1px solid #333', alignItems: 'center',
    }}>
      <span style={{ color: '#888', fontSize: '0.85rem', marginRight: '0.5rem' }}>Add node:</span>
      {modules.map((m) => (
        <button key={m.id} onClick={() => onAddNode(m.id, m.name)}
          style={{
            padding: '0.3rem 0.6rem', background: '#2a2a2a', border: '1px solid #444',
            borderRadius: '4px', color: '#e0e0e0', cursor: 'pointer', fontSize: '0.8rem',
          }}>
          + {m.name}
        </button>
      ))}
      <div style={{ flex: 1 }} />
      <button onClick={onSave} style={{
        padding: '0.3rem 0.8rem', background: '#333', border: '1px solid #555',
        borderRadius: '4px', color: '#e0e0e0', cursor: 'pointer',
      }}>
        Save
      </button>
      <button onClick={onExecute} disabled={executing} style={{
        padding: '0.3rem 0.8rem', background: executing ? '#555' : '#ff4444', border: 'none',
        borderRadius: '4px', color: '#fff', cursor: executing ? 'default' : 'pointer',
      }}>
        {executing ? 'Running...' : 'Execute'}
      </button>
    </div>
  );
}
