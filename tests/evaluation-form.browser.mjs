import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtempSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Isolated Chrome profile + intercepted synthetic API responses. No production writes.
// Run with Vite already serving http://localhost:5173; no browser dependency required.
const executable = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
assert.ok(existsSync(executable), 'Set CHROME_PATH to an installed Chromium browser')
const role = process.env.TEST_ROLE ?? 'ADMIN'
const readPermissions = ['dashboard:read','planning:read','project:read','consultant:read','evaluation:read','evaluation:create']
const currentUser = {id:'1',nom:'Évaluateur Test',email:'test@example.invalid',role,email_verified:true,consultant_id:process.env.TEST_SELF ? 1 : 5,permissions:role==='ADMIN'?[...readPermissions,'admin:access','consultant:write','project:write','planning:write','evaluation:delete']:readPermissions}
const output = mkdtempSync(join(tmpdir(), 'planning-evaluation-'))
const browser = spawn(executable, ['--headless=new', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=0', `--user-data-dir=${output}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' })
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))
let ws
let nextId = 0
const pending = new Map()
const handlers = new Map()
const networkErrors = []
const scriptErrors = []
let posts = []
let history = []
let registrationUnavailable = true
let verificationConsumed = false
let authRequests = []
let failNextSave = false
let holdSave = false

async function until(check, message, timeout = 30000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) { if (await check()) return; await delay(100) }
  throw new Error(message)
}
function send(method, params = {}) {
  const id = ++nextId
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    ws.send(JSON.stringify({ id, method, params }))
  })
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text + ': ' + result.exceptionDetails.exception?.description)
  return result.result.value
}
async function click(selector) {
  const point = await evaluate(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) throw new Error('Element absent'); el.scrollIntoView({block:'center'}); const r=el.getBoundingClientRect(); return {x:r.x+r.width/2,y:r.y+r.height/2} })()`)
  await send('Input.dispatchMouseEvent', { type:'mousePressed', ...point, button:'left', clickCount:1 })
  await send('Input.dispatchMouseEvent', { type:'mouseReleased', ...point, button:'left', clickCount:1 })
  await delay(100)
}
async function key(key, code = key) {
  await send('Input.dispatchKeyEvent', { type:'keyDown', key, code })
  await send('Input.dispatchKeyEvent', { type:'keyUp', key, code })
  await delay(50)
}
async function select(value) {
  await evaluate(`(() => { const el=document.querySelector('form select'); el.value=${JSON.stringify(value)}; el.dispatchEvent(new Event('change',{bubbles:true})) })()`)
  await delay(50)
}
async function comment(value) {
  await evaluate(`(() => { const el=document.querySelector('form textarea'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(el,${JSON.stringify(value)}); el.dispatchEvent(new Event('input',{bubbles:true})) })()`)
  await delay(50)
}
const form = 'form[aria-label="Nouvelle évaluation"]'
const skill = '[role="tab"][aria-label="Par compétence (module)"]'
const project = '[role="tab"][aria-label="Par projet (rendement)"]'
const star = value => `[role="radio"][aria-label="${value} étoile${value>1?'s':''} sur 5"]`
async function openForm() {
  await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent.trim()==='Évaluer').click()`)
  await until(() => evaluate(`Boolean(document.querySelector(${JSON.stringify(form)}))`), 'Evaluation form did not open')
}
function passed(message) { process.stdout.write('PASS ' + message + '\n') }

try {
  await until(() => existsSync(join(output,'DevToolsActivePort')), 'Chrome did not start')
  const port = readFileSync(join(output,'DevToolsActivePort'),'utf8').split('\n')[0]
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  ws = new WebSocket(targets.find(target=>target.type==='page').webSocketDebuggerUrl)
  ws.addEventListener('message', event => {
    const message=JSON.parse(event.data)
    if(message.id) {
      const task=pending.get(message.id); pending.delete(message.id)
      if(message.error) task?.reject(new Error(JSON.stringify(message.error))); else task?.resolve(message.result)
    } else handlers.get(message.method)?.(message.params)
  })
  await new Promise((resolve,reject)=>{ws.addEventListener('open',resolve,{once:true});ws.addEventListener('error',reject,{once:true})})
  handlers.set('Runtime.exceptionThrown', event => scriptErrors.push(event.exceptionDetails.text))
  handlers.set('Fetch.requestPaused', async ({requestId,request}) => {
    try {
      const url=new URL(request.url)
      let status=200
      let body=[]
      if(request.method==='OPTIONS') body={}
      else if(url.pathname==='/auth/register') {
        authRequests.push({path:url.pathname,payload:JSON.parse(request.postData)})
        if(registrationUnavailable) {status=503;body={detail:'Unavailable'};registrationUnavailable=false}
        else {status=202;body={message:'Accepted'}}
      }
      else if(url.pathname==='/auth/verification-status') body={valid:!verificationConsumed}
      else if(url.pathname==='/auth/verify-email') {authRequests.push({path:url.pathname,payload:JSON.parse(request.postData)});verificationConsumed=true;body={message:'Verified'}}
      else if (url.pathname==='/auth/me') body=currentUser
      else if (url.pathname==='/consultants/1') body={id:1,code:'TEST',nom_complet:'Consultant Test',email:'test@example.invalid',seniorite:'SENIOR',main_module:'SD',other_modules:['MM'],statut:'Active',division:'Test',localisation:'Test',annees_experience_sap:5,annees_experience_total:8}
      else if(url.pathname==='/planning/versions') body=[{id:1,nom:'V1.3',annee:2026,est_actuelle:true}]
      else if(url.pathname==='/projets' || url.pathname==='/projets/') body=[{id:10,nom:'Projet de test',wbs_code:'TEST-10'}]
      else if(url.pathname==='/scores/consultant/1') body=history
      else if(url.pathname==='/scores/' && request.method==='POST') {
        const payload=JSON.parse(request.postData)
        posts.push(payload)
        if(holdSave) await delay(700)
        if(failNextSave) {status=500;body={detail:'Erreur de test contrôlée.'};failNextSave=false}
        else {
          body={...payload,id:history.length+1,evaluateur_id:1,evaluateur_nom:'Évaluateur Test',evaluateur_email:'test@example.invalid',projet_nom:payload.projet_id?'Projet de test':null,date_creation:new Date().toISOString()}
          history.push(body)
        }
      }
      await send('Fetch.fulfillRequest',{requestId,responseCode:status,responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Access-Control-Allow-Origin',value:'http://localhost:5173'},{name:'Access-Control-Allow-Headers',value:'*'},{name:'Access-Control-Allow-Methods',value:'*'}],body:Buffer.from(JSON.stringify(body)).toString('base64')})
    } catch(error) {networkErrors.push(error.message)}
  })
  await send('Page.enable');await send('Runtime.enable')
  await send('Fetch.enable',{patterns:[{urlPattern:'http://localhost:8000/*'},{urlPattern:'http://127.0.0.1:8000/*'}]})
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`if(location.origin==='http://localhost:5173'){localStorage.setItem('planning-auth',JSON.stringify({state:{token:'synthetic-browser-test',user:${JSON.stringify(currentUser)}},version:0}));localStorage.setItem('planning-year',JSON.stringify({state:{selectedYear:2026},version:0}))}`})
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1100,deviceScaleFactor:1,mobile:false})
  if(process.env.TEST_AUTH) {
    await send('Page.navigate',{url:'http://localhost:5173/sign-up'})
    await until(()=>evaluate(`Boolean(document.querySelector('input[type="email"]'))`),'Registration page missing')
    for(const [language,title,direction] of [['EN','Create a consultant account','ltr'],['العربية','إنشاء حساب مستشار','rtl'],['FR','Créer un compte consultant','ltr']]) {
      await evaluate(`Array.from(document.querySelectorAll('button')).find(button=>button.textContent===${JSON.stringify(language)}).click()`)
      await until(()=>evaluate(`(document.body?.textContent ?? '').includes(${JSON.stringify(title)})`),'Missing localized registration title')
      assert.equal(await evaluate(`document.querySelector('section[dir]').dir`),direction)
    }
    passed('registration French, English and Arabic messages and direction')
    async function fill(selector,value) {
      await evaluate(`(() => {const input=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}))})()`)
    }
    await fill('input[autocomplete="name"]','Synthetic Consultant')
    await fill('input[type="email"]','synthetic@example.invalid')
    await fill('form label:nth-of-type(3) input','SyntheticPassword9')
    await delay(100)
    await fill('form label:nth-of-type(4) input','SyntheticPassword9')
    await delay(100)
    assert.equal(await evaluate(`document.querySelector('input[autocomplete="new-password"]').type`),'password')
    await evaluate(`document.querySelector('form').requestSubmit()`)
    await until(()=>evaluate(`Boolean(document.querySelector('[role="alert"]'))`),'SMTP error not displayed')
    assert.equal(authRequests.length,1,'Submission did not reach API: '+await evaluate(`document.body.textContent`))
    assert.match(await evaluate(`document.querySelector('[role="alert"]').textContent`),/email est indisponible/)
    await delay(100)
    await evaluate(`document.querySelector('form').requestSubmit()`)
    await until(()=>evaluate(`Boolean(document.querySelector('[role="status"]'))`),'Registration acceptance missing')
    assert.equal(authRequests.length,2)
    assert.deepEqual(Object.keys(authRequests[1].payload).sort(),['email','nom','password'])
    passed('real registration request shape, masked passwords, SMTP error and generic acceptance')
    await send('Page.navigate',{url:'http://localhost:5173/verify-email#token=synthetic-verification-token-123456789'})
    await until(()=>evaluate(`Boolean(document.querySelector('form input[autocomplete="new-password"]'))`),'Verification form missing')
    assert.equal(await evaluate('location.hash'),'')
    await fill('input[autocomplete="new-password"]','SyntheticPassword9')
    await evaluate(`document.querySelector('form').requestSubmit()`)
    await until(()=>evaluate(`!document.querySelector('form') && (document.body?.textContent ?? '').includes('connecter')`),'Activation confirmation missing')
    assert.equal(authRequests.at(-1).path,'/auth/verify-email')
    assert.equal(authRequests.at(-1).payload.token,'synthetic-verification-token-123456789')
    await send('Page.navigate',{url:'about:blank'})
    await send('Page.navigate',{url:'http://localhost:5173/verify-email#token=synthetic-verification-token-123456789'})
    await until(()=>evaluate(`(document.body?.textContent ?? '').includes('invalide')`),'Used link not rejected in UI')
    assert.equal(await evaluate(`Boolean(document.querySelector('form'))`),false)
    assert.equal(scriptErrors.length,0)
    assert.equal(networkErrors.length,0)
    passed('verification fragment removal, activation confirmation and used-link handling')
  } else {
  await send('Page.navigate',{url:'http://localhost:5173/consultants/1'})
  await until(()=>evaluate(`(document.body?.textContent ?? '').includes('Consultant Test')`),'Consultant Details did not load')
  if(role==='CONSULTANT') {
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('button')).some(b=>/Modifier le profil|Supprimer le consultant|Ajouter une photo|Changer la photo/.test(b.textContent))`),false)
    passed('consultant cannot access profile mutations')
  }
  if(process.env.TEST_SELF) {
    assert.equal(await evaluate(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()==='Évaluer')`),false)
    passed('self-evaluation control is absent')
    process.exitCode=0
  } else {
  await until(()=>evaluate(`Array.from(document.querySelectorAll('button')).some(b=>b.textContent.trim()==='Évaluer')`),'Evaluation action did not load')
  await openForm()
  await click(`${form} button[type="submit"]`)
  assert.match(await evaluate(`document.querySelector('[role="alert"]').textContent`),/Sélectionnez un module/)
  assert.equal(posts.length,0)
  await select('SD')
  await click(`${form} button[type="submit"]`)
  assert.match(await evaluate(`document.querySelector('[role="alert"]').textContent`),/Sélectionnez une note/)
  assert.equal(posts.length,0)
  passed('required module and rating validation preserved')

  await click(star(3))
  await click(star(3))
  assert.equal(await evaluate(`document.querySelectorAll('[role="radio"][aria-checked="true"]').length`),0)
  await evaluate(`document.querySelector(${JSON.stringify(star(1))}).focus()`)
  await key('ArrowRight')
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(star(2))}).getAttribute('aria-checked')`),'true')
  await key('End')
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(star(5))}).getAttribute('aria-checked')`),'true')
  await key('Home')
  assert.equal(await evaluate(`document.querySelector(${JSON.stringify(star(1))}).getAttribute('aria-checked')`),'true')
  await key(' ','Space')
  assert.equal(await evaluate(`document.querySelectorAll('[role="radio"][aria-checked="true"]').length`),0)
  passed('star click/toggle, arrow keys, Home/End and Space')

  await click(star(4));await comment('  Points forts de test  ')
  const before=posts.length
  holdSave=true
  await evaluate(`document.querySelector(${JSON.stringify(form)}).requestSubmit();document.querySelector(${JSON.stringify(form)}).requestSubmit()`)
  await until(()=>evaluate(`Boolean(document.querySelector(${JSON.stringify(form)})?.getAttribute('aria-busy')==='true')`),'Saving state absent')
  assert.equal(await evaluate(`document.querySelector('form button[type="submit"]').disabled`),true)
  assert.equal(await evaluate(`document.querySelector('form textarea').disabled || document.querySelector('form textarea').matches(':disabled')`),true)
  await until(()=>evaluate(`!document.querySelector(${JSON.stringify(form)})`),'Saved form did not close')
  assert.equal(posts.length,before+1)
  assert.deepEqual(posts.at(-1),{consultant_id:1,projet_id:null,module:'SD',note:4,commentaire:'Points forts de test'})
  passed('skill save payload, comment trimming, loading lock and duplicate-submit protection')
  holdSave=false

  await openForm();await comment('Commentaire partagé')
  await evaluate(`document.querySelector(${JSON.stringify(skill)}).focus()`)
  await key('ArrowRight')
  await until(()=>evaluate(`document.querySelector(${JSON.stringify(project)})?.getAttribute('data-state')==='active'`),'Keyboard tab switching failed')
  assert.equal(await evaluate(`document.querySelector('form textarea').value`),'Commentaire partagé')
  assert.equal(await evaluate(`document.querySelector('form select').value`),'')
  assert.equal(await evaluate(`document.querySelectorAll('[role="radio"][aria-checked="true"]').length`),0)
  await click(`${form} button[type="submit"]`)
  assert.match(await evaluate(`document.querySelector('[role="alert"]').textContent`),/Sélectionnez un projet/)
  await select('10');await click(star(5));await comment('')
  await click(`${form} button[type="submit"]`)
  await until(()=>evaluate(`!document.querySelector(${JSON.stringify(form)})`),'Project save did not close form')
  assert.deepEqual(posts.at(-1),{consultant_id:1,projet_id:10,module:'Rendement projet',note:5,commentaire:null})
  passed('project mode, native project options, shared comment state, keyboard tabs and exact save payload')

  await openForm();await click(skill);await select('MM');await click(star(2));await comment('À conserver')
  failNextSave=true
  await click(`${form} button[type="submit"]`)
  await until(()=>evaluate(`document.querySelector('[role="alert"]')?.textContent==='Erreur de test contrôlée.'`),'Save error not shown')
  assert.equal(await evaluate(`document.querySelector('form textarea').value`),'À conserver')
  assert.equal(await evaluate(`document.querySelector('form button[type="submit"]').disabled`),false)
  passed('API error preserves entered data and releases loading state')

  await evaluate(`Array.from(document.querySelectorAll('form button')).find(b=>b.textContent==='Annuler').click()`)
  await openForm()
  assert.equal(await evaluate(`document.querySelector('form textarea').value`),'')
  assert.equal(await evaluate(`document.querySelector('form select').value`),'')
  assert.equal(await evaluate(`document.querySelectorAll('[role="radio"][aria-checked="true"]').length`),0)
  passed('cancel closes and resets the existing shared form')

  await select('SD');await click(star(4))
  for(const [name,width,height] of [['desktop',1440,1100],['tablet',768,1100],['mobile',375,1000]]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false})
    await evaluate(`document.querySelector(${JSON.stringify(form)}).scrollIntoView({block:'center'})`)
    await delay(250)
    const bounds=await evaluate(`(() => {const f=document.querySelector(${JSON.stringify(form)});const r=f.getBoundingClientRect();return {left:r.left,right:r.right,width:innerWidth,overflow:f.scrollWidth>f.clientWidth,stars:[...f.querySelectorAll('[role="radio"]')].map(el=>({width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height}))}})()`)
    assert.ok(bounds.left>=0 && bounds.right<=bounds.width+1, name+' form outside viewport')
    assert.equal(bounds.overflow,false,name+' form overflow')
    assert.ok(bounds.stars.every(size=>size.width>=44 && size.height>=44),name+' star targets under 44px')
    const screenshot=await send('Page.captureScreenshot',{format:'png'})
    writeFileSync(join(output,`${name}.png`),Buffer.from(screenshot.data,'base64'))
    passed(name+' layout and 44px rating targets')
  }
  const accessibility=await send('Accessibility.getFullAXTree')
  assert.ok(accessibility.nodes.some(node=>node.role?.value==='radiogroup' && node.name?.value.includes('Note')))
  assert.equal(accessibility.nodes.filter(node=>node.role?.value==='radio').length,5)
  assert.equal(scriptErrors.length,0,'Browser runtime exceptions: '+scriptErrors.join(','))
  assert.equal(networkErrors.length,0,'Intercept errors: '+networkErrors.join(','))
  passed('browser accessibility tree, five labelled radios and no runtime exceptions')
  process.stdout.write('Screenshots: '+output+'\n')
  }
  }
} finally {
  if(ws?.readyState===WebSocket.OPEN) {await send('Browser.close').catch(()=>{});ws.close()}
  browser.kill()
}
