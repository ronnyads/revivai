import sys

def patch():
    path = 'src/lib/studio.ts'
    try:
        content = open(path, 'r', encoding='latin-1').read()
        
        # O novo bloco de codigo com detecao de genero
        new_logic = """  // Identificacao automatica de genero via Gemini Vision para garantir consistencia
  let detectedGender = 'person'
  try {
    const visionRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${googleApiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: "Just one word: Is the person in this image Male or Female?" },
            { inline_data: { mime_type: 'image/jpeg', data: base64Image } }
          ]
        }]
      })
    })
    const visionData = await visionRes.json()
    const text = visionData.candidates?.[0]?.content?.parts?.[0]?.text?.toLowerCase() || ''
    if (text.includes('female') || text.includes('woman')) detectedGender = 'woman'
    else if (text.includes('male') || text.includes('man')) detectedGender = 'man'
  } catch (e) {
    console.warn('[studio] Falha na auto-detencao de genero, usando generico:', e)
  }

  const prompt = `Maintain EXACT identity, EXACT same clothes, hair color, and facial features. Switch camera to ${params.angle} view. Full consistency of the ${detectedGender} is mandatory. Maintain ${detectedGender} gender. Photorealistic. ${perspective}. 8k resolution, cinematic lighting.`
"""

        # Linha EXATA que esta no arquivo agora (Verificado via PowerShell)
        old_line = '  const prompt = `Maintain EXACT identity, EXACT same clothes, hair color, and facial features. Switch camera to ${params.angle} view. Full consistency of the person is mandatory. Photorealistic. ${perspective}. 8k resolution, cinematic lighting.`'

        if old_line in content:
            new_content = content.replace(old_line, new_logic)
            with open(path, 'w', encoding='latin-1') as f:
                f.write(new_content)
            print("Sucesso: Genero Automatico Ativado!")
        else:
            print("Erro: Nao achei a linha alvo no arquivo.")
            
    except Exception as e:
        print(f"Erro no patch: {str(e)}")

if __name__ == "__main__":
    patch()
