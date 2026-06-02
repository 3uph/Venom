import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ReactFlow, Background, BackgroundVariant, NodeTypes, ReactFlowProvider,
} from '@xyflow/react';
import api from '../api/client';
import ModuleNode from '../pipelines/nodes/ModuleNode';
import ProjectFileNode from '../pipelines/nodes/ProjectFileNode';
import PlaceholderNode from './PlaceholderNode';
import InstantiateTemplateDialog from './InstantiateTemplateDialog';
import { t, space, radius, font } from '../theme/tokens';

interface Placeholder { id: string; label: string; hint: string }
interface Template {
  id: string;
  name: string;
  description: string;
  tags: string[];
  graph: { nodes: any[]; edges: any[] };
  placeholders: Placeholder[];
}

const nodeTypes: NodeTypes = {
  moduleNode: ModuleNode,
  projectFileNode: ProjectFileNode,
  placeholderNode: PlaceholderNode,
};

export default function TemplateDetailPage() {
  const { templateId } = useParams<{ templateId: string }>();
  const [template, setTemplate] = useState<Template | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!templateId) return;
    api.get(`/templates/${templateId}`).then((r) => setTemplate(r.data));
  }, [templateId]);

  if (!template) return <div style={{ padding: '1.5rem', color: t.textDim }}>Loading…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: t.bg }}>
      <div style={{
        padding: `${space.md} ${space.lg}`,
        borderBottom: `1px solid ${t.border}`,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: t.surface,
      }}>
        <div>
          <Link to="/templates" style={{ color: t.textDim, textDecoration: 'none', fontSize: font.sm }}>
            ← Templates
          </Link>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: space.md, marginTop: '0.25rem' }}>
            <span style={{ color: t.text, fontSize: font.lg, fontWeight: 600 }}>{template.name}</span>
            <span style={{ color: t.textDim, fontSize: font.sm }}>{template.description}</span>
          </div>
        </div>
        <button onClick={() => setShowDialog(true)} style={{
          padding: '0.5rem 1rem',
          background: t.accent,
          border: 'none',
          borderRadius: radius.md,
          color: '#fff',
          cursor: 'pointer',
          fontSize: font.sm,
          fontWeight: 500,
        }}>
          Use in project
        </button>
      </div>
      <div style={{ flex: 1 }}>
        <ReactFlowProvider>
          <ReactFlow
            nodes={template.graph.nodes || []}
            edges={template.graph.edges || []}
            nodeTypes={nodeTypes}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            fitView
            style={{ background: t.bg }}
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1} color={t.border} />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
      {showDialog && (
        <InstantiateTemplateDialog
          templateId={template.id}
          placeholders={template.placeholders}
          templateName={template.name}
          onClose={() => setShowDialog(false)}
          onCreated={(pipelineId, projectId) => {
            navigate(`/projects/${projectId}/pipelines/${pipelineId}`);
          }}
        />
      )}
    </div>
  );
}
