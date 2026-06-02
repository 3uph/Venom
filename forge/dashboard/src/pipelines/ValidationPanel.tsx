import type { ValidationError } from './usePipelineValidation';

interface Props {
  errors: ValidationError[];
  onFocusNode: (nodeId: string) => void;
}

function describe(err: ValidationError): string {
  switch (err.type) {
    case 'missing_required_input':
      return `Missing required input: ${err.param}`;
    case 'function_not_in_manifest':
      return `Function "${err.function}" no longer in module manifest`;
    case 'function_not_set':
      return 'Function not selected';
    case 'unknown_module':
      return 'Module not registered or removed';
    case 'cycle_detected':
      return `Cycle detected: ${(err.node_ids || []).length} nodes`;
    default:
      return err.type;
  }
}

export default function ValidationPanel({ errors, onFocusNode }: Props) {
  if (errors.length === 0) {
    return (
      <div style={{
        padding: '0.5rem 0.75rem',
        background: '#0e1f12',
        borderBottom: '1px solid #244',
        color: '#88dd88',
        fontSize: '0.8rem',
      }}>
        Pipeline valid.
      </div>
    );
  }

  return (
    <div style={{
      padding: '0.5rem 0.75rem',
      background: '#2a1414',
      borderBottom: '1px solid #553',
      maxHeight: '160px',
      overflow: 'auto',
    }}>
      <div style={{ color: '#ff8866', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.4rem' }}>
        {errors.length} validation issue{errors.length === 1 ? '' : 's'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {errors.map((err, idx) => {
          const clickable = err.node_id || (err.node_ids && err.node_ids[0]);
          return (
            <div
              key={idx}
              onClick={() => {
                const id = err.node_id || (err.node_ids && err.node_ids[0]);
                if (id) onFocusNode(id);
              }}
              style={{
                fontSize: '0.78rem',
                color: '#e0c0c0',
                padding: '0.2rem 0.4rem',
                background: '#1a0e0e',
                borderRadius: '3px',
                cursor: clickable ? 'pointer' : 'default',
              }}
            >
              <span style={{ color: '#ff8866' }}>●</span> {describe(err)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
