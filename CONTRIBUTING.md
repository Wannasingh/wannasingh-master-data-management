# Git Branching & Contribution Guidelines

To maintain a clean and organized repository, please follow these best practices for branching and committing code.

## Branching Strategy

We follow a structured branching model based on the standard **Git Flow** / **GitHub Flow**:

1. **`main`**: The primary branch. This branch must always be stable and deployable to production. Direct commits to `main` are strictly prohibited.
2. **`develop`** (Optional but recommended): The integration branch for features before they are moved to `main`.

### Feature and Bugfix Branches

When starting work on a new task, always branch off from `main` (or `develop`). Use the following prefixes to categorize your branch:

*   **`feature/<feature-name>`**: For new features or enhancements.
    *   *Example: `feature/user-authentication`*
*   **`bugfix/<bug-name>`**: For non-critical bug fixes.
    *   *Example: `bugfix/fix-upload-button-state`*
*   **`hotfix/<issue-name>`**: For critical fixes directly applied to the production `main` branch.
    *   *Example: `hotfix/fix-database-connection`*
*   **`chore/<chore-name>`**: For maintenance tasks, dependency updates, or configuration changes.
    *   *Example: `chore/update-eslint-rules`*
*   **`refactor/<refactor-name>`**: For code refactoring without adding new features or fixing bugs.
    *   *Example: `refactor/extract-dashboard-components`*

## Workflow Steps

1. **Pull the latest changes:**
   ```bash
   git checkout main
   git pull origin main
   ```
2. **Create a new branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Commit your changes:**
   Write clear, descriptive commit messages.
   ```bash
   git add .
   git commit -m "feat: add user authentication component"
   ```
4. **Push your branch:**
   ```bash
   git push origin feature/your-feature-name
   ```
5. **Open a Pull Request (PR):**
   *   Target the `main` branch.
   *   Ensure CI/CD checks (linting, tests) pass.
   *   Request a code review from at least one team member before merging.

## Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):
*   `feat:` A new feature
*   `fix:` A bug fix
*   `docs:` Documentation only changes
*   `style:` Changes that do not affect the meaning of the code (white-space, formatting, etc.)
*   `refactor:` A code change that neither fixes a bug nor adds a feature
*   `perf:` A code change that improves performance
*   `test:` Adding missing tests or correcting existing tests
*   `chore:` Changes to the build process or auxiliary tools and libraries
