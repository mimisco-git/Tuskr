/**
 * useAgentWallet — Autonomous AI agent with capped budget on Sui
 *
 * SECURITY: Agent keypair is derived deterministically from the user's wallet
 * signature. Nothing is stored in localStorage — not the private key, not even
 * encrypted. Same wallet = same agent address, always, on any device.
 *
 * Derivation:
 *   1. User signs a fixed message with their main wallet (one popup per session)
 *   2. SHA-256 hash of signature bytes → 32-byte Ed25519 seed
 *   3. Ed25519 keypair derived from seed
 *
 * The agent address is deterministic per wallet. Safe to share publicly.
 * The private key never touches localStorage, Walrus, or any server.
 */
import { useState, useEffect, useCallback, useRef }    from 'react'
import { useSuiClient, useSignPersonalMessage }         from '@mysten/dapp-kit'
import { Ed25519Keypair }                               from '@mysten/sui/keypairs/ed25519'
import { Transaction }                                  from '@mysten/sui/transactions'

// Fixed derivation message — changing this changes ALL agent addresses
const DERIVE_MSG = 'Tuskr Agent Wallet v1: Key Derivation'

const AGENT_POLICY   = 'tuskr_agent_policy'
const AGENT_LOG      = 'tuskr_agent_log'
const AGENT_LOG_BLOB = 'tuskr_agent_log_blob'
const PUBLISHER      = 'https://publisher.walrus-testnet.walrus.space'

export interface AgentPolicy {
  maxSpendSui:  number
  spentSui:     number
  scope:        string
  expiresAt:    number
  activatedAt:  number
  active:       boolean
  revoked:      boolean
}

export interface AgentAction {
  id:        string
  ts:        string
  type:      string
  nftName:   string
  costSui:   number
  txDigest:  string
  status:    'success' | 'failed' | 'blocked'
  reason?:   string
}

const DEFAULT_POLICY: AgentPolicy = {
  maxSpendSui: 0.5,
  spentSui:    0,
  scope:       'tuskr_nft_only',
  expiresAt:   Date.now() + 24 * 3600 * 1000,
  activatedAt: Date.now(),
  active:      false,
  revoked:     false,
}

export function useAgentWallet(ownerAddress: string | undefined) {
  const suiClient                 = useSuiClient()
  const { mutateAsync: signMsg }  = useSignPersonalMessage()

  // Keypair lives in memory only — never persisted anywhere
  const keypairRef                = useRef<Ed25519Keypair | null>(null)
  const [agentAddr, setAgentAddr] = useState<string>('')
  const [deriving,  setDeriving]  = useState(false)
  const [derived,   setDerived]   = useState(false)

  const [policy, setPolicy]       = useState<AgentPolicy>(DEFAULT_POLICY)
  const [log,    setLog]          = useState<AgentAction[]>([])
  const [saving, setSaving]       = useState(false)

  // Load policy + log from localStorage on mount (policy config is not sensitive)
  useEffect(() => {
    if (!ownerAddress) return
    const pol = localStorage.getItem(`${AGENT_POLICY}_${ownerAddress}`)
    if (pol) try { setPolicy(JSON.parse(pol)) } catch { /* ignore */ }
    const logStr = localStorage.getItem(`${AGENT_LOG}_${ownerAddress}`)
    if (logStr) try { setLog(JSON.parse(logStr)) } catch { /* ignore */ }
  }, [ownerAddress])

  // Derive agent keypair from wallet signature — one popup per session
  const deriveKeypair = useCallback(async () => {
    if (!ownerAddress || deriving) return
    setDeriving(true)
    try {
      // Ask user to sign the fixed derivation message
      const { signature } = await signMsg({
        message: new TextEncoder().encode(DERIVE_MSG),
      })

      // Decode base64 signature → bytes
      const sigBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0))

      // SHA-256 the signature bytes → deterministic 32-byte seed
      const hashBuf = await crypto.subtle.digest('SHA-256', sigBytes)
      const seed    = new Uint8Array(hashBuf)

      // Derive Ed25519 keypair from seed
      const kp      = Ed25519Keypair.fromSecretKey(seed)
      keypairRef.current = kp
      setAgentAddr(kp.getPublicKey().toSuiAddress())
      setDerived(true)
    } catch (e: any) {
      // User rejected or wallet error
      throw new Error(e?.message?.includes('reject') ? 'Wallet signature rejected.' : `Key derivation failed: ${e?.message}`)
    } finally {
      setDeriving(false)
    }
  }, [ownerAddress, deriving, signMsg])

  // Save + activate policy
  const activatePolicy = useCallback((patch: Partial<AgentPolicy>) => {
    const updated = { ...policy, ...patch, active: true, revoked: false, activatedAt: Date.now() }
    setPolicy(updated)
    if (ownerAddress) localStorage.setItem(`${AGENT_POLICY}_${ownerAddress}`, JSON.stringify(updated))
  }, [policy, ownerAddress])

  // Revoke — clear policy and forget keypair from memory
  const revoke = useCallback(() => {
    keypairRef.current = null
    setAgentAddr('')
    setDerived(false)
    const revoked = { ...policy, active: false, revoked: true }
    setPolicy(revoked)
    if (ownerAddress) localStorage.setItem(`${AGENT_POLICY}_${ownerAddress}`, JSON.stringify(revoked))
  }, [policy, ownerAddress])

  // Log action to Walrus
  const logAction = useCallback(async (action: AgentAction) => {
    const updated = [action, ...log].slice(0, 50)
    setLog(updated)
    if (ownerAddress) localStorage.setItem(`${AGENT_LOG}_${ownerAddress}`, JSON.stringify(updated))
    try {
      setSaving(true)
      const payload = JSON.stringify({ owner: ownerAddress, log: updated })
      const res = await fetch(`${PUBLISHER}/v1/blobs?epochs=5`, {
        method: 'PUT',
        body: new Blob([payload], { type: 'application/json' }),
      })
      if (res.ok) {
        const d = await res.json()
        const id = d.newlyCreated?.blobObject?.blobId || d.alreadyCertified?.blobId
        if (id && ownerAddress) localStorage.setItem(`${AGENT_LOG_BLOB}_${ownerAddress}`, id)
      }
    } catch { /* log is best-effort */ } finally { setSaving(false) }
  }, [log, ownerAddress])

  // Check policy
  const checkPolicy = useCallback((costSui: number): { allowed: boolean; reason?: string } => {
    if (!policy.active)  return { allowed: false, reason: 'Agent not activated.' }
    if (policy.revoked)  return { allowed: false, reason: 'Agent has been revoked by owner.' }
    if (Date.now() > policy.expiresAt) return { allowed: false, reason: 'Agent policy has expired.' }
    if (policy.spentSui + costSui > policy.maxSpendSui) {
      const rem = (policy.maxSpendSui - policy.spentSui).toFixed(4)
      return { allowed: false, reason: `Budget exceeded. ${rem} SUI remaining of ${policy.maxSpendSui} SUI budget.` }
    }
    return { allowed: true }
  }, [policy])

  // Execute transaction autonomously — agent signs, no popup
  const executeAutonomously = useCallback(async (
    tx:       Transaction,
    costSui:  number,
    metadata: { type: string; nftName: string },
  ): Promise<{ digest: string } | null> => {
    const kp = keypairRef.current
    if (!kp || !ownerAddress) return null

    const check   = checkPolicy(costSui)
    const actionId = Date.now().toString()

    if (!check.allowed) {
      await logAction({
        id: actionId, ts: new Date().toISOString(),
        type: metadata.type, nftName: metadata.nftName,
        costSui, txDigest: '', status: 'blocked', reason: check.reason,
      })
      throw new Error(check.reason)
    }

    try {
      tx.setSender(agentAddr)
      const { bytes, signature } = await tx.sign({ signer: kp, client: suiClient as any })

      const rpcRes = await fetch('https://fullnode.testnet.sui.io:443', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 1,
          method: 'sui_executeTransactionBlock',
          params: [bytes, [signature], { showEffects: true }, null],
        }),
      })
      const rpcData = await rpcRes.json()
      if (rpcData.error) throw new Error(rpcData.error.message)
      const result = rpcData.result

      const updatedPolicy = { ...policy, spentSui: policy.spentSui + costSui }
      setPolicy(updatedPolicy)
      if (ownerAddress) localStorage.setItem(`${AGENT_POLICY}_${ownerAddress}`, JSON.stringify(updatedPolicy))

      await logAction({
        id: actionId, ts: new Date().toISOString(),
        type: metadata.type, nftName: metadata.nftName,
        costSui, txDigest: result.digest, status: 'success',
      })
      return { digest: result.digest }
    } catch (err: any) {
      await logAction({
        id: actionId, ts: new Date().toISOString(),
        type: metadata.type, nftName: metadata.nftName,
        costSui, txDigest: '', status: 'failed', reason: err?.message,
      })
      throw err
    }
  }, [agentAddr, policy, checkPolicy, logAction, suiClient, ownerAddress])

  const remainingBudget = policy.maxSpendSui - policy.spentSui
  const budgetPct       = (policy.spentSui / policy.maxSpendSui) * 100
  const isExpired       = Date.now() > policy.expiresAt
  const logBlobId       = ownerAddress ? localStorage.getItem(`${AGENT_LOG_BLOB}_${ownerAddress}`) : null

  return {
    agentAddr, derived, deriving, policy, log,
    saving, remainingBudget, budgetPct, isExpired, logBlobId,
    deriveKeypair, activatePolicy, revoke, checkPolicy, executeAutonomously, logAction,
  }
}
