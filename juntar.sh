#!/bin/bash
PASTA_ORIGEM="src/assets"    # Alterar para o caminho da sua pasta de scripts
ARQUIVO_SAIDA="src/scripts.md"

> "$ARQUIVO_SAIDA"  # Limpa o arquivo de saída

find "$PASTA_ORIGEM" -type f -exec echo "## {}" \; -exec cat {} \; -exec echo -e "\n---\n" \; >> "$ARQUIVO_SAIDA"

echo "Pronto!"