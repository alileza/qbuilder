# QBuilder Example Application

A complete end-to-end example of using the `qbuilder` package to build a questionnaire API with file-based initialization and PostgreSQL storage.

## Features Demonstrated

- ✅ PostgreSQL database setup with Docker Compose
- ✅ File-based questionnaire initialization
- ✅ REST API with Express
- ✅ Smart versioning (no duplicate versions on restart)
- ✅ Branching logic with conditional questions
- ✅ Answer validation
- ✅ Submission storage

## Prerequisites

- Node.js >= 18.0.0
- Docker and Docker Compose
- npm or yarn

## Quick Start

### 1. Start PostgreSQL Database

The database runs on port **5437** (not the default 5432) to avoid conflicts with your local PostgreSQL:

```bash
npm run db:up
```

Wait for the database to be ready (health check will confirm):

```bash
npm run db:logs
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Database Migrations

```bash
npm run build
npm run db:migrate
```

### 4. Start the Application

```bash
npm run dev
```

The server will start on http://localhost:3000

## What Happens on Startup

1. **Questionnaire Initialization**: Loads all `.json` files from `./questionnaires/` directory
2. **Smart Versioning**:
   - First run: Creates version 1 for each questionnaire
   - Subsequent runs: Only creates new versions if content changed
3. **API Ready**: Express server starts with all endpoints available

## Project Structure

```
example/
├── docker-compose.yml          # PostgreSQL database (port 5437)
├── package.json                # Dependencies and scripts
├── tsconfig.json               # TypeScript configuration
├── questionnaires/             # Questionnaire definitions
│   ├── employee-onboarding.json
│   └── customer-feedback.json
└── src/
    ├── index.ts                # Main application
    └── migrate.ts              # Database migration script
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run start` | Start the compiled application |
| `npm run dev` | Build and start in one command |
| `npm run db:up` | Start PostgreSQL container |
| `npm run db:down` | Stop PostgreSQL container |
| `npm run db:logs` | View PostgreSQL logs |
| `npm run db:migrate` | Run database migrations |

## API Endpoints

Once running, the following endpoints are available:

### Questionnaires

```bash
# List all questionnaires
curl http://localhost:3000/api/questionnaires

# Get specific questionnaire (latest version)
curl http://localhost:3000/api/questionnaires/employee-onboarding

# Get specific version
curl http://localhost:3000/api/questionnaires/employee-onboarding?version=1

# Get all versions
curl http://localhost:3000/api/questionnaires/employee-onboarding/versions
```

### Submissions

```bash
# Submit answers
curl -X POST http://localhost:3000/api/questionnaires/employee-onboarding/submit \
  -H "Content-Type: application/json" \
  -d '{
    "answers": {
      "fullName": "John Doe",
      "email": "john@example.com",
      "hasExperience": "yes",
      "yearsOfExperience": "5",
      "department": "engineering",
      "startDate": "2025-01-15"
    }
  }'

# List submissions
curl http://localhost:3000/api/questionnaires/employee-onboarding/submissions

# Get specific submission
curl http://localhost:3000/api/submissions/{submissionId}
```

### Validation

```bash
# Validate answers without submitting
curl -X POST http://localhost:3000/api/questionnaires/employee-onboarding/validate \
  -H "Content-Type: application/json" \
  -d '{
    "answers": {
      "fullName": "Jane Smith",
      "email": "jane@example.com"
    }
  }'

# Get visible questions based on answers
curl -X POST http://localhost:3000/api/questionnaires/employee-onboarding/visible \
  -H "Content-Type: application/json" \
  -d '{
    "answers": {
      "hasExperience": "yes"
    }
  }'
```

### Documentation

```bash
# Get OpenAPI specification
curl http://localhost:3000/api/openapi.json

# Health check
curl http://localhost:3000/health
```

## Example Questionnaires

### Employee Onboarding

Demonstrates:
- Text input validation
- Choice questions
- Conditional logic (experience years only shown if has experience)
- Multiple departments

### Customer Feedback

Demonstrates:
- Satisfaction rating
- Conditional improvement suggestions (only if not satisfied)
- Recommendation question
- Optional fields

## Modifying Questionnaires

1. Edit any `.json` file in `questionnaires/` directory
2. Restart the application
3. **Smart Versioning** automatically:
   - Creates a new version if content changed
   - Skips if content is identical (prevents duplicate versions)

Example:

```bash
# Edit questionnaire
vim questionnaires/employee-onboarding.json

# Restart app (creates new version if changed)
npm run dev
```

## Database Connection

The PostgreSQL database is configured with:

- **Host**: localhost
- **Port**: 5437 (custom port to avoid conflicts)
- **Database**: qbuilder
- **User**: qbuilder
- **Password**: qbuilder123

To connect with `psql`:

```bash
psql -h localhost -p 5437 -U qbuilder -d qbuilder
```

## Troubleshooting

### Port 5437 already in use

```bash
# Check what's using the port
lsof -i :5437

# Stop the container and remove it
docker-compose down
```

### Database connection refused

```bash
# Check if container is running
docker ps | grep qbuilder-postgres

# Check logs
npm run db:logs
```

### Migrations failed

```bash
# Stop database
npm run db:down

# Remove volume and start fresh
docker volume rm example_postgres_data

# Start database and run migrations
npm run db:up
sleep 5
npm run db:migrate
```

### Build errors

```bash
# Clean build
rm -rf dist node_modules
npm install
npm run build
```

## Clean Up

To stop and remove everything:

```bash
# Stop containers
npm run db:down

# Remove volumes (deletes all data)
docker volume rm example_postgres_data

# Remove node_modules
rm -rf node_modules dist
```

## Next Steps

- Add custom question types by extending the registry
- Implement authentication/authorization
- Add webhooks for submission notifications
- Create a frontend with React/Vue/Angular
- Deploy to production with proper environment variables

## Learn More

- [QBuilder Documentation](../README.md)
- [OpenAPI Specification](http://localhost:3000/api/openapi.json)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Express Documentation](https://expressjs.com/)
