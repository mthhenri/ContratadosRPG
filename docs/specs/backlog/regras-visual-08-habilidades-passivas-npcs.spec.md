# Uniformizar a apresentação das habilidades passivas de NPCs

> Task de correção RV-08 / P-121; prioridade média. Criada após a bateria visual de 09/10/2026, por pedido do autor. **Backlog: não implementada.**
> Evidência, cobertura e limites: [auditoria do leitor](../done/regras-auditoria-visual-completa/auditoria.md).

## Problema e reprodução

Guia → Biblioteca de Referência → Operativo/Veterano/Elite/Lendário: passivas como Treinamento de Campo aparecem como prosa cinza contínua. As ativas imediatamente abaixo usam título mono, separador e bloco de habilidade; as passivas não têm a mesma hierarquia de catálogo.

## Fonte de verdade e responsabilidade

Guia, Biblioteca de Referência; normalizador/reconhecedores do Guia e `regras-habilidade.component.*`.

Regras e textos vêm de [Sistema](../../core/sistema-v4.1.4.md) e [Guia](../../core/guia_de_mestre-v4.2.0.md). Constituição, convenções e [design](../../design/DESIGN.md) prevalecem. A mudança é de apresentação; não alterar efeitos, custos, fórmulas ou permissões. Normalização/modelos de leitura pertencem ao frontend; nenhuma regra de domínio deve ser duplicada no renderer.

## Entregáveis e aceite

1. Renderizar todas as habilidades da Biblioteca de Referência com nome, exemplo narrativo, tipo/frequência e efeito claramente associados.
2. Usar o bloco de habilidade existente para as passivas quando seu contrato cobrir o caso. Não criar uma receita visual de cartão exclusiva para passivas.
3. Preservar a distinção entre ativa e passiva; ausência de custo não pode ser convertida em custo 0E inventado.
4. Manter categoria, ordem, todos os efeitos e limites da fonte, sem mesclar habilidades vizinhas.
5. Preservar pesquisa/destaque, links de condições e a navegação ao catálogo.

## Contrato visual e verificação

Análogo inicial: Habilidades ativas do mesmo catálogo e passivas ricas de A Estátua, preservando indicação de tipo e de frequência. Inspecioná-lo e registrar shell, densidade, hierarquia, espaçamento, controles, estados, iconografia e responsividade antes de editar. Usar tokens e a API completa dos primitivos; se a biblioteca não cobrir o necessário, consultar o autor antes de ampliá-la ou contorná-la.

Inventariar todas as habilidades das quatro categorias e testar reconhecimento/projeção de passivas e ativas. Comparar cada uma com a fonte e observar catálogo em uma/duas colunas, página/painel e bases clara/escura.

Usar a skill `verify` na aplicação real em **1920×1080, 1366×768, 960×1080 e 360×800**, página e painel normal/maximizado quando disponível. No celular, o painel ocupa a área disponível e não tem maximização separada. Comparar pessoalmente com o análogo, corrigir divergências e registrar estados, evidências e limites. Executar build, lint e testes proporcionais ao código alterado; `npm run repo:verificar` no fecho e modo `--staged` antes de eventual commit.

## Limites e organização

Não reescrever specs concluídas, corrigir PDF, ampliar a task de usabilidade ou introduzir um redesign do leitor. Anexos em `regras-visual-08-habilidades-passivas-npcs/`, ao lado desta spec; capturas em `.artifacts/regras-visual-08-habilidades-passivas-npcs/`. Ao fechar, mover spec e anexos juntos e atualizar contexto/problemas com evidência. A auditoria encerrada documenta o defeito; não certifica sua correção.
