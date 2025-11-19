# Strict Pre-Commit Policy

**Date**: 2025-01-27  
**Status**: ✅ Enforced

## Policy

**All pre-commit checks MUST pass before any commit is allowed.**

This project enforces strict quality gates through Husky pre-commit hooks. There is **NO** way to skip these checks.

## What This Means

1. **No `--no-verify` option**: The `git commit --no-verify` flag is not supported in this project
2. **All tests must pass**: Unit, integration, and contract tests must all pass
3. **Code quality enforced**: ESLint and Prettier checks must pass
4. **Fix before commit**: Any failing check blocks the commit - fix errors first

## Pre-Commit Checks

The following checks run automatically before every commit:

### 1. ESLint (Code Linting)
- **Command**: `npm run lint`
- **Failure**: Commit blocked
- **Fix**: Run `npm run lint:fix` to auto-fix issues

### 2. Prettier (Code Formatting)
- **Command**: `npm run format:check`
- **Failure**: Commit blocked
- **Fix**: Run `npm run format` to auto-format code

### 3. Comprehensive Tests
- **Command**: `npm run test:all`
- **Includes**:
  - Unit tests (`npm run test:unit`)
  - Integration tests (`npm run test:integration`)
  - Contract tests (`npm run test:contract`)
- **Failure**: Commit blocked
- **Fix**: Fix failing tests before committing

## Rationale

This strict policy ensures:

- **Code Quality**: Only tested, linted, and formatted code enters the repository
- **CI/CD Alignment**: Pre-commit checks match CI/CD pipeline requirements
- **Team Consistency**: All developers follow the same quality standards
- **Early Detection**: Issues caught before they reach the repository
- **Reduced Technical Debt**: Prevents accumulation of broken code

## Workflow

### Normal Development Flow

```bash
# 1. Make changes
# 2. Stage changes
git add .

# 3. Attempt commit (hooks run automatically)
git commit -m "Your message"

# If checks pass: Commit succeeds ✅
# If checks fail: Commit blocked ❌
```

### When Checks Fail

1. **Read the error message** - Each check provides specific feedback
2. **Fix the issues** - Use provided tips (e.g., `npm run lint:fix`)
3. **Re-run checks manually** (optional):
   ```bash
   npm run lint
   npm run format:check
   npm run test:all
   ```
4. **Re-attempt commit** - Once all checks pass, commit will succeed

## Enforcement

- **Husky Hook**: `.husky/pre-commit` enforces checks
- **Exit Codes**: Hook exits with code 1 on any failure, blocking commit
- **Documentation**: All references to skipping hooks have been removed
- **Team Policy**: This is a project-wide requirement, not optional

## Benefits

✅ **Prevents Broken Code**: No commits with failing tests  
✅ **Consistent Quality**: All code meets the same standards  
✅ **Faster CI/CD**: Fewer pipeline failures  
✅ **Better Code Reviews**: Reviews focus on logic, not style/test issues  
✅ **Reduced Debugging**: Issues caught early in development cycle

## Migration Notes

If you're used to using `--no-verify`:

- **Old Way**: `git commit --no-verify -m "quick fix"`
- **New Way**: Fix issues first, then commit normally
- **Time Investment**: Initial setup takes longer, but saves time overall
- **Habit Change**: Plan for tests to pass before committing

## Support

If you encounter issues with pre-commit hooks:

1. Check hook is executable: `chmod +x .husky/pre-commit`
2. Verify Husky is installed: `npm install`
3. Review error messages for specific fixes
4. Consult `docs/pre-commit-hooks.md` for troubleshooting

---

**Remember**: Quality gates are not obstacles - they're safeguards that protect the codebase and your team.

