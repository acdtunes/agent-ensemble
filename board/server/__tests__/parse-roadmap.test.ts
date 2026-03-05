import { describe, it, expect } from 'vitest';
import { parseRoadmap } from '../parser.js';
import type { Roadmap, RoadmapFormat } from '../../shared/types.js';

// --- Fixtures ---

const validRoadmapYaml = `
roadmap:
  project_id: directory-browser
  created_at: '2026-03-02T18:44:29Z'
  total_steps: 3
  phases: 1
phases:
- id: '01'
  name: Server-side browse infrastructure
  steps:
  - id: 01-01
    name: Add shared browse types
    files_to_modify:
      - board/shared/types.ts
    deps: []
    criteria:
      - BrowseEntry has readonly fields
    status: approved
    teammate_id: crafter-01-01
    started_at: '2026-03-02T18:50:00Z'
    completed_at: '2026-03-02T18:51:35Z'
    review_attempts: 1
  - id: 01-02
    name: Create validation core
    files_to_modify:
      - board/server/browse.ts
    deps:
      - 01-01
    criteria:
      - validateBrowsePath returns Result
    status: in_progress
    teammate_id: crafter-01-02
    started_at: '2026-03-02T18:53:45Z'
    completed_at: null
    review_attempts: 0
  - id: 01-03
    name: Create IO shell adapter
    files_to_modify:
      - board/server/browse.ts
    deps:
      - 01-02
    criteria: []
`;

describe('parseRoadmap', () => {
  it('should parse valid roadmap YAML with full status fields into Roadmap type', () => {
    const result = parseRoadmap(validRoadmapYaml);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const roadmap: Roadmap = result.value;
    expect(roadmap.roadmap.project_id).toBe('directory-browser');
    expect(roadmap.roadmap.created_at).toBe('2026-03-02T18:44:29Z');
    expect(roadmap.roadmap.total_steps).toBe(3);
    expect(roadmap.roadmap.phases).toBe(1);
    expect(roadmap.phases).toHaveLength(1);
    expect(roadmap.phases[0].id).toBe('01');
    expect(roadmap.phases[0].name).toBe('Server-side browse infrastructure');
    expect(roadmap.phases[0].steps).toHaveLength(3);

    const step1 = roadmap.phases[0].steps[0];
    expect(step1.id).toBe('01-01');
    expect(step1.name).toBe('Add shared browse types');
    expect(step1.files_to_modify).toEqual(['board/shared/types.ts']);
    expect(step1.dependencies).toEqual([]);
    expect(step1.criteria).toEqual(['BrowseEntry has readonly fields']);
    expect(step1.status).toBe('approved');
    expect(step1.teammate_id).toBe('crafter-01-01');
    expect(step1.started_at).toBe('2026-03-02T18:50:00Z');
    expect(step1.completed_at).toBe('2026-03-02T18:51:35Z');
    expect(step1.review_attempts).toBe(1);

    const step2 = roadmap.phases[0].steps[1];
    expect(step2.status).toBe('in_progress');
    expect(step2.completed_at).toBeNull();
  });

  it('should apply defaults for absent status fields', () => {
    const result = parseRoadmap(validRoadmapYaml);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Step 01-03 has no status fields at all
    const step3 = result.value.phases[0].steps[2];
    expect(step3.id).toBe('01-03');
    expect(step3.status).toBe('pending');
    expect(step3.teammate_id).toBeNull();
    expect(step3.started_at).toBeNull();
    expect(step3.completed_at).toBeNull();
    expect(step3.review_attempts).toBe(0);
  });

  it('should default missing dependencies, criteria, and files to empty arrays', () => {
    const minimalStep = `
roadmap:
  project_id: test
phases:
- id: '01'
  name: Phase one
  steps:
  - id: 01-01
    name: Minimal step
`;
    const result = parseRoadmap(minimalStep);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const step = result.value.phases[0].steps[0];
    expect(step.files_to_modify).toEqual([]);
    expect(step.dependencies).toEqual([]);
    expect(step.criteria).toEqual([]);
  });

  it('should return ParseError with type invalid_yaml for malformed YAML', () => {
    const result = parseRoadmap('key: [unclosed bracket');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('invalid_yaml');
  });

  it('should return ParseError with type invalid_schema when phases array is missing', () => {
    const noPhases = `
roadmap:
  project_id: test
`;
    const result = parseRoadmap(noPhases);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('invalid_schema');
    expect(result.error.message).toContain('phases');
  });

  it('should return ParseError with type invalid_schema when root is not an object', () => {
    const result = parseRoadmap('just a string');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('invalid_schema');
  });

  it('should parse roadmap meta fields as optional', () => {
    const minimalMeta = `
roadmap: {}
phases:
- id: '01'
  name: Phase one
  steps:
  - id: 01-01
    name: Step one
`;
    const result = parseRoadmap(minimalMeta);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.roadmap.project_id).toBeUndefined();
    expect(result.value.roadmap.created_at).toBeUndefined();
    expect(result.value.roadmap.total_steps).toBeUndefined();
  });

  it('should parse valid review_history entries on a step', () => {
    const yamlWithReview = `
roadmap:
  project_id: test
phases:
- id: '01'
  name: Phase one
  steps:
  - id: 01-01
    name: Step with reviews
    review_history:
    - cycle: 1
      timestamp: '2026-03-01T10:00:00Z'
      outcome: rejected
      feedback: Missing edge case tests
    - cycle: 2
      timestamp: '2026-03-02T14:00:00Z'
      outcome: approved
      feedback: All criteria met
`;
    const result = parseRoadmap(yamlWithReview);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const step = result.value.phases[0].steps[0];
    expect(step.review_history).toHaveLength(2);
    expect(step.review_history![0]).toEqual({
      cycle: 1,
      timestamp: '2026-03-01T10:00:00Z',
      outcome: 'rejected',
      feedback: 'Missing edge case tests',
    });
    expect(step.review_history![1]).toEqual({
      cycle: 2,
      timestamp: '2026-03-02T14:00:00Z',
      outcome: 'approved',
      feedback: 'All criteria met',
    });
  });

  it('should skip invalid review_history entries without failing the step', () => {
    const yamlWithInvalid = `
roadmap:
  project_id: test
phases:
- id: '01'
  name: Phase one
  steps:
  - id: 01-01
    name: Step with mixed reviews
    review_history:
    - cycle: 1
      timestamp: '2026-03-01T10:00:00Z'
      outcome: approved
      feedback: Looks good
    - cycle: not-a-number
      timestamp: '2026-03-01T11:00:00Z'
      outcome: approved
      feedback: Bad cycle
    - cycle: 2
      outcome: invalid_outcome
      feedback: Bad outcome
    - just-a-string
`;
    const result = parseRoadmap(yamlWithInvalid);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const step = result.value.phases[0].steps[0];
    expect(step.review_history).toHaveLength(1);
    expect(step.review_history![0].cycle).toBe(1);
  });

  it('should parse missing review_history as undefined (backward compatible)', () => {
    const yamlNoReview = `
roadmap:
  project_id: test
phases:
- id: '01'
  name: Phase one
  steps:
  - id: 01-01
    name: Step without reviews
`;
    const result = parseRoadmap(yamlNoReview);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const step = result.value.phases[0].steps[0];
    expect(step.review_history).toBeUndefined();
  });

  it('should use id field directly without normalization', () => {
    const yaml = `
roadmap:
  project_id: test
phases:
- id: phase-alpha
  name: Alpha phase
  steps:
  - id: alpha-01
    name: First alpha step
    status: claimed
`;
    const result = parseRoadmap(yaml);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value.phases[0].id).toBe('phase-alpha');
    expect(result.value.phases[0].steps[0].id).toBe('alpha-01');
  });
});

// --- JSON format parsing ---

const validRoadmapJson = JSON.stringify({
  roadmap: {
    project_id: 'directory-browser',
    created_at: '2026-03-02T18:44:29Z',
    total_steps: 2,
    phases: 1,
  },
  phases: [
    {
      id: '01',
      name: 'Server-side browse infrastructure',
      steps: [
        {
          id: '01-01',
          name: 'Add shared browse types',
          files_to_modify: ['board/shared/types.ts'],
          deps: [],
          criteria: ['BrowseEntry has readonly fields'],
          status: 'approved',
          teammate_id: 'crafter-01-01',
          started_at: '2026-03-02T18:50:00Z',
          completed_at: '2026-03-02T18:51:35Z',
          review_attempts: 1,
        },
        {
          id: '01-02',
          name: 'Create validation core',
          files_to_modify: ['board/server/browse.ts'],
          deps: ['01-01'],
          criteria: ['validateBrowsePath returns Result'],
          status: 'pending',
        },
      ],
    },
  ],
});

describe('parseRoadmap with JSON format', () => {
  it('should parse valid JSON roadmap with explicit format parameter', () => {
    const result = parseRoadmap(validRoadmapJson, 'json');

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const roadmap: Roadmap = result.value;
    expect(roadmap.roadmap.project_id).toBe('directory-browser');
    expect(roadmap.phases).toHaveLength(1);
    expect(roadmap.phases[0].steps).toHaveLength(2);
    expect(roadmap.phases[0].steps[0].id).toBe('01-01');
    expect(roadmap.phases[0].steps[0].status).toBe('approved');
  });

  it('should return ParseError with type invalid_json for malformed JSON', () => {
    const result = parseRoadmap('{ invalid json content', 'json');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('invalid_json');
  });

  it('should default to YAML parsing when format parameter is omitted', () => {
    const yamlContent = `
roadmap:
  project_id: test
phases:
- id: '01'
  name: Phase one
  steps:
  - id: 01-01
    name: Step one
`;
    const result = parseRoadmap(yamlContent);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.roadmap.project_id).toBe('test');
  });

  it('should produce identical results for equivalent YAML and JSON content', () => {
    const yamlContent = `
roadmap:
  project_id: identical-test
  total_steps: 1
phases:
- id: '01'
  name: Test phase
  steps:
  - id: 01-01
    name: Test step
    status: pending
    deps: []
    criteria:
      - First criterion
`;
    const jsonContent = JSON.stringify({
      roadmap: {
        project_id: 'identical-test',
        total_steps: 1,
      },
      phases: [
        {
          id: '01',
          name: 'Test phase',
          steps: [
            {
              id: '01-01',
              name: 'Test step',
              status: 'pending',
              deps: [],
              criteria: ['First criterion'],
            },
          ],
        },
      ],
    });

    const yamlResult = parseRoadmap(yamlContent, 'yaml');
    const jsonResult = parseRoadmap(jsonContent, 'json');

    expect(yamlResult.ok).toBe(true);
    expect(jsonResult.ok).toBe(true);
    if (!yamlResult.ok || !jsonResult.ok) return;

    expect(jsonResult.value).toEqual(yamlResult.value);
  });

  it('should apply same validation rules to JSON input', () => {
    const invalidJson = JSON.stringify({
      roadmap: { project_id: 'test' },
      // Missing phases array
    });

    const result = parseRoadmap(invalidJson, 'json');

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.type).toBe('invalid_schema');
    expect(result.error.message).toContain('phases');
  });
});
