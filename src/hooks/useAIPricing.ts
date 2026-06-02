/**
 * useAIPricing — Groq AI suggests optimal listing price
 * Analyzes NFT name, description and comparable market data
 * to recommend a price with reasoning.
 */
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY ?? ''

export interface PriceSuggestion {
  price:      number
  low:        number
  high:       number
  confidence: 'high' | 'medium' | 'low'
  reasoning:  string
  factors:    string[]
}

export async function getAIPriceSuggestion(
  name: string,
  description: string,
  traits: string[] = [],
  recentSales: number[] = []
): Promise<PriceSuggestion | null> {
  if (!GROQ_API_KEY) return null

  const avgSale = recentSales.length
    ? recentSales.reduce((a,b) => a+b, 0) / recentSales.length
    : null

  const prompt = `You are an NFT market analyst for Tuskr, a premium NFT marketplace on Sui blockchain.

Analyze this NFT and suggest an optimal listing price in SUI tokens:

NFT Name: "${name}"
Description: "${description}"
Traits: ${traits.length ? traits.join(', ') : 'None specified'}
Recent average sales on platform: ${avgSale ? `${avgSale.toFixed(2)} SUI` : 'No data yet (new platform)'}
Network: Sui testnet

Respond ONLY with valid JSON, no markdown:
{
  "price": <recommended price as number, e.g. 12.5>,
  "low": <minimum reasonable price>,
  "high": <maximum reasonable price>,
  "confidence": "high" or "medium" or "low",
  "reasoning": "<one sentence explaining the price>",
  "factors": ["<factor 1>", "<factor 2>", "<factor 3>"]
}`

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: 300,
        temperature: 0.3,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const data = await res.json()
    const text = data.choices?.[0]?.message?.content ?? '{}'
    return JSON.parse(text.replace(/```json|```/g,'').trim()) as PriceSuggestion
  } catch {
    return null
  }
}
