import sys

def final_polish():
    path = 'src/lib/studio.ts'
    try:
        content = open(path, 'r', encoding='latin-1').read()
        
        # Bloco que queremos deixar perfeito
        perfect_block = """      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${googleApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instances: [{
            prompt,
            subject_references: [{
              subject_id: 1,
              reference_image: {
                image: { 
                  mime_type: 'image/jpeg',
                  bytes_base_64_encoded: base64Image
                }
              }
            }]
          }],
          parameters: {
            sampleCount: 1,
            aspectRatio: "9:16",
            seed: 42
          }
        })
      })"""

        # Vamos procurar o inicio do fetch do Imagen 4.0
        import re
        pattern = r"const res = await fetch\(`https://generativelanguage\.googleapis\.com/v1beta/models/imagen-4\.0-generate-001:predict.*?\)\s+const data"
        # O padrao acima e complexo, vou usar uma busca mais simples baseada no inicio
        
        start_marker = '      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict'
        end_marker = '      })'
        
        # Encontra o bloco entre o fetch e o fim do JSON.stringify
        start_idx = content.find(start_marker)
        if start_idx != -1:
            # Procura o proximo const data para saber onde parar a limpeza
            end_search_idx = content.find('const data = await res.json()', start_idx)
            if end_search_idx != -1:
                # O fechamento real do fetch e antes de const data
                # Vamos substituir o bloco inteiro
                old_block = content[start_idx:end_search_idx].strip()
                # Removemos as chaves extras se houver
                if old_block.endswith('})'):
                     new_content = content[:start_idx] + perfect_block + "\n\n      " + content[end_search_idx:]
                     with open(path, 'w', encoding='latin-1') as f:
                        f.write(new_content)
                     print("Sucesso: Polimento final concluido!")
                else:
                     # Se falhar a detecao fina, tenta uma substituicao bruta do JSON
                     print("Tentando substituicao de seguranca...")
                     new_content = content.replace(old_block, perfect_block)
                     with open(path, 'w', encoding='latin-1') as f:
                        f.write(new_content)
                     print("Sucesso: Polimento aplicado via fallback!")
        else:
            print("Erro: Nao achei o fetch do Imagen 4.0.")
            
    except Exception as e:
        print(f"Erro no patch: {str(e)}")

if __name__ == "__main__":
    final_polish()
