import { Handle, Position, NodeProps } from '@xyflow/react';

export interface ProjectFileNodeData {
  file_id: string;
  filename: string;
  [key: string]: unknown;
}

export default function ProjectFileNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ProjectFileNodeData;
  const borderColor = selected ? '#44ddff' : '#266';

  return (
    <div style={{
      padding: '0.5rem 0.75rem',
      background: '#0e2a30',
      border: `2px solid ${borderColor}`,
      borderRadius: '8px',
      minWidth: '180px',
    }}>
      <div style={{ fontSize: '0.7rem', color: '#5cc', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Project File
      </div>
      <div style={{ fontSize: '0.9rem', color: '#e0f7ff', fontWeight: 'bold', marginTop: '0.15rem', wordBreak: 'break-all' }}>
        {nodeData.filename}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ background: '#44ddff', width: 10, height: 10 }}
      />
    </div>
  );
}
