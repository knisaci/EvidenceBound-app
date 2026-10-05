import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { createClient } from 'genlayer-js'
import { testnetBradbury } from 'genlayer-js/chains'

const address = '0x490817c879b019a5099F937EaF5672bCA887DfA3'
const revision = 'f0a0db04e4f3dbdf686968d0e198d17afc0c8ed7'
const hash = bytes => createHash('sha256').update(bytes).digest('hex')

try {
  const included = await readFile(new URL('../contracts/evidence_bound.py', import.meta.url))
  const client = createClient({ chain: testnetBradbury })
  const deployed = Buffer.from(await client.getContractCode(address), 'utf8')
  console.log('Network: Bradbury')
  console.log('Contract:', address)
  console.log('Original source revision:', revision)
  console.log('Included SHA-256:', hash(included))
  console.log('Deployed SHA-256:', hash(deployed))
  if (!included.equals(deployed)) {
    console.error('FAIL: deployed source differs from the included source.')
    process.exitCode = 1
  } else {
    console.log('PASS: deployed source matches the included source byte for byte.')
  }
} catch (error) {
  console.error('Verification could not complete:', error instanceof Error ? error.message : String(error))
  process.exitCode = 1
}
