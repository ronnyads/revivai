import os

def fix_corruption():
    path = 'src/lib/studio.ts'
    
    # Tenta ler de varias formas (UTF-16 e UTF-8)
    encodings = ['utf-16', 'utf-16-le', 'utf-16-be', 'utf-8', 'latin-1']
    content = None
    
    for enc in encodings:
        try:
            with open(path, 'r', encoding=enc) as f:
                content = f.read()
            print(f"Lido com sucesso usando encoding: {enc}")
            break
        except:
            continue
            
    if not content:
        print("Erro critico: Nao consegui ler o arquivo.")
        return

    # Procura o lixo no final e corta
    bad_string = "@[/Awesome Agent Skills (Reference)]"
    if bad_string in content:
        print(f"Lixo detectado! Removendo...")
        content = content.split(bad_string)[0]
    
    # Limpa espacos em branco extras no final
    content = content.rstrip() + "\n"
    
    # Salva em UTF-8 PURISSIMO
    try:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Arquivo sanitizado e salvo em UTF-8!")
    except Exception as e:
        print(f"Erro ao salvar: {str(e)}")

if __name__ == "__main__":
    fix_corruption()
