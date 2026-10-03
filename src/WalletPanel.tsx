import { useEffect, useState } from 'react'
import { setWalletProvider } from './walletSession'
import { testnetBradbury } from 'genlayer-js/chains'
import type { EIP1193Provider } from 'viem'

type Wallet = {
  id: string
  name: string
  provider: EIP1193Provider
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'string') return err
  if (err && typeof err === 'object') {
    const value = err as { message?: unknown; error?: unknown }
    if (typeof value.message === 'string') return value.message
    if (value.error) return errorMessage(value.error)
    try { return JSON.stringify(err, null, 2) }
    catch { return 'The wallet returned an unreadable error.' }
  }
  return String(err)
}

function errorCode(err: unknown): number | undefined {
  if (!err || typeof err !== 'object') return undefined
  const value = err as { code?: unknown; error?: unknown; cause?: unknown }
  if (typeof value.code === 'number') return value.code
  return errorCode(value.error) ?? errorCode(value.cause)
}

export default function WalletPanel() {
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [address, setAddress] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    function announce(event: Event) {
      const detail = (event as CustomEvent<{
        info: { uuid: string; name: string }
        provider: EIP1193Provider
      }>).detail
      if (!detail?.provider || !detail.info) return

      const wallet = {
        id: detail.info.uuid,
        name: detail.info.name,
        provider: detail.provider,
      }
      setWallets(previous => [
        ...previous.filter(item =>
          item.id !== wallet.id && item.provider !== wallet.provider
        ),
        wallet,
      ])
    }

    window.addEventListener('eip6963:announceProvider', announce)

    const injected = (window as unknown as {
      ethereum?: EIP1193Provider
    }).ethereum
    if (injected) {
      setWallets(previous => previous.length ? previous : [{
        id: 'injected',
        name: 'Browser wallet',
        provider: injected,
      }])
    }

    window.dispatchEvent(new Event('eip6963:requestProvider'))
    return () => {
      window.removeEventListener('eip6963:announceProvider', announce)
    }
  }, [])

  const selected = wallets.find(item => item.id === selectedId) ?? wallets[0]

  useEffect(() => {
    setAddress('')
    const provider = selected?.provider
    if (!provider) return

    const reset = () => { setAddress(''); setWalletProvider() }
    provider.on('accountsChanged', reset)
    provider.on('chainChanged', reset)
    return () => {
      provider.removeListener('accountsChanged', reset)
      provider.removeListener('chainChanged', reset)
    }
  }, [selected?.provider])

  async function connect() {
    setBusy(true)
    setError('')
    setAddress('')

    try {
      if (!selected) throw new Error(
        'No browser wallet detected. Enable your wallet extension and refresh.'
      )
      const provider = selected.provider
      await provider.request({ method: 'eth_requestAccounts' })

      const expectedId = `0x${testnetBradbury.id.toString(16)}`
      const currentId = await provider.request({ method: 'eth_chainId' })

      if (BigInt(currentId) !== BigInt(testnetBradbury.id)) {
        try {
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: expectedId }],
          })
        } catch (err) {
          if (errorCode(err) !== 4902) throw err

          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: expectedId,
              chainName: testnetBradbury.name,
              nativeCurrency: testnetBradbury.nativeCurrency,
              rpcUrls: [...testnetBradbury.rpcUrls.default.http],
              ...(testnetBradbury.blockExplorers?.default ? {
                blockExplorerUrls: [
                  testnetBradbury.blockExplorers.default.url,
                ],
              } : {}),
            }],
          })
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: expectedId }],
          })
        }
      }

      const actualId = await provider.request({ method: 'eth_chainId' })
      if (BigInt(actualId) !== BigInt(testnetBradbury.id)) {
        throw new Error('Please select Bradbury in your wallet and reconnect.')
      }

      const accounts = await provider.request({ method: 'eth_accounts' })
      if (!accounts[0]) throw new Error('No account connected.')
      setWalletProvider(provider)
      setAddress(accounts[0])
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <h2>Your wallet</h2>
      <p>Connect an EVM browser wallet to use Bradbury testnet.</p>

      {wallets.length > 0 && (
        <>
          <label htmlFor="wallet-choice">Wallet</label>
          <select
            id="wallet-choice"
            value={selected?.id ?? ''}
            disabled={busy}
            onChange={event => {
              setSelectedId(event.target.value)
              setAddress('')
              setError('')
            }}
          >
            {wallets.map(wallet => (
              <option key={wallet.id} value={wallet.id}>
                {wallet.name}
              </option>
            ))}
          </select>
        </>
      )}

      <div className="controls">
        <button disabled={busy} onClick={connect}>
          {busy ? 'Connecting…' : address ? 'Reconnect wallet' : 'Connect wallet'}
        </button>
      </div>

      {address && (
        <p role="status">
          Connected: <strong>{address}</strong><br />
          Network: Bradbury testnet
        </p>
      )}
      {error && <pre className="error" role="alert">{error}</pre>}
    </section>
  )
}
