import {
  TextInput,
  Textarea,
  Select,
  Radio,
  Checkbox,
  Stack,
  Text,
  Box,
} from '@mantine/core';
import type { QuestionDefinition } from '../../types/questionnaire';

interface QuestionRendererProps {
  question: QuestionDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
}

export function QuestionRenderer({ question, value, onChange, error }: QuestionRendererProps) {
  const renderTextQuestion = () => {
    if (question.type !== 'text') return null;

    const commonProps = {
      label: question.label,
      description: question.helpText,
      required: question.required,
      error: error,
      value: (value as string) || '',
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        onChange(e.currentTarget.value),
      maxLength: question.maxLength,
    };

    if (question.multiline) {
      return <Textarea {...commonProps} minRows={3} autosize maxRows={8} />;
    }

    return <TextInput {...commonProps} />;
  };

  const renderChoiceQuestion = () => {
    if (question.type !== 'choice') return null;

    const options = question.options;

    // Multi-select checkbox group
    if (question.multiple) {
      const selectedValues = Array.isArray(value) ? (value as string[]) : [];

      return (
        <Box>
          <Text size="sm" fw={500} mb={4}>
            {question.label}
            {question.required && (
              <Text span c="red" ml={4}>
                *
              </Text>
            )}
          </Text>
          {question.helpText && (
            <Text size="xs" c="dimmed" mb="xs">
              {question.helpText}
            </Text>
          )}
          <Stack gap="xs">
            {options.map((option) => (
              <Checkbox
                key={option.value}
                label={option.label}
                checked={selectedValues.includes(option.value)}
                onChange={(e) => {
                  if (e.currentTarget.checked) {
                    onChange([...selectedValues, option.value]);
                  } else {
                    onChange(selectedValues.filter((v) => v !== option.value));
                  }
                }}
              />
            ))}
          </Stack>
          {error && (
            <Text size="xs" c="red" mt={4}>
              {error}
            </Text>
          )}
        </Box>
      );
    }

    // Single select - use radio buttons for <= 5 options, select for more
    if (options.length <= 5) {
      return (
        <Radio.Group
          label={question.label}
          description={question.helpText}
          required={question.required}
          value={(value as string) || ''}
          onChange={onChange}
          error={error}
        >
          <Stack gap="xs" mt="xs">
            {options.map((option) => (
              <Radio key={option.value} value={option.value} label={option.label} />
            ))}
          </Stack>
        </Radio.Group>
      );
    }

    // Dropdown for many options
    return (
      <Select
        label={question.label}
        description={question.helpText}
        required={question.required}
        value={(value as string) || null}
        onChange={onChange}
        error={error}
        data={options.map((o) => ({ value: o.value, label: o.label }))}
        placeholder="Select an option"
        clearable
      />
    );
  };

  return (
    <Box>
      {question.type === 'text' && renderTextQuestion()}
      {question.type === 'choice' && renderChoiceQuestion()}
    </Box>
  );
}
