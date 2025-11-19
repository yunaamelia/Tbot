# Pre-Commit Hooks Documentation

## Overview

This project uses [Husky](https://typicode.github.io/husky/) to run comprehensive checks before each commit. This ensures code quality, consistency, and prevents broken code from being committed.

## What Runs Before Commit

The pre-commit hook automatically runs the following checks in order:

### 1. ESLint (Code Linting)
- **Command**: `npm run lint`
- **Purpose**: Checks code for linting errors and style issues
- **Auto-fix**: Run `npm run lint:fix` to automatically fix some issues
- **Exit Code**: Fails commit if linting errors found

### 2. Prettier (Code Formatting Check)
- **Command**: `npm run format:check`
- **Purpose**: Verifies code formatting matches project standards
- **Auto-fix**: Run `npm run format` to automatically format code
- **Exit Code**: Fails commit if formatting issues found

### 3. Comprehensive Tests
- **Command**: `npm run test:all`
- **Includes**:
  - Unit tests (`npm run test:unit`)
  - Integration tests (`npm run test:integration`)
  - Contract tests (`npm run test:contract`)
- **Purpose**: Ensures all tests pass before commit
- **Exit Code**: Fails commit if any test fails

## Best Practices (from Context7 Research)

Based on best practices research:

1. **Comprehensive Coverage**: All test types run to catch issues early
2. **Fast Feedback**: Checks run in sequence, failing fast on first error
3. **Clear Error Messages**: Each step provides helpful error messages and tips
4. **Skip Option**: Can be bypassed with `--no-verify` for emergency commits (not recommended)

## Usage

### Normal Commit Flow

```bash
git add .
git commit -m "Your commit message"
# Pre-commit hooks run automatically
```

### Skip Pre-commit Hooks

**⚠️ Not Recommended** - Only use in emergencies:

```bash
git commit --no-verify -m "Emergency commit"
```

### Test Pre-commit Hook Without Committing

To test the hook without creating a commit:

1. Temporarily add `exit 1` at the end of `.husky/pre-commit`
2. Run `git commit -m "test"`
3. Hook runs but commit is aborted
4. Remove `exit 1` to enable normal commits

## Troubleshooting

### Hook Not Running

1. Ensure Husky is installed: `npm install`
2. Ensure Husky is initialized: `npx husky init`
3. Check hook is executable: `chmod +x .husky/pre-commit`
4. Verify `prepare` script in `package.json`: `"prepare": "husky"`

### Tests Taking Too Long

If tests are too slow for frequent commits, consider:
- Running only unit tests in pre-commit
- Using `lint-staged` to only test changed files
- Running integration tests in CI/CD instead

### False Positives

If a test fails but you believe it's a false positive:
1. Investigate the failure
2. Fix the test or code
3. Only use `--no-verify` as last resort

## Configuration

### Modify Pre-commit Hook

Edit `.husky/pre-commit` to customize checks:

```bash
# Add custom checks
echo "🔍 Running custom check..."
npm run custom-check
```

### Add Additional Hooks

Create other hooks in `.husky/`:
- `pre-push` - Run before push
- `commit-msg` - Validate commit message format
- `post-commit` - Run after commit

Example:
```bash
echo "npm run test:integration" > .husky/pre-push
chmod +x .husky/pre-push
```

## Integration with CI/CD

Pre-commit hooks complement but don't replace CI/CD:
- **Pre-commit**: Fast feedback, prevents bad commits
- **CI/CD**: Comprehensive testing, deployment validation

Both should run the same checks for consistency.

