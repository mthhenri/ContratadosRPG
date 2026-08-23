# m3-74-guia-ignorar-recursos-iniciais.spec.md

> Ajuste pós-milestone do M3 — Guia de Criação de Ficha. Pedido direto do autor: "opção de ignorar
> os dados e equipamento inicial no guia de criação de ficha de agente".

## Objetivo

Dar ao mestre/jogador a opção de **pular a rolagem de dinheiro inicial** no passo "Recursos" do
guia, terminando a criação com $0 e sem gastar a rolagem única do passo. O kit de itens iniciais
("Equipamento inicial") **já é pulável hoje** — não precisa de mudança; ver "Estado atual" abaixo
para não duplicar trabalho.

## Estado atual (levantado antes de especificar, para não confundir as três frentes)

O pedido "dados e equipamento inicial" toca três mecanismos distintos do guia, só um dos quais
precisa de trabalho:

1. **Kit de Equipamento Inicial** (passo "Equipamento inicial", `m3-59`) — já é opcional. Um carrinho
   vazio (0 gasto / 0 peso) já é válido (`criar.page.ts:363-364`, `kitValido()`), e o próprio HTML
   avisa: *"O passo é opcional: um kit vazio é válido"* (`criar.page.html:599`). **Nada a fazer aqui.**
2. **Dinheiro inicial** (passo "Recursos") — **não é pulável hoje**. `passoValido()` para esse passo
   exige `e.dinheiro.rolado && !this.rolandoRecursos()` (`criar.page.ts:564`); o botão "Rolar dados"
   é obrigatório e a UI avisa que a rolagem *"é definitiva e poderá ser feita uma única vez"*
   (`criar.page.html:573`). **Este é o alvo desta task.**
3. **Pacote inicial de Habilidades** (dentro do passo "Habilidades", `m3-64`) — escolher um dos
   pacotes fixos do documento é obrigatório por regra de sistema (P-012); não há opção de "nenhuma
   habilidade". **Fora de escopo** — pular esse passo contrariaria a regra do jogo, não é um ajuste
   de UX.

## Entregáveis

1. No passo "Recursos" do guia (`criar.page.html`/`criar.page.ts`), adicionar uma opção explícita
   (ex.: botão/toggle "Não rolar dinheiro inicial" ao lado do botão "Rolar dados") que:
   - Marca o passo como resolvido sem chamar a rolagem, deixando `e.dinheiro` com valor `0` e
     `rolado = true` (ou equivalente que satisfaça `passoValido`), sem persistir nenhuma entrada de
     rolagem no histórico.
   - É reversível enquanto o passo não avançar (o usuário pode desistir de "ignorar" e rolar
     normalmente, contanto que ainda não tenha avançado — mesma trava de "rolagem única" que já
     existe hoje para a rolagem normal, sem abrir uma segunda chance depois de confirmado).
2. Texto de ajuda do passo atualizado para deixar claro que ignorar é permanente para aquela ficha,
   igual à rolagem normal.
3. Não alterar o motor de regras (`shared/regras`) — dinheiro $0 já é um valor válido no domínio, a
   mudança é só de fluxo do guia.

## Critérios de Aceite

- No passo "Recursos", é possível avançar sem rolar dados, optando explicitamente por ignorar; a
  ficha criada tem dinheiro $0.
- Optando por rolar normalmente, o comportamento é idêntico ao de hoje (rolagem única, definitiva).
- Depois de optar por ignorar (ou de rolar), o passo mostra o resultado (ignorado ou valor rolado) e
  não permite refazer a escolha.
- O passo "Equipamento inicial" continua funcionando exatamente como hoje (não é tocado por esta
  task).
- `npm run test -w frontend` verde, com teste de regressão cobrindo o fluxo "ignorar dinheiro".
- Verificação pela skill `verify` em `1920×1080` e `360×800`: criar um agente ignorando o dinheiro
  inicial, do início ao fim do guia.

## Fora de Escopo

- Tornar o pacote de Habilidades iniciais opcional — é mandatório por regra documentada (P-012).
- Qualquer mudança no passo "Equipamento inicial" (já opcional).
- Permitir desfazer a rolagem de dinheiro depois de já ter rolado.

## Dependências

`m3-57` (guia base), `m3-59` (equipamento inicial, referência de passo opcional já resolvido).
