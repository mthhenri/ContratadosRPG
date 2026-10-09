# Conter os bônus longos dos cartões

> Task de correção RV-02 / P-115; prioridade alta. Criada após a bateria visual de 09/10/2026, por pedido do autor. **Backlog: não implementada.**
> Evidência, cobertura e limites: [auditoria do leitor](../done/regras-auditoria-visual-completa/auditoria.md).

## Problema e reprodução

Em 360×800, abrir Experimento Híbrido e localizar Atributos bônus. Cada chip tem aproximadamente 295px para uma região de 225px: seu limite direito chega a x≈360, além do cartão. Em duas colunas desktop, o mesmo chip ultrapassa a coluna de 270px e consome quase todo o intervalo antes das habilidades.

## Fonte de verdade e responsabilidade

Sistema, Experimento Híbrido; `regras-subclasse.component.*`, `regras-arquetipos.component.*` e API do Chip em `shared/ui/`.

Regras e textos vêm de [Sistema](../../core/sistema-v4.1.4.md) e [Guia](../../core/guia_de_mestre-v4.2.0.md). Constituição, convenções e [design](../../design/DESIGN.md) prevalecem. A mudança é de apresentação; não alterar efeitos, custos, fórmulas ou permissões. Normalização/modelos de leitura pertencem ao frontend; nenhuma regra de domínio deve ser duplicada no renderer.

## Entregáveis e aceite

1. Mostrar integralmente os dois bônus de escolha do Híbrido, inclusive a exclusão de LUT/PON, dentro da área reservada aos bônus.
2. Conferir também o bônus de escolha do Acadêmico e os bônus dos demais arquétipos; não reduzir os textos autorais nem usar reticências para esconder a restrição.
3. Preservar densidade e distância entre identidade, bônus, habilidade inicial e catálogo. O chip não pode ocupar a coluna de habilidades ou escapar do cartão.
4. Usar a API do Chip e a composição canônica; se o primitivo não permitir a apresentação necessária, apresentar as alternativas ao autor antes de ampliá-lo.

## Contrato visual e verificação

Análogo inicial: Bônus curtos dos cartões de classe/arquétipo e distribuição dos cartões de Experimento Bestial/Artificial. Inspecioná-lo e registrar shell, densidade, hierarquia, espaçamento, controles, estados, iconografia e responsividade antes de editar. Usar tokens e a API completa dos primitivos; se a biblioteca não cobrir o necessário, consultar o autor antes de ampliá-la ou contorná-la.

Comparar o limite visual dos chips com o cartão e sua coluna nas quatro larguras, página e painel. Teste focado de conteúdo/projeção apenas se o texto for transformado; não testar snapshots de CSS que só reproduzem a implementação.

Usar a skill `verify` na aplicação real em **1920×1080, 1366×768, 960×1080 e 360×800**, página e painel normal/maximizado quando disponível. No celular, o painel ocupa a área disponível e não tem maximização separada. Comparar pessoalmente com o análogo, corrigir divergências e registrar estados, evidências e limites. Executar build, lint e testes proporcionais ao código alterado; `npm run repo:verificar` no fecho e modo `--staged` antes de eventual commit.

## Limites e organização

Não reescrever specs concluídas, corrigir PDF, ampliar a task de usabilidade ou introduzir um redesign do leitor. Anexos em `regras-visual-02-bonus-longos/`, ao lado desta spec; capturas em `.artifacts/regras-visual-02-bonus-longos/`. Ao fechar, mover spec e anexos juntos e atualizar contexto/problemas com evidência. A auditoria encerrada documenta o defeito; não certifica sua correção.
