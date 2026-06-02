import { useEffect, useState } from 'react';
import api from '../api/client';

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
    padding: '0.4rem', background: '#2a2a2a', border: '1px solid #333',
    borderRadius: '4px', color: '#e0e0e0', fontSize: '0.85rem', width: '100%',
  };

  return (
    <div style={{
      width: '300px', background: '#1a1a1a', borderLeft: '1px solid #333',
      padding: '1rem', overflow: 'auto', height: '100%',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
        <h3 style={{ fontSize: '1rem' }}>Node Config</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>X</button>
      </div>

      <label style={{ color: '#888', fontSize: '0.8rem' }}>Module</label>
      <select
        value={nodeData.module_id || ''}
        onChange={(e) => handleChange('module_id', e.target.value)}
        style={{ ...inputStyle, marginBottom: '0.75rem' }}
      >
        <option value="">Select module</option>
        {modules.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
      </select>

      {selectedModule && (
        <>
          <label style={{ color: '#888', fontSize: '0.8rem' }}>Function</label>
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
            style={{ ...inputStyle, marginBottom: '0.75rem' }}
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
            <div style={{ color: '#666', fontSize: '0.75rem' }}>
              This function has no inline parameters. File inputs are wired in the canvas.
            </div>
          );
        }
        return nonFileParams.map((p) => (
          <div key={p.name} style={{ marginBottom: '0.5rem' }}>
            <label style={{ color: '#888', fontSize: '0.8rem' }}>
              {p.name} ({p.type}){p.required && ' *'}
            </label>
            {p.type === 'enum' && p.options ? (
              <select
                value={nodeData.params?.[p.name] || ''}
                onChange={(e) => handleParamChange(p.name, e.target.value)}
                style={inputStyle}
              >
                <option value="">Select...</option>
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
          <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid #333' }}>
            <div style={{ color: '#666', fontSize: '0.75rem', marginBottom: '0.3rem' }}>
              File inputs (wire from canvas):
            </div>
            {fileParams.map((p) => (
              <div key={p.name} style={{ color: '#888', fontSize: '0.8rem' }}>
                ◀ {p.name}{p.required ? '*' : ''}
              </div>
            ))}
          </div>
        );
      })()}
    </div>
  );
}
