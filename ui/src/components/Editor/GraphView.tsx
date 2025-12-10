import { useMemo, useEffect } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  MarkerType,
  Position,
  Handle,
} from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Box, Text, Badge, Group, Paper, Alert, Stack, useComputedColorScheme } from '@mantine/core';
import { IconAlertCircle, IconTextSize, IconList } from '@tabler/icons-react';
import type { QuestionnaireDefinition, QuestionDefinition } from '../../types/questionnaire';

interface GraphViewProps {
  questionnaire: QuestionnaireDefinition | null;
}

// Custom node component for questions - horizontal flowchart style
function QuestionNode({ data }: { data: { question: QuestionDefinition; colorScheme: string } }) {
  const { question, colorScheme } = data;
  const isDark = colorScheme === 'dark';

  const borderColor = question.visibleIf
    ? '#f59f00'
    : question.type === 'text'
      ? '#228be6'
      : '#40c057';

  return (
    <Paper
      p="xs"
      withBorder
      style={{
        width: 200,
        backgroundColor: isDark ? 'var(--mantine-color-dark-6)' : 'white',
        borderLeft: `4px solid ${borderColor}`,
        borderRadius: '4px',
      }}
    >
      <Handle
        type="target"
        position={Position.Left}
        style={{
          background: '#228be6',
          width: 8,
          height: 8,
        }}
      />
      <Stack gap={4}>
        <Group gap={4} wrap="nowrap">
          <Badge
            size="xs"
            variant="light"
            color={question.type === 'text' ? 'blue' : 'green'}
            leftSection={question.type === 'text' ? <IconTextSize size={10} /> : <IconList size={10} />}
            style={{ flexShrink: 0 }}
          >
            {question.type}
          </Badge>
          {question.required && (
            <Badge size="xs" color="red" variant="filled" style={{ flexShrink: 0 }}>
              *
            </Badge>
          )}
          {question.hidden && (
            <Badge size="xs" color="gray" variant="light" style={{ flexShrink: 0 }}>
              hidden
            </Badge>
          )}
        </Group>
        <Text size="xs" fw={600} lineClamp={2} style={{ lineHeight: 1.3 }}>
          {question.label}
        </Text>
        <Text size="10px" c="dimmed" ff="monospace" truncate>
          {question.id}
        </Text>
      </Stack>
      <Handle
        type="source"
        position={Position.Right}
        style={{
          background: '#228be6',
          width: 8,
          height: 8,
        }}
      />
    </Paper>
  );
}

const nodeTypes = {
  question: QuestionNode,
};

// Inner component that uses useReactFlow
function GraphFlowInner({ questionnaire }: { questionnaire: QuestionnaireDefinition }) {
  const colorScheme = useComputedColorScheme('light');
  const { fitView } = useReactFlow();

  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const questions = questionnaire.questions;
    const questionMap = new Map(questions.map((q) => [q.id, q]));

    // Create nodes in sequential order (left to right flow)
    const nodes: Node[] = [];
    const nodeWidth = 220;
    const horizontalGap = 60;

    questions.forEach((question, index) => {
      nodes.push({
        id: question.id,
        type: 'question',
        position: {
          x: index * (nodeWidth + horizontalGap),
          y: 0,
        },
        data: { question, colorScheme },
      });
    });

    // Create edges for dependencies
    const edges: Edge[] = [];
    let edgeId = 0;

    // Add sequential flow edges (question order)
    // Also track which questions have visibleIf to add skip edges
    for (let i = 0; i < questions.length - 1; i++) {
      const currentQ = questions[i];
      const nextQ = questions[i + 1];

      // If next question has visibleIf, we need to show both paths:
      // 1. Normal path (condition met) - will be added by conditional edges
      // 2. Skip path (condition not met) - goes to the question after
      if (nextQ.visibleIf) {
        // Find the next question that doesn't have visibleIf depending on currentQ
        // or just the question after the conditional one
        let skipToIndex = i + 2;
        // Skip over consecutive conditional questions
        while (skipToIndex < questions.length && questions[skipToIndex].visibleIf) {
          skipToIndex++;
        }

        if (skipToIndex < questions.length) {
          // Add skip edge (dashed gray line)
          edges.push({
            id: `skip-${edgeId++}`,
            source: currentQ.id,
            target: questions[skipToIndex].id,
            type: 'smoothstep',
            animated: false,
            style: {
              stroke: colorScheme === 'dark' ? '#666' : '#aaa',
              strokeWidth: 1.5,
              strokeDasharray: '4,4',
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: colorScheme === 'dark' ? '#666' : '#aaa',
              width: 12,
              height: 12,
            },
            label: 'else',
            labelStyle: {
              fontSize: 9,
              fill: colorScheme === 'dark' ? '#888' : '#999',
              fontStyle: 'italic',
            },
            labelBgStyle: {
              fill: colorScheme === 'dark' ? '#1a1a1a' : '#fff',
              fillOpacity: 0.9,
            },
            labelBgPadding: [4, 2] as [number, number],
            labelBgBorderRadius: 2,
          });
        }
      }

      // Add normal sequential edge
      edges.push({
        id: `seq-${edgeId++}`,
        source: currentQ.id,
        target: nextQ.id,
        type: 'smoothstep',
        animated: false,
        style: {
          stroke: colorScheme === 'dark' ? '#555' : '#ccc',
          strokeWidth: 1.5,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: colorScheme === 'dark' ? '#555' : '#ccc',
          width: 12,
          height: 12,
        },
      });
    }

    // Add conditional dependency edges
    questions.forEach((q) => {
      if (q.visibleIf) {
        const allConditions = q.visibleIf.all || [];
        const anyConditions = q.visibleIf.any || [];

        // ALL conditions (AND) - solid blue lines
        allConditions.forEach((condition) => {
          if (questionMap.has(condition.questionId)) {
            const labelText = condition.value !== undefined
              ? `${condition.operator}: ${JSON.stringify(condition.value).slice(0, 15)}`
              : condition.operator;
            edges.push({
              id: `edge-${edgeId++}`,
              source: condition.questionId,
              target: q.id,
              type: 'smoothstep',
              animated: false,
              style: { stroke: '#228be6', strokeWidth: 2 },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: '#228be6',
                width: 15,
                height: 15,
              },
              label: labelText,
              labelStyle: {
                fontSize: 9,
                fill: colorScheme === 'dark' ? '#aaa' : '#666',
                fontWeight: 500,
              },
              labelBgStyle: {
                fill: colorScheme === 'dark' ? '#1a1a1a' : '#fff',
                fillOpacity: 0.9,
              },
              labelBgPadding: [4, 2] as [number, number],
              labelBgBorderRadius: 2,
            });
          }
        });

        // ANY conditions (OR) - dashed orange lines
        anyConditions.forEach((condition) => {
          if (questionMap.has(condition.questionId)) {
            const labelText = condition.value !== undefined
              ? `${condition.operator}: ${JSON.stringify(condition.value).slice(0, 15)}`
              : condition.operator;
            edges.push({
              id: `edge-${edgeId++}`,
              source: condition.questionId,
              target: q.id,
              type: 'smoothstep',
              animated: false,
              style: { stroke: '#f59f00', strokeWidth: 2, strokeDasharray: '5,5' },
              markerEnd: {
                type: MarkerType.ArrowClosed,
                color: '#f59f00',
                width: 15,
                height: 15,
              },
              label: labelText,
              labelStyle: {
                fontSize: 9,
                fill: colorScheme === 'dark' ? '#aaa' : '#666',
                fontWeight: 500,
              },
              labelBgStyle: {
                fill: colorScheme === 'dark' ? '#1a1a1a' : '#fff',
                fillOpacity: 0.9,
              },
              labelBgPadding: [4, 2] as [number, number],
              labelBgBorderRadius: 2,
            });
          }
        });
      }
    });

    return { nodes, edges };
  }, [questionnaire, colorScheme]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes/edges and fit view when questionnaire changes
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    // Fit view after a short delay to allow nodes to render
    const timer = setTimeout(() => {
      fitView({ padding: 0.3, duration: 200 });
    }, 50);
    return () => clearTimeout(timer);
  }, [initialNodes, initialEdges, setNodes, setEdges, fitView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      minZoom={0.1}
      maxZoom={2}
      defaultEdgeOptions={{
        type: 'smoothstep',
      }}
    >
      <Background color={colorScheme === 'dark' ? '#333' : '#ddd'} gap={20} />
      <Controls />
      <MiniMap
        nodeColor={(node) => {
          const q = node.data?.question as QuestionDefinition;
          if (q?.hidden) return '#868e96';
          if (q?.visibleIf) return '#f59f00';
          return q?.type === 'text' ? '#228be6' : '#40c057';
        }}
        maskColor={colorScheme === 'dark' ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)'}
        style={{ borderRadius: 4 }}
      />
    </ReactFlow>
  );
}

export function GraphView({ questionnaire }: GraphViewProps) {
  const colorScheme = useComputedColorScheme('light');

  if (!questionnaire) {
    return (
      <Box p="md">
        <Alert color="yellow" icon={<IconAlertCircle size={16} />}>
          Load or create a questionnaire to view the dependency graph
        </Alert>
      </Box>
    );
  }

  if (questionnaire.questions.length === 0) {
    return (
      <Box p="md">
        <Alert color="blue" icon={<IconAlertCircle size={16} />}>
          Add questions to see the dependency graph
        </Alert>
      </Box>
    );
  }

  return (
    <Box h="100%" style={{ position: 'relative' }}>
      <ReactFlowProvider>
        <GraphFlowInner questionnaire={questionnaire} />
      </ReactFlowProvider>

      {/* Legend */}
      <Paper
        p="xs"
        withBorder
        style={{
          position: 'absolute',
          bottom: 10,
          left: 60,
          zIndex: 10,
          backgroundColor: colorScheme === 'dark' ? 'var(--mantine-color-dark-7)' : 'white',
        }}
      >
        <Stack gap={4}>
          <Text size="xs" fw={600}>Edges</Text>
          <Group gap="xs">
            <Box style={{ width: 24, height: 2, backgroundColor: colorScheme === 'dark' ? '#555' : '#ccc', borderRadius: 1 }} />
            <Text size="xs">Flow</Text>
          </Group>
          <Group gap="xs">
            <Box
              style={{
                width: 24,
                height: 2,
                background: `repeating-linear-gradient(90deg, ${colorScheme === 'dark' ? '#666' : '#aaa'}, ${colorScheme === 'dark' ? '#666' : '#aaa'} 3px, transparent 3px, transparent 6px)`,
              }}
            />
            <Text size="xs">Skip (else)</Text>
          </Group>
          <Group gap="xs">
            <Box style={{ width: 24, height: 3, backgroundColor: '#228be6', borderRadius: 1 }} />
            <Text size="xs">ALL (AND)</Text>
          </Group>
          <Group gap="xs">
            <Box
              style={{
                width: 24,
                height: 3,
                background: 'repeating-linear-gradient(90deg, #f59f00, #f59f00 4px, transparent 4px, transparent 7px)',
              }}
            />
            <Text size="xs">ANY (OR)</Text>
          </Group>
          <Text size="xs" fw={600} mt={4}>Nodes</Text>
          <Group gap="xs">
            <Box style={{ width: 10, height: 10, backgroundColor: '#228be6', borderRadius: 2 }} />
            <Text size="xs">Text</Text>
            <Box style={{ width: 10, height: 10, backgroundColor: '#40c057', borderRadius: 2 }} />
            <Text size="xs">Choice</Text>
            <Box style={{ width: 10, height: 10, backgroundColor: '#f59f00', borderRadius: 2 }} />
            <Text size="xs">Conditional</Text>
          </Group>
        </Stack>
      </Paper>
    </Box>
  );
}
