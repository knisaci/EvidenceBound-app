# Contract source and deployment provenance

## Included source

[`evidence_bound.py`](./evidence_bound.py) is an unchanged review copy of EvidenceBound v0.3 from the original contract repository.

- Original repository: https://github.com/knisaci/EvidenceBound
- Implementation revision: `f0a0db04e4f3dbdf686968d0e198d17afc0c8ed7`
- Original pinned source: https://github.com/knisaci/EvidenceBound/blob/f0a0db04e4f3dbdf686968d0e198d17afc0c8ed7/contracts/evidence_bound.py
- Accepted Intelligent Contract submission snapshot: `fdaf62e2c0935cdd44ceaf84e833c38cdddf62e7`
- Accepted pinned source: https://github.com/knisaci/EvidenceBound/blob/fdaf62e2c0935cdd44ceaf84e833c38cdddf62e7/contracts/evidence_bound.py
- Git source blob SHA: `4ac2f95e1d342074c053b7de36fa1fa1aaa7bb2f` at both revisions and in this copy.

The implementation revision introduced the v0.3 contract; the accepted snapshot contains the same source bytes. Original authorship and development history remain in the original repository. This copy does not introduce a new deployment or change contract behaviour.

## Bradbury deployment record

The original repository's deployment record associates v0.3 with:

- Address: `0x490817c879b019a5099F937EaF5672bCA887DfA3`
- Explorer: https://explorer-bradbury.genlayer.com/address/0x490817c879b019a5099F937EaF5672bCA887DfA3
- Deployment transaction: https://explorer-bradbury.genlayer.com/tx/0x7b3f1f3f3305c0a39cc3ffded38a54fc7c74b6c858abedaa51446616898358a7
- Underlying chain transaction: `0xbeaa86d4d0cac78469fb089a64698f423c3c924c7582adc5e168c2de4adac134`

The application uses that existing address. Historical records identify the source revision above; reviewers can independently compare the deployed source against the included bytes using the following read-only check.

## Verify deployed source

With Node 24 and repository dependencies installed:

```bash
npm ci
node scripts/verify-contract-source.mjs
```

The script retrieves the code from Bradbury using the GenLayer SDK, prints SHA-256 hashes for the included and deployed source, and exits successfully only if the UTF-8 bytes match exactly. A network error does not establish a source mismatch; retry after connectivity recovers. No wallet or transaction is required.

## Material behaviour to review

- `submit_claim` requires exactly six non-negative integer facts and consistent record-status and funding totals. It creates the stored statement deterministically.
- `_extract` retrieves the public evidence URLs and extracts canonical counts with `gl.nondet.exec_prompt`. `gl.eq_principle.strict_eq` reaches consensus on the serialized fact object.
- `_derive` compares all six facts and deterministically derives the verdict and reasons.
- `resolve_claim` stores the result and prevents repeated resolution.
- `get_claim` and `get_claim_count` expose results for the frontend.
- The manifest digest is a stored declaration; v0.3 does not recompute it.

Finalized app workflow evidence and synthetic demo outcomes are documented in the [root README](../README.md).
