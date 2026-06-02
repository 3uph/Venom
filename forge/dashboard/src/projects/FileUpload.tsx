import { useRef } from 'react';
import api from '../api/client';

interface Props {
  projectId: string;
  onUploaded: () => void;
}

export default function FileUpload({ projectId, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    const files = inputRef.current?.files;
    if (!files || files.length === 0) return;
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append('file', file);
      form.append('file_type', 'shellcode');
      await api.post(`/projects/${projectId}/files`, form);
    }
    if (inputRef.current) inputRef.current.value = '';
    onUploaded();
  };

  return (
    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
      <input ref={inputRef} type="file" multiple style={{ color: '#888' }} />
      <button onClick={handleUpload} style={{
        padding: '0.4rem 0.8rem', background: '#333', border: '1px solid #555',
        borderRadius: '4px', color: '#e0e0e0', cursor: 'pointer',
      }}>
        Upload
      </button>
    </div>
  );
}
