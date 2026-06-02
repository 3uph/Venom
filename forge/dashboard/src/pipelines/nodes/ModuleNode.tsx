import { Handle, Position, NodeProps } from '@xyflow/react';

interface ManifestParam {
  name: string;
  type: string;
  required: boolean;
  description?: string;
  accepts?: string;
}

interface ManifestReturns {
  type: string;
  name?: string;
  produces?: string;
  description?: string;
}

interface ManifestFunction {
  name: string;
  description?: string;
  params: ManifestParam[];
  returns?: ManifestReturns;
}

export interface ModuleNodeData {
  label: string;
  module_id: string;
  module_name: string;
  function: string;
  params: Record<string, any>;
  manifest_function?: ManifestFunction | null;
  status?: 'pending' | 'running' | 'completed' | 'error' | 'failed';
  has_validation_error?: boolean;
  [key: string]: unknown;
}

const statusColors: Record<string, string> = {
  pending: '#555',
  running: '#ffaa00',
  completed: '#44ff44',
  error: '#ff4444',
  failed: '#ff4444',
};

const HANDLE_SPACING = 22;
const HANDLE_OFFSET_TOP = 38;

function colorForHint(hint?: string): string {
  if (!hint) return '#ff4444';
  const palette: Record<string, string> = {
    binary: '#ff8844',
    pe_binary: '#ff4488',
    shellcode: '#ffaa44',
    text: '#88ddff',
    archive: '#aa88ff',
  };
  return palette[hint] || '#ff4444';
}

export default function ModuleNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ModuleNodeData;
  const fn = nodeData.manifest_function || null;
  const fileParams = (fn?.params || []).filter((p) => p.type === 'file');
  const returns = fn?.returns;
  const showReturn = returns && returns.type === 'file';
  const returnHandleId = returns?.name || 'output';

  const borderColor = nodeData.has_validation_error
    ? '#ff4444'
    : selected
    ? '#ff4444'
    : '#333';
  const statusColor = statusColors[nodeData.status || 'pending'] || '#555';

  const minHeight = Math.max(
    fileParams.length * HANDLE_SPACING + HANDLE_OFFSET_TOP + 20,
    showReturn ? HANDLE_OFFSET_TOP + HANDLE_SPACING : 0,
    70,
  );

  return (
    <div
      style={{
        position: 'relative',
        padding: '0.5rem 0.75rem',
        background: '#1a1a1a',
        border: `2px solid ${borderColor}`,
        borderRadius: '8px',
        minWidth: '220px',
        minHeight,
      }}
    >
      <div style={{ fontSize: '0.7rem', color: '#888' }}>{nodeData.module_name}</div>
      <div style={{ fontSize: '0.95rem', color: '#e0e0e0', fontWeight: 'bold' }}>
        {nodeData.function || 'Select function'}
      </div>
      <div style={{ fontSize: '0.7rem', color: statusColor, marginTop: '0.2rem' }}>
        {nodeData.status || 'pending'}
        {nodeData.has_validation_error && (
          <span style={{ color: '#ff4444', marginLeft: '0.4rem' }}>● invalid</span>
        )}
      </div>

      {fileParams.length === 0 && fn && (
        <div style={{ fontSize: '0.7rem', color: '#555', marginTop: '0.3rem' }}>
          (no file inputs)
        </div>
      )}

      {fileParams.map((p, idx) => {
        const top = HANDLE_OFFSET_TOP + idx * HANDLE_SPACING;
        return (
          <div key={p.name}>
            <Handle
              type="target"
              id={p.name}
              position={Position.Left}
              style={{
                top,
                background: colorForHint(p.accepts),
                width: 10,
                height: 10,
              }}
            />
            <div
              style={{
                position: 'absolute',
                left: 14,
                top: top - 7,
                fontSize: '0.65rem',
                color: p.required ? '#bbb' : '#777',
                pointerEvents: 'none',
              }}
            >
              {p.name}
              {p.required ? '*' : ''}
            </div>
          </div>
        );
      })}

      {showReturn && (
        <>
          <Handle
            type="source"
            id={returnHandleId}
            position={Position.Right}
            style={{
              top: HANDLE_OFFSET_TOP,
              background: colorForHint(returns?.produces),
              width: 10,
              height: 10,
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: 14,
              top: HANDLE_OFFSET_TOP - 7,
              fontSize: '0.65rem',
              color: '#bbb',
              pointerEvents: 'none',
            }}
          >
            {returnHandleId}
          </div>
        </>
      )}
    </div>
  );
}
