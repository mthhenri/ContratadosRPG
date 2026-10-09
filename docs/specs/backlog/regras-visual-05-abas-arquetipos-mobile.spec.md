# Dar espaço aos nomes e ícones das abas mobile

> Task de correção RV-05 / P-118; prioridade média. Criada após a bateria visual de 09/10/2026, por pedido do autor. **Backlog: não implementada.**
> Evidência, cobertura e limites: [auditoria do leitor](../done/regras-auditoria-visual-completa/auditoria.md).

## Problema e reprodução

Sistema → Combatente em 360×800: três abas com aproximadamente 83px cada e fonte de 10px. Nome de Mercenário e ícones encostam nas fronteiras entre abas; o problema também aparece em Especialista e Suporte. Seleção por teclado funciona, mas o texto/ícone ficam excessivamente comprimidos.

## Fonte de verdade e responsabilidade

`regras-arquetipos.component.*`; APIs de Abas/Aba em `shared/ui/`; três classes e nove arquétipos do Sistema.

Regras e textos vêm de [Sistema](../../core/sistema-v4.1.4.md) e [Guia](../../core/guia_de_mestre-v4.2.0.md). Constituição, convenções e [design](../../design/DESIGN.md) prevalecem. A mudança é de apresentação; não alterar efeitos, custos, fórmulas ou permissões. Normalização/modelos de leitura pertencem ao frontend; nenhuma regra de domínio deve ser duplicada no renderer.

## Entregáveis e aceite

1. Exibir os nove nomes e seus ícones sem colisão, corte ou redução local da tipografia para fazê-los caber.
2. Conservar seleção atual, foco visível, relação aba/painel e navegação por teclado; alvos de toque devem manter pelo menos a altura atual de 44px.
3. Definir a composição mobile com as opções existentes da biblioteca. Se faltar comportamento/variante, levar a decisão ao autor antes de contornar com CSS ou HTML local.
4. Preservar a navegação da busca que revela uma aba oculta e o conteúdo integral de cada arquétipo.
5. Coordenar com `usabilidade-02-consulta-arquetipos.spec.md`: esta task corrige a legibilidade das abas existentes; não antecipa a reorganização/descoberta definida naquela spec.

## Contrato visual e verificação

Análogo inicial: Abas canônicas da biblioteca com nome e ícone legíveis e foco completo. Comparar também as abas atuais em 1920×1080. Inspecioná-lo e registrar shell, densidade, hierarquia, espaçamento, controles, estados, iconografia e responsividade antes de editar. Usar tokens e a API completa dos primitivos; se a biblioteca não cobrir o necessário, consultar o autor antes de ampliá-la ou contorná-la.

Inspecionar cada grupo e todos os nove estados selecionados, foco por Tab/setas e resultado de busca em aba oculta. Conferir no painel mobile e no normal desktop estreito. Reutilizar testes existentes de seleção, adicionando casos somente para comportamento alterado.

Usar a skill `verify` na aplicação real em **1920×1080, 1366×768, 960×1080 e 360×800**, página e painel normal/maximizado quando disponível. No celular, o painel ocupa a área disponível e não tem maximização separada. Comparar pessoalmente com o análogo, corrigir divergências e registrar estados, evidências e limites. Executar build, lint e testes proporcionais ao código alterado; `npm run repo:verificar` no fecho e modo `--staged` antes de eventual commit.

## Limites e organização

Não reescrever specs concluídas, corrigir PDF, ampliar a task de usabilidade ou introduzir um redesign do leitor. Anexos em `regras-visual-05-abas-arquetipos-mobile/`, ao lado desta spec; capturas em `.artifacts/regras-visual-05-abas-arquetipos-mobile/`. Ao fechar, mover spec e anexos juntos e atualizar contexto/problemas com evidência. A auditoria encerrada documenta o defeito; não certifica sua correção.
