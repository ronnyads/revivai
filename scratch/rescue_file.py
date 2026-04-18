import os

def rescue_file():
    path = 'src/lib/studio.ts'
    
    # 1. Le os bytes puros (sem interpretacao de encoding)
    with open(path, 'rb') as f:
        raw_data = f.read()
    
    # 2. Tenta converter para texto de forma inteligente
    text = None
    
    # Tenta UTF-16 (que e o culpado mais provavel vindo do PowerShell)
    try:
        text = raw_data.decode('utf-16')
        print("Detectado: UTF-16. Convertendo...")
    except:
        try:
            # Tenta Latin-1 (que aceita qualquer byte do Windows)
            text = raw_data.decode('latin-1')
            print("Detectado: Latin-1. Convertendo...")
        except:
            print("Erro critico ao decodificar bytes.")
            return

    if text:
        # 3. Limpeza de lixo de sistema (se houver)
        bad_string = "@[/Awesome Agent Skills (Reference)]"
        if bad_string in text:
            text = text.split(bad_string)[0]
        
        # 4. Remove o BOM (Byte Order Mark) se existir no comeco
        if text.startswith('\ufeff'):
            text = text[1:]
            
        # 5. Salva como UTF-8 limpo
        with open(path, 'w', encoding='utf-8', newline='\n') as f:
            f.write(text)
        print("Sucesso: Arquivo resgatado e convertido para UTF-8!")

if __name__ == "__main__":
    rescue_file()
