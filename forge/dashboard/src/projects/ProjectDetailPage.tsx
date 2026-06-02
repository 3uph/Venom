import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import FileUpload from './FileUpload';
import ClonePipelineDialog from './ClonePipelineDialog';
import { t, space, radius, font } from '../theme/tokens';

interface ProjectFile {
  id: string;
  filename: string;
  file_type: string;
  sha256: string;
  size_bytes: number;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  notes: string;
  archived: boolean;
  files: ProjectFile[];
}

interface PipelineSummary {
  id: string;
  name: string;
  created_at: string;
}

function humanSize(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [pipelines, setPipelines] = useState<PipelineSummary[]>([]);
  const [newPipelineName, setNewPipelineName] = useState('');
  const [notesDraft, setNotesDraft] = useState('');
  const [cloneTarget, setCloneTarget] = useState<string | null>(null);
  const navigate = useNavigate();

  const load = async () => {
    const [projRes, pipRes] = await Promise.all([
      api.get(`/projects/${projectId}`),
      api.get(`/pipelines?project_id=${projectId}`),
    ]);
    setProject(projRes.data);
    setPipelines(pipRes.data);
    setNotesDraft(projRes.data.notes || '');
  };

  useEffect(() => { load(); }, [projectId]);

  const handleDeleteFile = async (fileId: string) => {
    await api.delete(`/projects/${projectId}/files/${fileId}`);
    load();
  };

  const handleDownloadFile = async (fileId: string, filename: string) => {
    const res = await api.get(`/projects/${projectId}/files/${fileId}/download`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleCreatePipeline = async () => {
    if (!newPipelineName.trim()) return;
    await api.post('/pipelines', { name: newPipelineName, project_id: projectId, graph: { nodes: [], edges: [] } });
    setNewPipelineName('');
    load();
  };

  const handleDuplicatePipeline = async (pid: string) => {
    await api.post(`/pipelines/${pid}/duplicate`, {});
    load();
  };

  const handleDeletePipeline = async (pid: string) => {
    if (!confirm('Delete pipeline?')) return;
    await api.delete(`/pipelines/${pid}`);
    load();
  };

  const handleSaveNotes = async () => {
    if (notesDraft === project?.notes) return;
    await api.patch(`/projects/${projectId}`, { notes: notesDraft });
    load();
  };

  const handleArchive = async () => {
    if (!project) return;
    await api.post(`/projects/${projectId}/${project.archived ? 'restore' : 'archive'}`);
    load();
  };

  if (!project) return <div style={{ color: t.textDim }}>Loading…</div>;

  const inputStyle = {
    padding: '0.5rem 0.75rem',
    background: t.surface2,
    border: `1px solid ${t.border}`,
    borderRadius: radius.md,
    color: t.text,
    fontSize: font.sm,
    outline: 'none',
  };

  return (
    <div style={{ maxWidth: '960px' }}>
      <Link to="/projects" style={{ color: t.textDim, textDecoration: 'none', fontSize: font.sm }}>
        ← Back to Projects
      </Link>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', margin: '0.5rem 0 0.25rem 0' }}>
        <div>
          <h2 style={{ fontWeight: 600, fontSize: font.xxl }}>
            {project.name}
            {project.archived && (
              <span style={{ marginLeft: space.sm, fontSize: font.xs, color: t.placeholder, fontWeight: 400, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                archived
              </span>
            )}
          </h2>
          {project.description && (
            <div style={{ color: t.textDim, fontSize: font.sm, marginTop: '0.25rem' }}>
              {project.description}
            </div>
          )}
        </div>
        <button
          onClick={handleArchive}
          style={{
            padding: '0.4rem 0.85rem',
            background: 'transparent',
            border: `1px solid ${t.border}`,
            borderRadius: radius.md,
            color: project.archived ? t.success : t.warning,
            cursor: 'pointer',
            fontSize: font.sm,
          }}
        >
          {project.archived ? 'Restore' : 'Archive'}
        </button>
      </div>

      <Section title="Notes">
        <textarea
          value={notesDraft}
          onChange={(e) => setNotesDraft(e.target.value)}
          onBlur={handleSaveNotes}
          placeholder="Operator notes (TTPs, targets, observations)…"
          style={{
            width: '100%',
            minHeight: '90px',
            padding: '0.65rem 0.85rem',
            background: t.surface,
            border: `1px solid ${t.border}`,
            borderRadius: radius.md,
            color: t.text,
            fontSize: font.sm,
            fontFamily: 'inherit',
            resize: 'vertical',
            outline: 'none',
          }}
        />
      </Section>

      <Section title="Files">
        <FileUpload projectId={project.id} onUploaded={load} />
        <div style={{ marginTop: space.md, display: 'flex', flexDirection: 'column', gap: space.xs }}>
          {project.files.map((f) => (
            <div key={f.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0.6rem 0.85rem',
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: radius.md,
            }}>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: space.sm, flexWrap: 'wrap' }}>
                <span style={{
                  color: f.file_type === 'output' ? t.output : t.text,
                  fontSize: font.sm,
                  fontWeight: 500,
                }}>
                  {f.filename}
                </span>
                <span style={{ color: t.textFaint, fontSize: font.xs, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  {f.file_type}
                </span>
                {f.sha256 && (
                  <span style={{ color: t.textDim, fontSize: font.xs, fontFamily: 'ui-monospace, monospace' }}>
                    {f.sha256.slice(0, 12)}…
                  </span>
                )}
                {f.size_bytes > 0 && (
                  <span style={{ color: t.textDim, fontSize: font.xs }}>
                    {humanSize(f.size_bytes)}
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', gap: space.xs }}>
                <button onClick={() => handleDownloadFile(f.id, f.filename)} style={ghostButton(t.info)}>
                  Download
                </button>
                <button onClick={() => handleDeleteFile(f.id)} style={ghostButton(t.danger)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
          {project.files.length === 0 && (
            <div style={{ color: t.textFaint, fontSize: font.sm, padding: space.md }}>No files uploaded.</div>
          )}
        </div>
      </Section>

      <Section title="Pipelines">
        <div style={{ display: 'flex', gap: space.sm, marginBottom: space.md }}>
          <input
            placeholder="Pipeline name"
            value={newPipelineName}
            onChange={(e) => setNewPipelineName(e.target.value)}
            style={inputStyle}
          />
          <button
            onClick={handleCreatePipeline}
            style={{
              padding: '0.5rem 1rem',
              background: t.accent,
              border: 'none',
              borderRadius: radius.md,
              color: '#fff',
              cursor: 'pointer',
              fontSize: font.sm,
              fontWeight: 500,
            }}
          >
            New pipeline
          </button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: space.xs }}>
          {pipelines.map((p) => (
            <div key={p.id} style={{
              display: 'flex', alignItems: 'center', gap: space.sm,
              padding: '0.55rem 0.85rem',
              background: t.surface,
              border: `1px solid ${t.border}`,
              borderRadius: radius.md,
            }}>
              <Link to={`/projects/${projectId}/pipelines/${p.id}`} style={{ color: t.text, textDecoration: 'none', flex: 1, fontSize: font.sm, fontWeight: 500 }}>
                {p.name}
              </Link>
              <button onClick={() => handleDuplicatePipeline(p.id)} style={ghostButton(t.textDim)}>
                Duplicate
              </button>
              <button onClick={() => setCloneTarget(p.id)} style={ghostButton(t.info)}>
                Clone to project
              </button>
              <button onClick={() => handleDeletePipeline(p.id)} style={ghostButton(t.danger)}>
                Delete
              </button>
            </div>
          ))}
          {pipelines.length === 0 && (
            <div style={{ color: t.textFaint, fontSize: font.sm, padding: space.md }}>No pipelines yet.</div>
          )}
        </div>
      </Section>

      {cloneTarget && projectId && (
        <ClonePipelineDialog
          pipelineId={cloneTarget}
          currentProjectId={projectId}
          onClose={() => setCloneTarget(null)}
          onCloned={(newId, targetProjectId) => {
            setCloneTarget(null);
            navigate(`/projects/${targetProjectId}/pipelines/${newId}`);
          }}
        />
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: space.xl }}>
      <h3 style={{
        fontSize: font.sm,
        color: t.textDim,
        fontWeight: 500,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        marginBottom: space.sm,
      }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function ghostButton(color: string): React.CSSProperties {
  return {
    padding: '0.3rem 0.7rem',
    background: 'transparent',
    border: `1px solid ${t.border}`,
    borderRadius: radius.sm,
    color,
    cursor: 'pointer',
    fontSize: font.xs,
  };
}
