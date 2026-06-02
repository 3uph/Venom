import { useRef, useState } from 'react';
import api from '../api/client';
import { t, space, radius, font } from '../theme/tokens';

interface Props {
  projectId: string;
  onUploaded: () => void;
}

export default function FileUpload({ projectId, onUploaded }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileNames, setFileNames] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const handlePick = () => {
    inputRef.current?.click();
  };

  const handleChange = () => {
    const fs = inputRef.current?.files;
    setFileNames(fs ? Array.from(fs).map((f) => f.name) : []);
  };

  const handleUpload = async () => {
    const files = inputRef.current?.files;
    if (!files || files.length === 0) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append('file', file);
        form.append('file_type', 'shellcode');
        await api.post(`/projects/${projectId}/files`, form);
      }
      if (inputRef.current) inputRef.current.value = '';
      setFileNames([]);
      onUploaded();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: space.sm, alignItems: 'center' }}>
      <input ref={inputRef} type="file" multiple style={{ display: 'none' }} onChange={handleChange} />
      <button
        onClick={handlePick}
        style={{
          padding: '0.45rem 0.85rem',
          background: t.surface2,
          border: `1px solid ${t.border}`,
          borderRadius: radius.md,
          color: t.text,
          cursor: 'pointer',
          fontSize: font.sm,
        }}
      >
        Choose files
      </button>
      <div style={{ flex: 1, color: t.textDim, fontSize: font.sm, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {fileNames.length === 0 ? 'No files selected' : fileNames.join(', ')}
      </div>
      <button
        onClick={handleUpload}
        disabled={fileNames.length === 0 || busy}
        style={{
          padding: '0.45rem 1rem',
          background: fileNames.length === 0 ? t.surface2 : t.accent,
          border: 'none',
          borderRadius: radius.md,
          color: fileNames.length === 0 ? t.textFaint : '#fff',
          cursor: fileNames.length === 0 ? 'not-allowed' : 'pointer',
          fontSize: font.sm,
          fontWeight: 500,
        }}
      >
        {busy ? 'Uploading…' : 'Upload'}
      </button>
    </div>
  );
}
