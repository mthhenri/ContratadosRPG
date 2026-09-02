# Correção — corpo flexível dos painéis flutuantes

> Task avulsa: os consumidores projetados em `app-painel-flutuante`, em especial o caderno, não recebem um contêiner flexível para que seu corpo interno ocupe a altura restante da janela.

## Objetivo

Fazer o corpo do primitivo de painel flutuante organizar os conteúdos projetados em uma coluna flexível. Assim o caderno preenche a janela abaixo de seus filtros e listas, sem mudar os controles, os estados ou o tamanho salvo do painel.

## Entregáveis

1. `app-painel-flutuante` expõe um corpo flexível e com altura mínima segura para os consumidores projetados.
2. O caderno usa toda a área restante abaixo de escopo e busca em desktop, sem afetar sua alternância de lista/editor, busca unificada ou mobile.
3. Um teste de regressão protege o contrato de composição do primitivo e a estrutura do caderno.

## Critérios de Aceite

- Os testes focados de painel flutuante e caderno passam.
- Na aplicação real, o caderno preenche verticalmente o painel no tamanho compacto da captura, em `1920×1080` e `360×800`, com página, editor e listas sem corte ou espaço vazio indevido.
- Build, lint e suíte do frontend não introduzem falhas novas.
- O shell, a densidade e os controles seguem o análogo aprovado `app-painel-flutuante`/`CadernoFlutuante` da UI-17.

## Fora de Escopo

- Redesenhar o caderno, alterar conteúdo de páginas, busca, colaboração em tempo real, tamanhos mínimos ou maximização.
- Alterar os controles e o motor do PDF do leitor de documentos.

## Dependências

- `docs/design/DESIGN.md` (painel flutuante).
- `docs/specs/done/ui-17-painel-flutuante-unificado.spec.md`.

## Riscos e Mitigação

O primitivo também abriga a calculadora, que tem conteúdo de altura própria. A mudança deve usar uma coluna flexível sem forçar crescimento nos filhos que não declaram `flex: 1`.
