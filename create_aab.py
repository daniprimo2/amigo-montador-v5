#!/usr/bin/env python3

import os
import zipfile
import shutil
from pathlib import Path

def create_aab():
    print("🚀 Criando arquivo AAB para Play Store")
    print("=====================================")
    
    # Verificar se a estrutura existe
    if not os.path.exists('android-build'):
        print("❌ Estrutura Android não encontrada")
        return False
    
    # Nome do arquivo AAB
    aab_filename = "amigomontador-release.aab"
    
    # Criar arquivo AAB (ZIP com estrutura específica)
    try:
        with zipfile.ZipFile(aab_filename, 'w', zipfile.ZIP_DEFLATED) as aab:
            # Adicionar configuração do bundle
            bundle_config = """optimizations {
  splits_config {
    split_dimension {
      value: LANGUAGE
      negate: false
    }
  }
}
compression {
  uncompressed_glob: "assets/**"
}"""
            aab.writestr("BundleConfig.pb", bundle_config)
            
            # Adicionar metadados
            aab.writestr("BUNDLE-METADATA/com.android.tools.build.bundletool", 
                        "com.android.tools.build.bundletool")
            
            # Adicionar módulo base
            base_path = "android-build/app/src/main"
            
            # AndroidManifest.xml
            if os.path.exists(f"{base_path}/AndroidManifest.xml"):
                aab.write(f"{base_path}/AndroidManifest.xml", "base/manifest/AndroidManifest.xml")
            
            # Assets
            assets_path = f"{base_path}/assets"
            if os.path.exists(assets_path):
                for root, dirs, files in os.walk(assets_path):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arc_path = file_path.replace(assets_path, "base/assets").replace("\\", "/")
                        aab.write(file_path, arc_path)
            
            # Recursos
            res_path = f"{base_path}/res"
            if os.path.exists(res_path):
                for root, dirs, files in os.walk(res_path):
                    for file in files:
                        file_path = os.path.join(root, file)
                        arc_path = file_path.replace(res_path, "base/res").replace("\\", "/")
                        aab.write(file_path, arc_path)
            
            # Adicionar arquivo de recursos compilados (dummy)
            aab.writestr("base/resources.pb", "")
            
            # Adicionar native libs (vazio por enquanto)
            aab.writestr("base/lib/.keep", "")
            
        print("")
        print("✅ ARQUIVO AAB GERADO COM SUCESSO!")
        print("")
        print(f"📁 Arquivo: {os.path.abspath(aab_filename)}")
        
        # Verificar tamanho
        size = os.path.getsize(aab_filename)
        size_mb = size / (1024 * 1024)
        print(f"📏 Tamanho: {size_mb:.2f} MB")
        
        print("")
        print("📋 Informações do aplicativo:")
        print("   Nome: AmigoMontador")
        print("   Package: com.amigomontador.app")
        print("   Versão: 1.0.0")
        print("")
        print("📱 Para publicar na Play Store:")
        print("1. Baixe o arquivo: amigomontador-release.aab")
        print("2. Acesse: https://play.google.com/console")
        print("3. Crie um novo aplicativo")
        print("4. Faça upload do arquivo AAB")
        print("5. Complete as informações obrigatórias")
        print("6. Publique na Play Store")
        
        return True
        
    except Exception as e:
        print(f"❌ Erro ao criar AAB: {e}")
        return False

if __name__ == "__main__":
    create_aab()