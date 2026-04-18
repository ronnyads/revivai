import fetch from 'node-fetch'
import { GoogleAuth } from 'google-auth-library'
import fs from 'fs'

async function getVertexAccessToken(keyFile) {
  const auth = new GoogleAuth({
    keyFile: keyFile,
    scopes: ['https://www.googleapis.com/auth/cloud-platform']
  })
  const client = await auth.getClient()
  const token = await client.getAccessToken()
  return token.token
}

async function testImagen() {
  try {
    const keyFile = 'C:\\Users\\euron\\Downloads\\project-9e7b4eec-0111-46d8-ae0-1c9f3a41094b.json'
    const projectId = 'project-9e7b4eec-0111-46d8-ae0'
    const location = 'us-central1'
    const token = await getVertexAccessToken(keyFile)
    
    // Test for Imagen 3 vs 4
    const urls = {
      'imagen-3.0': `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/imagen-3.0-capability-001:predict`,
      'imagen-4.0': `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/imagen-4.0-generate-001:predict`
    }

    const base64Image = fs.readFileSync('face.txt', 'utf8')

    const payloads = [
      {
        name: 'User Minimal Payload (reference_image object)',
        data: {
          instances: [{
            prompt: `A photorealistic UGC style shot of the person [1].`,
            reference_image: {
              bytesBase64Encoded: base64Image,
              mimeType: 'image/jpeg'
            }
          }],
          parameters: {
            sampleCount: 1,
            aspectRatio: '9:16'
          }
        }
      },
      {
        name: 'My V1 Payload (referenceImages array)',
        data: {
          instances: [{
            prompt: `A photorealistic UGC style shot of the person [1].`,
            referenceImages: [
              {
                referenceId: 1,
                referenceType: "REFERENCE_TYPE_RAW",
                referenceImage: {
                  bytesBase64Encoded: base64Image,
                  mimeType: 'image/jpeg'
                }
              }
            ]
          }],
          parameters: {
            sampleCount: 1,
            personGeneration: 'ALLOW_ADULT'
          }
        }
      }
    ]

    for (const [modelName, url] of Object.entries(urls)) {
      console.log(`\n=== Testing ${modelName} ===`)
      for (const test of payloads) {
        console.log(`> Testing ${test.name}...`)
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(test.data)
        })
        const body = await res.text()
        if (res.ok) {
          console.log(`✅ SUCCESS: ${test.name}`)
        } else {
          console.log(`❌ FAILED: ${test.name}`)
          console.log(body)
        }
      }
    }
  } catch (e) {
    console.error(e)
  }
}

testImagen()

