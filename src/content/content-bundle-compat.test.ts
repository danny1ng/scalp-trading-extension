import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

describe('content bundle compatibility', () => {
  test('content modules do not import popup safe-mode module', () => {
    const sourcePath = resolve(process.cwd(), 'src/content/modules/hud-slots.ts');
    const source = readFileSync(sourcePath, 'utf8');

    expect(source).not.toContain("../../lib/safe-mode-settings");
  });
});
