import { Box, Title, Text, Stack, Paper, Divider, Button, Group, Badge, Alert } from '@mantine/core';
import { IconFileDescription, IconCheck, IconAlertCircle } from '@tabler/icons-react';
import type { QuestionnaireDefinition, AnswerPayload } from '../../types/questionnaire';
import { isQuestionVisible } from '../../utils/visibility';
import { QuestionRenderer } from './QuestionRenderer';

interface FormPreviewProps {
  questionnaire: QuestionnaireDefinition | null;
  answers: AnswerPayload;
  onAnswerChange: (questionId: string, value: unknown) => void;
  onReset: () => void;
  onSubmit: () => void;
  validationErrors: { questionId: string; message: string }[];
  showValidation: boolean;
}

export function FormPreview({
  questionnaire,
  answers,
  onAnswerChange,
  onReset,
  onSubmit,
  validationErrors,
  showValidation,
}: FormPreviewProps) {
  if (!questionnaire) {
    return (
      <Box
        h="100%"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Paper
          p="xl"
          radius="md"
          style={{ textAlign: 'center', backgroundColor: 'transparent' }}
        >
          <IconFileDescription size={64} stroke={1.5} color="var(--mantine-color-gray-5)" />
          <Title order={3} mt="md" c="dimmed">
            No questionnaire loaded
          </Title>
          <Text size="sm" c="dimmed" mt="xs">
            Import a JSON file, paste JSON in the editor, or load an example to get started
          </Text>
        </Paper>
      </Box>
    );
  }

  const visibleQuestions = questionnaire.questions.filter((q) => isQuestionVisible(q, answers));
  const errorMap = new Map(validationErrors.map((e) => [e.questionId, e.message]));

  // Render questions grouped by sections if sections exist
  const renderSections = () => {
    if (!questionnaire.sections || questionnaire.sections.length === 0) {
      return (
        <Stack gap="lg">
          {visibleQuestions.map((question) => (
            <QuestionRenderer
              key={question.id}
              question={question}
              value={answers[question.id]}
              onChange={(value) => onAnswerChange(question.id, value)}
              error={showValidation ? errorMap.get(question.id) : undefined}
            />
          ))}
        </Stack>
      );
    }

    // Group questions by section
    const questionsById = new Map(questionnaire.questions.map((q) => [q.id, q]));
    const assignedQuestionIds = new Set(questionnaire.sections.flatMap((s) => s.questionIds));
    const unassignedQuestions = visibleQuestions.filter((q) => !assignedQuestionIds.has(q.id));

    return (
      <Stack gap="xl">
        {questionnaire.sections.map((section) => {
          const sectionQuestions = section.questionIds
            .map((id) => questionsById.get(id))
            .filter((q): q is NonNullable<typeof q> => q !== undefined && isQuestionVisible(q, answers));

          if (sectionQuestions.length === 0) return null;

          return (
            <Box key={section.id}>
              <Title order={4} mb="xs">
                {section.title}
              </Title>
              {section.description && (
                <Text size="sm" c="dimmed" mb="md">
                  {section.description}
                </Text>
              )}
              <Stack gap="md">
                {sectionQuestions.map((question) => (
                  <QuestionRenderer
                    key={question.id}
                    question={question}
                    value={answers[question.id]}
                    onChange={(value) => onAnswerChange(question.id, value)}
                    error={showValidation ? errorMap.get(question.id) : undefined}
                  />
                ))}
              </Stack>
            </Box>
          );
        })}

        {unassignedQuestions.length > 0 && (
          <Box>
            <Divider my="md" />
            <Stack gap="md">
              {unassignedQuestions.map((question) => (
                <QuestionRenderer
                  key={question.id}
                  question={question}
                  value={answers[question.id]}
                  onChange={(value) => onAnswerChange(question.id, value)}
                  error={showValidation ? errorMap.get(question.id) : undefined}
                />
              ))}
            </Stack>
          </Box>
        )}
      </Stack>
    );
  };

  return (
    <Box h="100%" style={{ display: 'flex', flexDirection: 'column' }}>
      <Box p="md" style={{ flex: 1, overflow: 'auto' }}>
        <Stack gap="md">
          <Box>
            <Title order={2}>{questionnaire.title}</Title>
            {questionnaire.description && (
              <Text size="sm" c="dimmed" mt="xs">
                {questionnaire.description}
              </Text>
            )}
            <Group gap="xs" mt="xs">
              <Badge size="sm" variant="light">
                {questionnaire.questions.length} questions
              </Badge>
              {questionnaire.sections && questionnaire.sections.length > 0 && (
                <Badge size="sm" variant="light" color="blue">
                  {questionnaire.sections.length} sections
                </Badge>
              )}
              <Badge size="sm" variant="light" color="gray">
                {visibleQuestions.length} visible
              </Badge>
            </Group>
          </Box>

          <Divider />

          {showValidation && validationErrors.length > 0 && (
            <Alert color="red" icon={<IconAlertCircle size={16} />} title="Validation Errors">
              <Stack gap="xs">
                {validationErrors.map((error, i) => (
                  <Text key={i} size="sm">
                    {error.message}
                  </Text>
                ))}
              </Stack>
            </Alert>
          )}

          {renderSections()}

          <Divider mt="lg" />

          <Group justify="flex-end">
            <Button variant="subtle" onClick={onReset}>
              Reset
            </Button>
            <Button onClick={onSubmit} leftSection={<IconCheck size={16} />}>
              Submit
            </Button>
          </Group>
        </Stack>
      </Box>
    </Box>
  );
}
