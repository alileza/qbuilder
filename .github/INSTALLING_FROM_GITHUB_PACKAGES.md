# Installing from GitHub Packages

This package is automatically published to GitHub Packages on every push to the `main` branch.

## Prerequisites

You need a GitHub Personal Access Token (PAT) with `read:packages` permission to install packages from GitHub Packages.

## Create a Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Give it a name like "npm-read-packages"
4. Select the `read:packages` scope
5. Click "Generate token"
6. Copy the token (you won't be able to see it again!)

## Configuration

### Option 1: Project-level .npmrc

Create a `.npmrc` file in your project root:

```bash
@alileza:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

### Option 2: User-level .npmrc

Configure globally in `~/.npmrc`:

```bash
@alileza:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_TOKEN
```

### Option 3: Using npm config

```bash
npm config set @alileza:registry https://npm.pkg.github.com
npm config set //npm.pkg.github.com/:_authToken YOUR_GITHUB_TOKEN
```

## Installation

Once configured, install the package:

```bash
npm install @alileza/qbuilder
```

Or with yarn:

```bash
yarn add @alileza/qbuilder
```

Or with pnpm:

```bash
pnpm add @alileza/qbuilder
```

## Usage

```typescript
import { parseQuestionnaire, validateAnswers } from '@alileza/qbuilder';

const questionnaire = parseQuestionnaire({
  id: 'example',
  title: 'Example Questionnaire',
  questions: [
    { id: 'q1', type: 'text', label: 'Question 1', required: true }
  ]
});

const result = validateAnswers(questionnaire, { q1: 'Answer' });
```

## CI/CD Integration

### GitHub Actions

In your GitHub Actions workflow:

```yaml
- name: Install dependencies
  run: npm ci
  env:
    NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

The `GITHUB_TOKEN` is automatically available in GitHub Actions.

### Other CI Systems

Add your GitHub token as a secret environment variable in your CI system:

```bash
# .env or CI configuration
NPM_TOKEN=your_github_token
```

Then in your CI script:

```bash
echo "@alileza:registry=https://npm.pkg.github.com" >> .npmrc
echo "//npm.pkg.github.com/:_authToken=${NPM_TOKEN}" >> .npmrc
npm install
```

## Troubleshooting

### 401 Unauthorized

- Check your token has `read:packages` permission
- Verify the token is not expired
- Ensure the registry URL is correct

### 404 Not Found

- The package may not have been published yet
- Check the package name includes the `@alileza` scope
- Verify you're authenticated with GitHub

### SSL/Certificate Issues

If you encounter SSL errors:

```bash
npm config set strict-ssl false  # Not recommended for production
```

Or use a proper certificate:

```bash
npm config set cafile /path/to/cert.pem
```

## Publishing (Maintainers Only)

The package is automatically published via GitHub Actions when code is pushed to `main`. Manual publishing:

```bash
# Ensure you're authenticated
npm login --registry=https://npm.pkg.github.com

# Build and publish
npm run build
npm publish
```

## More Information

- [GitHub Packages Documentation](https://docs.github.com/en/packages)
- [Working with npm registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-npm-registry)
