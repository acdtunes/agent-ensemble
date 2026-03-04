/**
 * Shared test fixtures for doc-viewer acceptance tests.
 *
 * These fixtures build domain objects (DocNode, DocTree, DocContent)
 * from business-language descriptions. Step definitions use these to set up
 * preconditions without coupling to internal data structures.
 *
 * Driving ports exercised:
 *   - Component props: DocViewer, DocTree, DocContent, CopyPathButton
 *   - Pure functions: buildDocTree, sortNodes, validateDocPath, resolveDocsRoot, filterTree
 */

// --- DocNode types (mirroring shared/types.ts once created) ---

export interface DocFileNode {
  readonly type: 'file';
  readonly name: string;
  readonly path: string;
}

export interface DocDirectoryNode {
  readonly type: 'directory';
  readonly name: string;
  readonly path: string;
  readonly children: readonly DocNode[];
}

export type DocNode = DocFileNode | DocDirectoryNode;

export interface DocTree {
  readonly root: readonly DocNode[];
  readonly fileCount: number;
}

// --- DirEntry type (intermediate for buildDocTree) ---

export interface DirEntry {
  readonly name: string;
  readonly path: string;
  readonly isDirectory: boolean;
}

// --- DocNode builders ---

export const createFileNode = (
  overrides: Partial<DocFileNode> & Pick<DocFileNode, 'name' | 'path'>,
): DocFileNode => ({
  type: 'file',
  ...overrides,
});

export const createDirectoryNode = (
  overrides: Partial<DocDirectoryNode> & Pick<DocDirectoryNode, 'name' | 'path'>,
): DocDirectoryNode => ({
  type: 'directory',
  children: [],
  ...overrides,
});

// --- DocTree builders ---

export const createDocTree = (
  nodes: readonly DocNode[],
  overrides?: { fileCount?: number },
): DocTree => ({
  root: nodes,
  fileCount: overrides?.fileCount ?? countFiles(nodes),
});

const countFiles = (nodes: readonly DocNode[]): number =>
  nodes.reduce((sum, node) =>
    node.type === 'file'
      ? sum + 1
      : sum + countFiles(node.children),
    0,
  );

// --- DirEntry builders ---

export const createDirEntry = (
  overrides: Partial<DirEntry> & Pick<DirEntry, 'name' | 'path'>,
): DirEntry => ({
  isDirectory: false,
  ...overrides,
});

// --- Predefined document trees for common test scenarios ---

export const createNwTeamsDocTree = (): DocTree => createDocTree([
  createDirectoryNode({
    name: 'adrs',
    path: 'adrs',
    children: [
      createFileNode({ name: 'ADR-001-state-management', path: 'adrs/ADR-001-state-management.md' }),
      createFileNode({ name: 'ADR-002-markdown-rendering', path: 'adrs/ADR-002-markdown-rendering.md' }),
      createFileNode({ name: 'ADR-003-docs-root', path: 'adrs/ADR-003-docs-root.md' }),
    ],
  }),
  createDirectoryNode({
    name: 'feature',
    path: 'feature',
    children: [
      createDirectoryNode({
        name: 'card-redesign',
        path: 'feature/card-redesign',
        children: [
          createDirectoryNode({
            name: 'discuss',
            path: 'feature/card-redesign/discuss',
            children: [
              createFileNode({ name: 'jtbd-analysis', path: 'feature/card-redesign/discuss/jtbd-analysis.md' }),
              createFileNode({ name: 'journey-card-monitoring', path: 'feature/card-redesign/discuss/journey-card-monitoring.md' }),
            ],
          }),
          createDirectoryNode({
            name: 'design',
            path: 'feature/card-redesign/design',
            children: [
              createFileNode({ name: 'architecture-design', path: 'feature/card-redesign/design/architecture-design.md' }),
            ],
          }),
          createDirectoryNode({
            name: 'distill',
            path: 'feature/card-redesign/distill',
            children: [
              createFileNode({ name: 'test-scenarios', path: 'feature/card-redesign/distill/test-scenarios.md' }),
            ],
          }),
        ],
      }),
      createDirectoryNode({
        name: 'kanban-board',
        path: 'feature/kanban-board',
        children: [
          createDirectoryNode({
            name: 'design',
            path: 'feature/kanban-board/design',
            children: [
              createFileNode({ name: 'architecture-design', path: 'feature/kanban-board/design/architecture-design.md' }),
            ],
          }),
        ],
      }),
    ],
  }),
]);

export const createEmptyDocTree = (): DocTree => createDocTree([]);

// --- Sample markdown content for rendering tests ---

export const createMarkdownWithHeadings = (): string =>
  `# Main Title\n\n## Section One\n\nSome content here.\n\n### Sub-section\n\nMore details.`;

export const createMarkdownWithCodeBlock = (): string =>
  `# Code Example\n\n\`\`\`typescript\ninterface Config {\n  readonly name: string;\n  readonly value: number;\n}\n\`\`\``;

export const createMarkdownWithInlineCode = (): string =>
  `# Inline Code\n\nThe variable \`currentState\` holds the current delivery state.`;

export const createMarkdownWithTable = (): string =>
  `# Table Example\n\n| Column A | Column B | Column C |\n|----------|----------|----------|\n| value 1  | value 2  | value 3  |\n| value 4  | value 5  | value 6  |`;

export const createMarkdownWithMermaid = (): string =>
  `# Diagram\n\n\`\`\`mermaid\ngraph TB\n    A[Start] --> B[End]\n\`\`\``;

export const createMarkdownWithMalformedMermaid = (): string =>
  `# Bad Diagram\n\n\`\`\`mermaid\ngraph INVALID{{{}}}}\n\`\`\`\n\n## Following Section\n\nThis content should still render.`;

export const createLongMarkdown = (lines: number = 350): string => {
  const header = '# Long Document\n\n';
  const body = Array.from({ length: lines }, (_, i) =>
    `Line ${i + 1}: This is paragraph content for testing scroll behavior.`,
  ).join('\n\n');
  return header + body;
};

export const createEmptyMarkdown = (): string => '';

// --- Clipboard mock helper ---

export const createClipboardMock = (): {
  writeText: ReturnType<typeof import('vitest').vi.fn>;
  readText: ReturnType<typeof import('vitest').vi.fn>;
  lastWritten: () => string | undefined;
} => {
  let lastValue: string | undefined;
  const writeText = Object.assign(
    async (text: string) => { lastValue = text; },
    { mockRejectedValueOnce: undefined as any },
  );
  const readText = async () => lastValue ?? '';
  return {
    writeText: writeText as any,
    readText: readText as any,
    lastWritten: () => lastValue,
  };
};
