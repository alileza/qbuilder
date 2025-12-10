# QBuilder UI

Interactive questionnaire builder and preview tool for the QBuilder engine.

## Features

- **Code Editor** - JSON editor for questionnaire definitions with syntax validation
- **Visual Builder** - Intuitive interface for creating and editing questionnaires
- **Graph View** - Visualize question dependencies and conditional flow logic
- **Live Preview** - Test questionnaires in real-time with validation
- **Dark/Light Mode** - Toggle between color schemes
- **Import/Export** - Load examples or import/export JSON files

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Deployment

The UI is automatically deployed to GitHub Pages when changes are pushed to the `main` branch.

**Live URL**: https://alileza.github.io/qbuilder/

## Project Structure

```
ui/
├── src/
│   ├── components/
│   │   ├── Editor/
│   │   │   ├── JsonEditor.tsx      # JSON code editor
│   │   │   ├── BuilderEditor.tsx   # Visual builder
│   │   │   └── GraphView.tsx       # Dependency graph
│   │   └── Preview/
│   │       ├── FormPreview.tsx     # Form preview
│   │       └── QuestionRenderer.tsx # Question components
│   ├── types/
│   │   └── questionnaire.ts        # TypeScript types
│   ├── utils/
│   │   └── visibility.ts           # Visibility logic
│   └── App.tsx                     # Main app
└── package.json
```

## Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Mantine 8** - Component library and UI primitives
- **React Flow** - Interactive graph visualization
- **Vite** - Fast build tool and dev server

## Features in Detail

### Code Editor
- Syntax-highlighted JSON editor
- Real-time validation
- Format JSON with one click
- Copy to clipboard

### Visual Builder
- Add/edit questions (text, choice, multi-choice)
- Configure visibility conditions
- Set required fields
- Add help text
- Duplicate questions

### Graph View
- Automatic layout (left-to-right flowchart)
- Sequential flow arrows
- Conditional dependency arrows (ALL/ANY)
- Skip/else paths for conditional logic
- Auto-fit on changes
- Zoom and pan controls
- Minimap for navigation

### Form Preview
- Live preview with real answers
- Dynamic visibility based on conditions
- Validation feedback
- Section grouping
- Submit preview with JSON output

## License

See parent directory for license information.
