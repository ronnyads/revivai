import sys

def upgrade_to_subject_customization():
    path = 'src/lib/studio.ts'
    try:
        content = open(path, 'r', encoding='latin-1').read()
        
        # Estrutura antiga (Reference Images)
        old_block = """      body: JSON.stringify({
      contents: [{ parts }]
    })"""
        # ISSO FOI DO LYRIA, NAO DO IMAGEN. Pera.
        
        # Preciso achar o bloco do Google Imagen (que usa Predict/GenerateContent com instances)
        # O bloco atual do Imagen 4.0 no studio.ts e:
        
        target_search = '      body: JSON.stringify({'
        
        # Vou procurar a parte das instances no Imagen
        old_instances = """      body: JSON.stringify({
      instances: [{
        prompt: prompt,
        reference_images: [{
          reference_id: 1,
          reference_type: "RAW",
          reference_image: {
            image: { bytes_base_64_encoded: base64Image, mime_type: "image/jpeg" }
          }
        }]
      }]
    })"""

        new_instances = """      body: JSON.stringify({
      instances: [{
        prompt: prompt,
        subject_references: [{
          subject_id: 1,
          reference_image: {
            image: { bytes_base_64_encoded: base64Image, mime_type: "image/jpeg" }
          }
        }]
      }],
      parameters: {
        sampleCount: 1,
        aspectRatio: "9:16",
        seed: 42
      }
    })"""

        if old_instances in content:
            new_content = content.replace(old_instances, new_instances)
            with open(path, 'w', encoding='latin-1') as f:
                f.write(new_content)
            print("Sucesso: Upgrade para Subject Customization concluido!")
        else:
            # Se nao achar por causa de espacos, tenta um replace mais generico
            print("Erro: Nao achei as instances do Imagen. Tentando busca parcial...")
            if 'reference_id: 1' in content:
                 content = content.replace('reference_images:', 'subject_references:')
                 content = content.replace('reference_id: 1', 'subject_id: 1')
                 content = content.replace('reference_type: "RAW",', '')
                 # Inject parameters
                 content = content.replace('      }]\\n    })', '      }],\\n      parameters: { sampleCount: 1, aspectRatio: \"9:16\", seed: 42 }\\n    })')
                 with open(path, 'w', encoding='latin-1') as f:
                    f.write(content)
                 print("Sucesso: Upgrade parcial aplicado!")
            else:
                 print("Erro critico: Estrutura do Imagen nao mapeada.")
            
    except Exception as e:
        print(f"Erro no patch: {str(e)}")

if __name__ == "__main__":
    upgrade_to_subject_customization()
