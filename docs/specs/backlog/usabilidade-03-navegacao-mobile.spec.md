# Usabilidade 03 — Nomes e descoberta da navegação móvel

> Task 3/6 da revisão pública de 09/10/2026; achado U-03/P-112 do [relatório](../active/usabilidade-classes-condicoes-2026-10-09/RELATORIO.md). Quebra solicitada pelo autor. Prioridade alta.

## Objetivo

Garantir que todos os destinos da Simulação tenham nome acessível no celular e que a pessoa
consiga identificar a finalidade dos ícones inativos antes de navegar.

## Entregáveis

1. Nome acessível estável para cada um dos sete links, independente da aba ativa e do viewport.
2. Orientação visual dos destinos inativos pelo padrão de navegação/tooltip canônico, sem
   fazer a pessoa depender exclusivamente de memorizar ícones. Preservar a ação de toque curto.
3. Verificação e atualização de P-112 quando o defeito estiver comprovadamente corrigido;
   anexos em `usabilidade-03-navegacao-mobile/`, capturas em `.artifacts/usabilidade-03-navegacao-mobile/`.

## Critérios de Aceite

Em 360×800, a árvore de acessibilidade identifica Agente / Civil, DT, Novo Agente, Patentes,
Descanso, Compras e Vendas, inclusive quando inativos. Os nomes acompanham a nomenclatura
vigente (task 06 pode alterar Novo Agente posteriormente). Links continuam links com destinos
corretos, indicação atual e funcionamento por teclado; não usar tabs ARIA para rotas distintas.

Análogo: navegação atual da Simulação e orientação de destinos existente no produto. Inspecionar
antes de editar e usar primitivos/tokens. Se a solução requer novo comportamento da biblioteca,
consultar o autor. Não usar tooltip `title` nativo nem interceptar toque curto para ler a dica.

Usar `verify` nos quatro viewports 1920×1080, 1366×768, 960×1080 e 360×800, com cada rota
ativa. Verificar descoberta, foco, indicação atual, nomes acessíveis, alvos de toque e ausência
de sobreposição/overflow. Rodar teste proporcional da navegação, build, lint e `repo:verificar`.

## Fora de Escopo

Mudar rotas, cálculos ou permissões; redesenhar todas as navegações do produto; alterar o
significado de Novo Agente (task 06); declarar auditoria WCAG integral.

## Dependências

Constituição/convenções, design e tema; P-112 em `docs/context/PROBLEMS.md`;
`simulacao-shell.component.html`/`.scss` e contratos dos primitivos de navegação/tooltip existentes.
