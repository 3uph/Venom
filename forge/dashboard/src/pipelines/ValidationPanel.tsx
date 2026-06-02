import type { ValidationError } from './usePipelineValidation';
import { t, space, radius, font } from '../theme/tokens';

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
      return `Cycle detected across ${(err.node_ids || []).length} nodes`;
    default:
      return err.type;
  }
}

export default function ValidationPanel({ errors, onFocusNode }: Props) {
  if (errors.length === 0) {
    return (
      <div style={{
        padding: `${space.xs} ${space.lg}`,
        borderBottom: `1px solid ${t.border}`,
        color: t.success,
        fontSize: font.xs,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        ● pipeline valid
      </div>
    );
  }

  return (
    <div style={{
      padding: `${space.sm} ${space.lg}`,
      background: t.accentSoft,
      borderBottom: `1px solid ${t.border}`,
      maxHeight: '180px',
      overflow: 'auto',
    }}>
      <div style={{
        color: t.danger,
        fontSize: font.xs,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: space.xs,
      }}>
        {errors.length} validation issue{errors.length === 1 ? '' : 's'}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
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
                fontSize: font.sm,
                color: t.text,
                padding: '0.25rem 0.5rem',
                borderRadius: radius.sm,
                cursor: clickable ? 'pointer' : 'default',
                transition: 'background 0.15s ease',
              }}
              onMouseEnter={(e) => { if (clickable) e.currentTarget.style.background = t.surfaceHover; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span style={{ color: t.danger, marginRight: space.xs }}>●</span>
              {describe(err)}
            </div>
          );
        })}
      </div>
    </div>
  );
}
