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

  if (!template) return <div>Loading...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #333', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Link to="/templates" style={{ color: '#888', textDecoration: 'none', fontSize: '0.85rem' }}>
            &larr; Templates
          </Link>
          <span style={{ color: '#e0e0e0', marginLeft: '0.75rem', fontSize: '1.05rem' }}>{template.name}</span>
          <span style={{ color: '#888', marginLeft: '0.75rem', fontSize: '0.85rem' }}>{template.description}</span>
        </div>
        <button onClick={() => setShowDialog(true)} style={{
          padding: '0.4rem 0.9rem', background: '#ff4444', border: 'none',
          borderRadius: '4px', color: '#fff', cursor: 'pointer',
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
            style={{ background: '#0f0f0f' }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#222" />
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
