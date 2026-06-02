import { Handle, Position, NodeProps } from '@xyflow/react';
import { t, radius, font } from '../../theme/tokens';

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

const HANDLE_SPACING = 22;
const HANDLE_OFFSET_TOP = 42;

function statusColor(s?: string): string {
  if (s === 'completed') return t.success;
  if (s === 'running') return t.warning;
  if (s === 'failed' || s === 'error') return t.danger;
  return t.textFaint;
}

function colorForHint(hint?: string): string {
  if (!hint) return t.accent;
  const palette: Record<string, string> = {
    binary: t.accent,
    pe_binary: '#ec4899',
    shellcode: t.warning,
    text: t.info,
    archive: '#a855f7',
  };
  return palette[hint] || t.accent;
}

export default function ModuleNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as ModuleNodeData;
  const fn = nodeData.manifest_function || null;
  const fileParams = (fn?.params || []).filter((p) => p.type === 'file');
  const returns = fn?.returns;
  const showReturn = returns && returns.type === 'file';
  const returnHandleId = returns?.name || 'output';

  const borderColor = nodeData.has_validation_error
    ? t.danger
    : selected
    ? t.accent
    : t.border;
  const sc = statusColor(nodeData.status);

  const minHeight = Math.max(
    fileParams.length * HANDLE_SPACING + HANDLE_OFFSET_TOP + 20,
    showReturn ? HANDLE_OFFSET_TOP + HANDLE_SPACING : 0,
    78,
  );

  return (
    <div
      style={{
        position: 'relative',
        padding: '0.55rem 0.85rem',
        background: t.surface,
        border: `2px solid ${borderColor}`,
        borderRadius: radius.lg,
        minWidth: '240px',
        minHeight,
        transition: 'border-color 0.15s ease',
      }}
    >
      <div style={{
        fontSize: font.xs,
        color: t.textDim,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}>
        {nodeData.module_name}
      </div>
      <div style={{
        fontSize: font.md,
        color: t.text,
        fontWeight: 600,
        marginTop: '0.1rem',
      }}>
        {nodeData.function || 'Select function'}
      </div>
      <div style={{
        fontSize: font.xs,
        color: sc,
        marginTop: '0.2rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.3rem',
      }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc, display: 'inline-block' }} />
        {nodeData.status || 'pending'}
        {nodeData.has_validation_error && (
          <span style={{ color: t.danger, marginLeft: '0.4rem' }}>● invalid</span>
        )}
      </div>

      {fileParams.length === 0 && fn && (
        <div style={{ fontSize: font.xs, color: t.textFaint, marginTop: '0.3rem' }}>
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
                fontSize: font.xs,
                color: p.required ? t.textDim : t.textFaint,
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
              fontSize: font.xs,
              color: t.textDim,
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
