# regras-aberturas-leitura.spec.md

> Task avulsa solicitada pelo autor em 10/10/2026: melhorar a leitura das duas aberturas, mantendo o centro.

## Objetivo

Reorganizar as aberturas do Sistema e do Guia em parágrafos por assunto, preservando o conteúdo autoral, tarjas e atmosfera institucional.

## Entregáveis

1. Reagrupar somente as aberturas nas fontes Markdown, com quebras naturais nas frases contínuas, lista compacta de nomes e pausas dramáticas do Guia.
2. Renderizar parágrafos centralizados, corpo sem itálico generalizado e fechamento isolado em itálico. Preservar negritos e tarjas, sem duplicar o texto no frontend.
3. Registrar comparação visual e gates em `regras-aberturas-leitura/verificacao.md`; capturas locais em `.artifacts/regras-aberturas-leitura/`.

## Critérios de Aceite

- Conteúdo e ordem preservados, sem alteração de regras ou palavras censuradas.
- Testes do normalizador e renderer; build/lint e verificador de repositório.
- Inspeção pessoal das duas aberturas na página e painel, em 1920×1080, 1366×768, 960×1080 e 360×800; bases escura e clara, sem cortes nem overflow do bloco.
- Análogo: abertura aprovada `RegrasAbertura` e capa `RegrasCapa`: centro, selo mono vermelho, hierarquia de negritos, tarjas de `RegrasInline`, densidade do leitor. Manter shell e controles existentes, espaçamento pelos tokens; largura acompanha página/painel.

## Fora de Escopo

Reescrever narrativa, alterar regras, revisar tabelas, modificar primitivos ou concluir a revisão editorial de PDF P-108.

## Dependências

`docs/core/sistema-v4.1.5.md`, `docs/core/guia_de_mestre-v4.2.0.md`, `docs/design/DESIGN.md`, `docs/design/tema/`; leitor e renderer já existentes.
