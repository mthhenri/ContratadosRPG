# bugs-calculadora-abas-destaque.spec.md

> Task solta de correção (pedido do autor em 2026-11-24: "bugs abertos"). Origem: `PROBLEMS.md`
> P-133, P-134, P-129 e P-124.

## Objetivo

Corrigir os quatro defeitos de interface abertos que não dependem de decisão de regra nem de
dado em produção.

## Entregáveis

1. P-133: Enter em botão da janela da Calculadora que não é tecla do teclado numérico (Minimizar,
   Fechar, Limpar histórico) aciona o próprio botão. Nas teclas numéricas, Enter continua calculando.
2. P-134: nas fichas de Agente, Criatura e NPC, o item "Calculadora" restaura a janela minimizada
   no primeiro acionamento, usando `CalculadoraFlutuante.alternar()`.
3. P-129: o rótulo das abas compactas no celular sai da tela sem sair do nome acessível.
4. P-124: o destaque de pesquisa não selecionado preserva a cor do indicador de ameaça.

## Critérios de Aceite

- Testes focados que falham antes e passam depois para os itens 1 e 2.
- Suíte, lint e build do frontend.
- Verificação na aplicação real em `1920×1080` e `360×800` (análogo: os próprios componentes,
  sem mudança visual esperada nos itens 1–3; item 4 nas duas bases).

## Fora de Escopo

P-018 (decisões pendentes), P-132 (adiado pelo autor), P-119/P-120 (edição em produção), P-126.

## Dependências

Nenhuma.
