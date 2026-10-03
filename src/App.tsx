import ClaimResult from './ClaimResult'
import { useState } from 'react'
import WalletPanel from './WalletPanel'
import TransactionPanel from './TransactionPanel'
import ResolutionPanel from './ResolutionPanel'
import { createClient } from 'genlayer-js'
import { testnetBradbury } from 'genlayer-js/chains'

const ADDRESS = '0x490817c879b019a5099F937EaF5672bCA887DfA3'
const client = createClient({ chain: testnetBradbury })

function pretty(value: unknown): string {
  return JSON.stringify(
    value,
    (_, item) => typeof item === 'bigint' ? item.toString() : item,
    2,
  ) ?? String(value)
}

export default function App() {
  const [claimId, setClaimId] = useState('claim-1')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function read(functionName: string, args: string[]) {
    setBusy(true)
    setError('')
    setResult('')
    try {
      const value = await client.readContract({
        address: ADDRESS,
        functionName,
        args,
      })
      setResult(pretty(value))
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <main>
      <div className="eyebrow">GENLAYER · BRADBURY TESTNET</div>
      <h1>EvidenceBound</h1>
      <p>Compare record-set claims with evidence evaluated through validator consensus.</p>

      <WalletPanel />
      <TransactionPanel />
      <ResolutionPanel />

      <section>
        <h2>Explore on-chain evidence</h2>
        <p>Read stored results directly from the deployed contract.</p>
        <a
          href={`https://explorer-bradbury.genlayer.com/address/${ADDRESS}`}
          target="_blank"
          rel="noreferrer"
        >
          View deployed contract ↗
        </a>

        <div className="controls">
          <button
            disabled={busy}
            onClick={() => read('get_claim_count', [])}
          >
            Read claim count
          </button>
        </div>

        <label htmlFor="claim-id">Claim ID</label>
        <div className="controls">
          <input
            id="claim-id"
            value={claimId}
            onChange={event => setClaimId(event.target.value)}
            placeholder="claim-1"
          />
          <button
            disabled={busy || !claimId.trim()}
            onClick={() => read('get_claim', [claimId.trim()])}
          >
            Load claim
          </button>
        </div>

        {busy && <p role="status">Reading from GenLayer…</p>}
        {error && <p className="error" role="alert">{error}</p>}
        {result && <ClaimResult json={result} />}
      </section>

      <p className="footnote">
        Public evidence adjudication on GenLayer Bradbury testnet.
      </p>
    </main>
  )
}
