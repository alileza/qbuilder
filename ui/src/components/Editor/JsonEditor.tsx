import { Textarea, Stack, Alert, useComputedColorScheme } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

interface JsonEditorProps {
  value: string;
  onChange: (value: string) => void;
  error: string | null;
}

export function JsonEditor({ value, onChange, error }: JsonEditorProps) {
  const colorScheme = useComputedColorScheme('light');

  return (
    <Stack h="100%" gap={0}>
      {error && (
        <Alert
          color="red"
          icon={<IconAlertCircle size={16} />}
          p="xs"
          styles={{ root: { borderRadius: 0 } }}
        >
          {error}
        </Alert>
      )}
      <Textarea
        value={value}
        onChange={(e) => onChange(e.currentTarget.value)}
        placeholder="Paste your questionnaire JSON here, or use Import/Examples above..."
        styles={{
          root: { flex: 1, display: 'flex', flexDirection: 'column' },
          wrapper: { flex: 1, display: 'flex' },
          input: {
            flex: 1,
            fontFamily: 'monospace',
            fontSize: '13px',
            borderRadius: 0,
            border: 'none',
            resize: 'none',
            backgroundColor: colorScheme === 'dark'
              ? 'var(--mantine-color-dark-7)'
              : 'var(--mantine-color-gray-1)',
            color: colorScheme === 'dark'
              ? 'var(--mantine-color-gray-3)'
              : 'var(--mantine-color-dark-7)',
          },
        }}
        autosize={false}
      />
    </Stack>
  );
}
