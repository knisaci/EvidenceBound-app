import { hexToBytes } from 'viem'
import { useState } from 'react'
import { createClient, abi } from 'genlayer-js'
import { testnetBradbury } from 'genlayer-js/chains'
import { TransactionStatus } from 'genlayer-js/types'
import { describeError, getWalletProvider } from './walletSession'

const ADDRESS = '0x490817c879b019a5099F937EaF5672bCA887DfA3'
const STORAGE_KEY = 'evidencebound:last-submit:bradbury'
const readClient = createClient({ chain: testnetBradbury })

function pretty(value: unknown) {
  return JSON.stringify(
    value,
    (_, item) => typeof item === 'bigint' ? item.toString() : item,
    2,
  )
}

export default function TransactionPanel() {
  const [hash, setHash] = useState(
    () => localStorage.getItem(STORAGE_KEY) ?? ''
  )
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [receipt, setReceipt] = useState('')
  const [error, setError] = useState('')
  const [createdClaimId, setCreatedClaimId] = useState('')


  const [subject, setSubject] = useState('Synthetic funding-record audit — website test')
  const [urlsText, setUrlsText] = useState(
    'https://raw.githubusercontent.com/knisaci/EvidenceBound/e1db917dfae002b191d1f9ce9ce44b149cb02040/evidence/fixtures/evidencebound-partial-v1.json'
  )
  const [digest, setDigest] = useState(
    'sha256:6969d8fd6ac2a46f650fb5c04c24c8b44c8e241cc2df396f376e2506792b43a3'
  )
  const [startDate, setStartDate] = useState('2026-08-01')
  const [endDate, setEndDate] = useState('2026-08-31')
  const [counts, setCounts] = useState({
    total_records: '20',
    claimed_records: '20',
    locked_records: '0',
    other_records: '0',
    funding_records_verified: '20',
    funding_mismatches: '0',
  })

  const fields = [
    ['total_records', 'Total records'],
    ['claimed_records', 'Claimed records'],
    ['locked_records', 'Locked records'],
    ['other_records', 'Other records'],
    ['funding_records_verified', 'Verified funding records'],
    ['funding_mismatches', 'Funding mismatches'],
  ] as const

  function validateClaim() {
    if (!subject.trim() || subject.trim().length > 200) {
      throw new Error('Subject must contain 1 to 200 characters.')
    }

    const urls = urlsText.split(/\\r?\\n/).map(url => url.trim()).filter(Boolean)
    if (urls.length < 1 || urls.length > 5) {
      throw new Error('Provide between 1 and 5 public HTTPS evidence URLs.')
    }
    for (const url of urls) {
      try {
        const parsed = new URL(url)
        if (parsed.protocol !== 'https:') throw new Error()
      } catch {
        throw new Error('Every evidence URL must be a valid HTTPS URL.')
      }
    }

    if (digest.trim().length < 16 || digest.trim().length > 128) {
      throw new Error('Manifest digest must contain 16 to 128 characters.')
    }

    const facts = Object.fromEntries(
      fields.map(([key]) => {
        const raw = counts[key].trim()
        const value = Number(raw)
        if (raw === '' || !Number.isSafeInteger(value) || value < 0) {
          throw new Error(`${key.replaceAll('_', ' ')} must be a non-negative whole number. Received: ${JSON.stringify(raw)}`)
        }
        return [key, value]
      })
    ) as Record<keyof typeof counts, number>

    if (
      BigInt(facts.claimed_records) + BigInt(facts.locked_records) +
      BigInt(facts.other_records) !== BigInt(facts.total_records)
    ) {
      throw new Error('Claimed + locked + other must equal total records.')
    }

    if (
      BigInt(facts.funding_records_verified) + BigInt(facts.funding_mismatches) !==
      BigInt(facts.total_records)
    ) {
      throw new Error('Verified funding records + funding mismatches must equal total records.')
    }

    const start = Date.parse(startDate + 'T00:00:00Z') / 1000
    const end = Date.parse(endDate + 'T23:59:59Z') / 1000
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end) {
      throw new Error('Choose valid reporting dates, with start on or before end.')
    }

    return { urls, facts, start: BigInt(start), end: BigInt(end) }
  }


  async function identifyClaim() {
    setBusy(true)
    setError('')
    setCreatedClaimId('')
    try {
      if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) {
        throw new Error('No valid submission transaction to inspect.')
      }

      const transactionHash = hash as Parameters<typeof readClient.getTransaction>[0]['hash']
      const transaction = await readClient.getTransaction({ hash: transactionHash })

      if (
        transaction.recipient?.toLowerCase() !== ADDRESS.toLowerCase() ||
        transaction.txExecutionResultName !== 'FINISHED_WITH_RETURN' ||
        transaction.resultName !== 'AGREE'
      ) {
        throw new Error('This transaction does not show successful execution for EvidenceBound.')
      }

      const trace = await readClient.debugTraceTransaction({
        hash: transactionHash,
        round: Number(transaction.lastRound?.round ?? 0),
      })

      if (trace.result_code !== 0 || !trace.return_data) {
        throw new Error('Successful return data is not available yet.')
      }

      const decoded = abi.calldata.decode(
        hexToBytes(trace.return_data as `0x${string}`)
      )

      if (!(decoded instanceof Map) || decoded.get('kind') !== 'Return') {
        throw new Error('Unexpected execution return format.')
      }

      const id = decoded.get('data')
      if (typeof id !== 'string' || !/^claim-[1-9][0-9]*$/.test(id)) {
        throw new Error('The transaction did not return a claim ID.')
      }

      const stored = await readClient.readContract({
        address: ADDRESS,
        functionName: 'get_claim',
        args: [id],
      })

      if (
        !stored || typeof stored !== 'object' ||
        !('submitter' in stored) || typeof stored.submitter !== 'string' ||
        stored.submitter.toLowerCase() !== transaction.sender?.toLowerCase()
      ) {
        throw new Error('The stored claim could not be confirmed against the transaction sender.')
      }

      setCreatedClaimId(id)
    } catch (err) {
      setError(describeError(err))
    } finally {
      setBusy(false)
    }
  }

  async function track(transactionHash: Parameters<typeof readClient.waitForTransactionReceipt>[0]['hash']) {
    setStatus('Submitted. Waiting for validator acceptance…')
    const accepted = await readClient.waitForTransactionReceipt({
      hash: transactionHash,
      status: TransactionStatus.ACCEPTED,
    })
    setReceipt(pretty(accepted))
    setStatus('Acceptance stage reached. Waiting for finalization…')

    const finalized = await readClient.waitForTransactionReceipt({
      hash: transactionHash,
      status: TransactionStatus.FINALIZED,
      interval: 10000,
      retries: 240,
    })
    setReceipt(pretty(finalized))

    if (finalized.txExecutionResultName === 'FINISHED_WITH_RETURN' && finalized.resultName === 'AGREE') {
      setStatus('Finalized successfully. Inspect the receipt for the new claim ID.')
    } else {
      setStatus('Finalization reached. Execution did not report success; inspect the receipt.')
    }
  }

  async function submitDemo() {
    setBusy(true)
    setError('')
    setReceipt('')
    try {
      const validated = validateClaim()
      const provider = getWalletProvider()
      const accounts = await provider.request({ method: 'eth_accounts' })
      if (!accounts[0]) throw new Error('Reconnect your wallet.')

      const chainId = await provider.request({ method: 'eth_chainId' })
      if (BigInt(chainId) !== BigInt(testnetBradbury.id)) {
        throw new Error('Switch your wallet to Bradbury and reconnect.')
      }

      const client = createClient({
        chain: testnetBradbury,
        account: accounts[0],
        provider,
      })

      setStatus('Waiting for your wallet approval…')
      const transactionHash = await client.writeContract({
        address: ADDRESS,
        functionName: 'submit_claim',
        args: [
          subject.trim(),
          'RECORD_SET_CLAIM_V1',
          JSON.stringify(validated.urls),
          digest.trim(),
          JSON.stringify(validated.facts),
          validated.start,
          validated.end,
        ],
        value: 0n,
      })

      setHash(transactionHash)
      localStorage.setItem(STORAGE_KEY, transactionHash)
      await track(transactionHash)
    } catch (err) {
      setError(describeError(err))
      setStatus('Stopped. If a transaction hash exists, check its status before submitting again.')
    } finally {
      setBusy(false)
    }
  }

  async function resume() {
    setBusy(true)
    setError('')
    try {
      if (!/^0x[0-9a-fA-F]{64}$/.test(hash)) {
        throw new Error('No valid transaction hash to check.')
      }
      await track(hash as Parameters<typeof readClient.waitForTransactionReceipt>[0]['hash'])
    } catch (err) {
      setError(describeError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <h2>Submit an evidence claim</h2>
      <p>
        Enter a complete claim about a bounded record set.
        The prefilled example uses explicitly synthetic evidence.
      </p>

      <fieldset disabled={busy}>
        <label htmlFor="subject">Subject</label>
        <input id="subject" value={subject} maxLength={200}
          onChange={event => setSubject(event.target.value)} />

        <label htmlFor="evidence-urls">Public evidence URLs — one per line, maximum five</label>
        <textarea id="evidence-urls" rows={4} value={urlsText}
          onChange={event => setUrlsText(event.target.value)} />

        <label htmlFor="manifest-digest">Evidence manifest digest</label>
        <input id="manifest-digest" value={digest}
          onChange={event => setDigest(event.target.value)} />
        <p className="footnote">
          The contract stores this digest as a declaration.
          Version 0.3 does not verify it against fetched evidence.
        </p>

        <div className="form-grid">
          <div>
            <label htmlFor="period-start">Reporting period start — UTC</label>
            <input id="period-start" type="date" value={startDate}
              onChange={event => setStartDate(event.target.value)} />
          </div>
          <div>
            <label htmlFor="period-end">Reporting period end — UTC</label>
            <input id="period-end" type="date" value={endDate}
              onChange={event => setEndDate(event.target.value)} />
          </div>
          {fields.map(([key, label]) => (
            <div key={key}>
              <label htmlFor={key}>{label}</label>
              <input id={key} type="number" min="0" step="1" value={counts[key]}
                onChange={event => setCounts(previous => ({
                  ...previous, [key]: event.target.value,
                }))} />
            </div>
          ))}
        </div>
      </fieldset>

      <p>
        Submission creates a pending claim. Resolution is a separate transaction.
        Attached value: 0 GEN; the wallet may show a network fee.
      </p>
      <div className="controls">
        <button disabled={busy} onClick={submitDemo}>
          Submit claim
        </button>
        {hash && (
          <button disabled={busy} onClick={resume}>
            Check existing transaction
          </button>
        )}
      </div>

      {hash && (
        <div className="controls">
          <button disabled={busy} onClick={identifyClaim}>
            Find submitted claim ID
          </button>
        </div>
      )}
      {createdClaimId && (
        <p role="status">
          Your submitted claim: <strong>{createdClaimId}</strong>.
          Enter this ID in the resolution or exploration section.
        </p>
      )}
      {status && <p role="status">{status}</p>}
      {hash && (
        <p>
          <a
            href={`https://explorer-bradbury.genlayer.com/tx/${hash}`}
            target="_blank"
            rel="noreferrer"
          >
            View submission transaction ↗
          </a>
          <br />{hash}
        </p>
      )}
      {error && <pre className="error" role="alert">{error}</pre>}
      {receipt && <pre>{receipt}</pre>}
    </section>
  )
}
