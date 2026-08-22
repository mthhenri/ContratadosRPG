# m7-17-receber-dano.spec.md

> Ajuste pós-milestone do M7 — Encontro de Combate.

## Objetivo

Dar ao mestre e ao jogador um **tomador de dano facilitado**: um botão "Receber dano" que abre um
dialog com os cinco tipos de dano, aplica as resistências da ficha (mais um ajuste custom por tipo)
e abate da Vida já o valor efetivo, sem que ninguém precise fazer a subtração na mão. Cada um usa o
botão no ponto onde já tem permissão para mexer na Vida hoje — o mestre no cartão do combatente
(dentro do encontro), o jogador na própria ficha — sem abrir nenhuma permissão nova.

Exemplo do autor: o agente toma 40 de Físico e 20 de Químico, tendo 15 de resistência Física e 5 de
Química. Ele digita apenas os dois valores brutos; o dialog mostra o que ele efetivamente vai tomar
e, ao confirmar, a Vida cai já reduzida.

## Regra de cálculo

Fonte: `docs/core/sistema-v4.1.0.md` — "⬥ Tipos de Dano" e "⬦ Resistências". A regra é **assimétrica**
e a implementação deve respeitá-la, não simplificá-la em cinco linhas iguais:

- **Dano Geral** é "impossível de ser burlada e/ou reduzida" — entra inteiro, sem campo de resistência.
- **Resistência Geral** reduz *qualquer* tipo de dano ("um ataque que cause 7 de dano físico seria
  barrado por uma resistência de 7 de dano geral") — é uma camada acima, aplicada **uma única vez**
  sobre o residual somado, nunca repetida por linha.

Ordem canônica do cálculo:

1. Para cada tipo bloqueável (`TIPOS_DANO_BLOQUEAVEIS`: Físico, Balístico, Explosão, Químico):
   `efetivoTipo = max(0, bruto - (resistenciaFicha + resistenciaCustom))`.
2. `residual = soma dos quatro efetivoTipo`.
3. `residualPosGeral = max(0, residual - (resistenciaGeralFicha + resistenciaGeralCustom))`.
4. `total = residualPosGeral + danoGeralInformado`.

Piso 0 em cada etapa: resistência excedente nunca vira cura nem compensa outro tipo. Tipo sem valor
bruto informado não participa do cálculo nem do resumo.

## Entregáveis

1. **Regra pura** em `shared/src/regras/encontro/receber-dano.ts`, exportada pelo `index.ts` do
   módulo, implementando exatamente a ordem acima. Recebe brutos por tipo e resistências (ficha +
   custom) e devolve o efetivo por tipo, o residual pós-Geral e o total. Sem dependência de UI,
   sem duplicar a regra no frontend ou no backend.
2. **Dialog `ReceberDanoDialogComponent`** (frontend, standalone), com uma linha por tipo bloqueável
   contendo: rótulo com `appTooltip` trazendo a definição do tipo conforme o documento, campo de dano
   bruto, resistência da ficha em somente-leitura (quando disponível — ver item 4) e campo de
   resistência custom (default 0, para efeitos temporários) e o efetivo daquela linha. Abaixo,
   separada, a **camada Geral**: resistência Geral da ficha + custom, e o campo de dano Geral marcado
   como irredutível, sem campo de resistência própria. A resistência da ficha é um `input` opcional
   do dialog (`readonly resistenciasFicha = input<Partial<Record<TipoDanoEnum, number>>>({})`) — sem
   ela, a coluna correspondente fica ausente/zerada e só o campo custom conta, sem erro nem estado de
   carregamento.
3. **Resumo ao vivo** acima do botão de confirmar, listando somente os tipos informados no formato
   bruto → efetivo, e o total a ser abatido. Confirmar aplica e fecha; cancelar não altera nada.
4. **Ponto de entrada no encontro (mestre)**: botão-ícone no cartão do combatente, na mesma linha de
   Vida/Energia, junto do gatilho de abrir ficha, reutilizando o padrão de ação já existente no
   cartão. O abate da Vida passa pelo mesmo caminho dos steppers (`vidaAjustada` → `ajustarVida()` da
   página → `EncontroService.ajustarVida()`) — não criar um segundo handler de mutação de Vida.
   Visível sob a mesma condição que já rege os steppers hoje (`podeAjustar`, mestre-only — o endpoint
   `PUT /encontro/combatente/:id/vida` já é mestre-only no backend; esta tarefa não abre exceção nem
   mexe em permissão do encontro). O jogador **não** tem esse botão no cartão do encontro.
   `EncontroCombatenteResumoDto` não carrega resistências — buscar a ficha completa só para preencher
   a coluna automática exigiria uma chamada de rede nova, fora do escopo desta tarefa. O dialog aberto
   por aqui **não recebe** `resistenciasFicha`: o mestre usa só o campo custom, olhando a ficha à parte
   se precisar (inclusive abrindo-a pelo botão adjacente).
5. **Ponto de entrada na ficha (dono, mestre, ou quem tiver edição)**: botão ao lado do rótulo "Vida",
   visível apenas quando `ajustavel()`. É o caminho do jogador para receber dano — inclusive dentro de
   uma cena de encontro, se ele abrir a própria ficha. Ficha de agente (`FichaVisualizacao`) usa o
   canal `ajusteVitalidade`, com `resistenciasFicha` vindo do `resistencias` já calculado por
   `montarResistencias` (item 8). Ficha de criatura (`CriaturaVisualizacao`, editada só pelo mestre)
   usa o canal `vitalidadeMudou`, com `resistenciasFicha` somando `dados().resistencias` por tipo
   (a lista da criatura tem `subtipo` e pode repetir tipo — soma as repetidas). Sem log em nenhum dos
   dois casos (item 6).
6. **Log do encontro**: confirmação dentro do encontro reaproveita o caminho de `vidaAjustada` →
   `ajustarVida()` → `EncontroService.ajustarVida()`, que já registra `EncontroEventoTipoEnum.DANO`
   com o total abatido (`"<nome> sofreu N de dano"`). Não criar tipo de evento novo nem plugar o
   detalhamento por tipo (`origemTexto`) nesta tarefa — o output `vidaAjustada` do cartão carrega só
   o delta numérico hoje, e estender seu contrato para levar texto de origem é uma mudança maior,
   fora deste escopo. Fora do encontro (ficha), não há log: a Vida muda como qualquer edição de
   vitalidade.
7. **Permissão herdada**: o botão só aparece para quem já pode alterar aquela Vida hoje, sem criar
   nenhuma permissão nova. Visualizador não vê o botão em lugar nenhum; o jogador só o tem na própria
   ficha; o mestre, no cartão de qualquer combatente da campanha (e também na própria ficha).
8. Resistências exibidas vêm de `montarResistencias` (`shared/regras/agente`), incluindo total
   negativo quando for o caso — o dialog não mascara nem aplica piso à resistência da ficha; o piso
   é do dano efetivo, não da resistência.

## Critérios de Aceite

- 40 de Físico e 20 de Químico, com 15 de resistência Física e 5 de Química e 0 de Geral, resultam em
  40 de dano efetivo (25 + 15) e a Vida cai exatamente 40.
- Um dano efetivo maior que a Vida atual do combatente é clampado ao valor exato da Vida atual antes
  de emitir o ajuste — o dialog nunca envia um delta que deixaria a Vida negativa. Achado em
  verificação ao vivo: sem o clamp, o backend rejeita o ajuste inteiro (`ajustarVida`/
  `alterarVitalidade` recusam Vida resultante negativa) e a Vida não muda, com um erro visível ao
  mestre/jogador. O clamp é feito no ponto de entrada (cartão do combatente), já que `ajustar()`
  (ficha de agente) e `ajustarVida()` (ficha de criatura) já clampam via `clamparVitalidade`/
  `Math.max(0, …)`.
- Dano Geral informado entra inteiro no total, sem qualquer redução, mesmo com resistências altas.
- Resistência Geral maior que zero reduz o residual somado uma única vez, não uma vez por tipo.
- Resistência maior que o bruto de um tipo zera aquele tipo, sem valor negativo e sem compensar
  outros tipos.
- Resistência custom soma à da ficha no tipo correspondente e não persiste entre aberturas do dialog.
- No dialog aberto pelo cartão do encontro (sem `resistenciasFicha`), o cálculo usa só a resistência
  custom digitada, sem erro nem coluna fantasma de resistência da ficha.
- Cancelar não altera Vida nem gera entrada no log.
- Dentro do encontro, a confirmação pelo mestre gera uma entrada `DANO` (texto padrão de
  `ajustarVida`, sem detalhamento por tipo) no log visível para a mesa e a Vida sincroniza em tempo
  real para os demais participantes.
- O jogador não vê o botão no cartão do encontro (mestre-only, igual aos steppers hoje); vê e usa o
  botão na própria ficha, sem gerar log.
- Visualizador não tem acesso ao botão em nenhuma das entradas.
- `npm run test -w shared`, `npm run test -w frontend` verdes e `npm run lint -w frontend` limpo.
- Verificação pela skill `verify` em `1920×1080` e `360×800`: como mestre, aplicando dano a um
  combatente pelo cartão do encontro; como jogador dono, aplicando dano na própria ficha.

## Fora de Escopo

- **Dano composto** (divisão 50/50 com resto no primeiro tipo). O dialog trata os cinco tipos
  diretamente; quem tomar composto informa as duas metades.
- Cura, recuperação de Energia ou qualquer outra mutação de recurso pelo mesmo dialog.
- Dano em massa ou aplicação simultânea a vários combatentes.
- Cálculo automático de dano a partir de rolagem ou de arma — o valor bruto é sempre digitado
  (coerente com `m3-31`: sem fusão automática de efeitos na rolagem).
- Persistir as resistências custom na ficha.

## Dependências

- `m7-05` e `m7-06` (painel do mestre e visão do jogador), `m7-07` (log do encontro), `m3-36`
  (resistências da aba Combate) e `m3-10` (modelo de vitalidade).
