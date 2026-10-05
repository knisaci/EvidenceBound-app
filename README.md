# EvidenceBound web app

Public website: https://knisaci.github.io/EvidenceBound-app/

Earlier verified hosting location: https://knisaci.github.io/EvidenceBound/

EvidenceBound helps report reviewers compare six declared record-set counts
with facts extracted from public evidence through GenLayer validator consensus.

## Review an existing result — no wallet required

1. Open the public website.
2. In "Explore on-chain evidence", enter claim-2.
3. Click "Load claim".
4. Inspect the comparison table and public evidence link.

Expected result: PARTIALLY_VERIFIED, HIGH, with four matching facts and two
mismatches. The claim declares 20 claimed records and zero locked records.
The explicitly synthetic evidence establishes 17 claimed and three locked.
All 20 funding records are verified.

Reason codes:
- CLAIMED_RECORDS_MISMATCH
- LOCKED_RECORDS_MISMATCH

## Submit and resolve a new claim

1. Connect an EVM browser wallet and select Bradbury testnet.
2. Enter a subject, one to five public HTTPS evidence URLs, an evidence
   manifest digest, UTC reporting dates, and all six claimed counts.
3. Status counts must sum to total records. Verified funding records plus
   funding mismatches must also sum to total records.
4. Click "Submit claim", review the wallet request, and approve.
5. Track the transaction through acceptance and finalization.
6. Click "Find submitted claim ID" to retrieve the exact returned ID.
7. Enter that ID in "Resolve a claim" and approve the resolution transaction.
8. Track finalization, then load the claim to inspect the stored verdict.

The prefilled example is synthetic. Changing claim fields requires evidence
and a manifest digest appropriate to the new claim.

Acceptance is provisional. In our demonstrated transactions, finalization
took about 30 minutes after acceptance. Network timings can vary.
If tracking times out, use the existing-transaction check button. Transaction
hashes are retained in browser storage for the same website origin.

## Why GenLayer is central

The frontend calls the deployed Intelligent Contract. Validators independently
retrieve evidence and extract a canonical fact object. Consensus covers those
facts, and deterministic contract code compares all six claimed counts.
The website does not generate or substitute its own adjudication.

## Included Intelligent Contract source

The complete deployment-exact v0.3 contract is included at
[contracts/evidence_bound.py](contracts/evidence_bound.py).
[Contract provenance and deployment verification](contracts/PROVENANCE.md)
identifies the original implementation revision, accepted source snapshot,
original and deployed source hashes and Bradbury deployment transactions.
The deployed source omits the original file's final newline; the included copy
preserves the deployed bytes. No executable code differs.

Verify the included source against code retrieved from Bradbury:

```bash
npm ci
node scripts/verify-contract-source.mjs
```

This read-only check needs no wallet and succeeds only on an exact byte match.

## Deployment and verification

Network: GenLayer Bradbury testnet
Contract: 0x490817c879b019a5099F937EaF5672bCA887DfA3

Finalized website submission, claim-2:
https://explorer-bradbury.genlayer.com/tx/0x0cf4dcf5c1d9d3b0dcf6c9fb56736822470bd43a22841b70e4747da2652376dc

Finalized website resolution, claim-2:
https://explorer-bradbury.genlayer.com/tx/0xe39b3737ed48789a88cd5c1831b009b1fa3487da91583a178c85f85855a39b83

The claim-2 writes were tested through the local frontend. Public-site reads
and Rabby connection were also verified. A further submission returned claim-3;
its return-data discovery was verified.

## Finalized public-site workflow — claim-4

Both submission and resolution were performed through the earlier hosted
website at https://knisaci.github.io/EvidenceBound/. The dedicated app deployment
uses the same frontend source and existing Bradbury contract.

Submission:
https://explorer-bradbury.genlayer.com/tx/0x0ea23f4e4112a452ba7ffd8855a86d0b5849452d3f44b11f600518c18f8f5025

Resolution:
https://explorer-bradbury.genlayer.com/tx/0x7099d23fcf92f4274973ac629ddb6812ad2c357471e07bc34c4614594a11a2b3

The submission finalized on 3 October 2026 at 17:28:55 Australia/Sydney.
The resolution finalized at 18:31:14 Australia/Sydney.

Load claim-4 without a wallet to inspect VERIFIED / HIGH, with all six facts
matching and reason ALL_EXPECTED_FACTS_MATCH. Counts are 20 total, 17 claimed,
3 locked, 0 other, 20 verified funding records and 0 funding mismatches.
The evidence is the same explicitly synthetic fixture used for claim-2.

The resolution journey included a leader timeout, an appeal, acceptance and
finalization. A submission tracker fetch failure was recovered using the
existing-transaction check button; the transaction was not resubmitted.

## Limits

- Testnet application supporting RECORD_SET_CLAIM_V1 only.
- Demo evidence is synthetic, not a real-world audit.
- The manifest digest is stored but not recomputed by the contract.
- Evidence must be publicly accessible; private evidence is unsupported.
- Live evidence may change between submission and resolution.
- The HIGH confidence label reflects the contract's count-consistency rule;
  it is not a calibrated probability or guarantee of factual accuracy.
- Wallet discovery targets injected EVM browser wallets. Rabby was tested.
  Mobile WalletConnect integration is not included.
- Exact claim-ID discovery depends on the network execution-trace endpoint.

## Run locally

Tested with Node 24.

Run commands from this repository's root:

```bash
npm ci
npm run dev
```

Production build:

```bash
npm run build
```

The dedicated GitHub Pages workflow builds from `main` with the
`/EvidenceBound-app/` asset base. Enable GitHub Actions as the Pages source,
then run the deployment workflow. The dedicated deployment completed successfully
on 3 October 2026. The original hosting location remains available.

## Repository relationship

This repository contains the EvidenceBound web application and a deployment-exact
review copy of its previously accepted Intelligent Contract. Contract development
history remains in the original repository; pinned provenance is documented in
[contracts/PROVENANCE.md](contracts/PROVENANCE.md).

Contract source and development history:
https://github.com/knisaci/EvidenceBound

The application uses the existing Bradbury deployment:
0x490817c879b019a5099F937EaF5672bCA887DfA3

The initial frontend was developed and tested in the contract repository,
then separated into this dedicated application repository. This separation
does not represent a new contract deployment.
