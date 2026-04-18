import os

def final_sanitization():
    path = 'src/lib/studio.ts'
    
    # 1. Leitura Binaria (Seguranca absoluta)
    with open(path, 'rb') as f:
        raw = f.read()
    
    # 2. Decodificacao inteligente
    text = None
    try:
        text = raw.decode('utf-16')
    except:
        try:
            text = raw.decode('latin-1')
        except:
            print("Erro ao ler bytes.")
            return

    if text:
        # 3. Truncate no ultimo bracket de fechamento
        # Isso remove QUALQUER coisa que tenha sido grudada no final
        last_bracket = text.rfind('}')
        if last_bracket != -1:
            clean_text = text[:last_bracket+1] + "\n"
        else:
            clean_text = text
            
        # 4. Escrita UTF-8 PURISSIMA (Unix Style)
        #newline='' impede que o windows coloque \r\n
        with open(path, 'w', encoding='utf-8', newline='\n') as f:
            f.write(clean_text)
        print("Arquivo 100% HIGIENIZADO e salvo em UTF-8!")

if __name__ == "__main__":
    final_sanitization()
