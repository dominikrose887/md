/**
 * ~1800-line realistic markdown document for performance benchmarking.
 * Contains: TOC with anchor links, headings, code blocks (multiple languages),
 * tables, math (inline + display), blockquotes, task lists, images, horizontal
 * rules, nested lists, and long prose paragraphs.
 */

function generateCodeBlock(lang: string, lines: number): string {
  const samples: Record<string, (i: number) => string> = {
    typescript: (i) => {
      const snippets = [
        `interface Config${i} { host: string; port: number; debug: boolean; }`,
        `function process${i}(data: unknown[]): Promise<Config${i}> {`,
        `  const filtered = data.filter((d): d is Config${i} => d !== null);`,
        `  return Promise.resolve(filtered[0]);`,
        `}`,
        `export class Service${i} {`,
        `  private cache = new Map<string, Config${i}>();`,
        `  constructor(private readonly name: string) {}`,
        `  async init(): Promise<void> {`,
        `    const config = await process${i}([{ host: 'localhost', port: 3000 + ${i}, debug: true }]);`,
        `    this.cache.set(this.name, config);`,
        `  }`,
        `  get(key: string): Config${i} | undefined { return this.cache.get(key); }`,
        `}`,
      ];
      return snippets[i % snippets.length];
    },
    python: (i) => {
      const snippets = [
        `class DataProcessor${i}:`,
        `    def __init__(self, source: str, batch_size: int = 32):`,
        `        self.source = source`,
        `        self.batch_size = batch_size`,
        `        self._cache: dict[str, list] = {}`,
        `    def process(self) -> list[dict]:`,
        `        results = []`,
        `        for batch in self._iter_batches():`,
        `            results.extend(self._transform(batch))`,
        `        return results`,
        `    def _iter_batches(self):`,
        `        data = open(self.source).readlines()`,
        `        for i in range(0, len(data), self.batch_size):`,
        `            yield data[i:i + self.batch_size]`,
      ];
      return snippets[i % snippets.length];
    },
    javascript: (i) => {
      const snippets = [
        `const handler${i} = async (req, res) => {`,
        `  const { id, name } = req.params;`,
        `  const data = await db.query('SELECT * FROM items WHERE id = $1', [id]);`,
        `  if (!data.rows.length) {`,
        `    return res.status(404).json({ error: 'Not found' });`,
        `  }`,
        `  res.json({ item: data.rows[0], timestamp: Date.now() });`,
        `};`,
        `app.get('/api/items/:id', handler${i});`,
        `app.post('/api/items', validateBody, async (req, res) => {`,
        `  const result = await db.query('INSERT INTO items (name) VALUES ($1) RETURNING *', [req.body.name]);`,
        `  res.status(201).json(result.rows[0]);`,
        `});`,
      ];
      return snippets[i % snippets.length];
    },
    rust: (i) => {
      const snippets = [
        `pub struct Worker${i} {`,
        `    id: usize,`,
        `    thread: Option<std::thread::JoinHandle<()>>,`,
        `}`,
        `impl Worker${i} {`,
        `    pub fn new(id: usize, receiver: Arc<Mutex<mpsc::Receiver<Job>>>) -> Self {`,
        `        let thread = std::thread::spawn(move || loop {`,
        `            let job = receiver.lock().unwrap().recv().unwrap();`,
        `            println!("Worker {id} executing job");`,
        `            job();`,
        `        });`,
        `        Worker${i} { id, thread: Some(thread) }`,
        `    }`,
        `}`,
      ];
      return snippets[i % snippets.length];
    },
    sql: (i) => {
      const snippets = [
        `CREATE TABLE orders_${i} (`,
        `  id         SERIAL PRIMARY KEY,`,
        `  user_id    INTEGER NOT NULL REFERENCES users(id),`,
        `  total      DECIMAL(10,2) NOT NULL DEFAULT 0.00,`,
        `  status     VARCHAR(20) NOT NULL DEFAULT 'pending',`,
        `  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`,
        `);`,
        `CREATE INDEX idx_orders_${i}_user ON orders_${i}(user_id);`,
        `CREATE INDEX idx_orders_${i}_status ON orders_${i}(status);`,
      ];
      return snippets[i % snippets.length];
    },
    bash: (i) => {
      const snippets = [
        `#!/usr/bin/env bash`,
        `set -euo pipefail`,
        `DEPLOY_ENV="\${1:-staging}"`,
        `echo "Deploying build ${i} to $DEPLOY_ENV..."`,
        `docker build -t myapp:${i} .`,
        `docker push registry.example.com/myapp:${i}`,
        `kubectl set image deployment/myapp myapp=registry.example.com/myapp:${i}`,
        `echo "Deployment ${i} complete."`,
      ];
      return snippets[i % snippets.length];
    },
  };

  const gen = samples[lang] ?? samples.typescript;
  const out: string[] = [];
  for (let i = 0; i < lines; i++) {
    out.push(gen(i));
  }
  return '```' + lang + '\n' + out.join('\n') + '\n```';
}

function generateTable(rows: number, cols: number, label: string): string {
  const header = '| ' + Array.from({ length: cols }, (_, c) => `${label} Col ${c + 1}`).join(' | ') + ' |';
  const sep = '| ' + Array.from({ length: cols }, () => '---').join(' | ') + ' |';
  const body = Array.from({ length: rows }, (_, r) =>
    '| ' + Array.from({ length: cols }, (_, c) => `Row ${r + 1}-${c + 1}`).join(' | ') + ' |'
  ).join('\n');
  return [header, sep, body].join('\n');
}

function generateProse(paragraphs: number): string {
  const templates = [
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
    'Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Curabitur pretium tincidunt lacus. Nulla gravida orci a odio. Nullam varius, turpis et commodo pharetra, est eros bibendum elit, nec luctus magna felis sollicitudin mauris.',
    'Integer in mauris eu nibh euismod gravida. Duis ac tellus et risus vulputate vehicula. Donec lobortis risus a elit. Etiam tempor. Ut ullamcorper, ligula ut dictum pharetra, nisi nunc fringilla magna, in commodo elit erat nec turpis. Ut pharetra auctor commodo.',
    'Praesent dapibus, neque id cursus faucibus, tortor neque egestas augue, eu vulputate magna eros eu erat. Aliquam erat volutpat. Nam dui mi, tincidunt quis, accumsan porttitor, facilisis luctus, metus. Phasellus ultrices nulla quis nibh. Quisque a lectus.',
    'Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Proin pharetra nonummy pede. Mauris et orci. Aenean nec lorem. In porttitor. Donec laoreet nonummy augue. Suspendisse dui purus, scelerisque at, vulputate vitae, pretium mattis, nunc.',
  ];
  return Array.from({ length: paragraphs }, (_, i) => templates[i % templates.length]).join('\n\n');
}

export function generateLargeTestDocument(): string {
  const sections: string[] = [];

  sections.push('# API Reference & Architecture Guide\n');
  sections.push('> A comprehensive technical reference document for benchmarking performance with realistic markdown content.\n');

  // TOC
  const tocEntries = [
    '- [1. Introduction](#1-introduction)',
    '- [2. Architecture Overview](#2-architecture-overview)',
    '  - [2.1 System Components](#21-system-components)',
    '  - [2.2 Data Flow](#22-data-flow)',
    '- [3. API Endpoints](#3-api-endpoints)',
    '  - [3.1 Authentication](#31-authentication)',
    '  - [3.2 Resources](#32-resources)',
    '  - [3.3 Batch Operations](#33-batch-operations)',
    '- [4. Database Schema](#4-database-schema)',
    '- [5. Configuration](#5-configuration)',
    '- [6. Deployment](#6-deployment)',
    '  - [6.1 Docker](#61-docker)',
    '  - [6.2 Kubernetes](#62-kubernetes)',
    '- [7. Performance](#7-performance)',
    '  - [7.1 Benchmarks](#71-benchmarks)',
    '  - [7.2 Optimization](#72-optimization)',
    '- [8. Mathematical Models](#8-mathematical-models)',
    '- [9. Troubleshooting](#9-troubleshooting)',
    '- [10. Appendix](#10-appendix)',
  ];
  sections.push('## Table of Contents\n');
  sections.push(tocEntries.join('\n'));

  // Section 1
  sections.push('\n---\n');
  sections.push('## 1. Introduction\n');
  sections.push(generateProse(4));
  sections.push('\n### Key Features\n');
  sections.push('- [x] Real-time data processing pipeline');
  sections.push('- [x] Horizontal auto-scaling');
  sections.push('- [x] Multi-region replication');
  sections.push('- [ ] GraphQL federation gateway');
  sections.push('- [ ] Event sourcing migration');
  sections.push('- [x] End-to-end encryption');
  sections.push('- [ ] Canary deployment automation\n');

  // Section 2
  sections.push('---\n');
  sections.push('## 2. Architecture Overview\n');
  sections.push(generateProse(3));

  sections.push('\n### 2.1 System Components\n');
  sections.push(generateProse(2));
  sections.push('\nThe core service uses a TypeScript backend:\n');
  sections.push(generateCodeBlock('typescript', 14));
  sections.push('\nWith a Python ML pipeline:\n');
  sections.push(generateCodeBlock('python', 14));

  sections.push('\n### 2.2 Data Flow\n');
  sections.push(generateProse(2));
  sections.push('\n' + generateTable(8, 5, 'Component'));

  // Section 3
  sections.push('\n---\n');
  sections.push('## 3. API Endpoints\n');
  sections.push(generateProse(2));

  sections.push('\n### 3.1 Authentication\n');
  sections.push(generateProse(2));
  sections.push('\nAuthentication handler:\n');
  sections.push(generateCodeBlock('javascript', 12));

  sections.push('\n### 3.2 Resources\n');
  sections.push('\n' + generateTable(12, 4, 'Endpoint'));
  sections.push('\nResource controller:\n');
  sections.push(generateCodeBlock('typescript', 14));
  sections.push('\n' + generateProse(2));

  sections.push('\n### 3.3 Batch Operations\n');
  sections.push(generateProse(2));
  sections.push('\nBatch processor (Rust):\n');
  sections.push(generateCodeBlock('rust', 14));
  sections.push('\n> **Note:** Batch operations are processed asynchronously. The response includes a `job_id` that can be polled for status.\n');
  sections.push('> **Warning:** Maximum batch size is 1000 items. Exceeding this limit returns HTTP 413.\n');

  // Section 4
  sections.push('---\n');
  sections.push('## 4. Database Schema\n');
  sections.push(generateProse(2));
  sections.push('\n' + generateCodeBlock('sql', 9));
  sections.push('\nAdditional tables:\n');
  sections.push(generateCodeBlock('sql', 9));
  sections.push('\n' + generateTable(10, 6, 'Schema'));
  sections.push('\n' + generateProse(2));

  // Section 5
  sections.push('\n---\n');
  sections.push('## 5. Configuration\n');
  sections.push(generateProse(3));
  sections.push('\nEnvironment configuration:\n');
  sections.push(generateCodeBlock('bash', 8));
  sections.push('\nApplication config (TypeScript):\n');
  sections.push(generateCodeBlock('typescript', 14));
  sections.push('\n' + generateTable(6, 4, 'Config'));

  // Section 6
  sections.push('\n---\n');
  sections.push('## 6. Deployment\n');
  sections.push(generateProse(2));

  sections.push('\n### 6.1 Docker\n');
  sections.push(generateProse(2));
  sections.push('\n' + generateCodeBlock('bash', 8));

  sections.push('\n### 6.2 Kubernetes\n');
  sections.push(generateProse(2));
  sections.push('\n' + generateCodeBlock('bash', 8));
  sections.push('\n' + generateTable(8, 4, 'K8s'));

  // Section 7
  sections.push('\n---\n');
  sections.push('## 7. Performance\n');
  sections.push(generateProse(2));

  sections.push('\n### 7.1 Benchmarks\n');
  sections.push('\n' + generateTable(15, 5, 'Benchmark'));
  sections.push('\n' + generateProse(2));
  sections.push('\nBenchmark runner:\n');
  sections.push(generateCodeBlock('typescript', 14));

  sections.push('\n### 7.2 Optimization\n');
  sections.push(generateProse(3));
  sections.push('\n' + generateCodeBlock('python', 14));

  // Section 8 - Math
  sections.push('\n---\n');
  sections.push('## 8. Mathematical Models\n');
  sections.push('\nThe system uses several mathematical models for load prediction and scaling.\n');
  sections.push('\nInline: The latency model follows $L(n) = \\alpha + \\beta \\cdot \\log(n)$ where $\\alpha$ is the base latency and $\\beta$ is the scaling factor.\n');
  sections.push('\nThroughput is modeled as $T = \\frac{N}{L(n) + \\gamma}$ where $\\gamma$ accounts for network overhead.\n');
  sections.push('\nDisplay math — the full prediction model:\n');
  sections.push('\n$$\n\\hat{y} = \\sum_{i=1}^{k} w_i \\cdot f_i(x) + \\epsilon\n$$\n');
  sections.push('\nWhere the loss function is:\n');
  sections.push('\n$$\n\\mathcal{L}(\\theta) = -\\frac{1}{N} \\sum_{i=1}^{N} \\left[ y_i \\log(\\hat{y}_i) + (1 - y_i) \\log(1 - \\hat{y}_i) \\right] + \\lambda \\|\\theta\\|_2^2\n$$\n');
  sections.push('\nThe scaling decision boundary:\n');
  sections.push('\n$$\n\\text{scale}(t) = \\begin{cases} \\text{up} & \\text{if } \\bar{L}(t) > \\tau_u \\\\ \\text{down} & \\text{if } \\bar{L}(t) < \\tau_d \\\\ \\text{hold} & \\text{otherwise} \\end{cases}\n$$\n');
  sections.push('\n' + generateProse(3));

  // Section 9
  sections.push('\n---\n');
  sections.push('## 9. Troubleshooting\n');
  sections.push(generateProse(3));
  sections.push('\n' + generateTable(10, 4, 'Error'));
  sections.push('\nDiagnostic script:\n');
  sections.push(generateCodeBlock('bash', 8));
  sections.push('\n' + generateProse(2));

  // Section 10
  sections.push('\n---\n');
  sections.push('## 10. Appendix\n');
  sections.push(generateProse(4));
  sections.push('\nFull configuration reference:\n');
  sections.push(generateCodeBlock('typescript', 14));
  sections.push('\n' + generateCodeBlock('python', 14));
  sections.push('\n' + generateTable(12, 5, 'Ref'));
  sections.push('\n' + generateProse(3));

  // Extra sections to reach ~1500+ lines
  for (let s = 11; s <= 18; s++) {
    sections.push('\n---\n');
    sections.push(`## ${s}. Extended Reference ${s - 10}\n`);
    sections.push(generateProse(3));
    sections.push(`\nExample ${s} implementation:\n`);
    const langs = ['typescript', 'python', 'javascript', 'rust', 'sql', 'bash'];
    sections.push(generateCodeBlock(langs[s % langs.length], 14));
    sections.push('\n' + generateTable(8, 4, `Ref${s}`));
    sections.push('\n' + generateProse(2));
    if (s % 2 === 0) {
      sections.push(`\nThe cost function for module ${s} is $C_{${s}}(x) = \\sum_{i=1}^{n} w_i x_i^2 + \\lambda$ with constraint $\\|x\\| \\leq 1$.\n`);
      sections.push(`\n$$\n\\nabla C_{${s}} = 2 \\sum_{i=1}^{n} w_i x_i + \\mu\n$$\n`);
    }
    sections.push('\n> **Important:** This section documents internal APIs subject to change without notice.\n');
    sections.push(generateCodeBlock(langs[(s + 1) % langs.length], 14));
  }

  sections.push('\n---\n');
  sections.push('\n**Last updated:** April 29, 2026 | **Version:** 2.0.0\n');

  return sections.join('\n');
}
