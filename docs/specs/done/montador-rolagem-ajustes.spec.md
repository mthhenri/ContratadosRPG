# montador-rolagem-ajustes.spec.md

> Task avulsa de refinamento do `MontadorRolagem` entregue em `ui-35`/`ui-36`.

## Objetivo

Corrigir a composição de tokens do montador para que ela gere fórmulas válidas e previsíveis,
inclusive quando há mais de um dado, atributo repetido ou tipo de dano. Ampliar a gramática de
rolagem somente nas duas formas solicitadas — quantidade por atributo multiplicado e grupo de
termos tipado — e manter a ferramenta flutuante aberta ao navegar entre as abas da ficha.

## Entregáveis

1. Extrair para `montador-rolagem.util.ts` funções puras que localizam o último termo de dado
   elegível e reposicionam o operador de pool (`kh`, `kl` ou `cmN`) no final dele. Clicar em
   **Manter maior**, **Manter menor** ou **Margem de crítico** não altera a fórmula quando não há
   um dado ou uma quantidade resolvida para dado; com dados, remove a ocorrência existente do
   operador acionado e a acrescenta ao último dado elegível. O mesmo vale para a rolagem de
   crítico, pois ela usa a mesma fórmula interpretada pelo motor.
2. Alterar o clique de dado para inserir um novo termo aditivo: primeiro dado continua `dN`; todo
   dado novo posterior entra como `+dN`, salvo se a fórmula já termina em `+`, `-` ou `(`. O
   incremento do último termo daquela face continua funcionando e preserva o sinal já existente.
3. Ao clicar novamente no mesmo atributo ou fonte extra já adicionada como valor, consolidar a
   soma em multiplicador, sempre dentro de parênteses quando a expressão for usada como
   quantidade de dados: `LUT` seguido de `LUT` resulta em `(LUT*2)` antes de `dM`, nunca em uma
   concatenação ambígua. A ação composta passa a aceitar multiplicador como alternativa ao ajuste
   e gera `(ATR*Y)dM`.
4. Estender o motor puro em `shared/src/regras/rolagem/` para aceitar e executar
   `(ATR*Y)dM`, preservando o comportamento de `(ATR±n)dM`: a quantidade é limitada a zero,
   não ativa a desvantagem intrínseca e operadores de pool se aplicam ao dado do bloco. Cobrir ao
   menos `(LUT*2)d20` na interpretação e na rolagem.
5. Tornar o token de tipo de dano condicional: sem um dado, constante ou grupo fechado elegível,
   o clique não escreve nada. Com um grupo de expressão entre parênteses, a gramática aceita a tag
   no fim do grupo, por exemplo `(2d12+2d6)[F]`, e atribui o tipo a todos os termos do grupo. Não
   ampliar parênteses para agrupamento aritmético geral fora deste caso.
6. Hospedar o `app-montador-rolagem` em um nível persistente da visualização da ficha, não dentro
   do conteúdo destruído das abas. O gatilho permanece na aba Rolagens; uma vez aberto, o painel
   continua visível e editando a mesma fórmula ao trocar para qualquer outra aba. A janela também
   ganha afastamento maior das bordas no desktop, usando tokens/`safe-area` e sem alterar a
   geometria dos demais consumidores de `app-painel-flutuante`.
7. Atualizar testes focados do montador, do motor de rolagem e da ficha para cobrir inserção de
   dados com sinal, reposicionamento de `kh`/`kl`/`cm` ao último dado, ausência de efeito sem alvo,
   repetição de atributo, as fórmulas `(LUT*2)d20` e `(2d12+2d6)[F]`, e persistência visual do
   painel ao trocar abas.

## Critérios de Aceite

- O montador produz, somente por clique, `d20+d6kh`, `d20+d6kl` e `d20+d6cm1` quando o operador é
  acionado depois dos dois dados; cada fórmula é aceita por `validarFormula` e o operador afeta
  o `d6`.
- Sem um alvo elegível, os cliques de `kh`, `kl`, `cmN` e tipo de dano não modificam a fórmula.
- Com atributos de LUT=3, `(LUT*2)d20` é válida e rola seis d20; o resultado não recebe a regra
  de desvantagem intrínseca. `(2d12+2d6)[F]` é válida e agrupa ambos os pools como dano Físico.
- `npm run test --workspace=shared`, `npm run test --workspace=frontend`, os linters aplicáveis e
  `npm run build --workspace=frontend` passam sem regressão.
- Gate visual obrigatório com o análogo `CalculadoraFlutuante` e o primitivo
  `app-painel-flutuante`: na aplicação real, em 1920×1080 e 360×800, abrir o montador pela aba
  Rolagens, trocar de aba com a caixa aberta, conferir que ela continua visível, usar o teclado e
  rolar pelo rodapé. Verificar margens, ausência de overflow, foco visível e controles canônicos.
- Ao fechar, a spec vai para `docs/specs/done/` e `docs/context/HISTORY.md`/`CONTEXT.md` registram
  o comportamento, análogo, viewports e verificações.

## Fora de Escopo

- Alterar o texto livre da fórmula fora das correções de gramática necessárias acima.
- Adicionar suporte a agrupamento aritmético genérico, novos operadores, explosão ou implosão na UI.
- Levar o montador ao formulário de presets ou à rolagem avulsa.
- Mudar o tamanho, o comportamento de arraste ou as margens de outros painéis flutuantes.

## Dependências

- `docs/specs/done/ui-35-montador-rolagem.spec.md`.
- `docs/specs/done/ui-36-montador-rolagem-usabilidade.spec.md`.
- `docs/core/sistema-v4.1.0.md` (Dados, testes e tipos de dano).
- `docs/design/DESIGN.md` (painel flutuante e biblioteca de componentes).

## Riscos e Mitigação

- A gramática atual permite parênteses só em formas sancionadas. O grupo tipado deve ser
  reconhecido explicitamente e reusar a interpretação de cada termo interno; não deve aceitar
  expressões parentetizadas arbitrárias por acidente.
- O painel não pode ser duplicado ao mudar de aba. A instância persistente precisa ter um único
  `id` e um único estado de abertura por ficha, preservando as garantias de posição e z-index do
  primitivo.
