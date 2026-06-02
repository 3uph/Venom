import { DragEvent } from 'react';

interface ProjectFile {
  id: string;
  filename: string;
  file_type: string;
}

interface Props {
  files: ProjectFile[];
}

export default function FilePalette({ files }: Props) {
  const handleDragStart = (e: DragEvent<HTMLDivElement>, file: ProjectFile) => {
    e.dataTransfer.setData(
      'application/forge-file',
      JSON.stringify({ file_id: file.id, filename: file.filename })
    );
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div style={{
      width: '200px',
      background: '#141414',
      borderRight: '1px solid #333',
      padding: '0.75rem',
      overflow: 'auto',
      height: '100%',
    }}>
      <div style={{ color: '#5cc', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
        Project Files
      </div>
      {files.length === 0 && (
        <div style={{ color: '#555', fontSize: '0.8rem' }}>No files uploaded.</div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        {files.map((f) => (
          <div
            key={f.id}
            draggable
            onDragStart={(e) => handleDragStart(e, f)}
            title="Drag onto canvas"
            style={{
              padding: '0.4rem 0.5rem',
              background: f.file_type === 'output' ? '#0e2a18' : '#0e2a30',
              border: '1px solid #266',
              borderRadius: '4px',
              color: '#e0f7ff',
              fontSize: '0.8rem',
              cursor: 'grab',
              wordBreak: 'break-all',
            }}
          >
            {f.filename}
            <div style={{ color: '#588', fontSize: '0.65rem', marginTop: '0.15rem' }}>
              [{f.file_type}]
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
