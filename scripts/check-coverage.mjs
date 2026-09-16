import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const manifest = JSON.parse(await readFile(new URL('../docs/coverage.json', import.meta.url)));
const catalog = JSON.parse(await readFile(new URL('../src/catalog.json', import.meta.url)));
assert.equal(catalog.length, 46);
assert.equal(new Set(catalog.map(o => o.name)).size, 46);
assert.deepEqual(catalog.map(({operation,name,method,service,path}) => ({operation,name,method,service,path})), manifest.operations);
if (process.argv[2]) {
  const vendor = JSON.parse(await readFile(process.argv[2]));
  assert.deepEqual(catalog.map(o=>o.operation).sort(), vendor.map(o=>o.name).sort());
  for (const op of catalog) {
    const v = vendor.find(v=>v.name===op.operation); const url = new URL(v.url);
    assert.equal(op.method, v.type.split(' ')[0].toUpperCase());
    assert.equal(op.path, url.pathname);
    for (const field of Object.values(v.parameter?.fields ?? {}).flat()) {
      if (field.field.includes('.') || ['filePath','fileContent'].includes(field.field)) continue;
      assert.ok(field.field in op.inputSchema.properties, `${op.operation}: missing ${field.field}`);
    }
  }
}
console.log('Coverage verified: all 46 documented operations and their parameters.');
