import { useBlobProof } from '../hooks/useBlobProof'
import s from './BlobVerifiedBadge.module.css'

interface Props { blobId?: string; showDetails?: boolean }

export default function BlobVerifiedBadge({ blobId, showDetails = false }: Props) {
  const proof = useBlobProof(blobId)
  if (!blobId) return null

  const icons: Record<string, string> = {
    checking:    '⟳',
    verified:    '✓',
    unavailable: '✗',
    unknown:     '?',
  }

  const status = proof?.status ?? 'checking'

  return (
    <div className={`${s.badge} ${s[status]}`}>
      <span className={s.icon}>{icons[status]}</span>
      <span className={s.label}>
        {status === 'checking'    && 'Checking Walrus...'}
        {status === 'verified'    && 'Verified on Walrus'}
        {status === 'unavailable' && 'Blob unavailable'}
        {status === 'unknown'     && 'Status unknown'}
      </span>
      {showDetails && proof?.status === 'verified' && proof.size && (
        <span className={s.detail}>{(proof.size / 1024).toFixed(1)} KB</span>
      )}
    </div>
  )
}
