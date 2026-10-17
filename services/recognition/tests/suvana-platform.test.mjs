import assert from 'node:assert/strict'
import test from 'node:test'
import vm from 'node:vm'
import {readFileSync} from 'node:fs'

const source=readFileSync(new URL('../webapp/static/suvana-platform.js',import.meta.url),'utf8')
function load(pathname, publicOrigin, session=null) {
  const requests=[]
  const listeners={}
  const slot={hidden:true,textContent:'',replaceChildren(node){this.child=node}}
  const home={href:'https://suvana-shell.vercel.app/'}
  const window={location:{pathname,origin:'http://localhost:8000'}}
  const document={addEventListener:(name,fn)=>{listeners[name]=fn},
    querySelector:()=>({classList:{add(){}}}),
    getElementById:id=>id==='suvana-home'?home:slot,createElement:()=>({})}
  vm.runInNewContext(source,{window,document,URL,fetch:async(url)=>{
    requests.push(url)
    return {ok:true,json:async()=>url.includes('/api/info')?{numClasses:171,...(publicOrigin?{publicOrigin}:{})}:session}
  }})
  return {platform:window.SuvanaRecognize,requests,listeners,slot,home}
}

test('unset setting at its own root preserves API/socket URLs and has no account request/UI',async()=>{
  const r=load('/')
  assert.equal(r.platform.apiPath('/api/labels'),'/api/labels')
  assert.equal(await r.platform.socketUrl(),'ws://localhost:8000/ws/recognize')
  assert.deepEqual(r.requests,['/api/info'])
  assert.deepEqual(Object.keys(r.listeners),[])
  assert.equal(r.slot.hidden,true)
  assert.equal(r.home.href,'https://suvana-shell.vercel.app/')
})

test('bare and slash platform entries prefix every HTTP path and use the configured socket origin',async()=>{
  for(const path of ['/recognize','/recognize/']) {
    const r=load(path,'https://socket.example.invalid')
    assert.equal(r.platform.apiPath('/api/speak?text=example'),'/recognize/api/speak?text=example')
    assert.equal(await r.platform.socketUrl(),'wss://socket.example.invalid/ws/recognize')
    r.listeners.DOMContentLoaded()
    await new Promise(resolve=>setTimeout(resolve,0))
    assert.equal(r.home.href,'/')
    assert.equal(r.slot.hidden,false)
    assert.equal(r.slot.child.href,'/login?callbackUrl=%2Frecognize%2F')
    assert.ok(r.requests.includes('/communicate/api/auth/session'))
  }
})

test('shows account names as text rather than HTML',async()=>{
  const r=load('/recognize/',undefined,{user:{name:'<img src=x onerror=alert(1)>'}})
  r.listeners.DOMContentLoaded()
  await new Promise(resolve=>setTimeout(resolve,0))
  assert.equal(r.slot.textContent,'Signed in as <img src=x onerror=alert(1)>')
})
