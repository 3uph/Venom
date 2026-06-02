import { useEffect, useState } from 'react';
import api from '../api/client';
import { t, space, radius, font } from '../theme/tokens';

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
  if (s === 'completed') return t.success;
  if (s === 'failed') return t.danger;
  if (s === 'running') return t.warning;
  return t.textDim;
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
    const token = localStorage.getItem('venom_token');
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
      background: t.surface,
      borderTop: `1px solid ${t.border}`,
      maxHeight: collapsed ? '34px' : '280px',
      overflow: 'hidden',
      transition: 'max-height 0.2s ease',
    }}>
      <div
        onClick={() => setCollapsed(!collapsed)}
        style={{
          padding: `${space.xs} ${space.md}`, cursor: 'pointer', display: 'flex',
          justifyContent: 'space-between', alignItems: 'center',
          borderBottom: collapsed ? 'none' : `1px solid ${t.border}`,
        }}
      >
        <span style={{ color: t.textDim, fontSize: font.xs, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Run history ({runs.length})
        </span>
        <span style={{ color: t.textFaint, fontSize: font.xs }}>
          {collapsed ? '▲' : '▼'}
        </span>
      </div>
      <div style={{ overflow: 'auto', maxHeight: '240px', padding: space.sm }}>
        {runs.length === 0 && (
          <div style={{ color: t.textFaint, fontSize: font.sm, padding: space.sm }}>
            No runs yet.
          </div>
        )}
        {runs.map((r) => (
          <div key={r.id} style={{
            background: t.surface2, padding: '0.45rem 0.7rem', marginBottom: '0.3rem',
            borderRadius: radius.md, border: `1px solid ${t.border}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: space.sm }}>
              <span style={{ color: statusColor(r.status), fontSize: font.sm, minWidth: '90px' }}>
                ● {r.status}
              </span>
              <span style={{ color: t.textDim, fontSize: font.xs, flex: 1 }}>
                {r.started_at ? new Date(r.started_at).toLocaleTimeString() : '-'}
                {' · '}{durationStr(r.started_at, r.finished_at)}
              </span>
              <button onClick={() => setExpanded(expanded === r.id ? null : r.id)} style={miniBtn(t.textDim)}>
                {expanded === r.id ? 'Hide' : 'Details'}
              </button>
              <button onClick={() => handleRerun(r.id)} style={miniBtn(t.info)}>
                Re-run
              </button>
            </div>
            {expanded === r.id && (
              <div style={{ marginTop: space.sm, paddingTop: space.sm, borderTop: `1px solid ${t.border}` }}>
                {Object.entries(r.step_results || {}).map(([nodeId, step]: [string, any]) => {
                  if (nodeId === 'error' || nodeId === 'validation_errors') return null;
                  return (
                    <div key={nodeId} style={{ fontSize: font.xs, color: t.text, marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: space.sm }}>
                      <span style={{ color: statusColor(step.status), minWidth: '80px' }}>{step.status || '?'}</span>
                      <span style={{ color: t.textDim, flex: 1, wordBreak: 'break-all' }}>
                        {nodeId} → {step.module}/{step.function}
                      </span>
                      {step.output_path && (
                        <button onClick={() => handleDownload(r.id, nodeId)} style={miniBtn(t.info)}>
                          Download
                        </button>
                      )}
                    </div>
                  );
                })}
                {r.step_results?.error && (
                  <div style={{ color: t.danger, fontSize: font.xs, marginTop: '0.3rem' }}>
                    Error: {r.step_results.error}
                  </div>
                )}
                {r.step_results?.validation_errors && (
                  <div style={{ color: t.danger, fontSize: font.xs, marginTop: '0.3rem' }}>
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

function miniBtn(color: string): React.CSSProperties {
  return {
    padding: '0.15rem 0.5rem',
    background: 'transparent',
    border: `1px solid ${t.border}`,
    borderRadius: radius.sm,
    color,
    cursor: 'pointer',
    fontSize: font.xs,
  };
}
