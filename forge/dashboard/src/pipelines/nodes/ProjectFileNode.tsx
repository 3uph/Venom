import { Handle, Position, NodeProps } from '@xyflow/react';
import { t, radius, font } from '../../theme/tokens';

export interface ProjectFileNodeData {
  file_id: string;
  filename: string;
  [key: string]: unknown;
}

export default function ProjectFileNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ProjectFileNodeData;
  const borderColor = selected ? t.shellcode : t.border;

  return (
    <div style={{
      padding: '0.5rem 0.75rem',
      background: t.surface,
      border: `2px solid ${borderColor}`,
      borderRadius: radius.lg,
      minWidth: '180px',
      transition: 'border-color 0.15s ease',
    }}>
      <div style={{
        fontSize: font.xs,
        color: t.shellcode,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        Project file
      </div>
      <div style={{
        fontSize: font.md,
        color: t.text,
        fontWeight: 600,
        marginTop: '0.15rem',
        wordBreak: 'break-all',
      }}>
        {nodeData.filename}
      </div>
      <Handle
        type="source"
        position={Position.Right}
        id="output"
        style={{ background: t.shellcode, width: 10, height: 10 }}
      />
    </div>
  );
}
