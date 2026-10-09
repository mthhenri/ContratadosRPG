# Dar contraste aos rótulos semânticos na base clara

> Task de correção RV-09 / P-122; prioridade média. Criada após a bateria visual de 09/10/2026, por pedido do autor. **Backlog: não implementada.**
> Evidência, cobertura e limites: [auditoria do leitor](../done/regras-auditoria-visual-completa/auditoria.md).

## Problema e reprodução

Ativar base Clara e abrir Experimento Híbrido. Os rótulos de 11px “Habilidade inicial”, “Custo do experimento” e “Energia inicial” ficam pálidos. Cores observadas e composição dos fundos produzem razões aproximadas de 1,87:1, 3,22:1 e 3,05:1 respectivamente.

## Fonte de verdade e responsabilidade

Tokens runtime de `docs/design/tema/_tokens.scss`, DESIGN.md, Stats e destaques do leitor de Regras. Cores/fundos observados estão no relatório.

Regras e textos vêm de [Sistema](../../core/sistema-v4.1.4.md) e [Guia](../../core/guia_de_mestre-v4.2.0.md). Constituição, convenções e [design](../../design/DESIGN.md) prevalecem. A mudança é de apresentação; não alterar efeitos, custos, fórmulas ou permissões. Normalização/modelos de leitura pertencem ao frontend; nenhuma regra de domínio deve ser duplicada no renderer.

## Entregáveis e aceite

1. Garantir contraste de pelo menos 4,5:1 para os rótulos pequenos identificados, mantendo a identidade de Vida/Energia/custo/habilidade inicial.
2. Usar tokens canônicos e distinguir, quando necessário, cor de ícone/fundo da cor de texto; não aplicar hex local nem escurecer um cartão isolado para mascarar o defeito.
3. Delimitar consumidores afetados antes de alterar token compartilhado. Se a solução mudar a paleta canônica, apresentar a decisão ao autor e sincronizar fonte/runtime conforme a documentação.
4. Conferir classes, subclasses, arquétipos, notas e custos do Guia que usam o mesmo tratamento. Preservar contraste e fidelidade na base escura.

## Contrato visual e verificação

Análogo inicial: Rótulos de texto principal/secundário da base clara e identidade semântica dos mesmos cartões na base escura. Inspecioná-lo e registrar shell, densidade, hierarquia, espaçamento, controles, estados, iconografia e responsividade antes de editar. Usar tokens e a API completa dos primitivos; se a biblioteca não cobrir o necessário, consultar o autor antes de ampliá-la ou contorná-la.

Registrar cores calculadas, fundo composto e razão de contraste antes/depois, inclusive opacidade. Inspecionar texto pequeno e bordas/foco em bases clara/escura e todas as larguras, no leitor e no painel. Verificar consumidores reais dos tokens que forem alterados.

Usar a skill `verify` na aplicação real em **1920×1080, 1366×768, 960×1080 e 360×800**, página e painel normal/maximizado quando disponível. No celular, o painel ocupa a área disponível e não tem maximização separada. Comparar pessoalmente com o análogo, corrigir divergências e registrar estados, evidências e limites. Executar build, lint e testes proporcionais ao código alterado; `npm run repo:verificar` no fecho e modo `--staged` antes de eventual commit.

## Limites e organização

Não reescrever specs concluídas, corrigir PDF, ampliar a task de usabilidade ou introduzir um redesign do leitor. Anexos em `regras-visual-09-contraste-base-clara/`, ao lado desta spec; capturas em `.artifacts/regras-visual-09-contraste-base-clara/`. Ao fechar, mover spec e anexos juntos e atualizar contexto/problemas com evidência. A auditoria encerrada documenta o defeito; não certifica sua correção.
