import type { EIP1193Provider } from 'viem'

let connectedProvider: EIP1193Provider | undefined

export function setWalletProvider(provider?: EIP1193Provider) {
  connectedProvider = provider
}

export function getWalletProvider() {
  if (!connectedProvider) {
    throw new Error('Connect your wallet first.')
  }
  return connectedProvider
}

export function describeError(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const object = error as { message?: unknown }
    if (typeof object.message === 'string') return object.message
    try { return JSON.stringify(error, null, 2) }
    catch { return 'Unable to display error.' }
  }
  return String(error)
}
