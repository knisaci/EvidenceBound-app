import { readFile, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { createClient } from 'genlayer-js'
import { testnetBradbury } from 'genlayer-js/chains'

const address = '0x490817c879b019a5099F937EaF5672bCA887DfA3'
const sha = value => createHash('sha256').update(value).digest('hex')
try {
  const client = createClient({ chain: testnetBradbury })
  const deployed = await client.getContractCode(address)
  const included = await readFile(new URL('../contracts/evidence_bound.py', import.meta.url), 'utf8')
  await writeFile('/tmp/evidencebound-deployed.py', deployed, 'utf8')
  console.log('Deployed source saved: /tmp/evidencebound-deployed.py')
  console.log('Included bytes:', Buffer.byteLength(included))
  console.log('Deployed bytes:', Buffer.byteLength(deployed))
  console.log('Deployed SHA-256:', sha(deployed))
  const normalize = s => s.replace(/\r\n/g, '\n').replace(/^\uFEFF/, '').trim()
  console.log('Equal after normalizing line endings, BOM and edge whitespace:', normalize(included) === normalize(deployed))
  const a = included.split('\n'), b = deployed.split('\n')
  let shown = 0
  for (let i = 0; i < Math.max(a.length, b.length) && shown < 12; i++) {
    if (a[i] !== b[i]) {
      console.log('Line', i + 1)
      console.log('Included:', JSON.stringify(a[i] ?? '<absent>'))
      console.log('Deployed:', JSON.stringify(b[i] ?? '<absent>'))
      shown++
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
