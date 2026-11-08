const authorship = 'I wrote this issue myself without using an LLM or copying LLM-generated descriptions or phrasing.';
const forms = {
  Bug: {
    file: 'bug_report.yml',
    required: ['OhMyKeymint version', 'Environment', 'Affected package', 'Reproduction steps',
      'Expected behavior', 'Actual behavior', 'KeyMint log', 'Injector log', 'Logcat output'],
    optional: ['Relevant configuration', 'Additional context'],
    checks: [
      'I kept the required `[Bug]` prefix and added a specific title after it.',
      'I read the FAQ and found no issue reporting the same problem.',
      'I reproduced this on a current release or an identifiable build, or explained below why I could not.',
      'This is not caused by deliberately relaxing filters to intercept Android, system, or core callers; that configuration is outside the support scope.',
    ],
  },
  Feature: {
    file: 'feature_request.yml',
    required: ['Current problem or limitation', 'Use case', 'Desired behavior', 'Compatibility and risk'],
    optional: ['Alternatives considered'],
    checks: [
      'I kept the required `[Feature]` prefix and added a specific title after it.',
      'I found no issue requesting the same behavior.',
      'This is not a bug report or a general usage question.',
      'The request keeps Android as the production target and considers Android 12-17 compatibility.',
    ],
  },
  Question: {
    file: 'question.yml',
    required: ['Question', 'Goal and background'],
    optional: ['Relevant environment and configuration'],
    checks: [
      'I kept the required `[Question]` prefix and added a specific title after it.',
      'The FAQ, README, and existing issues do not answer this question.',
      'This is not a reproducible bug or a feature request.',
    ],
  },
};

function validateIssue({ title = '', body = '' }) {
  const kind = /^\[(Bug|Feature|Question)\] +\S/.exec(title)?.[1];
  if (!kind) return ['Use a form title prefix ([Bug], [Feature], or [Question]) followed by a specific title.'];

  const form = forms[kind];
  const headings = new Set(['Pre-submission checks', ...form.required, ...form.optional]);
  const sections = new Map();
  const checked = new Set();
  let current;
  let fence;
  for (const line of (body ?? '').replace(/\r\n?/g, '\n').split('\n')) {
    const marker = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);
    if (!fence && marker) {
      fence = marker[1];
    } else if (fence && marker && marker[1][0] === fence[0]
        && marker[1].length >= fence.length && marker[2].trim() === '') {
      fence = undefined;
    } else if (!fence) {
      const heading = /^### (.+?)\s*$/.exec(line)?.[1];
      if (headings.has(heading)) {
        current = heading;
        if (!sections.has(current)) sections.set(current, []);
        continue;
      }
      if (current === 'Pre-submission checks') {
        const check = /^\s*- \[[xX]\] (.+?)\s*$/.exec(line)?.[1];
        if (check) checked.add(check);
      }
    }
    if (current) sections.get(current).push(line);
  }

  const errors = [];
  for (const label of form.required) {
    const value = sections.get(label)?.join('\n').trim();
    if (!value || value === '_No response_') errors.push(`Complete the required "${label}" field.`);
  }
  if (![...form.checks, authorship].every(check => checked.has(check))) {
    errors.push('Complete every pre-submission checkbox, including the prohibition on LLM-written issues.');
  }
  return errors;
}

module.exports = validateIssue;

if (require.main === module) {
  const assert = require('node:assert/strict');
  const { readFileSync } = require('node:fs');
  const { join } = require('node:path');
  for (const [kind, form] of Object.entries(forms)) {
    const template = readFileSync(join(__dirname, '../ISSUE_TEMPLATE', form.file), 'utf8');
    const checks = [...form.checks, authorship];
    assert(template.includes(`title: "[${kind}] "`));
    for (const label of [...form.required, ...form.optional, ...checks]) {
      assert(template.includes(`label: ${label}\n`), `${form.file}: missing "${label}"`);
    }
    assert.equal((template.match(/^ +required: true$/gm) ?? []).length, form.required.length + checks.length);

    const preflight = `### Pre-submission checks\n\n${checks.map(check => `- [x] ${check}`).join('\n')}`;
    const fields = form.required.map(label => `### ${label}\n\nFirsthand evidence.`);
    const body = [preflight, ...fields].join('\n\n');
    const title = `[${kind}] A specific issue`;
    assert.deepEqual(validateIssue({ title, body }), []);
    assert.deepEqual(validateIssue({ title, body: body.replaceAll('[x]', '[X]').replaceAll('\n', '\r\n') }), []);
    assert.deepEqual(validateIssue({ title, body: `${body}\n\n### ${form.optional[0]}\n\n_No response_` }), []);
    assert(validateIssue({ title: `[${kind}] `, body }).length > 0);
    assert(validateIssue({ title, body: null }).length > 0);
    for (const field of fields) {
      assert(validateIssue({ title, body: body.replace(field, '') }).length > 0);
      assert(validateIssue({ title, body: body.replace(field, field.replace('Firsthand evidence.', '_No response_')) }).length > 0);
    }
    for (const check of checks) {
      assert(validateIssue({ title, body: body.replace(`- [x] ${check}`, `- [ ] ${check}`) }).length > 0);
    }
    const nested = `\n\n### User-provided detail\n\nMore evidence.\n\n\`\`\`text\n### ${form.required[0]}\n\n\`\`\``;
    assert.deepEqual(validateIssue({ title, body: `${body}${nested}` }), []);
    assert(validateIssue({ title, body: `${preflight}\n\n\`\`\`text\n${fields.join('\n\n')}\n\`\`\`` }).length > 0);
    assert(validateIssue({ title, body: `### Pre-submission checks\n\n~~~\n${checks.map(check => `- [x] ${check}`).join('\n')}\n~~~\n\n${fields.join('\n\n')}` }).length > 0);
  }
  assert(validateIssue({ title: 'A blank issue', body: 'No template.' }).length > 0);
  console.log('Issue policy checks passed for all three forms.');
}
