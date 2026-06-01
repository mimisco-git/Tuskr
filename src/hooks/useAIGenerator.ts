/**
 * useAIGenerator.ts
 * Generate NFT artwork descriptions and metadata using Claude,
 * then the user can use the generated concept to create/upload their art.
 *
 * For actual image generation we call a compatible image gen endpoint.
 */
import { useState } from 'react'

export interface GeneratedNFT {
  name:        string
  description: string
  traits:      { trait_type: string; value: string }[]
  prompt:      string
  style:       string
}

export function useAIGenerator() {
  const [generating, setGenerating] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const generateNFTConcept = async (userPrompt: string): Promise<GeneratedNFT | null> => {
    setGenerating(true)
    setError(null)

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          model:      'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: `You are an NFT creative director for Tuskr, a premium NFT marketplace on Sui blockchain.
Generate compelling NFT concepts based on user prompts.
Always respond with valid JSON only, no markdown, no explanation outside the JSON.
The JSON must have: name (string), description (string, 1-2 sentences), traits (array of {trait_type, value}), prompt (detailed art generation prompt), style (art style name).`,
          messages: [{
            role:    'user',
            content: `Generate an NFT concept for: "${userPrompt}". Return JSON with name, description, traits (4-6 items), prompt (for image generation), and style.`
          }]
        })
      })

      if (!response.ok) throw new Error(`API error: ${response.status}`)
      const data = await response.json()
      const text = data.content?.[0]?.text ?? ''

      // Parse JSON, strip any markdown fences
      const clean = text.replace(/```json|```/g, '').trim()
      return JSON.parse(clean) as GeneratedNFT
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed')
      return null
    } finally {
      setGenerating(false)
    }
  }

  const generateCollectionIdeas = async (theme: string): Promise<string[]> => {
    setGenerating(true)
    setError(null)
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          model:      'claude-sonnet-4-20250514',
          max_tokens: 500,
          system: 'You are an NFT creative director. Return only a JSON array of 5 creative NFT collection name suggestions. No explanation.',
          messages: [{ role: 'user', content: `Theme: ${theme}` }]
        })
      })
      const data = await response.json()
      const text = data.content?.[0]?.text ?? '[]'
      return JSON.parse(text.replace(/```json|```/g, '').trim())
    } catch {
      return []
    } finally {
      setGenerating(false)
    }
  }

  return { generateNFTConcept, generateCollectionIdeas, generating, error }
}
