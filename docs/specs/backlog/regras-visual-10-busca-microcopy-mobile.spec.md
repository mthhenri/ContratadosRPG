# Evitar texto incorreto e seta órfã na busca

> Task de correção RV-10 / P-123; prioridade baixa. Criada após a bateria visual de 09/10/2026, por pedido do autor. **Backlog: não implementada.**
> Evidência, cobertura e limites: [auditoria do leitor](../done/regras-auditoria-visual-completa/auditoria.md).

## Problema e reprodução

Em 360×800, Guia → Sumário → pesquisar Mercenário. O estado vazio exibe “1 RESULTADOS NO OUTRO DOCUMENTO” e a seta sozinha na linha seguinte. A busca no Sistema também mostra “1 resultados”. A ação encontra o livro correto.

## Fonte de verdade e responsabilidade

Busca, resumo de resultados e ação do outro documento em `regras-leitor.component.*`; API de Botão/ícone em `shared/ui/`.

Regras e textos vêm de [Sistema](../../core/sistema-v4.1.4.md) e [Guia](../../core/guia_de_mestre-v4.2.0.md). Constituição, convenções e [design](../../design/DESIGN.md) prevalecem. A mudança é de apresentação; não alterar efeitos, custos, fórmulas ou permissões. Normalização/modelos de leitura pertencem ao frontend; nenhuma regra de domínio deve ser duplicada no renderer.

## Entregáveis e aceite

1. Usar singular para um resultado e plural para zero/vários, nos dois resumos de busca.
2. Manter a seta/ícone da ação associada visualmente à legenda, sem uma linha composta apenas pela seta no celular ou painel estreito.
3. Usar o primitivo e seu input de posição de ícone, quando cobertos; não desenhar botão/link à mão. Ajustes de redação devem manter claro que a ação consulta o outro livro.
4. Preservar estado vazio, contador de ocorrências, foco, troca de livro, termo pesquisado e revelação de aba oculta.

## Contrato visual e verificação

Análogo inicial: Estado vazio canônico e ações textuais com ícone à direita usando a API completa de Botão. Inspecioná-lo e registrar shell, densidade, hierarquia, espaçamento, controles, estados, iconografia e responsividade antes de editar. Usar tokens e a API completa dos primitivos; se a biblioteca não cobrir o necessário, consultar o autor antes de ampliá-la ou contorná-la.

Conferir zero, um e vários resultados, inclusive outro documento, em ambas as gavetas e no trilho desktop. Testar pluralização de modo focado se extraída e exercer a ação real de troca de livro.

Usar a skill `verify` na aplicação real em **1920×1080, 1366×768, 960×1080 e 360×800**, página e painel normal/maximizado quando disponível. No celular, o painel ocupa a área disponível e não tem maximização separada. Comparar pessoalmente com o análogo, corrigir divergências e registrar estados, evidências e limites. Executar build, lint e testes proporcionais ao código alterado; `npm run repo:verificar` no fecho e modo `--staged` antes de eventual commit.

## Limites e organização

Não reescrever specs concluídas, corrigir PDF, ampliar a task de usabilidade ou introduzir um redesign do leitor. Anexos em `regras-visual-10-busca-microcopy-mobile/`, ao lado desta spec; capturas em `.artifacts/regras-visual-10-busca-microcopy-mobile/`. Ao fechar, mover spec e anexos juntos e atualizar contexto/problemas com evidência. A auditoria encerrada documenta o defeito; não certifica sua correção.
