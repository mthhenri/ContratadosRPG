# Preservar a hierarquia das grades de referência

> Task de correção RV-04 / P-117; prioridade alta. Criada após a bateria visual de 09/10/2026, por pedido do autor. **Backlog: não implementada.**
> Evidência, cobertura e limites: [auditoria do leitor](../done/regras-auditoria-visual-completa/auditoria.md).

## Problema e reprodução

Sistema → Jogando como um Civil → Saúde em 360×800: a ordem visual é VIDA, ENERGIA, fórmula de Vida, fórmula de Energia. Em Afinidade com Fragmentos, “Nível de Criatura” vira uma célula comum na grade desktop; em Deslocamento, faixa de Destreza e metros têm o mesmo tratamento sem separação.

## Fonte de verdade e responsabilidade

Sistema, Saúde do Civil, Deslocamento, Tipos de Alcances e Afinidade com Fragmentos; `regras-grade.component.*` e reconhecimento de tabelas do normalizador.

Regras e textos vêm de [Sistema](../../core/sistema-v4.1.4.md) e [Guia](../../core/guia_de_mestre-v4.2.0.md). Constituição, convenções e [design](../../design/DESIGN.md) prevalecem. A mudança é de apresentação; não alterar efeitos, custos, fórmulas ou permissões. Normalização/modelos de leitura pertencem ao frontend; nenhuma regra de domínio deve ser duplicada no renderer.

## Entregáveis e aceite

1. Na Saúde do Civil, manter rótulo, valor inicial e progressão de cada recurso juntos, inclusive quando a composição passa para uma coluna.
2. Em Afinidade, tratar “Nível de Criatura” como título do recorte e manter cada faixa de Afinidade junto de sua ameaça. Nenhuma categoria deve ficar isolada por um cabeçalho contado como item.
3. Em Deslocamento e Tipos de Alcances, separar visualmente condição/faixa/tipo de seu valor ou descrição, com hierarquia compatível com os blocos ricos existentes.
4. Preservar integralmente valores, limites, desigualdades e textos da fonte; não corrigir nem interpretar regras por conveniência de layout.
5. Delimitar reconhecimento aos recortes conhecidos. Não substituir indiscriminadamente todas as grades por um novo desenho.

## Contrato visual e verificação

Análogo inicial: Stats de Vida/Energia das classes e subclasses; cartões de módulos que mantêm título e efeitos associados; blocos ricos de referência de NA. Inspecioná-lo e registrar shell, densidade, hierarquia, espaçamento, controles, estados, iconografia e responsividade antes de editar. Usar tokens e a API completa dos primitivos; se a biblioteca não cobrir o necessário, consultar o autor antes de ampliá-la ou contorná-la.

Comparar cada par com o Markdown e testar o reconhecimento dos recortes, incluindo cabeçalhos e células vazias. Observar todos os itens em uma/duas colunas e em bases clara/escura, com busca e navegação.

Usar a skill `verify` na aplicação real em **1920×1080, 1366×768, 960×1080 e 360×800**, página e painel normal/maximizado quando disponível. No celular, o painel ocupa a área disponível e não tem maximização separada. Comparar pessoalmente com o análogo, corrigir divergências e registrar estados, evidências e limites. Executar build, lint e testes proporcionais ao código alterado; `npm run repo:verificar` no fecho e modo `--staged` antes de eventual commit.

## Limites e organização

Não reescrever specs concluídas, corrigir PDF, ampliar a task de usabilidade ou introduzir um redesign do leitor. Anexos em `regras-visual-04-grades-semanticas/`, ao lado desta spec; capturas em `.artifacts/regras-visual-04-grades-semanticas/`. Ao fechar, mover spec e anexos juntos e atualizar contexto/problemas com evidência. A auditoria encerrada documenta o defeito; não certifica sua correção.
