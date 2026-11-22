import { spawn } from 'node:child_process'
import { mkdtemp, readFile, writeFile, mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import assert from 'node:assert/strict'

const pause = ms => new Promise(resolve => setTimeout(resolve, ms))
async function until(operation) {
  for (let attempt = 0; attempt < 120; attempt++) {
    try { const value = await operation(); if (value) return value } catch {}
    await pause(100)
  }
  throw new Error('Timed out waiting for local browser evidence.')
}

const preview = spawn(process.execPath, ['scripts/race-replay-demo.mjs'], { windowsHide: true })
let browser
const children = []
try {
  let origin
  preview.stdout.on('data', bytes => { origin = bytes.toString().match(/http:\/\/127\.0\.0\.1:\d+/)?.[0] ?? origin })
  preview.stderr.on('data', bytes => process.stderr.write(bytes))
  await until(() => origin)
  const profile = await mkdtemp(join(tmpdir(), 'uranius-chrome-'))
  const binary = process.env.URANIUS_CHROME ?? join(process.env.ProgramFiles, 'Google/Chrome/Application/chrome.exe')
  browser = spawn(binary, [
    '--headless=new', '--disable-gpu', '--disable-background-networking', '--disable-component-update',
    '--disable-sync', '--no-first-run', '--no-proxy-server', '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1',
    '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank',
  ], { windowsHide: true, stdio: 'ignore' })
  const endpoint = await until(async () => {
    const port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split(/\r?\n/)[0]
    return 'http://127.0.0.1:' + port
  })
  async function tab() {
    const result = await fetch(endpoint + '/json/new?about:blank', { method: 'PUT' }).then(response => response.json())
    const socket = new WebSocket(result.webSocketDebuggerUrl)
    children.push(socket)
    await new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true })
      socket.addEventListener('error', reject, { once: true })
    })
    let id = 0
    const waiting = new Map()
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data)
      const handlers = waiting.get(message.id)
      if (!handlers) return
      waiting.delete(message.id)
      if (message.error) handlers.reject(Error(message.error.message))
      else handlers.resolve(message.result)
    })
    function send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const call = ++id
        waiting.set(call, { resolve, reject })
        socket.send(JSON.stringify({ id: call, method, params }))
      })
    }
    async function evaluate(expression) {
      const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
      if (result.exceptionDetails) throw Error(result.exceptionDetails.exception?.description ?? 'Browser evaluation failed')
      return result.result.value
    }
    return { send, evaluate, open: path => send('Page.navigate', { url: origin + path }) }
  }
  const a = await tab(), b = await tab()
  await a.open('/?mode=live')
  await b.open('/?mode=live')
  const display = page => page.evaluate("document.querySelector('#connection')?.textContent")
  await until(async () => (await display(a))?.includes('revision 0') && (await display(b))?.includes('revision 0'))
  assert.equal(await a.evaluate("document.querySelector('#play').disabled && document.querySelector('#seek').disabled"), true)
  const post = (route, payload, suppliedOrigin = origin) => fetch(origin + route, {
    method: 'POST', headers: { Origin: suppliedOrigin, 'Content-Type': 'application/json' },
    body: payload ? JSON.stringify(payload) : undefined,
  })
  for (let step = 0; step < 5; step++) await post('/api/advance')
  await until(() => a.evaluate("Number(document.querySelector('#seek').max) === 150"))
  const before = await fetch(origin + '/api/state').then(r => r.json())
  assert.ok(!('final' in before))
  await a.evaluate(`(() => {
    const owner=document.querySelector('[name=owner]'); owner.value='manager-b';owner.dispatchEvent(new Event('change'));
    document.querySelector('[name=rider]').value='synthetic-rider-10';document.querySelector('form.tactics').requestSubmit();
  })()`)
  await until(() => a.evaluate("document.querySelector('#command-status').textContent.includes('Accepted')"))
  await post('/api/advance')
  const after = await fetch(origin + '/api/state').then(r => r.json())
  assert.deepEqual(after.frames.slice(0, before.frames.length), before.frames)
  assert.ok(after.events.some(event => event.eventType === 'ATTACK_STARTED'))
  await a.evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Reconnect').click()")
  await b.evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Reconnect').click()")
  await until(async () => (await display(a))?.includes('revision 1') && (await display(b))?.includes('revision 1'))
  await a.send('Page.bringToFront')
  await until(() => a.evaluate("document.querySelectorAll('#profile-markers > g').length > 1"))
  const denied = await post('/api/command', { owner: 'manager-a', command: {
    commandId: 'wrong-owner', teamId: 'synthetic-team-b', riderId: 'synthetic-rider-9',
    kind: 'attack', payload: {}, expectedRevision: 1, requestedTick: 6,
  } }).then(r => r.json())
  assert.equal(denied.reason, 'ownership')
  const crossOrigin = await post('/api/advance', undefined, 'null')
  assert.equal(crossOrigin.status, 404)
  async function rejectionCheck() {
    // Force a server rejection through the same interface an owner uses.
    await a.evaluate(`(() => {
      const kind=document.querySelector('[name=kind]');kind.value='effort';kind.dispatchEvent(new Event('change'));
      document.querySelector('form.tactics').requestSubmit();
    })()`)
    await until(() => a.evaluate("document.querySelector('#command-status').textContent.includes('Rejected')"))
  }
  if (process.argv.includes('--screenshots')) {
    const directory = join(process.cwd(),'demo','race-replay','evidence')
    await mkdir(directory,{recursive:true})
    async function capture(page,name, width,height) {
      await page.send('Page.bringToFront')
      await page.send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false})
      await pause(200)
      const image=await page.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false})
      await writeFile(join(directory,name+'.png'),Buffer.from(image.data,'base64'))
    }
    assert.equal(await a.evaluate("document.body.textContent.includes('riders ?') || document.querySelector('#rate').textContent.includes('1?')"), false)
    await capture(a,'live-command',1180,1290)
    await rejectionCheck()
    for (const [name,url,expected] of [
      ['group-separation','/?second=450','37.5 s gap'],
      ['climb','/?fixture=terrain&second=300','29.7 km/h'],
      ['descent','/?fixture=terrain&second=790','39.2 km/h'],
      ['caught','/?second=600','caught the breakaway'],
    ]) {
      await b.open(url)
      await until(() => b.evaluate('document.body.textContent.includes(' + JSON.stringify(expected) + ')'))
      await capture(b,name,name==='caught'?540:1180,1000)
    }
    await post('/api/complete')
    await until(() => a.evaluate("!document.querySelector('#result').hidden && document.querySelectorAll('#result li').length===10"))
    const result = await fetch(origin + '/api/state').then(r=>r.json())
    assert.ok(result.completed && result.final.events.some(event=>event.eventType==='ATTACK_STARTED'))
    assert.equal(await a.evaluate("document.querySelector('#play').disabled"),false)
    await a.evaluate("document.querySelector('#result').scrollIntoView({block:'end'})")
    await capture(a,'completed-classification',1180,1120)
    assert.equal(await a.evaluate("(() => { const seek=document.querySelector('#seek');seek.value=150;seek.dispatchEvent(new Event('input'));return document.querySelector('#timer').value })()"),'2:30')
    await a.evaluate("document.querySelector('#rate').value='16';document.querySelector('#play').click()")
    await until(() => a.evaluate("Number(document.querySelector('#seek').value)>150"))
    await a.evaluate("document.querySelector('#play').click()")
    const cursor = await a.evaluate("document.querySelector('#seek').value")
    await pause(300)
    assert.equal(await a.evaluate("document.querySelector('#seek').value"), cursor)
    assert.equal((await fetch(origin + '/api/state').then(r=>r.json())).raceSecond,result.raceSecond)
  } else await rejectionCheck()
  console.log('Two browser clients matched revision 1. Command acceptance, rejection, reconnect and elapsed prefix verified.')
} finally {
  for (const socket of children) socket.close()
  browser?.kill()
  preview.kill()
}
