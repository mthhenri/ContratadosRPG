# Usar o ícone Energia no botão Utilizar

> Task própria derivada de `icones-recursos-glifos-e-pendencias` em 2026-10-18.
> Desenho/adoção aprovados. Execução autorizada pelo autor em 2026-10-18.

## Objetivo

Usar o ícone Energia no botão Utilizar, preservando os dados, regras e comportamentos atuais.

## Entregáveis

1. Trocar somente o relâmpago textual por `app-icone` com nome `energia` no botão Utilizar de `frontend/src/app/modules/ficha/componentes/ficha-habilidades/ficha-habilidades.component.html`.
2. Preservar primitivo do botão e seus inputs, texto, acessibilidade, custo, comportamento de gasto e estado desabilitado com custo zero; não redesenhar o catálogo.
3. Mapear consumidores do componente; registrar análogo, verificação e limites no anexo da task.

## Critérios de Aceite

- Antes de editar, aplicar `gerenciamento-de-impacto`, registrar componente análogo
  e seguir `design-fidelity` e `verify` na aplicação real.
- Conferir 1920×1080, 1366×768, 960×1080 e 360×800, temas claro/escuro;
  estados normais, ativos e desabilitados pertinentes, hover, foco/teclado e toque
  emulado; declarar separadamente ausência de toque em aparelho físico.
- Observar custo positivo/zero, estado desabilitado e gasto real de Energia.
- Testes focados, lint, build e gates de integração proporcionais; `npm run repo:verificar`.
  Relatório textual junto da spec; saídas brutas em `.artifacts/icones-energia-utilizar/`.

## Fora de Escopo

Alterar custos, regras, feedback numérico “−N E”, tooltip geral de recursos, catálogo ou API de primitivos.

## Dependências

`docs/SYSTEM.SPEC.md`, `docs/CONVENTIONS.md`, `docs/design/DESIGN.md`, catálogo de
ícones e [inventário](../active/icones-recursos-glifos-e-pendencias/inventario.md).
Decisões e geometria em [registro do autor](../active/icones-recursos-glifos-e-pendencias/decisoes.md),
[prancha original](../active/icones-recursos-glifos-e-pendencias/prancha-propostas.html)
e [refino do Crítico](../active/icones-recursos-glifos-e-pendencias/prancha-critico-refino.html).
Não exige fechar a rodada inteira de propostas para executar o recorte aprovado.

## Fecho

Concluída em 18/10/2026. [Verificação e limites](icones-energia-utilizar/verificacao.md).
