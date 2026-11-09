import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'

// Exercise the real helper without adding a test framework or changing app config.
const source = readFileSync(new URL('../src/services/chatbotErrors.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
const sandbox = { exports: {} }
vm.runInNewContext(compiled, sandbox)
const { chatbotLanguage, chatbotErrorMessage } = sandbox.exports

test('French, English and Arabic error languages', () => {
  assert.equal(chatbotLanguage('combien de consultant', 'fr'), 'fr')
  assert.equal(chatbotLanguage('how many consultants', 'en'), 'en')
  assert.equal(chatbotLanguage('كم عدد المستشارين؟', 'fr'), 'ar')
  const failure = { response: { status: 503, data: { detail: { code: 'ai_model_unavailable' } } } }
  assert.match(chatbotErrorMessage(failure, 'fr'), /modèle/)
  assert.match(chatbotErrorMessage(failure, 'en'), /model/)
  assert.match(chatbotErrorMessage(failure, 'ar'), /نموذج/)
})

test('provider, backend connection and timeout errors stay distinct', () => {
  const provider = { response: { status: 502, data: { detail: { code: 'ai_connection' } } } }
  assert.match(chatbotErrorMessage(provider, 'en'), /AI service/)
  assert.match(chatbotErrorMessage({}, 'en'), /planning server/)
  assert.match(chatbotErrorMessage({ code: 'ECONNABORTED' }, 'en'), /too long/)
  assert.match(chatbotErrorMessage({ response: { status: 403 } }, 'en'), /access/)
})

test('unrecognized backend bodies cannot leak provider diagnostics', () => {
  for (const detail of ['private key', { code: '__proto__', message: 'private key' }, { code: 'unknown', message: 'private key' }]) {
    const message = chatbotErrorMessage({ response: { status: 500, data: { detail } } }, 'en')
    assert.match(message, /planning server/)
    assert.doesNotMatch(message, /private key/)
  }
})
