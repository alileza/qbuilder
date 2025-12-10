import {
  Box,
  Stack,
  Paper,
  Title,
  Text,
  TextInput,
  Textarea,
  Select,
  Switch,
  NumberInput,
  Button,
  Group,
  ActionIcon,
  Badge,
  Divider,
  Alert,
  Menu,
  Modal,
  Code,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconPlus,
  IconTrash,
  IconGripVertical,
  IconAlertCircle,
  IconEyeOff,
  IconCopy,
} from '@tabler/icons-react';
import type {
  QuestionnaireDefinition,
  QuestionDefinition,
  ChoiceOption,
  Condition,
  ConditionOperator,
} from '../../types/questionnaire';

interface BuilderEditorProps {
  questionnaire: QuestionnaireDefinition | null;
  onChange: (questionnaire: QuestionnaireDefinition) => void;
  error: string | null;
}

const CONDITION_OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: 'equals', label: 'Equals' },
  { value: 'notEquals', label: 'Not Equals' },
  { value: 'in', label: 'In (array)' },
  { value: 'notIn', label: 'Not In (array)' },
  { value: 'gt', label: 'Greater Than' },
  { value: 'gte', label: 'Greater Than or Equal' },
  { value: 'lt', label: 'Less Than' },
  { value: 'lte', label: 'Less Than or Equal' },
  { value: 'isAnswered', label: 'Is Answered' },
  { value: 'notAnswered', label: 'Not Answered' },
];

function QuestionEditor({
  question,
  onChange,
  onDelete,
  onDuplicate,
  allQuestions,
}: {
  question: QuestionDefinition;
  onChange: (q: QuestionDefinition) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  allQuestions: QuestionDefinition[];
}) {
  const [conditionModalOpen, { open: openConditionModal, close: closeConditionModal }] =
    useDisclosure(false);
  const otherQuestions = allQuestions.filter((q) => q.id !== question.id);

  const updateField = <K extends keyof QuestionDefinition>(
    field: K,
    value: QuestionDefinition[K]
  ) => {
    onChange({ ...question, [field]: value } as QuestionDefinition);
  };

  const addOption = () => {
    if (question.type !== 'choice') return;
    const newOption: ChoiceOption = {
      value: `option_${question.options.length + 1}`,
      label: `Option ${question.options.length + 1}`,
    };
    onChange({ ...question, options: [...question.options, newOption] });
  };

  const updateOption = (index: number, field: keyof ChoiceOption, value: string) => {
    if (question.type !== 'choice') return;
    const newOptions = [...question.options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    onChange({ ...question, options: newOptions });
  };

  const removeOption = (index: number) => {
    if (question.type !== 'choice') return;
    onChange({ ...question, options: question.options.filter((_, i) => i !== index) });
  };

  const addCondition = (type: 'all' | 'any') => {
    const newCondition: Condition = {
      questionId: otherQuestions[0]?.id || '',
      operator: 'equals',
      value: '',
    };
    const currentVisibleIf = question.visibleIf || {};
    const currentConditions = currentVisibleIf[type] || [];
    onChange({
      ...question,
      visibleIf: {
        ...currentVisibleIf,
        [type]: [...currentConditions, newCondition],
      },
    } as QuestionDefinition);
  };

  const updateCondition = (
    type: 'all' | 'any',
    index: number,
    field: keyof Condition,
    value: unknown
  ) => {
    const currentVisibleIf = question.visibleIf || {};
    const currentConditions = [...(currentVisibleIf[type] || [])];
    currentConditions[index] = { ...currentConditions[index], [field]: value };
    onChange({
      ...question,
      visibleIf: {
        ...currentVisibleIf,
        [type]: currentConditions,
      },
    } as QuestionDefinition);
  };

  const removeCondition = (type: 'all' | 'any', index: number) => {
    const currentVisibleIf = question.visibleIf || {};
    const currentConditions = (currentVisibleIf[type] || []).filter((_, i) => i !== index);
    const newVisibleIf = { ...currentVisibleIf, [type]: currentConditions };
    if (newVisibleIf.all?.length === 0) delete newVisibleIf.all;
    if (newVisibleIf.any?.length === 0) delete newVisibleIf.any;
    onChange({
      ...question,
      visibleIf: Object.keys(newVisibleIf).length > 0 ? newVisibleIf : undefined,
    } as QuestionDefinition);
  };

  const hasConditions =
    (question.visibleIf?.all?.length || 0) + (question.visibleIf?.any?.length || 0) > 0;

  return (
    <Paper p="md" withBorder>
      <Group justify="space-between" mb="md">
        <Group gap="xs">
          <ActionIcon variant="subtle" color="gray" style={{ cursor: 'grab' }}>
            <IconGripVertical size={16} />
          </ActionIcon>
          <Badge variant="light" size="sm">
            {question.type}
          </Badge>
          {question.hidden && (
            <Badge variant="light" size="sm" color="gray" leftSection={<IconEyeOff size={12} />}>
              Hidden
            </Badge>
          )}
          {hasConditions && (
            <Badge variant="light" size="sm" color="blue">
              Conditional
            </Badge>
          )}
        </Group>
        <Group gap="xs">
          <ActionIcon variant="subtle" color="gray" onClick={onDuplicate}>
            <IconCopy size={16} />
          </ActionIcon>
          <ActionIcon variant="subtle" color="red" onClick={onDelete}>
            <IconTrash size={16} />
          </ActionIcon>
        </Group>
      </Group>

      <Stack gap="sm">
        <Group grow>
          <TextInput
            label="Question ID"
            value={question.id}
            onChange={(e) => updateField('id', e.currentTarget.value)}
            placeholder="unique_id"
            required
          />
          <Select
            label="Type"
            value={question.type}
            onChange={(value) => {
              if (value === 'text') {
                const { options, multiple, ...rest } = question as any;
                onChange({ ...rest, type: 'text' } as QuestionDefinition);
              } else if (value === 'choice') {
                const { multiline, maxLength, ...rest } = question as any;
                onChange({
                  ...rest,
                  type: 'choice',
                  options: [{ value: 'option_1', label: 'Option 1' }],
                } as QuestionDefinition);
              }
            }}
            data={[
              { value: 'text', label: 'Text' },
              { value: 'choice', label: 'Choice' },
            ]}
          />
        </Group>

        <TextInput
          label="Label"
          value={question.label}
          onChange={(e) => updateField('label', e.currentTarget.value)}
          placeholder="Question text"
          required
        />

        <TextInput
          label="Help Text"
          value={question.helpText || ''}
          onChange={(e) => updateField('helpText', e.currentTarget.value || undefined)}
          placeholder="Optional help text"
        />

        <Group>
          <Switch
            label="Required"
            checked={question.required || false}
            onChange={(e) => updateField('required', e.currentTarget.checked || undefined)}
          />
          <Switch
            label="Hidden"
            checked={question.hidden || false}
            onChange={(e) => updateField('hidden', e.currentTarget.checked || undefined)}
          />
        </Group>

        {question.type === 'text' && (
          <Group>
            <Switch
              label="Multiline"
              checked={question.multiline || false}
              onChange={(e) =>
                onChange({ ...question, multiline: e.currentTarget.checked || undefined })
              }
            />
            <NumberInput
              label="Max Length"
              value={question.maxLength || ''}
              onChange={(value) =>
                onChange({ ...question, maxLength: value ? Number(value) : undefined })
              }
              placeholder="No limit"
              min={1}
              style={{ width: 120 }}
            />
          </Group>
        )}

        {question.type === 'choice' && (
          <>
            <Switch
              label="Allow Multiple Selections"
              checked={question.multiple || false}
              onChange={(e) =>
                onChange({ ...question, multiple: e.currentTarget.checked || undefined })
              }
            />
            <Divider label="Options" labelPosition="left" />
            <Stack gap="xs">
              {question.options.map((option, index) => (
                <Group key={index} gap="xs">
                  <TextInput
                    placeholder="Value"
                    value={option.value}
                    onChange={(e) => updateOption(index, 'value', e.currentTarget.value)}
                    style={{ flex: 1 }}
                  />
                  <TextInput
                    placeholder="Label"
                    value={option.label}
                    onChange={(e) => updateOption(index, 'label', e.currentTarget.value)}
                    style={{ flex: 1 }}
                  />
                  <ActionIcon
                    variant="subtle"
                    color="red"
                    onClick={() => removeOption(index)}
                    disabled={question.options.length <= 1}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              ))}
              <Button variant="light" size="xs" leftSection={<IconPlus size={14} />} onClick={addOption}>
                Add Option
              </Button>
            </Stack>
          </>
        )}

        <Divider />

        <Group justify="space-between">
          <Text size="sm" fw={500}>
            Visibility Conditions
          </Text>
          <Button variant="subtle" size="xs" onClick={openConditionModal}>
            {hasConditions ? 'Edit Conditions' : 'Add Conditions'}
          </Button>
        </Group>

        {hasConditions && (
          <Paper p="xs" bg="var(--mantine-color-default-hover)" radius="sm">
            <Stack gap="xs">
              {question.visibleIf?.all && question.visibleIf.all.length > 0 && (
                <Box>
                  <Text size="xs" c="dimmed">
                    ALL of these must be true:
                  </Text>
                  {question.visibleIf.all.map((c, i) => (
                    <Code key={i} block style={{ fontSize: 11 }}>
                      {c.questionId} {c.operator} {JSON.stringify(c.value)}
                    </Code>
                  ))}
                </Box>
              )}
              {question.visibleIf?.any && question.visibleIf.any.length > 0 && (
                <Box>
                  <Text size="xs" c="dimmed">
                    ANY of these must be true:
                  </Text>
                  {question.visibleIf.any.map((c, i) => (
                    <Code key={i} block style={{ fontSize: 11 }}>
                      {c.questionId} {c.operator} {JSON.stringify(c.value)}
                    </Code>
                  ))}
                </Box>
              )}
            </Stack>
          </Paper>
        )}
      </Stack>

      <Modal opened={conditionModalOpen} onClose={closeConditionModal} title="Visibility Conditions" size="lg">
        <Stack gap="md">
          <Alert color="blue" icon={<IconAlertCircle size={16} />}>
            <Text size="sm">
              Configure when this question should be visible based on answers to other questions.
            </Text>
          </Alert>

          <Box>
            <Group justify="space-between" mb="xs">
              <Text fw={500}>ALL Conditions (AND)</Text>
              <Button
                variant="light"
                size="xs"
                leftSection={<IconPlus size={14} />}
                onClick={() => addCondition('all')}
                disabled={otherQuestions.length === 0}
              >
                Add
              </Button>
            </Group>
            <Text size="xs" c="dimmed" mb="sm">
              All of these conditions must be true for the question to show
            </Text>
            <Stack gap="xs">
              {(question.visibleIf?.all || []).map((condition, index) => (
                <Group key={index} gap="xs">
                  <Select
                    placeholder="Question"
                    value={condition.questionId}
                    onChange={(v) => updateCondition('all', index, 'questionId', v || '')}
                    data={otherQuestions.map((q) => ({ value: q.id, label: q.label }))}
                    style={{ flex: 1 }}
                  />
                  <Select
                    placeholder="Operator"
                    value={condition.operator}
                    onChange={(v) => updateCondition('all', index, 'operator', v || 'equals')}
                    data={CONDITION_OPERATORS}
                    style={{ width: 160 }}
                  />
                  {!['isAnswered', 'notAnswered'].includes(condition.operator) && (
                    <TextInput
                      placeholder="Value"
                      value={String(condition.value || '')}
                      onChange={(e) => updateCondition('all', index, 'value', e.currentTarget.value)}
                      style={{ flex: 1 }}
                    />
                  )}
                  <ActionIcon variant="subtle" color="red" onClick={() => removeCondition('all', index)}>
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              ))}
            </Stack>
          </Box>

          <Divider />

          <Box>
            <Group justify="space-between" mb="xs">
              <Text fw={500}>ANY Conditions (OR)</Text>
              <Button
                variant="light"
                size="xs"
                leftSection={<IconPlus size={14} />}
                onClick={() => addCondition('any')}
                disabled={otherQuestions.length === 0}
              >
                Add
              </Button>
            </Group>
            <Text size="xs" c="dimmed" mb="sm">
              At least one of these conditions must be true for the question to show
            </Text>
            <Stack gap="xs">
              {(question.visibleIf?.any || []).map((condition, index) => (
                <Group key={index} gap="xs">
                  <Select
                    placeholder="Question"
                    value={condition.questionId}
                    onChange={(v) => updateCondition('any', index, 'questionId', v || '')}
                    data={otherQuestions.map((q) => ({ value: q.id, label: q.label }))}
                    style={{ flex: 1 }}
                  />
                  <Select
                    placeholder="Operator"
                    value={condition.operator}
                    onChange={(v) => updateCondition('any', index, 'operator', v || 'equals')}
                    data={CONDITION_OPERATORS}
                    style={{ width: 160 }}
                  />
                  {!['isAnswered', 'notAnswered'].includes(condition.operator) && (
                    <TextInput
                      placeholder="Value"
                      value={String(condition.value || '')}
                      onChange={(e) => updateCondition('any', index, 'value', e.currentTarget.value)}
                      style={{ flex: 1 }}
                    />
                  )}
                  <ActionIcon variant="subtle" color="red" onClick={() => removeCondition('any', index)}>
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              ))}
            </Stack>
          </Box>

          <Group justify="flex-end">
            <Button onClick={closeConditionModal}>Done</Button>
          </Group>
        </Stack>
      </Modal>
    </Paper>
  );
}

export function BuilderEditor({ questionnaire, onChange, error }: BuilderEditorProps) {
  if (!questionnaire) {
    return (
      <Box p="md">
        <Alert color="yellow" icon={<IconAlertCircle size={16} />}>
          Load or create a questionnaire to use the visual builder
        </Alert>
      </Box>
    );
  }

  const addQuestion = (type: 'text' | 'choice') => {
    const id = `question_${questionnaire.questions.length + 1}`;
    const newQuestion: QuestionDefinition =
      type === 'text'
        ? { id, type: 'text', label: 'New Text Question', required: false }
        : {
            id,
            type: 'choice',
            label: 'New Choice Question',
            required: false,
            options: [{ value: 'option_1', label: 'Option 1' }],
          };
    onChange({ ...questionnaire, questions: [...questionnaire.questions, newQuestion] });
  };

  const updateQuestion = (index: number, updated: QuestionDefinition) => {
    const newQuestions = [...questionnaire.questions];
    newQuestions[index] = updated;
    onChange({ ...questionnaire, questions: newQuestions });
  };

  const deleteQuestion = (index: number) => {
    onChange({
      ...questionnaire,
      questions: questionnaire.questions.filter((_, i) => i !== index),
    });
  };

  const duplicateQuestion = (index: number) => {
    const question = questionnaire.questions[index];
    const newQuestion = {
      ...question,
      id: `${question.id}_copy`,
    };
    const newQuestions = [...questionnaire.questions];
    newQuestions.splice(index + 1, 0, newQuestion as QuestionDefinition);
    onChange({ ...questionnaire, questions: newQuestions });
  };

  return (
    <Box h="100%" style={{ overflow: 'auto' }} p="md">
      <Stack gap="md">
        {error && (
          <Alert color="red" icon={<IconAlertCircle size={16} />}>
            {error}
          </Alert>
        )}

        <Paper p="md" withBorder>
          <Title order={5} mb="md">
            Questionnaire Settings
          </Title>
          <Stack gap="sm">
            <TextInput
              label="ID"
              value={questionnaire.id}
              onChange={(e) => onChange({ ...questionnaire, id: e.currentTarget.value })}
              required
            />
            <TextInput
              label="Title"
              value={questionnaire.title}
              onChange={(e) => onChange({ ...questionnaire, title: e.currentTarget.value })}
              required
            />
            <Textarea
              label="Description"
              value={questionnaire.description || ''}
              onChange={(e) =>
                onChange({ ...questionnaire, description: e.currentTarget.value || undefined })
              }
              placeholder="Optional description"
            />
          </Stack>
        </Paper>

        <Divider label="Questions" labelPosition="left" />

        {questionnaire.questions.map((question, index) => (
          <QuestionEditor
            key={`${question.id}-${index}`}
            question={question}
            onChange={(q) => updateQuestion(index, q)}
            onDelete={() => deleteQuestion(index)}
            onDuplicate={() => duplicateQuestion(index)}
            allQuestions={questionnaire.questions}
          />
        ))}

        <Menu shadow="md" width={200}>
          <Menu.Target>
            <Button variant="light" leftSection={<IconPlus size={16} />} fullWidth>
              Add Question
            </Button>
          </Menu.Target>
          <Menu.Dropdown>
            <Menu.Item onClick={() => addQuestion('text')}>Text Question</Menu.Item>
            <Menu.Item onClick={() => addQuestion('choice')}>Choice Question</Menu.Item>
          </Menu.Dropdown>
        </Menu>
      </Stack>
    </Box>
  );
}
