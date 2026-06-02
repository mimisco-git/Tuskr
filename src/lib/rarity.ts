/**
 * rarity.ts — NFT Rarity Score Calculator
 * Scores NFTs based on trait frequency and uniqueness.
 * Higher score = rarer = more valuable.
 */

export interface RarityResult {
  score:  number     // 0-100
  tier:   'Common' | 'Uncommon' | 'Rare' | 'Epic' | 'Legendary'
  color:  string
  label:  string
}

const TIER_CONFIG = [
  { min: 80, tier: 'Legendary' as const, color: '#f59e0b', label: '★ Legendary' },
  { min: 60, tier: 'Epic'      as const, color: '#a78bfa', label: '◆ Epic'      },
  { min: 40, tier: 'Rare'      as const, color: '#06b6d4', label: '◈ Rare'      },
  { min: 20, tier: 'Uncommon'  as const, color: '#00d4aa', label: '◉ Uncommon'  },
  { min:  0, tier: 'Common'    as const, color: '#8A8F98', label: '○ Common'    },
]

/**
 * Score from traits array (from AI generator output)
 */
export function scoreFromTraits(traits: { trait_type: string; value: string }[]): RarityResult {
  if (!traits || traits.length === 0) return scoreFromName('', '')

  let score = 0

  // More traits = rarer
  score += Math.min(traits.length * 8, 40)

  // Specific rare trait types boost score
  const rareTypes = ['background','legendary','special','unique','mythic','divine','cosmic','void']
  const rareVals  = ['none','zero','infinity','genesis','one-of-one','exclusive']

  traits.forEach(t => {
    const type = t.trait_type.toLowerCase()
    const val  = t.value.toLowerCase()

    if (rareTypes.some(r => type.includes(r))) score += 15
    if (rareVals.some(r => val.includes(r)))   score += 20
    if (val === 'none' || val === 'null')       score += 10 // "None" traits are rare
    if (val.length < 4)                         score += 5  // Short values are often rare
  })

  return buildResult(Math.min(score, 100))
}

/**
 * Score from NFT name and description heuristics
 */
export function scoreFromName(name: string, description: string): RarityResult {
  const text = `${name} ${description}`.toLowerCase()
  let score = 20 // Base score

  const legendaryWords = ['genesis','legendary','mythic','one-of-one','unique','exclusive','divine','cosmic','void','origin','alpha']
  const epicWords      = ['epic','rare','special','limited','elite','prime','ultra','supreme']
  const rareWords      = ['rare','chosen','ancient','sacred','astral','eternal','shadow','phantom']

  legendaryWords.forEach(w => { if (text.includes(w)) score += 20 })
  epicWords.forEach(w =>      { if (text.includes(w)) score += 12 })
  rareWords.forEach(w =>      { if (text.includes(w)) score += 8  })

  // Number in name (#001 is rarer than #999)
  const numMatch = name.match(/#(\d+)/)
  if (numMatch) {
    const num = parseInt(numMatch[1])
    if (num <= 10)  score += 25
    else if (num <= 50)  score += 15
    else if (num <= 100) score += 8
  }

  return buildResult(Math.min(score, 100))
}

function buildResult(score: number): RarityResult {
  const tier = TIER_CONFIG.find(t => score >= t.min) ?? TIER_CONFIG[4]
  return { score, tier: tier.tier, color: tier.color, label: tier.label }
}
