import { useState, useEffect, useCallback, useMemo, useRef, DragEvent } from 'react';
import { useParams } from 'react-router-dom';
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  Node,
  Edge,
  NodeTypes,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import api from '../api/client';
import ModuleNode from './nodes/ModuleNode';
import ProjectFileNode from './nodes/ProjectFileNode';
import NodeConfigPanel from './NodeConfigPanel';
import PipelineToolbar from './PipelineToolbar';
import FilePalette from './FilePalette';
import ValidationPanel from './ValidationPanel';
import RunHistoryDrawer from './RunHistoryDrawer';
import SaveAsTemplateDialog from './SaveAsTemplateDialog';
import usePipelineValidation from './usePipelineValidation';
import usePipelineExecution from './usePipelineExecution';
import { autoLayout } from './autoLayout';
import { t, space, font } from '../theme/tokens';

const nodeTypes: NodeTypes = {
  moduleNode: ModuleNode,
  projectFileNode: ProjectFileNode,
};

interface ManifestFunction {
  name: string;
  description?: string;
  params: { name: string; type: string; required: boolean; description?: string; accepts?: string; options?: string[] }[];
  returns?: { type: string; name?: string; produces?: string; description?: string };
}

interface Module {
  id: string;
  name: string;
  manifest_cache: { functions?: ManifestFunction[]; category?: string } | null;
}

interface ProjectFile {
  id: string;
  filename: string;
  file_type: string;
}

function PipelineEditorInner() {
  const { projectId, pipelineId } = useParams<{ projectId: string; pipelineId: string }>();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [pipelineName, setPipelineName] = useState('');
  const [validationTrigger, setValidationTrigger] = useState(0);
  const [showSaveAsTemplate, setShowSaveAsTemplate] = useState(false);
  const [runHistoryRefresh, setRunHistoryRefresh] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, setCenter } = useReactFlow();

  const execution = usePipelineExecution();
  const validation = usePipelineValidation(pipelineId, validationTrigger);

  useEffect(() => {
    api.get('/modules').then((r) => setModules(r.data));
    if (projectId) {
      api.get(`/projects/${projectId}`).then((r) => setFiles(r.data.files || []));
    }
    if (pipelineId) {
      api.get(`/pipelines/${pipelineId}`).then((r) => {
        const graph = r.data.graph || { nodes: [], edges: [] };
        setNodes(graph.nodes || []);
        setEdges(graph.edges || []);
        setPipelineName(r.data.name);
      });
    }
  }, [pipelineId, projectId]);

  // Bump history refresh once execution finishes
  useEffect(() => {
    if (execution.finalStatus) {
      setRunHistoryRefresh((v) => v + 1);
    }
  }, [execution.finalStatus]);

  const moduleById = useMemo(() => {
    const map: Record<string, Module> = {};
    for (const m of modules) map[m.id] = m;
    return map;
  }, [modules]);

  const errorsByNode = useMemo(() => {
    const map: Record<string, true> = {};
    for (const e of validation.errors) {
      if (e.node_id) map[e.node_id] = true;
      for (const id of e.node_ids || []) map[id] = true;
    }
    return map;
  }, [validation]);

  const enrichedNodes = useMemo(() => {
    return nodes.map((n) => {
      if (n.type !== 'moduleNode') return n;
      const data = n.data as any;
      const mod = moduleById[data.module_id];
      const fn = mod?.manifest_cache?.functions?.find((f) => f.name === data.function) || null;
      return {
        ...n,
        data: {
          ...data,
          manifest_function: fn,
          status: execution.nodeStatuses[n.id] || 'pending',
          has_validation_error: !!errorsByNode[n.id],
        },
      };
    });
  }, [nodes, moduleById, execution.nodeStatuses, errorsByNode]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) => addEdge(connection, eds));
      setValidationTrigger((v) => v + 1);
    },
    [setEdges]
  );

  const handleAddNode = (moduleId: string, moduleName: string) => {
    const newNode: Node = {
      id: `node_${Date.now()}`,
      type: 'moduleNode',
      position: { x: 250 + nodes.length * 250, y: 200 },
      data: {
        label: moduleName,
        module_id: moduleId,
        module_name: moduleName,
        function: '',
        params: {},
      },
    };
    setNodes((nds) => [...nds, newNode]);
    setValidationTrigger((v) => v + 1);
  };

  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    if (node.type === 'moduleNode') {
      setSelectedNode(node.id);
    } else {
      setSelectedNode(null);
    }
  };

  const handleNodeUpdate = (data: Record<string, any>) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === selectedNode ? { ...n, data: { ...n.data, ...data } } : n))
    );
    setValidationTrigger((v) => v + 1);
  };

  const handleSave = async () => {
    await api.patch(`/pipelines/${pipelineId}`, { graph: { nodes, edges } });
    setValidationTrigger((v) => v + 1);
  };

  const handleExecute = async () => {
    await handleSave();
    if (pipelineId) execution.start(pipelineId);
  };

  const handleAutoLayout = () => {
    setNodes(autoLayout(nodes, edges));
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/venom-file');
    if (!raw) return;
    let payload: { file_id: string; filename: string };
    try {
      payload = JSON.parse(raw);
    } catch {
      return;
    }
    const nodeId = `file_${payload.file_id}`;
    if (nodes.some((n) => n.id === nodeId)) {
      const existing = nodes.find((n) => n.id === nodeId)!;
      setCenter(existing.position.x, existing.position.y, { zoom: 1, duration: 250 });
      return;
    }
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
    const newNode: Node = {
      id: nodeId,
      type: 'projectFileNode',
      position,
      data: { file_id: payload.file_id, filename: payload.filename },
    };
    setNodes((nds) => [...nds, newNode]);
    setValidationTrigger((v) => v + 1);
  };

  const handleFocusNode = (id: string) => {
    const n = nodes.find((nd) => nd.id === id);
    if (n) {
      setCenter(n.position.x + 110, n.position.y + 60, { zoom: 1.1, duration: 350 });
      if (n.type === 'moduleNode') setSelectedNode(id);
    }
  };

  const selected = nodes.find((n) => n.id === selectedNode);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: t.bg }}>
      <div style={{
        padding: `${space.sm} ${space.lg}`,
        borderBottom: `1px solid ${t.border}`,
        background: t.surface,
        display: 'flex', alignItems: 'center', gap: space.md,
      }}>
        <span style={{ color: t.textDim, fontSize: font.xs, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Pipeline
        </span>
        <span style={{ color: t.text, fontWeight: 600 }}>{pipelineName}</span>
        {execution.lastError && (
          <span style={{ color: t.danger, fontSize: font.xs }}>
            {execution.lastError}
          </span>
        )}
      </div>
      <ValidationPanel errors={validation.errors} onFocusNode={handleFocusNode} />
      <PipelineToolbar
        modules={modules}
        onAddNode={handleAddNode}
        onSave={handleSave}
        onExecute={handleExecute}
        onSaveAsTemplate={() => setShowSaveAsTemplate(true)}
        onAutoLayout={handleAutoLayout}
        executing={execution.running}
        canExecute={validation.valid && nodes.some((n) => n.type === 'moduleNode')}
        validationCount={validation.errors.length}
      />
      <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
        <FilePalette files={files} />
        <div ref={wrapperRef} style={{ flex: 1, position: 'relative' }} onDragOver={handleDragOver} onDrop={handleDrop}>
          <ReactFlow
            nodes={enrichedNodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
            fitView
            style={{ background: t.bg }}
          >
            <Background variant={BackgroundVariant.Dots} gap={22} size={1} color={t.border} />
            <Controls />
            <MiniMap
              nodeColor={(n) => {
                if (n.type === 'projectFileNode') return t.shellcode;
                if (n.type === 'moduleNode') {
                  const d = n.data as any;
                  if (d?.has_validation_error) return t.danger;
                  if (d?.status === 'completed') return t.success;
                  if (d?.status === 'running') return t.warning;
                  return t.textFaint;
                }
                if (n.type === 'placeholderNode') return t.placeholder;
                return t.textFaint;
              }}
              maskColor="rgba(0,0,0,0.45)"
            />
          </ReactFlow>
        </div>
        {selected && selected.type === 'moduleNode' && projectId && (
          <NodeConfigPanel
            nodeData={selected.data as Record<string, any>}
            projectId={projectId}
            onUpdate={handleNodeUpdate}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
      {pipelineId && (
        <RunHistoryDrawer pipelineId={pipelineId} refreshKey={runHistoryRefresh} />
      )}
      {showSaveAsTemplate && pipelineId && (
        <SaveAsTemplateDialog
          pipelineId={pipelineId}
          onClose={() => setShowSaveAsTemplate(false)}
          onSaved={() => setShowSaveAsTemplate(false)}
        />
      )}
    </div>
  );
}

export default function PipelineEditorPage() {
  return (
    <ReactFlowProvider>
      <PipelineEditorInner />
    </ReactFlowProvider>
  );
}
