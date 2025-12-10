import { useState, useCallback, useRef } from 'react';
import {
  MantineProvider,
  AppShell,
  Group,
  Button,
  Tabs,
  Box,
  Text,
  Menu,
  ActionIcon,
  Modal,
  Stack,
  Code,
  CopyButton,
  Tooltip,
  Badge,
  createTheme,
  useMantineColorScheme,
  useComputedColorScheme,
} from '@mantine/core';
import { Notifications, notifications } from '@mantine/notifications';
import {
  IconUpload,
  IconDownload,
  IconBook2,
  IconCode,
  IconLayoutGrid,
  IconRefresh,
  IconCopy,
  IconCheck,
  IconSun,
  IconMoon,
  IconGitBranch,
} from '@tabler/icons-react';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';

import { JsonEditor } from './components/Editor/JsonEditor';
import { BuilderEditor } from './components/Editor/BuilderEditor';
import { GraphView } from './components/Editor/GraphView';
import { FormPreview } from './components/Preview/FormPreview';
import type { QuestionnaireDefinition, AnswerPayload } from './types/questionnaire';
import { EXAMPLE_QUESTIONNAIRES } from './types/questionnaire';
import { validateAnswers } from './utils/visibility';

const theme = createTheme({
  primaryColor: 'green',
  defaultRadius: 'sm',
});

function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light');

  return (
    <Tooltip label={computedColorScheme === 'dark' ? 'Light mode' : 'Dark mode'}>
      <ActionIcon
        variant="subtle"
        onClick={() => setColorScheme(computedColorScheme === 'dark' ? 'light' : 'dark')}
      >
        {computedColorScheme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
      </ActionIcon>
    </Tooltip>
  );
}

function AppContent() {
  const computedColorScheme = useComputedColorScheme('light');
  const [jsonText, setJsonText] = useState('');
  const [questionnaire, setQuestionnaire] = useState<QuestionnaireDefinition | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<AnswerPayload>({});
  const [activeTab, setActiveTab] = useState<string | null>('code');
  const [showValidation, setShowValidation] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{ questionId: string; message: string }[]>(
    []
  );
  const [submissionModalOpen, setSubmissionModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Parse JSON and update questionnaire
  const parseJson = useCallback((text: string) => {
    if (!text.trim()) {
      setQuestionnaire(null);
      setParseError(null);
      return;
    }

    try {
      const parsed = JSON.parse(text);
      // Basic validation
      if (!parsed.id || !parsed.title || !Array.isArray(parsed.questions)) {
        setParseError('Invalid questionnaire: must have id, title, and questions array');
        return;
      }
      setQuestionnaire(parsed as QuestionnaireDefinition);
      setParseError(null);
      setAnswers({});
      setShowValidation(false);
    } catch (e) {
      setParseError(`JSON parse error: ${(e as Error).message}`);
    }
  }, []);

  // Handle JSON text change
  const handleJsonChange = useCallback(
    (text: string) => {
      setJsonText(text);
      parseJson(text);
    },
    [parseJson]
  );

  // Handle builder changes
  const handleBuilderChange = useCallback((updated: QuestionnaireDefinition) => {
    setQuestionnaire(updated);
    setJsonText(JSON.stringify(updated, null, 2));
    setParseError(null);
  }, []);

  // Format JSON
  const handleFormat = useCallback(() => {
    try {
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      notifications.show({
        title: 'Formatted',
        message: 'JSON has been formatted',
        color: 'green',
      });
    } catch {
      notifications.show({
        title: 'Error',
        message: 'Cannot format invalid JSON',
        color: 'red',
      });
    }
  }, [jsonText]);

  // Load example
  const loadExample = useCallback(
    (key: string) => {
      const example = EXAMPLE_QUESTIONNAIRES[key];
      if (example) {
        const text = JSON.stringify(example, null, 2);
        setJsonText(text);
        setQuestionnaire(example);
        setParseError(null);
        setAnswers({});
        setShowValidation(false);
        notifications.show({
          title: 'Example Loaded',
          message: `Loaded "${example.title}"`,
          color: 'green',
        });
      }
    },
    []
  );

  // Import file
  const handleImport = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        handleJsonChange(text);
        notifications.show({
          title: 'Imported',
          message: `Loaded ${file.name}`,
          color: 'green',
        });
      };
      reader.onerror = () => {
        notifications.show({
          title: 'Error',
          message: 'Failed to read file',
          color: 'red',
        });
      };
      reader.readAsText(file);
      e.target.value = '';
    },
    [handleJsonChange]
  );

  // Export file
  const handleExport = useCallback(() => {
    if (!questionnaire) {
      notifications.show({
        title: 'Error',
        message: 'No questionnaire to export',
        color: 'red',
      });
      return;
    }

    const blob = new Blob([JSON.stringify(questionnaire, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${questionnaire.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    notifications.show({
      title: 'Exported',
      message: `Downloaded ${questionnaire.id}.json`,
      color: 'green',
    });
  }, [questionnaire]);

  // Handle answer change
  const handleAnswerChange = useCallback((questionId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setShowValidation(false);
  }, []);

  // Reset form
  const handleReset = useCallback(() => {
    setAnswers({});
    setShowValidation(false);
    setValidationErrors([]);
  }, []);

  // Submit form
  const handleSubmit = useCallback(() => {
    if (!questionnaire) return;

    const errors = validateAnswers(questionnaire.questions, answers);
    setValidationErrors(errors);
    setShowValidation(true);

    if (errors.length === 0) {
      setSubmissionModalOpen(true);
    } else {
      notifications.show({
        title: 'Validation Failed',
        message: `Please fix ${errors.length} error(s)`,
        color: 'red',
      });
    }
  }, [questionnaire, answers]);

  const isJsonEmpty = !jsonText.trim();

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept=".json"
        style={{ display: 'none' }}
      />

      <AppShell header={{ height: 50 }} padding={0}>
        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between">
            <Group gap="sm">
              <Text fw={600} size="sm">
                Questionnaire JSON
              </Text>
              {questionnaire ? (
                <Badge size="sm" color="green" variant="light">
                  Valid
                </Badge>
              ) : isJsonEmpty ? (
                <Badge size="sm" color="gray" variant="light">
                  Empty
                </Badge>
              ) : (
                <Badge size="sm" color="red" variant="light">
                  Invalid
                </Badge>
              )}
            </Group>

            <Group gap="xs">
              <Button
                variant="default"
                size="xs"
                leftSection={<IconUpload size={14} />}
                onClick={handleImport}
              >
                Import
              </Button>

              <Menu shadow="md" width={200}>
                <Menu.Target>
                  <Button variant="default" size="xs" leftSection={<IconBook2 size={14} />}>
                    Examples
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  {Object.entries(EXAMPLE_QUESTIONNAIRES).map(([key, example]) => (
                    <Menu.Item key={key} onClick={() => loadExample(key)}>
                      {example.title}
                    </Menu.Item>
                  ))}
                </Menu.Dropdown>
              </Menu>

              <Button
                variant="default"
                size="xs"
                leftSection={<IconCode size={14} />}
                onClick={handleFormat}
                disabled={!jsonText.trim()}
              >
                Format
              </Button>

              <CopyButton value={jsonText}>
                {({ copied, copy }) => (
                  <Button
                    variant="default"
                    size="xs"
                    leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                    onClick={copy}
                    disabled={!jsonText.trim()}
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                )}
              </CopyButton>

              <Button
                variant="filled"
                size="xs"
                leftSection={<IconDownload size={14} />}
                onClick={handleExport}
                disabled={!questionnaire}
              >
                Export
              </Button>
            </Group>

            <Group gap="sm">
              <Text size="sm" c="dimmed">
                Form Preview
              </Text>
              <Tooltip label="Reset form">
                <ActionIcon variant="subtle" onClick={handleReset}>
                  <IconRefresh size={16} />
                </ActionIcon>
              </Tooltip>
              <ColorSchemeToggle />
            </Group>
          </Group>
        </AppShell.Header>

        <AppShell.Main>
          <Box style={{ display: 'flex', height: 'calc(100vh - 50px)' }}>
            {/* Left Panel - Editor */}
            <Box
              style={{
                width: '50%',
                borderRight: '1px solid var(--mantine-color-default-border)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Tabs value={activeTab} onChange={setActiveTab} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Tabs.List>
                  <Tabs.Tab value="code" leftSection={<IconCode size={14} />}>
                    Code
                  </Tabs.Tab>
                  <Tabs.Tab value="builder" leftSection={<IconLayoutGrid size={14} />}>
                    Builder
                  </Tabs.Tab>
                  <Tabs.Tab value="graph" leftSection={<IconGitBranch size={14} />}>
                    Graph
                  </Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="code" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <JsonEditor value={jsonText} onChange={handleJsonChange} error={parseError} />
                </Tabs.Panel>

                <Tabs.Panel value="builder" style={{ flex: 1, overflow: 'hidden' }}>
                  <BuilderEditor
                    questionnaire={questionnaire}
                    onChange={handleBuilderChange}
                    error={parseError}
                  />
                </Tabs.Panel>

                <Tabs.Panel value="graph" style={{ flex: 1, overflow: 'hidden' }}>
                  <GraphView questionnaire={questionnaire} />
                </Tabs.Panel>
              </Tabs>
            </Box>

            {/* Right Panel - Preview */}
            <Box
              style={{
                width: '50%',
                backgroundColor: computedColorScheme === 'dark'
                  ? 'var(--mantine-color-dark-6)'
                  : 'var(--mantine-color-gray-0)',
                overflow: 'hidden',
              }}
            >
              <FormPreview
                questionnaire={questionnaire}
                answers={answers}
                onAnswerChange={handleAnswerChange}
                onReset={handleReset}
                onSubmit={handleSubmit}
                validationErrors={validationErrors}
                showValidation={showValidation}
              />
            </Box>
          </Box>
        </AppShell.Main>
      </AppShell>

      {/* Submission Success Modal */}
      <Modal
        opened={submissionModalOpen}
        onClose={() => setSubmissionModalOpen(false)}
        title="Submission Preview"
        size="lg"
      >
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            This is what would be submitted to the API:
          </Text>
          <Code block style={{ maxHeight: 400, overflow: 'auto' }}>
            {JSON.stringify(
              {
                questionnaireId: questionnaire?.id,
                answers,
              },
              null,
              2
            )}
          </Code>
          <Group justify="flex-end">
            <CopyButton
              value={JSON.stringify({ questionnaireId: questionnaire?.id, answers }, null, 2)}
            >
              {({ copied, copy }) => (
                <Button
                  variant="light"
                  leftSection={copied ? <IconCheck size={14} /> : <IconCopy size={14} />}
                  onClick={copy}
                >
                  {copied ? 'Copied' : 'Copy JSON'}
                </Button>
              )}
            </CopyButton>
            <Button onClick={() => setSubmissionModalOpen(false)}>Close</Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}

function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      <Notifications position="top-right" />
      <AppContent />
    </MantineProvider>
  );
}

export default App;
