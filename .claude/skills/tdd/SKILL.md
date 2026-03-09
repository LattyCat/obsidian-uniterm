---
name: tdd
description: TDD (Red-Green-Refactor) cycle guide for test-first development
user_invocable: true
---

# /tdd - Test-Driven Development Cycle

Guide the implementation through strict Red-Green-Refactor cycles.

## Workflow

When the user invokes `/tdd` with a target (e.g., `/tdd shell-detector`):

### 1. RED: Write Failing Tests First
- Identify the module/function to implement
- Write comprehensive test cases using **vitest** BEFORE any implementation
- Tests MUST cover:
  - Happy path
  - Edge cases
  - Error handling
  - Boundary conditions
- Run `npm run test` — confirm all new tests **FAIL** (red)
- If tests pass without implementation, the tests are wrong — rewrite them

### 2. GREEN: Minimal Implementation
- Write the **minimum code** to make all tests pass
- No optimization, no refactoring, no extra features
- Run `npm run test` — confirm all tests **PASS** (green)
- If any test fails, fix the implementation (not the test) unless the test has a bug

### 3. REFACTOR: Clean Up
- Improve code quality while keeping all tests green
- Look for:
  - Duplicated logic
  - Unclear naming
  - Unnecessary complexity
  - Missing type safety
- Run `npm run test` after each refactor step — must stay green
- If a refactor breaks tests, revert and try a different approach

## Rules

1. **NEVER write implementation before tests** — this is non-negotiable
2. **One cycle at a time** — complete Red-Green-Refactor before starting the next feature
3. **Tests are the spec** — if behavior isn't tested, it doesn't exist
4. **Mock external dependencies** — node-pty, xterm.js, Obsidian API use `vi.mock()`
5. **Run tests frequently** — after every meaningful change

## Test File Convention

- Test files: `src/**/__tests__/*.test.ts`
- Naming: `{module-name}.test.ts` matches `{module-name}.ts`
- Framework: vitest with `vi.mock()` for mocking

## Commands

```bash
npm run test          # Run all tests once
npm run test:watch    # Watch mode
npm run test -- --reporter=verbose  # Verbose output
```
