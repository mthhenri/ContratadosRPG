# Estruturar notas e bônus apresentados como texto contínuo

> Task de correção RV-06 / P-119; prioridade média. Criada após a bateria visual de 09/10/2026, por pedido do autor. **Backlog: não implementada.**
> Evidência, cobertura e limites: [auditoria do leitor](../done/regras-auditoria-visual-completa/auditoria.md).

## Problema e reprodução

Sistema → Origem → Bombeiro/Alpinista: os dois bônus da Formação aparecem na mesma frase sem delimitador. A nota Amaldiçoado pelo Passado apresenta título, descrição, três itens ▢ e ressalva em um parágrafo contínuo. A nota de Armazenamento junta a ausência de peso e o custo de 300$.

## Fonte de verdade e responsabilidade

Sistema, exemplos de Origem, Modificações de Armazenamento e Amaldiçoado pelo Passado; `regras-origem`, `regras-nota` e reconhecedores do normalizador.

Regras e textos vêm de [Sistema](../../core/sistema-v4.1.4.md) e [Guia](../../core/guia_de_mestre-v4.2.0.md). Constituição, convenções e [design](../../design/DESIGN.md) prevalecem. A mudança é de apresentação; não alterar efeitos, custos, fórmulas ou permissões. Normalização/modelos de leitura pertencem ao frontend; nenhuma regra de domínio deve ser duplicada no renderer.

## Entregáveis e aceite

1. Apresentar separadamente os dois bônus da Formação nos dois exemplos, preservando quantidade e efeito exatos.
2. Dar título próprio a Amaldiçoado pelo Passado, separar descrição de efeitos e apresentar os três itens existentes como lista; manter a ressalva de Peculiaridade associada ao conjunto.
3. Distinguir as duas afirmações da nota de Armazenamento, sem alterar peso, custo ou qualquer regra.
4. Usar apenas segmentações demonstráveis na fonte e nos rótulos/glyphs existentes. Se um limite de frase for ambíguo, registrar e consultar o autor; não inventar conteúdo nem corrigir a regra.
5. Preferir reconhecer a estrutura de apresentação sem reescrever o Markdown autoral. Eventual ajuste editorial da fonte precisa ser delimitado e revisado pelo autor.

## Contrato visual e verificação

Análogo inicial: Formação/Especialidade/Saber de Campo dos cartões de Origem; notas e destaques com rótulo próprio; lista Custo do Experimento nos cartões de subclasse. Inspecioná-lo e registrar shell, densidade, hierarquia, espaçamento, controles, estados, iconografia e responsividade antes de editar. Usar tokens e a API completa dos primitivos; se a biblioteca não cobrir o necessário, consultar o autor antes de ampliá-la ou contorná-la.

Comparar os textos e itens antes/depois com as três passagens canônicas; testar a segmentação focada se o normalizador for alterado. Observar título, descrição, cada bônus e ressalva em página/painel, com pesquisa preservada.

Usar a skill `verify` na aplicação real em **1920×1080, 1366×768, 960×1080 e 360×800**, página e painel normal/maximizado quando disponível. No celular, o painel ocupa a área disponível e não tem maximização separada. Comparar pessoalmente com o análogo, corrigir divergências e registrar estados, evidências e limites. Executar build, lint e testes proporcionais ao código alterado; `npm run repo:verificar` no fecho e modo `--staged` antes de eventual commit.

## Limites e organização

Não reescrever specs concluídas, corrigir PDF, ampliar a task de usabilidade ou introduzir um redesign do leitor. Anexos em `regras-visual-06-notas-e-formacoes/`, ao lado desta spec; capturas em `.artifacts/regras-visual-06-notas-e-formacoes/`. Ao fechar, mover spec e anexos juntos e atualizar contexto/problemas com evidência. A auditoria encerrada documenta o defeito; não certifica sua correção.
