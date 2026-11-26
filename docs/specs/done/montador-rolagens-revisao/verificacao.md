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

## Conferência complementar na máquina do autor (25/11/2026)

Aplicação real (Postgres local, backend e frontend de desenvolvimento), Chromium via Playwright, ficha "Operador
Codex". Capturas e script em `.artifacts/montador-rolagens-revisao/conferencia/` (local, ignorada). Análogo: o próprio
montador já aprovado.

- **Viewports:** 1366×768, 960×1080, 1920×1080, 768×1024 com toque emulado e 360×800 com toque emulado, nas bases
  clara e escura.
- **Estados:** abertura, Teste, nota de troca, Dados livres, Dano de arma, "Nenhum dado", avançada/inválida,
  resultado, maximizado e troca maximizada (os dois últimos só fora do mobile); em 360 e 1366, também a linha "Da
  ficha em LUT" com `modificadoresTeste` temporário (removido ao final).
- **Passou:** janela sempre dentro da tela, "Rolar" visível, sem overflow horizontal, mesmo tamanho entre modelos,
  troca não desmaximiza, nota de troca presente, Teste abrindo em `LUTd20kh1cm1 + PROF + 2`.
- **Achados:** P-136 (nota fica após digitar) e P-137 (texto do segmento ativo no hover/toque).
- **Alvos abaixo de 44px:** em 360, os `select` têm 42px e o "Limpar" do aviso de fórmula, 35px. Em 768 com toque o
  layout é o de desktop e vários controles ficam entre 26 e 42px. Não comparado com o resto do produto.
- **Aperto:** em 1366×768 com resultado aberto, o corpo do editor cai para cerca de 200–240px (rola; nada se perde).
- **Limites:** toque emulado, não em aparelho; teclado virtual não observado; Edge e Firefox não conferidos. As
  rolagens da conferência ficaram no histórico do banco de desenvolvimento.
