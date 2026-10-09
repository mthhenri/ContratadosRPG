# Usabilidade 06 — Orientação da calculadora de entrada de agente

> Task 6/6 da revisão pública de 09/10/2026; achado U-05 do [relatório](../active/usabilidade-classes-condicoes-2026-10-09/RELATORIO.md). Quebra solicitada pelo autor. Prioridade média.

## Objetivo

Explicitar que a aba Novo Agente calcula nível, prestígio e dinheiro de entrada de um agente
no grupo, incluindo substituição, sem induzir a expectativa de criação de ficha nessa calculadora.

## Entregáveis

1. Título/subtítulo e orientação inicial que descrevam entradas, resultados e propósito da aba.
2. Nomenclatura consistente na navegação, ajuda e nomes acessíveis; conservar motivo de entrada
   e todos os cenários atuais, inclusive Entrada do zero e sucessores Experimento.
3. Verificação em `usabilidade-06-orientacao-entrada-agente/`, capturas locais em
   `.artifacts/usabilidade-06-orientacao-entrada-agente/`.

## Critérios de Aceite

Ao abrir a aba, a pessoa vê que se trata de um cálculo de entrada no grupo e identifica a
finalidade das médias. A orientação não pressupõe que sempre exista um agente saindo.
Ajuda/rótulo ativo/nome acessível são coerentes; `/simulacao/novo-agente` continua válido.
Mesmas entradas produzem mesmos resultados e limites. Decomposição atual do cálculo permanece legível.

Análogo: shell/cartões e Ajuda atuais da Simulação. Usar os componentes e tokens vigentes;
registrar antes de editar. Texto novo não cria efeitos de jogo nem novo fluxo de cadastro.

Usar `verify` em 1920×1080, 1366×768, 960×1080 e 360×800: entrada do zero, aposentadoria,
cenários de Experimento, Ajuda, navegação, teclado e texto longo sem corte/overflow.
Executar checagens proporcionais da rota/rótulos, build, lint e `repo:verificar`; não criar
testes redundantes que só espelhem textos estáticos.

## Fora de Escopo

Criar assistente de ficha, mudar rotas ou regras de entrada, recalcular patentes/salário;
redesenhar os controles numéricos; tratar esta hipótese de interpretação como abandono medido.

## Dependências

Constituição/convenções, design e tema; Sistema vigente, Entrada de Novo Agente;
calculadora/ajuda e shell da Simulação. Compatibilizar nomes com task 03 caso já executada,
sem exigir sua conclusão para iniciar esta task.
