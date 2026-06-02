import { Handle, Position, NodeProps } from '@xyflow/react';

export interface ModuleNodeData {
  label: string;
  module_id: string;
  module_name: string;
  function: string;
  params: Record<string, any>;
  status?: 'pending' | 'running' | 'completed' | 'error';
  [key: string]: unknown;
}

const statusColors: Record<string, string> = {
  pending: '#555',
  running: '#ffaa00',
  completed: '#44ff44',
  error: '#ff4444',
};

export default function ModuleNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ModuleNodeData;
  const borderColor = selected ? '#ff4444' : '#333';
  const statusColor = statusColors[nodeData.status || 'pending'] || '#555';

  return (
    <div style={{
      padding: '0.5rem 0.75rem', background: '#1a1a1a', border: `2px solid ${borderColor}`,
      borderRadius: '8px', minWidth: '180px',
    }}>
      <Handle type="target" position={Position.Left} style={{ background: '#ff4444' }} />
      <div style={{ fontSize: '0.75rem', color: '#888' }}>{nodeData.module_name}</div>
      <div style={{ fontSize: '0.9rem', color: '#e0e0e0', fontWeight: 'bold' }}>{nodeData.function || 'Select function'}</div>
      <div style={{ fontSize: '0.7rem', color: statusColor, marginTop: '0.2rem' }}>
        {nodeData.status || 'pending'}
      </div>
      <Handle type="source" position={Position.Right} style={{ background: '#ff4444' }} />
    </div>
  );
}
