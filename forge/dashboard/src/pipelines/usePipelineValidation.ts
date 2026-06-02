import { useEffect, useState, useRef } from 'react';
import api from '../api/client';

export interface ValidationError {
  type: string;
  node_id?: string;
  param?: string;
  function?: string;
  module_id?: string;
  node_ids?: string[];
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

const DEBOUNCE_MS = 400;

export default function usePipelineValidation(
  pipelineId: string | undefined,
  triggerKey: number,
): ValidationResult {
  const [result, setResult] = useState<ValidationResult>({ valid: true, errors: [] });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!pipelineId) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await api.post(`/pipelines/${pipelineId}/validate`);
        setResult(res.data);
      } catch {
        // ignore — keep previous result
      }
    }, DEBOUNCE_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [pipelineId, triggerKey]);

  return result;
}
