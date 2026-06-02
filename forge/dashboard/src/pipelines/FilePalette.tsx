import { DragEvent } from 'react';
import { t, space, radius, font } from '../theme/tokens';

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
      'application/venom-file',
      JSON.stringify({ file_id: file.id, filename: file.filename })
    );
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div style={{
      width: '220px',
      background: t.surface,
      borderRight: `1px solid ${t.border}`,
      padding: space.md,
      overflow: 'auto',
      height: '100%',
    }}>
      <div style={{
        color: t.textDim,
        fontSize: font.xs,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: space.sm,
      }}>
        Project files
      </div>
      {files.length === 0 && (
        <div style={{ color: t.textFaint, fontSize: font.sm }}>
          No files uploaded.
        </div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: space.xs }}>
        {files.map((f) => (
          <div
            key={f.id}
            draggable
            onDragStart={(e) => handleDragStart(e, f)}
            title="Drag onto canvas"
            style={{
              padding: '0.45rem 0.6rem',
              background: t.surface2,
              border: `1px solid ${t.border}`,
              borderRadius: radius.md,
              color: t.text,
              fontSize: font.sm,
              cursor: 'grab',
              wordBreak: 'break-all',
              transition: 'border-color 0.15s ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = t.shellcode; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = t.border; }}
          >
            {f.filename}
            <div style={{
              color: f.file_type === 'output' ? t.output : t.textFaint,
              fontSize: font.xs,
              marginTop: '0.15rem',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}>
              {f.file_type}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
