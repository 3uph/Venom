import { useState, useRef, useCallback } from 'react';
import api from '../api/client';

export type NodeStatus = 'pending' | 'running' | 'completed' | 'failed';

interface RunEvent {
  event: 'run_started' | 'node_started' | 'node_completed' | 'node_failed' | 'run_finished';
  node_id?: string;
  output_path?: string;
  error?: string;
  status?: 'completed' | 'failed';
  run_id?: string;
}

interface ExecutionState {
  running: boolean;
  nodeStatuses: Record<string, NodeStatus>;
  runId: string | null;
  finalStatus: 'completed' | 'failed' | null;
  lastError: string | null;
}

const INITIAL_STATE: ExecutionState = {
  running: false,
  nodeStatuses: {},
  runId: null,
  finalStatus: null,
  lastError: null,
};

export default function usePipelineExecution() {
  const [state, setState] = useState<ExecutionState>(INITIAL_STATE);
  const wsRef = useRef<WebSocket | null>(null);

  const closeWs = () => {
    if (wsRef.current) {
      try { wsRef.current.close(); } catch { /* noop */ }
      wsRef.current = null;
    }
  };

  const start = useCallback(async (pipelineId: string) => {
    closeWs();
    setState({ ...INITIAL_STATE, running: true });
    try {
      const res = await api.post(`/pipelines/${pipelineId}/execute`);
      const runId = res.data.id as string;
      setState((s) => ({ ...s, runId }));

      const token = localStorage.getItem('venom_token') || '';
      const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const wsUrl = `${proto}://${window.location.host}/api/pipelines/${pipelineId}/runs/${runId}/stream?token=${encodeURIComponent(token)}`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (msg) => {
        try {
          const ev: RunEvent = JSON.parse(msg.data);
          if (ev.event === 'node_started' && ev.node_id) {
            setState((s) => ({ ...s, nodeStatuses: { ...s.nodeStatuses, [ev.node_id!]: 'running' } }));
          } else if (ev.event === 'node_completed' && ev.node_id) {
            setState((s) => ({ ...s, nodeStatuses: { ...s.nodeStatuses, [ev.node_id!]: 'completed' } }));
          } else if (ev.event === 'node_failed' && ev.node_id) {
            setState((s) => ({
              ...s,
              nodeStatuses: { ...s.nodeStatuses, [ev.node_id!]: 'failed' },
              lastError: ev.error || 'Node failed',
            }));
          } else if (ev.event === 'run_finished') {
            setState((s) => ({ ...s, running: false, finalStatus: ev.status || null }));
            closeWs();
          }
        } catch {
          // ignore parse errors
        }
      };

      ws.onerror = () => {
        setState((s) => ({ ...s, lastError: 'WebSocket error' }));
      };

      ws.onclose = () => {
        setState((s) => (s.running ? { ...s, running: false } : s));
        wsRef.current = null;
      };
    } catch (err: any) {
      setState({
        ...INITIAL_STATE,
        lastError: err?.response?.data?.detail || 'Failed to start pipeline',
      });
    }
  }, []);

  const reset = useCallback(() => {
    closeWs();
    setState(INITIAL_STATE);
  }, []);

  return { ...state, start, reset };
}
