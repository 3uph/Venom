import { useEffect, useState } from 'react';
import api from '../api/client';

interface RunSummary {
  id: string;
  pipeline_id: string;
  status: string;
  started_at: string | null;
  finished_at: string | null;
  step_results: Record<string, any>;
}

interface Props {
  pipelineId: string;
  refreshKey: number;
}

function durationStr(started: string | null, finished: string | null): string {
  if (!started) return '-';
  const s = new Date(started).getTime();
  const f = finished ? new Date(finished).getTime() : Date.now();
  const ms = f - s;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function statusColor(s: string): string {
  if (s === 'completed') return '#44ff44';
  if (s === 'failed') return '#ff4444';
  if (s === 'running') return '#ffaa00';
  return '#888';
}

export default function RunHistoryDrawer({ pipelineId, refreshKey }: Props) {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  const load = async () => {
    const res = await api.get(`/pipelines/${pipelineId}/runs`);
    setRuns(res.data);
  };

  useEffect(() => { load(); }, [pipelineId, refreshKey]);

  const handleRerun = async (runId: string) => {
    await api.post(`/pipelines/${pipelineId}/runs/${runId}/rerun`);
    setTimeout(load, 800);
  };

  const handleDownload = async (runId: string, nodeId: string) => {
    const token = localStorage.getItem('forge_token');
    const url = `/api/pipelines/${pipelineId}/runs/${runId}/artifacts/${nodeId}/download`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      alert('Artifact unavailable');
      return;
    }
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${runId}_${nodeId}.bin`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div style={{
      background: '#141414', borderTop: '1px solid #333',
      maxHeight: collapsed ? '32px' : '260px', overflow: 'hidden',
      transition: 'max-height 0.2s ease',
    }}>
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          padding: '0.4rem 0.75rem', cursor: 'pointer', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center', background: '#1a1a1a',
        }}
      >
        <span style={{ color: '#888', fontSize: '0.85rem' }}>
          Run history ({runs.length})
        </span>
        <span style={{ color: '#666', fontSize: '0.8rem' }}>
          {collapsed ? '▲' : '▼'}
        </span>
      </div>
      <div style={{ overflow: 'auto', maxHeight: '230px', padding: '0.5rem 0.75rem' }}>
        {runs.length === 0 && <div style={{ color: '#555', fontSize: '0.8rem' }}>No runs yet.</div>}
        {runs.map((r) => (
          <div key={r.id} style={{
            background: '#1a1a1a', padding: '0.4rem 0.6rem', marginBottom: '0.3rem',
            borderRadius: '4px', border: '1px solid #2a2a2a',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ color: statusColor(r.status), fontSize: '0.85rem', minWidth: '80px' }}>
                ● {r.status}
              </span>
              <span style={{ color: '#aaa', fontSize: '0.75rem', flex: 1 }}>
                {r.started_at ? new Date(r.started_at).toLocaleTimeString() : '-'}
                {' '}({durationStr(r.started_at, r.finished_at)})
              </span>
              <button onClick={() => setExpanded(expanded === r.id ? null : r.id)} style={{
                padding: '0.2rem 0.5rem', background: '#2a2a2a', border: '1px solid #444',
                borderRadius: '3px', color: '#aaa', cursor: 'pointer', fontSize: '0.75rem',
              }}>
                {expanded === r.id ? 'Hide' : 'Details'}
              </button>
              <button onClick={() => handleRerun(r.id)} style={{
                padding: '0.2rem 0.5rem', background: '#2a3a2a', border: '1px solid #4a8',
                borderRadius: '3px', color: '#8e8', cursor: 'pointer', fontSize: '0.75rem',
              }}>
                Re-run
              </button>
            </div>
            {expanded === r.id && (
              <div style={{ marginTop: '0.4rem', paddingTop: '0.4rem', borderTop: '1px solid #2a2a2a' }}>
                {Object.entries(r.step_results || {}).map(([nodeId, step]: [string, any]) => (
                  <div key={nodeId} style={{ fontSize: '0.75rem', color: '#bbb', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: statusColor(step.status), minWidth: '70px' }}>{step.status || '?'}</span>
                    <span style={{ color: '#888', flex: 1, wordBreak: 'break-all' }}>
                      {nodeId} → {step.module}/{step.function}
                    </span>
                    {step.output_path && (
                      <button onClick={() => handleDownload(r.id, nodeId)} style={{
                        padding: '0.15rem 0.4rem', background: '#2a2a2a', border: '1px solid #444',
                        borderRadius: '3px', color: '#8cf', cursor: 'pointer', fontSize: '0.7rem',
                      }}>
                        Download
                      </button>
                    )}
                  </div>
                ))}
                {r.step_results?.error && (
                  <div style={{ color: '#ff8866', fontSize: '0.75rem', marginTop: '0.3rem' }}>
                    Error: {r.step_results.error}
                  </div>
                )}
                {r.step_results?.validation_errors && (
                  <div style={{ color: '#ff8866', fontSize: '0.75rem', marginTop: '0.3rem' }}>
                    {r.step_results.validation_errors.length} validation error(s)
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
