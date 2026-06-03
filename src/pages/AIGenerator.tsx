import { useState } from 'react'
import { useWalrus } from '../hooks/useWalrus'
import { useAIGenerator } from '../hooks/useAIGenerator'
import { useNFTMarketplace } from '../hooks/useNFTMarketplace'
import { useCurrentAccount } from '@mysten/dapp-kit'
import { useToast } from '../components/Toast'
import { Link } from 'react-router-dom'
import { useNetwork } from '../hooks/useNetwork'
import s from './AIGenerator.module.css'
import usePageTitle from '../hooks/usePageTitle'

const STYLE_PRESETS = [
  { label:'Pixel Art',     icon:'◈', prompt:'pixel art style, 16-bit, vibrant colors' },
  { label:'Dark Fantasy',  icon:'◉', prompt:'dark fantasy digital art, dramatic lighting, cinematic' },
  { label:'Watercolor',    icon:'◎', prompt:'delicate watercolor illustration, soft edges, flowing' },
  { label:'Cyberpunk',     icon:'◆', prompt:'cyberpunk neon, futuristic, glowing, urban decay' },
  { label:'Minimalist',    icon:'○', prompt:'minimalist geometric art, clean lines, limited palette' },
  { label:'Afrofuturism',  icon:'✦', prompt:'afrofuturism, vibrant, cosmic, cultural richness' },
]

const AI_TOOLS = [
  { name:'Midjourney',   url:'https://midjourney.com',       desc:'Best quality' },
  { name:'DALL-E',       url:'https://chatgpt.com',          desc:'Fast, free tier' },
  { name:'Leonardo AI',  url:'https://leonardo.ai',          desc:'Free credits' },
  { name:'Adobe Firefly',url:'https://firefly.adobe.com',    desc:'Free trial' },
]

export default function AIGenerator() {
  usePageTitle('AI Generator')
  const account = useCurrentAccount()
  const { network } = useNetwork()
  const { toast, success, error: toastError } = useToast()
  const { uploadBlob, uploading } = useWalrus()
  const { mintNFT } = useNFTMarketplace()
  const { generateNFTConcept, generating } = useAIGenerator()

  const [userPrompt,    setUserPrompt]    = useState('')
  const [style,         setStyle]         = useState(STYLE_PRESETS[0])
  const [concept,       setConcept]       = useState<any>(null)
  const [step,          setStep]          = useState<'prompt'|'review'|'mint'|'done'>('prompt')
  const [imageFile,     setImageFile]     = useState<File|null>(null)
  const [imagePreview,  setImagePreview]  = useState<string|null>(null)
  const [txDigest,      setTxDigest]      = useState<string|null>(null)
  const [isMinting,     setIsMinting]     = useState(false)
  const [promptCopied,  setPromptCopied]  = useState(false)

  const generate = async () => {
    if (!userPrompt.trim()) return
    toast('Generating concept with Groq AI...', 'loading')
    const result = await generateNFTConcept(`${userPrompt} in ${style.label} style`)
    if (result) { setConcept(result); setStep('review') }
    else toastError('Generation failed. Check your Groq API key in Vercel.')
  }

  const copyPrompt = () => {
    navigator.clipboard.writeText(concept?.prompt ?? '')
    setPromptCopied(true)
    setTimeout(() => setPromptCopied(false), 2000)
  }

  const handleImageUpload = (file: File) => {
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith('image/')) handleImageUpload(file)
  }

  const mintGenerated = async () => {
    if (!imageFile || !concept || !account) return
    setIsMinting(true)
    setStep('mint')

    // Upload to Walrus
    toast('Uploading image to Walrus...', 'loading')
    const uploaded = await uploadBlob(imageFile)
    if (!uploaded) {
      toastError('Walrus upload failed — check your network connection')
      setStep('review')
      return
    }

    // Mint on Sui
    toast('Minting on Sui — confirm in your wallet...', 'loading')
    try {
      const result = await mintNFT({
        name:        concept.name || 'Tuskr NFT',
        description: concept.description || '',
        blobId:      uploaded.blobId,
        mediaUrl:    uploaded.mediaUrl,
        royaltyBps:  500,
      })
      setTxDigest(result.digest)
      success('NFT minted successfully!')
      setStep('done')
    } catch (err: any) {
      const msg = err?.message || 'Mint failed'
      toastError(msg)
      setStep('review')
    } finally {
      setIsMinting(false)
    }
  }

  const reset = () => {
    setStep('prompt'); setConcept(null)
    setImageFile(null); setImagePreview(null)
    setUserPrompt(''); setTxDigest(null); setIsMinting(false)
  }

  return (
    <main className={s.page}>
      <div className={s.inner}>

        {/* Header */}
        <div className={s.header}>
          <div className={s.eyebrow}>
            <span className={s.eyebrowDot}/>
            <span>AI-Powered Creation</span>
          </div>
          <h1 className={s.title}>NFT Generator</h1>
          <p className={s.sub}>Describe your idea. Groq AI builds the concept and traits. You generate the art. Tuskr mints it on Sui with media on Walrus.</p>
        </div>

        {/* Step indicators */}
        <div className={s.steps}>
          {['Describe','Generate','Upload art','Mint'].map((label, i) => {
            const stepMap = ['prompt','review','review','done']
            const active  = i === ['prompt','review','mint','done'].indexOf(step)
            const done    = ['prompt','review','review','done'].indexOf(step) > i ||
                            (step === 'done' && i < 3)
            return (
              <div key={label} className={`${s.step} ${active ? s.stepActive : ''} ${done ? s.stepDone : ''}`}>
                <div className={s.stepNum}>{done ? '✓' : i + 1}</div>
                <span className={s.stepLabel}>{label}</span>
                {i < 3 && <div className={s.stepLine}/>}
              </div>
            )
          })}
        </div>

        {/* STEP 1, Prompt */}
        {step === 'prompt' && (
          <div className={s.card}>
            <div className={s.fieldGroup}>
              <label className={s.label}>Describe your NFT concept</label>
              <textarea
                className={`input ${s.textarea}`}
                placeholder="e.g. A cosmic walrus warrior floating through a nebula, wearing ancient tribal armour and holding a glowing spear..."
                value={userPrompt}
                onChange={e => setUserPrompt(e.target.value)}
                rows={5}
              />
              <p className={s.hint}>Be specific. Include mood, setting, character, and any unique details.</p>
            </div>

            <div className={s.fieldGroup}>
              <label className={s.label}>Art style</label>
              <div className={s.styleGrid}>
                {STYLE_PRESETS.map(st => (
                  <button
                    key={st.label}
                    className={`${s.styleCard} ${style.label === st.label ? s.styleActive : ''}`}
                    onClick={() => setStyle(st)}
                  >
                    <span className={s.styleIcon}>{st.icon}</span>
                    <span className={s.styleName}>{st.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              className={`btn btn-primary btn-lg ${s.generateBtn}`}
              onClick={generate}
              disabled={!userPrompt.trim() || generating}
            >
              {generating
                ? <><span className={s.spinner}/> Groq is generating…</>
                : '✦ Generate concept'
              }
            </button>
          </div>
        )}

        {/* STEP 2, Review + Upload */}
        {step === 'review' && concept && (
          <div className={s.reviewLayout}>

            {/* Left: Generated concept */}
            <div className={s.conceptCard}>
              <div className={s.conceptHeader}>
                <div className={s.conceptMeta}>
                  <span className={s.conceptStyle}>{concept.style || style.label}</span>
                  <span className={s.conceptBadge}>AI Generated</span>
                </div>
                <h2 className={s.conceptName}>{concept.name}</h2>
                <p className={s.conceptDesc}>{concept.description}</p>
              </div>

              {/* Traits */}
              {concept.traits?.length > 0 && (
                <div className={s.traitsSection}>
                  <p className={s.traitsTitle}>Traits</p>
                  <div className={s.traitsGrid}>
                    {concept.traits.map((t: any) => (
                      <div key={t.trait_type} className={s.traitCard}>
                        <p className={s.traitType}>{t.trait_type}</p>
                        <p className={s.traitValue}>{t.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Prompt box */}
              <div className={s.promptSection}>
                <div className={s.promptHeader}>
                  <p className={s.promptTitle}>Image generation prompt</p>
                  <button className={s.copyBtn} onClick={copyPrompt}>
                    {promptCopied ? '✓ Copied' : 'Copy prompt'}
                  </button>
                </div>
                <p className={s.promptText}>{concept.prompt}</p>
                <div className={s.toolsRow}>
                  <p className={s.toolsLabel}>Use this prompt in:</p>
                  <div className={s.tools}>
                    {AI_TOOLS.map(t => (
                      <a key={t.name} href={t.url} target="_blank" rel="noopener noreferrer" className={s.toolPill}>
                        <span>{t.name}</span>
                        <span className={s.toolDesc}>{t.desc}</span>
                      </a>
                    ))}
                  </div>
                </div>
              </div>

              <button className={s.regenBtn} onClick={() => setStep('prompt')}>
                ← Change concept
              </button>
            </div>

            {/* Right: Upload */}
            <div className={s.uploadCard}>
              <div className={s.uploadHeader}>
                <h3 className={s.uploadTitle}>Upload your artwork</h3>
                <p className={s.uploadSub}>Generate an image using the prompt above, then upload it here to mint.</p>
              </div>

              <div
                className={`${s.dropzone} ${imagePreview ? s.dropzoneFilled : ''}`}
                onClick={() => document.getElementById('ai-file')?.click()}
                onDrop={handleDrop}
                onDragOver={e => e.preventDefault()}
              >
                {imagePreview ? (
                  <>
                    <img src={imagePreview} alt="Preview" className={s.previewImg}/>
                    <div className={s.previewOverlay}>
                      <span>Click to change</span>
                    </div>
                  </>
                ) : (
                  <div className={s.dropInner}>
                    <div className={s.dropIcon}>↑</div>
                    <p className={s.dropTitle}>Drop your image here</p>
                    <p className={s.dropSub}>PNG, JPG, GIF, MP4 · up to 10MB</p>
                  </div>
                )}
                <input
                  id="ai-file" type="file" accept="image/*"
                  style={{ display:'none' }}
                  onChange={e => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                />
              </div>

              {imageFile && (
                <div className={s.fileInfo}>
                  <span className={s.fileName}>{imageFile.name}</span>
                  <span className={s.fileSize}>{(imageFile.size / 1024).toFixed(0)} KB</span>
                </div>
              )}

              {!account && (
                <div className={s.walletWarning}>Connect your wallet to mint</div>
              )}

              <button
                className={s.mintActionBtn}
                onClick={mintGenerated}
                disabled={!imageFile || !account || uploading || isMinting}
              >
                {uploading
                  ? <><span className={s.btnSpinner}/> Uploading to Walrus...</>
                  : isMinting
                    ? <><span className={s.btnSpinner}/> Minting on Sui...</>
                    : !account
                      ? 'Connect wallet to mint'
                      : !imageFile
                        ? 'Upload your artwork above first'
                        : 'Mint on Sui →'
                }
              </button>

              <div className={s.mintInfo}>
                <div className={s.mintInfoItem}><span className={s.mintDot}/> Media stored on Walrus</div>
                <div className={s.mintInfoItem}><span className={s.mintDot}/> Ownership on Sui {network.name}</div>
                <div className={s.mintInfoItem}><span className={s.mintDot}/> 5% royalty set</div>
              </div>
              <div className={s.networkNote}>
                Your wallet must be on <strong>{network.name}</strong> to mint.
                Switch in your wallet extension if needed.
              </div>
            </div>
          </div>
        )}

        {/* STEP 3, Minting */}
        {step === 'mint' && (
          <div className={s.statusCard}>
            <div className={s.spinner} style={{ width:48, height:48, borderWidth:3 }}/>
            <h2 className={s.statusTitle}>Minting your NFT</h2>
            <p className={s.statusSub}>Uploading to Walrus decentralized storage, then minting on Sui. Confirm the transaction in your wallet.</p>
            <div className={s.statusSteps}>
              <div className={s.statusStep}><span className={s.mintDot}/>Upload to Walrus</div>
              <div className={s.statusStep}><span className={s.mintDot}/>Mint on Sui</div>
              <div className={s.statusStep}><span className={s.mintDot}/>Confirm in wallet</div>
            </div>
          </div>
        )}

        {/* STEP 4, Done */}
        {step === 'done' && (
          <div className={s.statusCard}>
            <div className={s.doneCheck}>✓</div>
            <h2 className={s.statusTitle}>{concept?.name} is live</h2>
            <p className={s.statusSub}>Your AI-generated NFT is now permanently stored on Walrus and owned on Sui.</p>

            {imagePreview && (
              <div className={s.donePreview}>
                <img src={imagePreview} alt={concept?.name} className={s.doneImg}/>
              </div>
            )}

            <div className={s.doneActions}>
              {txDigest && (
                <a
                  href={`https://suivision.xyz/txblock/${txDigest}${network.name === "testnet" ? "?network=testnet" : ""}`}
                  target="_blank" rel="noreferrer"
                  className="btn btn-ghost"
                >
                  View on Explorer ↗
                </a>
              )}
              <Link to="/profile" className="btn btn-ghost">My NFTs</Link>
              <Link to="/list" className="btn btn-primary">List for sale</Link>
            </div>

            <button className={s.regenBtn} style={{ marginTop:24 }} onClick={reset}>
              Generate another NFT
            </button>
          </div>
        )}
      </div>
    </main>
  )
}
