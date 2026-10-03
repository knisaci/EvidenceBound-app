import { useState } from 'react'
import { createClient } from 'genlayer-js'
import { testnetBradbury } from 'genlayer-js/chains'
import { TransactionStatus } from 'genlayer-js/types'
import { describeError, getWalletProvider } from './walletSession'

const ADDRESS = '0x490817c879b019a5099F937EaF5672bCA887DfA3'
const readClient = createClient({ chain: testnetBradbury })
type Hash = Parameters<typeof readClient.waitForTransactionReceipt>[0]['hash']

function storageKey(id: string) {
  return `evidencebound:resolve:bradbury:${ADDRESS}:${id}`
}

function pretty(value: unknown) {
  return JSON.stringify(
    value,
    (_, item) => typeof item === 'bigint' ? item.toString() : item,
    2,
  )
}

export default function ResolutionPanel() {
  const [claimId, setClaimId] = useState('claim-2')
  const [hash, setHash] = useState(
    () => localStorage.getItem(storageKey('claim-2')) ?? ''
  )
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  async function loadClaim(id: string) {
    return readClient.readContract({
      address: ADDRESS,
      functionName: 'get_claim',
      args: [id],
    })
  }

  async function track(transactionHash: Hash, id: string) {
    setStatus('Resolution submitted. Waiting for consensus…')
    const accepted = await readClient.waitForTransactionReceipt({
      hash: transactionHash,
      status: TransactionStatus.ACCEPTED,
      interval: 5000,
      retries: 240,
    })
    setResult(pretty(accepted))
    setStatus('Acceptance stage reached. Waiting for finalization…')

    const finalized = await readClient.waitForTransactionReceipt({
      hash: transactionHash,
      status: TransactionStatus.FINALIZED,
      interval: 10000,
      retries: 240,
    })
    setResult(pretty(finalized))

    if (
      finalized.txExecutionResultName !== 'FINISHED_WITH_RETURN' ||
      finalized.resultName !== 'AGREE'
    ) {
      setStatus('Finalized without confirmed success. Inspect the receipt.')
      return
    }

    const claim = await loadClaim(id)
    setResult(pretty(claim))
    setStatus('Resolution finalized successfully. Stored result loaded below.')
  }

  async function resolve() {
    setBusy(true)
    setError('')
    setResult('')
    const id = claimId.trim()
    try {
      if (!/^claim-[1-9][0-9]*$/.test(id)) {
        throw new Error('Enter a claim ID such as claim-2.')
      }

      const existing = await loadClaim(id)
      if (
        existing &&
        typeof existing === 'object' &&
        'resolved' in existing &&
        existing.resolved === true
      ) {
        setResult(pretty(existing))
        setStatus('This claim is already resolved.')
        return
      }

      const provider = getWalletProvider()
      const accounts = await provider.request({ method: 'eth_accounts' })
      if (!accounts[0]) throw new Error('Reconnect your wallet.')

      const chainId = await provider.request({ method: 'eth_chainId' })
      if (BigInt(chainId) !== BigInt(testnetBradbury.id)) {
        throw new Error('Switch to Bradbury and reconnect.')
      }

      const client = createClient({
        chain: testnetBradbury,
        account: accounts[0],
        provider,
      })

      setStatus('Waiting for wallet approval…')
      const transactionHash = await client.writeContract({
        address: ADDRESS,
        functionName: 'resolve_claim',
        args: [id],
        value: 0n,
      })

      setHash(transactionHash)
      localStorage.setItem(storageKey(id), transactionHash)
      await track(transactionHash, id)
    } catch (err) {
      setError(describeError(err))
      setStatus('Check the existing transaction if a hash is shown.')
    } finally {
      setBusy(false)
    }
  }

  async function resume() {
    setBusy(true)
    setError('')
    try {
      if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) {
        throw new Error('No valid resolution hash to track.')
      }
      await track(hash as Hash, claimId.trim())
    } catch (err) {
      setError(describeError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <h2>Resolve a claim</h2>
      <p>
        Validators retrieve the evidence and establish the six record counts.
        The contract then compares those counts with the stored claim.
      </p>
      <label htmlFor="resolve-id">Claim ID to resolve</label>
      <div className="controls">
        <input
          id="resolve-id"
          value={claimId}
          disabled={busy}
          onChange={event => {
            const id = event.target.value
            setClaimId(id)
            setHash(localStorage.getItem(storageKey(id.trim())) ?? '')
            setStatus('')
            setResult('')
            setError('')
          }}
        />
        <button disabled={busy || !!hash} onClick={resolve}>
          Resolve claim
        </button>
        {hash && (
          <button disabled={busy} onClick={resume}>
            Check resolution transaction
          </button>
        )}
      </div>
      {status && <p role="status">{status}</p>}
      {hash && (
        <p>
          <a
            href={`https://explorer-bradbury.genlayer.com/tx/${hash}`}
            target="_blank"
            rel="noreferrer"
          >
            View resolution transaction ↗
          </a>
          <br />{hash}
        </p>
      )}
      {error && <pre className="error" role="alert">{error}</pre>}
      {result && <pre>{result}</pre>}
    </section>
  )
}
