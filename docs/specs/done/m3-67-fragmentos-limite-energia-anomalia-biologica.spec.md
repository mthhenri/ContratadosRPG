# m3-67-fragmentos-limite-energia-anomalia-biologica.spec.md

> Task do milestone `m3-ficha-jogador.spec.md`. Continuação do lote de Fragmentos (`m3-35`, `m3-42`).

> **Antes de codar:** reler `docs/core/sistema-v4.1.0.md` — "⬥ Afinidade com Fragmentos" >
> "⬦ Limite mínimo de Energia" (~1959-1961). **O documento vence** (proibição #27). **Não** ler a
> continuação sobre Colapso (~1962-1968) como parte desta task — está fora de escopo (ver abaixo).

## Objetivo

Modelar o "Limite mínimo de Energia" e o estado de "Anomalia Biológica" que o doc define quando
portar fragmentos drena a Energia Máxima do agente abaixo de `(Vigor + Destreza) × 2`. Hoje nada
disso existe — um agente pode portar fragmentos suficientes para zerar sua Energia Máxima sem
qualquer aviso ou consequência.

## Cuidado — não confundir com `calcularLimiteEnergia`

`shared/src/regras/agente/saude.ts:calcularLimiteEnergia` já existe e é **outro conceito**: é o
quanto a **Energia atual** pode ficar negativa antes de penalidade (doc — seção "Energia" >
"Limites de Energia" — `Destreza × 2` para agentes, só `Destreza` para Civis; o docstring da
função já registra que diverge da fórmula ingênua `(Vigor+Destreza)×2`). O limite desta task é
sobre a **Energia Máxima** (o teto, não o quanto pode negativar) especificamente no contexto de
fragmentos, e usa `(Vigor + Destreza) × 2` de verdade, conforme a seção de Fragmentos do doc. Nomear
a nova função de forma que não colida (ex.: `limiteMinimoEnergiaMaximaFragmentos`) e documentar a
distinção no próprio código, para não repetir a confusão que `calcularLimiteEnergia` já teve que
resolver uma vez.

## Entregáveis

1. **Limite mínimo.** Nova função pura em `shared/src/regras/agente/` (ou junto de `fragmento.ts`,
   já que só se aplica no contexto de fragmentos — decidir pelo padrão de import mais limpo) que
   calcula `(vigor + destreza) × 2`.
2. **Estado derivado "Anomalia Biológica".** Um `computed`/função pura que compara a Energia Máxima
   **atual** do agente (já reduzida pelos fragmentos portados) contra o limite mínimo. Sem novo
   campo persistido de "decisão do jogador" — o estado é 100% derivado dos números atuais (mesma
   filosofia de "nada é travado pelo motor, o narrativo é refletido por quem joga", `m3-10`): se a
   Energia Máxima está abaixo do limite, o agente **está** em Anomalia Biológica, ponto. O jogador
   decide narrativamente "largar" (remover fragmentos até sair do estado) ou "continuar" (não faz
   nada) — o app não trava a ação de portar um fragmento que causaria isso, só avisa antes
   (`ficha-inv__aviso` no painel de aquisição, quando a compra levaria a Energia Máxima abaixo do
   limite).
3. **Exibição dos efeitos.** Quando em Anomalia Biológica, mostrar na ficha (aba Extras, perto do
   bloco de Afinidade) os efeitos do doc como **texto informativo calculado**, não aplicado
   automaticamente em testes/Defesa (mesmo padrão das sequelas/traumas hoje — nome+descrição,
   aplicação manual pelo jogador/mestre): "-15 em todos os testes", "-10 em Defesa", "vida atual
   travada em 10% da máxima" (mostrar o valor calculado, ex.: "trava em 8 de 80"). Não mexer em
   `calcularDefesa`/motor de rolagem — mudar essas fontes de verdade globais para um estado de
   fragmento é risco desproporcional ao pedido.
4. **Trauma "Limiar da Humanidade".** Não auto-aplicar (doc: só depois de "passar uma cena" nesse
   estado, julgamento do Mestre). Facilitar o registro: quando em Anomalia Biológica, oferecer um
   atalho no editor de Sanidade (`m3-12`) pré-preenchendo nome "Limiar da Humanidade" e a descrição
   dos efeitos (+2 custo da habilidade de Personalidade, -5 em todas as resistências, tratamento
   3× mais caro) para o jogador/mestre confirmar a adição, em vez de criar aplicação automática.
5. Testes em `shared` para o limite mínimo e o estado derivado; teste de componente para o aviso na
   aquisição e a exibição dos efeitos.

## Critérios de Aceite

- Existe uma função pura testada para `(Vigor + Destreza) × 2`, sem colidir com
  `calcularLimiteEnergia`.
- A ficha mostra claramente quando o agente está em Anomalia Biológica e os efeitos calculados
  (testes, Defesa, teto de vida).
- Tentar portar um fragmento que levaria a Energia Máxima abaixo do limite mostra aviso antes da
  confirmação, sem bloquear a ação.
- O atalho de registrar o trauma "Limiar da Humanidade" existe e não dispara sozinho.

## Fora de Escopo

- **Colapso** e a transformação em criatura por faixa de Ameaça — fora de escopo por pedido
  explícito, registrado em `IDEAS.md` como upgrade futuro.
- Qualquer alteração em `calcularDefesa`/motor de rolagem para aplicar os -15/-10 automaticamente.

## Dependências

- `m3-42` (Afinidade), `m3-12` (editor de Sanidade/traumas), `shared/regras/agente/saude.ts`
  (`calcularEnergia`, `calcularVida`).
