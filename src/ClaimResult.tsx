const FACTS = [
  ['total_records', 'Total records'],
  ['claimed_records', 'Claimed records'],
  ['locked_records', 'Locked records'],
  ['other_records', 'Other records'],
  ['funding_records_verified', 'Verified funding records'],
  ['funding_mismatches', 'Funding mismatches'],
] as const

export default function ClaimResult({ json }: { json: string }) {
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return <pre>{json}</pre>
  }

  if (!data || typeof data !== 'object' || !('claim_id' in data)) {
    return <pre>{json}</pre>
  }

  const claim = data as {
    claim_id: string
    subject?: string
    verdict?: string
    confidence_bucket?: string
    explanation?: string
    claim_facts?: Record<string, number>
    established_facts?: Record<string, number | boolean>
    evidence_urls?: string[]
    reason_codes?: string[]
  }

  return (
    <div className="claim-result">
      <h2>{claim.subject || claim.claim_id}</h2>
      <p>
        <strong>{claim.claim_id}</strong> ·{' '}
        <strong>{claim.verdict?.replaceAll('_', ' ')}</strong>
      </p>
      {claim.confidence_bucket && (
        <p>Contract confidence label: {claim.confidence_bucket}</p>
      )}
      <p className="footnote">
        This view reads accepted state. A resolution is final only when its
        transaction tracker reports successful finalization.
      </p>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Fact</th>
              <th>Claimed</th>
              <th>Evidence</th>
              <th>Comparison</th>
            </tr>
          </thead>
          <tbody>
            {FACTS.map(([key, label]) => {
              const claimed = claim.claim_facts?.[key]
              const found = claim.established_facts?.[key]
              const available = typeof found === 'number'
              const match = available && claimed === found
              return (
                <tr key={key}>
                  <th scope="row">{label}</th>
                  <td>{claimed ?? '—'}</td>
                  <td>{available ? found : '—'}</td>
                  <td className={available ? match ? 'match' : 'mismatch' : ''}>
                    {available ? match ? 'Matches' : 'Mismatch' : 'Pending'}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {claim.explanation && <p>{claim.explanation}</p>}
      {!!claim.reason_codes?.length && (
        <ul>
          {claim.reason_codes.map(reason => (
            <li key={reason}>{reason.replaceAll('_', ' ')}</li>
          ))}
        </ul>
      )}

      {!!claim.evidence_urls?.length && (
        <>
          <h3>Public evidence</h3>
          <ul>
            {claim.evidence_urls.map((url, index) => (
              <li key={`${index}:${url}`}>
                {url.startsWith('https://') ? (
                  <a href={url} target="_blank" rel="noreferrer">
                    Source {index + 1}
                  </a>
                ) : 'Invalid evidence link'}
              </li>
            ))}
          </ul>
        </>
      )}

      <details>
        <summary>View full on-chain record</summary>
        <pre>{json}</pre>
      </details>
    </div>
  )
}
