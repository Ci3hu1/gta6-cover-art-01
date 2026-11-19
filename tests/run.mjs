// Test runner: node tests/run.mjs
import { testInk } from './ink.test.mjs';
import { testGrades, testLayouts } from './grades-layouts.test.mjs';
import { testDossier } from './dossier.test.mjs';

const tests = [
  ['ink pipeline', testInk],
  ['grades', testGrades],
  ['layouts', testLayouts],
  ['dossier (main.ts)', testDossier],
];

let failed = 0;
for (const [name, fn] of tests) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (err) {
    failed++;
    console.log(`FAIL ${name}: ${err.message}`);
  }
}
console.log(failed === 0 ? 'ALL TESTS PASSED' : `${failed} TEST(S) FAILED`);
process.exit(failed === 0 ? 0 : 1);
