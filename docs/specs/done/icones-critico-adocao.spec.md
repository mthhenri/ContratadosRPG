# Adotar o glifo Crítico — Dado excepcional com estrelinhas

> Task própria derivada de `icones-recursos-glifos-e-pendencias` em 2026-10-18.
> Desenho/adoção aprovados. Execução autorizada pelo autor em 2026-10-18.

## Objetivo

Adotar o glifo Crítico — Dado excepcional com estrelinhas, preservando os dados, regras e comportamentos atuais.

## Entregáveis

1. Adicionar `critico` ao catálogo `app-icone`, usando o dado A refinado com estrelinhas no lugar dos riscos, autoria e teste do nome.
2. Substituir somente `◆` na contagem de críticos em `frontend/src/app/shared/resultado-rolagem/resultado-rolagem.component.html`, mantendo quantidade, nome acessível e texto adjacente.
3. Mapear e verificar propagação na bandeja de rolagens, cartão e preview do montador experimental. Preservar badge textual “crítico ×2”, fórmulas, histórico e ícone `d20`. Registrar análogo, consumidores e evidências no anexo.

## Critérios de Aceite

- Antes de editar, aplicar `gerenciamento-de-impacto`, registrar componente análogo
  e seguir `design-fidelity` e `verify` na aplicação real.
- Conferir 1920×1080, 1366×768, 960×1080 e 360×800, temas claro/escuro;
  estados normais, ativos e desabilitados pertinentes, hover, foco/teclado e toque
  emulado; declarar separadamente ausência de toque em aparelho físico.
- Observar zero/um/vários críticos em todos os consumidores do resultado.
- Testes focados, lint, build e gates de integração proporcionais; `npm run repo:verificar`.
  Relatório textual junto da spec; saídas brutas em `.artifacts/icones-critico-adocao/`.

## Fora de Escopo

Alterar cálculos, dano, efeitos, notação autoral do livro, badge textual ou desenho do d20.

## Dependências

`docs/SYSTEM.SPEC.md`, `docs/CONVENTIONS.md`, `docs/design/DESIGN.md`, catálogo de
ícones e [inventário](../active/icones-recursos-glifos-e-pendencias/inventario.md).
Decisões e geometria em [registro do autor](../active/icones-recursos-glifos-e-pendencias/decisoes.md),
[prancha original](../active/icones-recursos-glifos-e-pendencias/prancha-propostas.html)
e [refino do Crítico](../active/icones-recursos-glifos-e-pendencias/prancha-critico-refino.html).
Não exige fechar a rodada inteira de propostas para executar o recorte aprovado.

## Fecho

Concluída em 18/10/2026. [Verificação e limites](icones-critico-adocao/verificacao.md).
