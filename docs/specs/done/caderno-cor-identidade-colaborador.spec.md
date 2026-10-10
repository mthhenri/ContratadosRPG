# caderno-cor-identidade-colaborador.spec.md

> Task avulsa autorizada pelo autor em 2026-10-09. Recorte de identidade do
> [desenho legado](../done/legado-superpowers-conferir-fecho/2026-09-02-caderno-markdown-identidade-design.md).

## Objetivo

Identificar cada colaborador do Caderno do Esquadrão pela cor da sua ficha alterada
mais recentemente na campanha. Inicial de presença, cursor e seleção usam a mesma cor.

## Entregáveis

1. Expor `updatedDate` no resumo de ficha de membro, usando a coluna existente e
   preservando o recorte de permissões do endpoint.
2. Escolher a ficha com maior data válida; empate usa maior `id`. Se não houver
   ficha válida ou a escolhida não tiver cor, manter a reserva estável por usuário.
3. Publicar a cor pelo Awareness existente, tanto no painel quanto na janela externa.
   Mudanças das fichas próprias e releituras de membros refletem a identidade sem
   recriar o documento colaborativo, sem ampliar eventos da sala de campanha.
4. Cobrir seleção, reserva, empate, troca de cor, ciclo de salas e reconexão com
   testes e verificação real de dois usuários.

## Critérios de Aceite

- Testes focados e gates de build, lint e integração dos workspaces envolvidos.
- Dois usuários na mesma página: inicial, cursor e seleção com a cor correta;
  alteração de cor e mudança da ficha mais recente sem recarregar, além de reconexão.
- Painel e janela externa nos viewports 1920×1080, 1366×768, 960×1080 e 360×800.
  Análogo aprovado: Caderno atual, mesmos shell, controles, densidade, hierarquia,
  espaçamento e responsividade; muda somente a identidade já aplicada à presença.
- Relatório em `caderno-cor-identidade-colaborador/`; capturas e saídas brutas em
  `.artifacts/caderno-cor-identidade-colaborador/`. `npm run repo:verificar` aprovado.

## Fora de Escopo

Redesenho da barra e formatação Markdown, novos controles/primitivos, gradientes,
mudança de permissões, protocolo colaborativo, persistência, migrations ou
reimplementação das outras três frentes legadas.

## Dependências

`docs/SYSTEM.SPEC.md` §§3.1, 9 e 14; `docs/CONVENTIONS.md`; `docs/design/DESIGN.md`;
`docs/specs/done/legado-superpowers-conferir-fecho.spec.md`.
