import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Background,
  Controls,
  BackgroundVariant,
  Node,
  Edge,
  NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import api from '../api/client';
import ModuleNode from './nodes/ModuleNode';
import NodeConfigPanel from './NodeConfigPanel';
import PipelineToolbar from './PipelineToolbar';

const nodeTypes: NodeTypes = { moduleNode: ModuleNode };

interface Module {
  id: string;
  name: string;
}

export default function PipelineEditorPage() {
  const { projectId, pipelineId } = useParams<{ projectId: string; pipelineId: string }>();
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [pipelineName, setPipelineName] = useState('');

  useEffect(() => {
    api.get('/modules').then((r) => setModules(r.data));
    api.get(`/pipelines/${pipelineId}`).then((r) => {
      const graph = r.data.graph || { nodes: [], edges: [] };
      setNodes(graph.nodes || []);
      setEdges(graph.edges || []);
      setPipelineName(r.data.name);
    });
  }, [pipelineId]);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges]
  );

  const handleAddNode = (moduleId: string, moduleName: string) => {
    const newNode: Node = {
      id: `node_${Date.now()}`,
      type: 'moduleNode',
      position: { x: 100 + nodes.length * 250, y: 150 },
      data: {
        label: moduleName,
        module_id: moduleId,
        module_name: moduleName,
        function: '',
        params: {},
        status: 'pending',
      },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  const handleNodeClick = (_: React.MouseEvent, node: Node) => {
    setSelectedNode(node.id);
  };

  const handleNodeUpdate = (data: Record<string, any>) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === selectedNode ? { ...n, data: { ...n.data, ...data } } : n))
    );
  };

  const handleSave = async () => {
    await api.patch(`/pipelines/${pipelineId}`, {
      graph: { nodes, edges },
    });
  };

  const handleExecute = async () => {
    await handleSave();
    setExecuting(true);
    try {
      const res = await api.post(`/pipelines/${pipelineId}/execute`);
      const run = res.data;
      if (run.step_results) {
        setNodes((nds) =>
          nds.map((n) => {
            const stepResult = run.step_results[n.id];
            if (stepResult) {
              return { ...n, data: { ...n.data, status: stepResult.status } };
            }
            return n;
          })
        );
      }
    } catch (err) {
      console.error('Pipeline execution failed', err);
    } finally {
      setExecuting(false);
    }
  };

  const selected = nodes.find((n) => n.id === selectedNode);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '0.5rem 1rem', borderBottom: '1px solid #333' }}>
        <span style={{ color: '#888', fontSize: '0.85rem' }}>Pipeline: </span>
        <span style={{ color: '#e0e0e0' }}>{pipelineName}</span>
      </div>
      <PipelineToolbar
        modules={modules}
        onAddNode={handleAddNode}
        onSave={handleSave}
        onExecute={handleExecute}
        executing={executing}
      />
      <div style={{ flex: 1, display: 'flex' }}>
        <div style={{ flex: 1 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
            fitView
            style={{ background: '#0f0f0f' }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="#222" />
            <Controls />
          </ReactFlow>
        </div>
        {selected && projectId && (
          <NodeConfigPanel
            nodeData={selected.data as Record<string, any>}
            projectId={projectId}
            onUpdate={handleNodeUpdate}
            onClose={() => setSelectedNode(null)}
          />
        )}
      </div>
    </div>
  );
}
