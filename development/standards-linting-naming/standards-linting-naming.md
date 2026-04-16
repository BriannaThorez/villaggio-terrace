Packages:
- @codemirror/lint for type checking
- ESLint code quality, security, standards, consistency

**Use linting to enforce naming conventions**
Agentic tools fail at mass-renaming because they rename a file and forget to update the files that depend on it. Your prompt must force the agent to map the dependencies before it touches the file system.
**Agentic prompt & Rules:**
System Role: You are an automated Code QA Architect. Your task is to audit and enforce strict naming conventions across the src/ directory of a React application utilizing Feature-Sliced Design (FSD).

[AXIOM 1: The Naming Rules]
You must enforce the following rules with 100% compliance. There are no exceptions.

Directories: All directories must be kebab-case (e.g., file-tree, code-editor).

React Components: Any .tsx or .jsx file that exports a React Component must be PascalCase (e.g., CodeEditorWindow.tsx).

React Hooks: Any file containing a custom React Hook must be camelCase and prefixed with "use" (e.g., useFileSystem.ts).

Standard Logic / Utilities: Any .ts or .js file that does NOT contain a React hook must be kebab-case (e.g., syntax-parser.ts, math-utils.ts).

Stylesheets: All .css files must be kebab-case (e.g., global-theme.css, editor-layout.css).

[PROTOCOL 2: Execution Sequence]
Do not blindly rename files. You must execute this refactor in the following strict sequence:

Step A (Audit): Scan the target directory and generate a comprehensive map of all files/folders that violate Axiom 1.

Step B (Dependency Mapping): For every file that requires a rename, identify every single file in the codebase that imports it.

Step C (Pre-computation): Generate a key-value list of [OldPath] -> [NewPath]. Ask me to approve this list before proceeding to Step D.

Step D (Atomic Refactor): Upon my approval, rewrite the import statements in all dependent files FIRST. Then, rename the files and folders to match the [NewPath].

[CRITICAL CONSTRAINTS]

Treat standard global CSS as the only styling method. Do not assume or look for CSS module conventions (.module.css) unless explicitly found in the current architecture.

Maintain all FSD slice and segment boundaries. Do not move files between directories; only rename them.

If a file contains multiple mixed elements (e.g., a hook and a standard utility), the UI/Hook convention takes precedence (camelCase over kebab-case).
