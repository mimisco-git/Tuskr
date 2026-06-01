import { useState } from 'react'
import { useWalrus } from '../hooks/useWalrus'
import { useAIGenerator } from '../hooks/useAIGenerator'
import { useNFTMarketplace } from '../hooks/useNFTMarketplace'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { useToast } from '../components/Toast'
import s from './AIGenerator.module.css'
import usePageTitle from '../hooks/usePageTitle'

const STYLE_PRESETS = [
  { label:'Pixel Art',        prompt:'pixel art style, 16-bit, vibrant colors' },
  { label:'Dark Fantasy',     prompt:'dark fantasy digital art, dramatic lighting, cinematic' },
  { label:'Watercolor',       prompt:'delicate watercolor illustration, soft edges, flowing' },
  { label:'Cyberpunk',        prompt:'cyberpunk neon, futuristic, glowing, urban decay' },
  { label:'Minimalist',       prompt:'minimalist geometric art, clean lines, limited palette' },
  { label:'Afrofuturism',     prompt:'afrofuturism, vibrant, cosmic, cultural richness' },
]

export default function AIGenerator() {
  usePageTitle('AI Generator')
  const account  = useCurrentAccount()
  const { toast, success, error: toastError } = useToast()
  const { uploadBlob, uploading } = useWalrus()
  const { mintNFT } = useNFTMarketplace()
  const { generateNFTConcept, generating } = useAIGenerator()

  const [userPrompt, setUserPrompt] = useState('')
  const [style, setStyle]           = useState(STYLE_PRESETS[0])
  const [concept, setConcept]       = useState<any>(null)
  const [step, setStep]             = useState<'prompt'|'review'|'mint'|'done'>('prompt')
  const [imageFile, setImageFile]   = useState<File|null>(null)
  const [imagePreview, setImagePreview] = useState<string|null>(null)
  const [txDigest, setTxDigest]     = useState<string|null>(null)

  const generate = async () => {
    if (!userPrompt.trim()) return
    toast('Generating concept with Claude...', 'loading')
    const result = await generateNFTConcept(`${userPrompt} in ${style.label} style`)
    if (result) { setConcept(result); setStep('review') }
    else toastError('Generation failed. Try again.')
  }

  const handleImageUpload = (file: File) => {
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const mintGenerated = async () => {
    if (!imageFile || !concept || !account) return
    setStep('mint')
    toast('Uploading to Walrus...', 'loading')

    const uploaded = await uploadBlob(imageFile)
    if (!uploaded) { toastError('Walrus upload failed'); setStep('review'); return }

    toast('Minting on Sui...', 'loading')
    try {
      const result = await mintNFT({
        name:        concept.name,
        description: concept.description,
        blobId:      uploaded.blobId,
        mediaUrl:    uploaded.mediaUrl,
        royaltyBps:  500,
      })
      setTxDigest(result.digest)
      success('NFT minted!', result.digest)
      setStep('done')
    } catch (e) {
      toastError('Mint failed')
      setStep('review')
    }
  }

  return (
    <main className={s.page}>
      <div className={s.inner}>
        <div className={s.header}>
          <div className={s.eyebrow}>
            <div className={s.eyebrowLine} />
            <span className={s.eyebrowText}>AI-Powered</span>
          </div>
          <h1 className={s.title}>NFT Generator</h1>
          <p className={s.sub}>Describe your idea. Claude generates the concept. You upload the art. It mints on Sui.</p>
        </div>

        {step === 'prompt' && (
          <div className={s.card}>
            <div className={s.section}>
              <p className={s.sectionLabel}>Describe your NFT</p>
              <textarea
                className={`input ${s.textarea}`}
                placeholder="e.g. A cosmic walrus floating through a nebula, wearing ancient tribal jewellery..."
                value={userPrompt}
                onChange={e => setUserPrompt(e.target.value)}
                rows={4}
              />
            </div>

            <div className={s.section}>
              <p className={s.sectionLabel}>Art style</p>
              <div className={s.styleGrid}>
                {STYLE_PRESETS.map(st => (
                  <button
                    key={st.label}
                    className={`${s.stylePill} ${style.label === st.label ? s.styleActive : ''}`}
                    onClick={() => setStyle(st)}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              className="btn btn-primary btn-lg"
              onClick={generate}
              disabled={!userPrompt.trim() || generating}
              style={{ width:'100%', justifyContent:'center' }}
            >
              {generating ? 'Claude is thinking...' : '✦ Generate concept'}
            </button>
          </div>
        )}

        {step === 'review' && concept && (
          <div className={s.reviewGrid}>
            <div className={s.card}>
              <p className={s.sectionLabel}>Generated concept</p>
              <h2 className={s.conceptName}>{concept.name}</h2>
              <p className={s.conceptDesc}>{concept.description}</p>
              <div className={s.conceptStyle}>
                <span className="tag tag-a">{concept.style}</span>
              </div>

              <div className={s.traits}>
                <p className={s.traitsLabel}>Traits</p>
                <div className={s.traitsGrid}>
                  {concept.traits?.map((t: any) => (
                    <div key={t.trait_type} className={s.trait}>
                      <p className={s.traitKey}>{t.trait_type}</p>
                      <p className={s.traitVal}>{t.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className={s.aiPromptBox}>
                <p className={s.aiPromptLabel}>Art generation prompt</p>
                <p className={s.aiPrompt}>{concept.prompt}</p>
              </div>

              <button className="btn btn-ghost btn-sm" onClick={() => setStep('prompt')} style={{marginTop:12}}>
                ← Regenerate
              </button>
            </div>

            <div className={s.card}>
              <p className={s.sectionLabel}>Upload your artwork</p>
              <p className={s.uploadHint}>
                Use the prompt above in Midjourney, DALL-E, or any AI art tool, then upload the result here.
              </p>

              <div
                className={s.dropzone}
                onClick={() => document.getElementById('ai-file')?.click()}
              >
                {imagePreview
                  ? <img src={imagePreview} alt="" className={s.previewImg} />
                  : <div className={s.dropInner}>
                      <p className={s.dropIcon}>↑</p>
                      <p className={s.dropText}>Click to upload artwork</p>
                    </div>
                }
                <input
                  id="ai-file" type="file" accept="image/*"
                  style={{ display:'none' }}
                  onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                />
              </div>

              {!account && (
                <p className={s.connectWarning}>Connect wallet to mint</p>
              )}

              <button
                className="btn btn-primary btn-lg"
                onClick={mintGenerated}
                disabled={!imageFile || !account || uploading}
                style={{ width:'100%', justifyContent:'center', marginTop:16 }}
              >
                {uploading ? 'Uploading...' : 'Mint on Sui'}
              </button>
            </div>
          </div>
        )}

        {step === 'mint' && (
          <div className={s.card} style={{ textAlign:'center', padding:'60px 32px' }}>
            <div className={s.mintingIcon}>⟳</div>
            <h2 className={s.mintingTitle}>Minting your NFT...</h2>
            <p className={s.mintingSub}>Uploading to Walrus and minting on Sui. Confirm in your wallet.</p>
          </div>
        )}

        {step === 'done' && (
          <div className={s.card} style={{ textAlign:'center', padding:'60px 32px' }}>
            <div className={s.doneIcon}>✓</div>
            <h2 className={s.doneTitle}>{concept?.name}</h2>
            <p className={s.doneSub}>Your AI-generated NFT is live on Sui with media on Walrus.</p>
            <div className="flex gap-12" style={{ justifyContent:'center', marginTop:20 }}>
              {txDigest && (
                <a href={`https://suiexplorer.com/txblock/${txDigest}?network=testnet`} target="_blank" rel="noreferrer" className="btn btn-ghost">
                  Sui Explorer ↗
                </a>
              )}
              <button className="btn btn-primary" onClick={() => { setStep('prompt'); setConcept(null); setImageFile(null); setImagePreview(null); setUserPrompt('') }}>
                Generate another
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
