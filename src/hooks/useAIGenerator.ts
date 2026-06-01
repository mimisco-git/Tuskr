/**
 * useAIGenerator.ts — uses Groq (llama3-70b) for fast, free NFT concept generation.
 * Add VITE_GROQ_API_KEY to Vercel environment variables.
 * Get a free key at: https://console.groq.com
 */
import { useState } from 'react'

export interface GeneratedNFT {
  name:        string
  description: string
  traits:      { trait_type: string; value: string }[]
  prompt:      string
  style:       string
}

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY ?? ''

export function useAIGenerator() {
  const [generating, setGenerating] = useState(false)
  const [error, setError]           = useState<string | null>(null)

  const generateNFTConcept = async (userPrompt: string): Promise<GeneratedNFT | null> => {
    setGenerating(true)
    setError(null)

    if (!GROQ_API_KEY) {
      setError('No Groq API key. Add VITE_GROQ_API_KEY to Vercel environment variables.')
      setGenerating(false)
      return null
    }

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3-70b-8192',
          max_tokens: 800,
          temperature: 0.9,
          messages: [
            {
              role: 'system',
              content: `You are an NFT creative director for Tuskr, a premium NFT marketplace on Sui blockchain with media stored on Walrus.
Generate compelling, unique NFT concepts. Respond ONLY with valid JSON — no markdown, no explanation, just raw JSON.
Required fields: name (creative title), description (1-2 evocative sentences), traits (array of 4-6 {trait_type, value} objects), prompt (detailed image generation prompt), style (art style name).`
            },
            {
              role: 'user',
              content: `Generate a unique NFT concept for: "${userPrompt}"`
            }
          ]
        })
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error((err as any)?.error?.message ?? `Groq error: ${response.status}`)
      }

      const data = await response.json()
      const text = data.choices?.[0]?.message?.content ?? ''
      const clean = text.replace(/```json|```/g, '').trim()
      return JSON.parse(clean) as GeneratedNFT
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Generation failed. Try again.'
      setError(msg)
      return null
    } finally {
      setGenerating(false)
    }
  }

  const generateCollectionIdeas = async (theme: string): Promise<string[]> => {
    if (!GROQ_API_KEY) return []
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama3-70b-8192',
          max_tokens: 200,
          messages: [
            { role: 'system', content: 'Return ONLY a JSON array of 5 creative NFT collection names. No explanation.' },
            { role: 'user', content: `Theme: ${theme}` }
          ]
        })
      })
      const data = await response.json()
      const text = data.choices?.[0]?.message?.content ?? '[]'
      return JSON.parse(text.replace(/```json|```/g, '').trim())
    } catch {
      return []
    }
  }

  return { generateNFTConcept, generateCollectionIdeas, generating, error }
}
