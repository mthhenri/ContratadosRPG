# Verificação — montador-rolagens-revisao

> Anexo de `montador-rolagens-revisao.spec.md`. Fecho de 25/11/2026. Saídas brutas em
> `.artifacts/montador-rolagens-revisao/` (ignorada pelo Git).

## Gates automáticos (com os ajustes finais)

| Verificação | Resultado |
|---|---|
| `npm run test --workspace=shared` | 78 arquivos, 1.348 testes passados |
| `npm run test --workspace=backend` | 82 arquivos passados (9 ignorados), 1.360 testes passados (100 ignorados) |
| `npm run test --workspace=frontend` (suíte completa) | 294 arquivos, 3.649 testes passados |
| Specs tocadas (montador, regras, rolagens da ficha) | 66 arquivos, 458 testes passados |
| `npm run lint` | 0 erros (29.046 avisos de aspas, preexistentes e só de estilo) |
| `npm run build --workspace=frontend` | ok; aviso de orçamento do bundle inicial (603 kB contra 450 kB) |

Limite do ambiente: rodando a suíte do frontend com o paralelismo padrão, o contêiner matou um worker por falta de
memória (duas vezes, 293 de 294 arquivos). Com `VITEST_MAX_WORKERS=2` a suíte inteira passou. Não é falha de teste.
O aviso de orçamento do bundle não foi comparado com a base anterior.

## Verificação na aplicação real

Feita em 1920×1080 e 360×800, base escura, com Postgres local e o app em execução: reprodução R1–R4 e R6, D1 a D4 e
paridade com o dadinho (ficha de teste com modificadores de teste). Detalhes em `reproducao.md`.

## Não verificado

- 960×1080 e 1366×768, base clara e toque real (o autor fará na própria máquina).
- A Sessão 4 em si não foi reproduzida.
- Estrutura visual unificada e estado por editor: não implementados (I-064).
