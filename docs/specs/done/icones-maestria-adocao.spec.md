# Adotar o glifo Maestria — Atributo coroado

> Task própria derivada de `icones-recursos-glifos-e-pendencias` em 2026-10-18.
> Desenho/adoção aprovados. Execução autorizada pelo autor em 2026-10-18.

## Objetivo

Adotar o glifo Maestria — Atributo coroado, preservando os dados, regras e comportamentos atuais.

## Entregáveis

1. Adicionar `maestria` ao catálogo `app-icone`, com a geometria B da prancha, autoria e teste do nome.
2. Substituir somente as marcas de Maestria em `shared/ui/atributo-ficha`, `modules/ficha/paginas/criar` e `modules/ficha/componentes/ficha-campanha-card` (prefixo `frontend/src/app/`). Preservar posições, quantidade de marcas, textos, estados e interação.
3. Medir impacto dos componentes compartilhados; preservar Maestria oculta em NPC (`mostrarMaestria=false`). Registrar consumidores, análogo, evidências e limites no anexo da task.

## Critérios de Aceite

- Antes de editar, aplicar `gerenciamento-de-impacto`, registrar componente análogo
  e seguir `design-fidelity` e `verify` na aplicação real.
- Conferir 1920×1080, 1366×768, 960×1080 e 360×800, temas claro/escuro;
  estados normais, ativos e desabilitados pertinentes, hover, foco/teclado e toque
  emulado; declarar separadamente ausência de toque em aparelho físico.
- Observar Maestria ativa/inativa, edição, criação e NPC sem Maestria.
- Testes focados, lint, build e gates de integração proporcionais; `npm run repo:verificar`.
  Relatório textual junto da spec; saídas brutas em `.artifacts/icones-maestria-adocao/`.

## Fora de Escopo

Alterar regras de Maestria, glifo de Habilidade Geral, Competência de NPC, demais estrelas ou API de primitivos sem decisão do autor.

## Dependências

`docs/SYSTEM.SPEC.md`, `docs/CONVENTIONS.md`, `docs/design/DESIGN.md`, catálogo de
ícones e [inventário](../active/icones-recursos-glifos-e-pendencias/inventario.md).
Decisões e geometria em [registro do autor](../active/icones-recursos-glifos-e-pendencias/decisoes.md),
[prancha original](../active/icones-recursos-glifos-e-pendencias/prancha-propostas.html)
e [refino do Crítico](../active/icones-recursos-glifos-e-pendencias/prancha-critico-refino.html).
Não exige fechar a rodada inteira de propostas para executar o recorte aprovado.

## Fecho

Concluída em 18/10/2026. [Verificação e limites](icones-maestria-adocao/verificacao.md).
