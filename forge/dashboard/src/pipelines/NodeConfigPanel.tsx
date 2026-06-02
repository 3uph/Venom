import { useEffect, useState } from 'react';
import api from '../api/client';
import { t, space, radius, font } from '../theme/tokens';

interface ManifestParam {
  name: string;
  type: string;
  required: boolean;
  options?: string[];
  description?: string;
}

interface ManifestFunction {
  name: string;
  description?: string;
  params: ManifestParam[];
}

interface Module {
  id: string;
  name: string;
  manifest_cache: { functions?: ManifestFunction[] } | null;
}

interface Props {
  nodeData: Record<string, any>;
  projectId: string;
  onUpdate: (data: Record<string, any>) => void;
  onClose: () => void;
}

export default function NodeConfigPanel({ nodeData, projectId, onUpdate, onClose }: Props) {
  const [modules, setModules] = useState<Module[]>([]);

  useEffect(() => {
    api.get('/modules').then((r) => setModules(r.data));
  }, [projectId]);

  const selectedModule = modules.find((m) => m.id === nodeData.module_id);
  const functions = selectedModule?.manifest_cache?.functions || [];
  const selectedFn = functions.find((f) => f.name === nodeData.function);

  const handleChange = (key: string, value: any) => {
    onUpdate({ ...nodeData, [key]: value });
  };

  const handleParamChange = (paramName: string, value: string) => {
    const params = { ...(nodeData.params || {}), [paramName]: value };
    onUpdate({ ...nodeData, params });
  };

  const inputStyle = {
    padding: '0.45rem 0.65rem',
    background: t.surface2,
    border: `1px solid ${t.border}`,
    borderRadius: radius.md,
    color: t.text,
    fontSize: font.sm,
    width: '100%',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    color: t.textDim,
    fontSize: font.xs,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.25rem',
  };

  return (
    <div style={{
      width: '320px',
      background: t.surface,
      borderLeft: `1px solid ${t.border}`,
      padding: space.lg,
      overflow: 'auto',
      height: '100%',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: space.md, alignItems: 'center' }}>
        <h3 style={{ fontSize: font.md, fontWeight: 600 }}>Node config</h3>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', color: t.textDim, cursor: 'pointer',
          fontSize: font.md, padding: '0 0.4rem',
        }}>
          ×
        </button>
      </div>

      <label style={labelStyle}>Module</label>
      <select
        value={nodeData.module_id || ''}
        onChange={(e) => handleChange('module_id', e.target.value)}
        style={{ ...inputStyle, marginBottom: space.md }}
      >
        <option value="">Select module</option>
        {modules.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>

      {selectedModule && (
        <>
          <label style={labelStyle}>Function</label>
          <select
            value={nodeData.function || ''}
            onChange={(e) => {
              const newFn = e.target.value;
              const fn = functions.find((f) => f.name === newFn);
              const next: Record<string, any> = { ...nodeData, function: newFn };
              next.module_name = selectedModule.name;
              next.label = `${selectedModule.name}: ${newFn}`;
              if (fn) next.params = {};
              onUpdate(next);
            }}
            style={{ ...inputStyle, marginBottom: space.md }}
          >
            <option value="">Select function</option>
            {functions.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
          </select>
        </>
      )}

      {selectedFn && (() => {
        const nonFileParams = selectedFn.params.filter((p) => p.type !== 'file');
        if (nonFileParams.length === 0) {
          return (
            <div style={{ color: t.textFaint, fontSize: font.xs }}>
              No inline parameters. File inputs are wired in the canvas.
            </div>
          );
        }
        return nonFileParams.map((p) => (
          <div key={p.name} style={{ marginBottom: space.sm }}>
            <label style={labelStyle}>
              {p.name} <span style={{ color: t.textFaint }}>({p.type}{p.required ? '*' : ''})</span>
            </label>
            {p.type === 'enum' && p.options ? (
              <select
                value={nodeData.params?.[p.name] || ''}
                onChange={(e) => handleParamChange(p.name, e.target.value)}
                style={inputStyle}
              >
                <option value="">Select…</option>
                {p.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input
                value={nodeData.params?.[p.name] || ''}
                onChange={(e) => handleParamChange(p.name, e.target.value)}
                placeholder={p.description || p.name}
                style={inputStyle}
              />
            )}
          </div>
        ));
      })()}

      {selectedFn && (() => {
        const fileParams = selectedFn.params.filter((p) => p.type === 'file');
        if (fileParams.length === 0) return null;
        return (
          <div style={{ marginTop: space.md, paddingTop: space.md, borderTop: `1px solid ${t.border}` }}>
            <div style={{ color: t.textDim, fontSize: font.xs, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.3rem' }}>
              File inputs (wire from canvas)
            </div>
            {fileParams.map((p) => (
              <div key={p.name} style={{ color: t.textDim, fontSize: font.sm }}>
                ◀ {p.name}{p.required ? '*' : ''}
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
