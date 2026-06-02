import { Handle, Position, NodeProps } from '@xyflow/react';

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
      padding: '0.5rem 0.75rem',
      background: '#2a1f0e',
      border: '2px dashed #cc8844',
      borderRadius: '8px',
      minWidth: '180px',
    }}>
      <div style={{ fontSize: '0.7rem', color: '#cc8844', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Placeholder
      </div>
      <div style={{ fontSize: '0.9rem', color: '#ffd699', fontWeight: 'bold', marginTop: '0.15rem' }}>
        {nd.label}
      </div>
      {nd.hint && (
        <div style={{ fontSize: '0.7rem', color: '#aa7733', marginTop: '0.15rem' }}>
          [{nd.hint}]
        </div>
      )}
      <Handle type="source" position={Position.Right} id="output" style={{ background: '#cc8844', width: 10, height: 10 }} />
    </div>
  );
}
