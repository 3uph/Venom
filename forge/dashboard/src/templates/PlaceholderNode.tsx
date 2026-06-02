import { Handle, Position, NodeProps } from '@xyflow/react';
import { t, radius, font } from '../theme/tokens';

export interface PlaceholderNodeData {
  placeholder_id: string;
  label: string;
  hint: string;
  [key: string]: unknown;
}

export default function PlaceholderNode({ data }: NodeProps) {
  const nd = data as unknown as PlaceholderNodeData;
  return (
    <div style={{
      padding: '0.55rem 0.85rem',
      background: t.surface,
      border: `2px dashed ${t.placeholder}`,
      borderRadius: radius.lg,
      minWidth: '180px',
    }}>
      <div style={{
        fontSize: font.xs,
        color: t.placeholder,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        Placeholder
      </div>
      <div style={{
        fontSize: font.md,
        color: t.text,
        fontWeight: 600,
        marginTop: '0.15rem',
      }}>
        {nd.label}
      </div>
      {nd.hint && (
        <div style={{ fontSize: font.xs, color: t.textDim, marginTop: '0.15rem' }}>
          [{nd.hint}]
        </div>
      )}
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ background: t.placeholder, width: 10, height: 10 }}
      />
    </div>
  );
}
