import { useEffect, useState } from 'react';
import api from '../api/client';

interface ModuleFunction {
  name: string;
  description: string;
  params: { name: string; type: string; required: boolean; options?: string[]; description?: string }[];
}

interface Module {
  id: string;
  name: string;
  manifest_cache: { functions?: ModuleFunction[] } | null;
}

interface ProjectFile {
  id: string;
  filename: string;
  file_type: string;
}

interface Props {
  nodeData: Record<string, any>;
  projectId: string;
  onUpdate: (data: Record<string, any>) => void;
  onClose: () => void;
}

export default function NodeConfigPanel({ nodeData, projectId, onUpdate, onClose }: Props) {
  const [modules, setModules] = useState<Module[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);

  useEffect(() => {
    api.get('/modules').then((r) => setModules(r.data));
    api.get(`/projects/${projectId}`).then((r) => setFiles(r.data.files || []));
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
              const fn = functions.find((f) => f.name === e.target.value);
              handleChange('function', e.target.value);
              handleChange('module_name', selectedModule.name);
              handleChange('label', `${selectedModule.name}: ${e.target.value}`);
              if (fn) handleChange('params', {});
            }}
            style={{ ...inputStyle, marginBottom: '0.75rem' }}
          >
            <option value="">Select function</option>
            {functions.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
          </select>
        </>
      )}

      {selectedFn && selectedFn.params.map((p) => (
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
          ) : p.type === 'file' ? (
            <select
              value={nodeData.params?.[p.name] || ''}
              onChange={(e) => handleParamChange(p.name, e.target.value)}
              style={inputStyle}
            >
              <option value="">Select file...</option>
              <option value="prev:auto">From previous node</option>
              {files.map((f) => <option key={f.id} value={`file:${f.id}`}>{f.filename}</option>)}
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
      ))}
    </div>
  );
}
