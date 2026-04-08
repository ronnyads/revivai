import { NextResponse } from 'next/server'
import Replicate from 'replicate'

export async function GET() {
  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN,
  })

  const modelsToTest = [
    'sczhou/codeformer',
    'nightmareai/real-esrgan',
    'arielreplicate/deoldify_image',
    'arielreplicate/deoldify',
    'cjwbw/deoldify',
    'piddnad/ddcolor',
    'lucataco/deoldify',
    'rossjyl/ddcolor',
    ' stability-ai/stable-diffusion-img2img'
  ]

  const results: any = {}

  for (const modelString of modelsToTest) {
    try {
      const [owner, name] = modelString.split('/')
      const model = await replicate.models.get(owner, name)
      results[modelString] = model.latest_version?.id || "NO VERSION ID"
    } catch (e: any) {
      results[modelString] = `FAILED: ${e.message}`
    }
  }

  return NextResponse.json(results)
}
