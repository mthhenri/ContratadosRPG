# Renderizar o tachado do Markdown no leitor

> Task de correção RV-07 / P-120; prioridade média. Criada após a bateria visual de 09/10/2026, por pedido do autor. **Backlog: não implementada.**
> Evidência, cobertura e limites: [auditoria do leitor](../done/regras-auditoria-visual-completa/auditoria.md).

## Problema e reprodução

Guia → Introdução: `~~torturar psicologicamente~~` aparece com os delimitadores literais, nas páginas desktop e mobile. O Markdown canônico marca esse trecho como tachado.

## Fonte de verdade e responsabilidade

Guia, Introdução, linha com `~~torturar psicologicamente~~`; `normalizar-regras.mjs`, `regras.model.ts` e `regras-inline.component.*`.

Regras e textos vêm de [Sistema](../../core/sistema-v4.1.4.md) e [Guia](../../core/guia_de_mestre-v4.2.0.md). Constituição, convenções e [design](../../design/DESIGN.md) prevalecem. A mudança é de apresentação; não alterar efeitos, custos, fórmulas ou permissões. Normalização/modelos de leitura pertencem ao frontend; nenhuma regra de domínio deve ser duplicada no renderer.

## Entregáveis e aceite

1. Representar o tachado como formatação inline sem exibir seus delimitadores e sem remover as palavras autorais.
2. Preservar a composição com negrito, itálico, links, tarjas, condições e recursos. O texto continua pesquisável, e destaque não deve apagar o tachado.
3. Manter a política de não executar HTML da fonte; não trocar o renderer tipado por HTML irrestrito.
4. Regenerar derivados pelo script canônico, sem editar JSON manualmente ou mudar a frase do livro para evitar o problema.

## Contrato visual e verificação

Análogo inicial: Ênfases negrito/itálico já preservadas no mesmo renderer inline e no livro. Inspecioná-lo e registrar shell, densidade, hierarquia, espaçamento, controles, estados, iconografia e responsividade antes de editar. Usar tokens e a API completa dos primitivos; se a biblioteca não cobrir o necessário, consultar o autor antes de ampliá-la ou contorná-la.

Teste focado do token tachado, sua projeção textual e composição com outras ênfases; executar a suíte de normalização e conferir a Introdução real nas quatro larguras, bases e hospedeiros.

Usar a skill `verify` na aplicação real em **1920×1080, 1366×768, 960×1080 e 360×800**, página e painel normal/maximizado quando disponível. No celular, o painel ocupa a área disponível e não tem maximização separada. Comparar pessoalmente com o análogo, corrigir divergências e registrar estados, evidências e limites. Executar build, lint e testes proporcionais ao código alterado; `npm run repo:verificar` no fecho e modo `--staged` antes de eventual commit.

## Limites e organização

Não reescrever specs concluídas, corrigir PDF, ampliar a task de usabilidade ou introduzir um redesign do leitor. Anexos em `regras-visual-07-tachado-inline/`, ao lado desta spec; capturas em `.artifacts/regras-visual-07-tachado-inline/`. Ao fechar, mover spec e anexos juntos e atualizar contexto/problemas com evidência. A auditoria encerrada documenta o defeito; não certifica sua correção.
