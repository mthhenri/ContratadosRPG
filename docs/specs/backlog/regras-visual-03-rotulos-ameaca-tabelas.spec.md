# Conter rótulos de ameaça nas tabelas mobile

> Task de correção RV-03 / P-116; prioridade alta. Criada após a bateria visual de 09/10/2026, por pedido do autor. **Backlog: não implementada.**
> Evidência, cobertura e limites: [auditoria do leitor](../done/regras-auditoria-visual-completa/auditoria.md).

## Problema e reprodução

Em 360×800, Guia → Definindo o Nível de Ameaça (NA), Tabela de Referência de NA, e tabela VD Típico por NA. Rolar horizontalmente. “Catastrófica” e “Apocalíptica” saem da primeira coluna fixa e se sobrepõem aos dados vizinhos.

## Fonte de verdade e responsabilidade

Guia, Tabela de Referência de NA e VD Típico por NA; `regras-tabela.component.*` e `regras-ameaca.component.*`.

Regras e textos vêm de [Sistema](../../core/sistema-v4.1.4.md) e [Guia](../../core/guia_de_mestre-v4.2.0.md). Constituição, convenções e [design](../../design/DESIGN.md) prevalecem. A mudança é de apresentação; não alterar efeitos, custos, fórmulas ou permissões. Normalização/modelos de leitura pertencem ao frontend; nenhuma regra de domínio deve ser duplicada no renderer.

## Entregáveis e aceite

1. Manter ícone e rótulo completo de cada NA dentro de sua célula, sem sobreposição aos dados ou corte do termo.
2. Conservar significado, cores e tratamento visual canônicos dos sete níveis, incluindo os fundos contrastantes dos níveis altos.
3. Manter todas as colunas consultáveis com rolagem local. Conferir também as posições intermediárias, não apenas início/fim.
4. Resolver a composição com os componentes existentes; uma nova variante ou ampliação de primitivo exige decisão do autor.

## Contrato visual e verificação

Análogo inicial: Rótulos curtos de NA nessas próprias tabelas, referência rica de NA e ficha de exemplo A Estátua. Inspecioná-lo e registrar shell, densidade, hierarquia, espaçamento, controles, estados, iconografia e responsividade antes de editar. Usar tokens e a API completa dos primitivos; se a biblioteca não cobrir o necessário, consultar o autor antes de ampliá-la ou contorná-la.

Inspecionar os sete níveis nas duas tabelas, com a primeira coluna fixa e todas as posições horizontais. Conferir bases clara/escura e busca/destaque sobre os rótulos. Teste focado de renderização/semântica se houver alteração do contrato.

Usar a skill `verify` na aplicação real em **1920×1080, 1366×768, 960×1080 e 360×800**, página e painel normal/maximizado quando disponível. No celular, o painel ocupa a área disponível e não tem maximização separada. Comparar pessoalmente com o análogo, corrigir divergências e registrar estados, evidências e limites. Executar build, lint e testes proporcionais ao código alterado; `npm run repo:verificar` no fecho e modo `--staged` antes de eventual commit.

## Limites e organização

Não reescrever specs concluídas, corrigir PDF, ampliar a task de usabilidade ou introduzir um redesign do leitor. Anexos em `regras-visual-03-rotulos-ameaca-tabelas/`, ao lado desta spec; capturas em `.artifacts/regras-visual-03-rotulos-ameaca-tabelas/`. Ao fechar, mover spec e anexos juntos e atualizar contexto/problemas com evidência. A auditoria encerrada documenta o defeito; não certifica sua correção.
