import {build} from 'esbuild'
import {fileURLToPath} from 'node:url'
import {expect,it} from 'vitest'

it('bundles the homepage widget without any provider or assistant API client',async()=>{
  const entry=fileURLToPath(new URL('./widget.ts',import.meta.url))
  const result=await build({entryPoints:[entry],bundle:true,write:false,metafile:true,platform:'browser'})
  const inputs=Object.keys(result.metafile!.inputs)
  expect(inputs.some(path=>/assistant\/(?:gemini|handler|model)\.ts$/.test(path.replace(/\\/g,'/')))).toBe(false)
  const code=result.outputFiles[0].text
  for (const endpoint of ['/api/assistant','generativelanguage.googleapis.com','openrouter.ai','api.groq.com']) {
    expect(code).not.toContain(endpoint)
  }
})
