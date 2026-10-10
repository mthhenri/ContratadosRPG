# legado-superpowers-conferir-fecho.spec.md

> Registro de organização documental em 2026-10-08, não uma nova autorização de implementação.

## Objetivo

Reunir os documentos legados desta frente no ciclo canônico de specs.
Fecho não comprovado para bônus de atributo no guia, ações da ficha no painel jogador, aumento de avatar e identidade Markdown do Caderno. Os anexos não autorizam implementação nem indicam que ela esteja faltando: é preciso conferir código e história antes de recortar trabalho.

## Entregáveis

1. Preservar os contratos e planos originais como anexos, com datas e ressalvas.
2. Distinguir registro histórico de aceite ou autorização para implementar novamente.

## Critérios de Aceite

Anexos preservados e localizáveis. Este registro não repete nem certifica gates
de produto; eventuais diferenças com o sistema atual exigem uma investigação própria.

## Fora de Escopo

Reimplementar o plano legado, alterar regras atuais ou presumir fecho de trabalho incerto.

## Dependências

Documentos anexos e relatos datados em `docs/context/HISTORY.md`.
Política de organização: `docs/SYSTEM.SPEC.md` §3.1.

## Conferência de 2026-10-09

- **Bônus de atributo no guia:** implementação encontrada no histórico de 2026-08-08
  (`d1ab3d1c`, `417181e7`, `8d29bb71`), no componente atual e nos testes.
- **Ações da ficha no painel jogador:** implementação de 2026-08-08
  (`357805d2`, `3ad7ad07`), preservada no código atual.
- **Avatar maior:** implementação de 2026-08-10 (`6a0a77ff`, 100px), posteriormente
  ampliada para 175px. O registro histórico tem observação desktop/mobile e ressalva compacta.
- **Markdown e identidade:** a formatação foi tratada pelas tasks concluídas
  `editor-markdown-barra-e-mobile` e `editor-markdown-desfazer-e-tabelas` e correções posteriores.
  A cor da ficha mais recente era a diferença remanescente; com autorização do autor, foi
  implementada e verificada na [task própria](../done/caderno-cor-identidade-colaborador.spec.md).

Os anexos permanecem como registro histórico. A conferência de código/história das três
primeiras frentes não equivale a uma nova certificação visual integral desses produtos.

## Fecho documental — 2026-10-09

Encerramento autorizado pelo autor após a conferência e o commit `394cacba` do Caderno.
Os seis anexos estão preservados, as quatro frentes foram discriminadas e a diferença
funcional encontrada foi concluída em task própria. Este registro sai do backlog como
conferência documental concluída, mantendo os limites de aceite descritos acima.
[Relatório de fecho](legado-superpowers-conferir-fecho/verificacao.md).
