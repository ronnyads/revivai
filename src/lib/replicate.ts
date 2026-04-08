import Replicate from 'replicate'

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function getModelVersion(replicate: Replicate, fullName: string): Promise<string> {
  const [owner, name] = fullName.split('/')
  const info = await replicate.models.get(owner, name)
  const version = info.latest_version?.id
  if (!version) throw new Error(`No version found for ${fullName}`)
  return version
}

export async function createPredictionWithRetry(
  replicate: Replicate,
  options: any,
  maxRetries = 3
): Promise<any> {
  let attempt = 0
  
  while (true) {
    try {
      return await replicate.predictions.create(options)
    } catch (err: any) {
      attempt++
      const msg = err.message || ''
      
      // Check if it's a rate limit error (429)
      const isRateLimit = msg.includes('429') || msg.includes('Too Many Requests')
      
      if (!isRateLimit || attempt >= maxRetries) {
        throw err
      }

      // If rate limited, wait dynamically based on advice, or default to 8 seconds
      console.warn(`[replicate] 429 Rate Limit Hit. Attempt ${attempt}/${maxRetries}. Retrying in 8s...`)
      await sleep(8500) // Replicate low-tier burst resets in ~8s. We wait 8.5s to be safe.
    }
  }
}
