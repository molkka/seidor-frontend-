import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

const source = readFileSync(new URL('../src/pages/planning/planning-scenarios.ts', import.meta.url), 'utf8')
const sandbox = { exports: {} }
vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, sandbox)
const { groupPlanningVersions, preferredPlanningVersion } = sandbox.exports

test('empty scenario links resolve to the saved plan, even when the empty version is newer', () => {
  for (const [legacyName, generatedName] of [['V1.2', 'Réel 2027'], ['V1.1', 'Pessimiste 2027'], ['V1.3', 'Optimiste 2027']]) {
    const populated = { id: 98, nom: generatedName, assignment_count: 94 }
    const empty = { id: 100, nom: legacyName, assignment_count: 0 }
    assert.equal(groupPlanningVersions([empty, populated])[0].versions[0].id, 98)
    assert.equal(preferredPlanningVersion([empty, populated], 100).id, 98)
  }
})

test('explicit historical populated plans remain available', () => {
  const versions = [{ id: 10, nom: 'Réel 2027 · old', assignment_count: 2 }, { id: 98, nom: 'Réel 2027 · new', assignment_count: 94 }]
  assert.equal(preferredPlanningVersion(versions, 10).id, 10)
  assert.equal(groupPlanningVersions(versions)[0].versions[0].id, 98)
})

test('default selection ignores an empty current placeholder', () => {
  const versions = [{ id: 1, nom: 'V1.3', assignment_count: 0, est_actuelle: true }, { id: 98, nom: 'Réel 2027', assignment_count: 94 }]
  assert.equal(preferredPlanningVersion(versions).id, 98)
})

test('old servers without counts still resolve a legacy tag to its generated version', () => {
  assert.equal(preferredPlanningVersion([{ id: 10, nom: 'V1.2' }, { id: 98, nom: 'Réel 2027' }], 10).id, 98)
})
