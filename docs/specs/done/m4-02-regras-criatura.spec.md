# m4-02-regras-criatura.spec.md

> Task 2/10 do milestone `m4-ficha-criatura-npc.spec.md`.

## Objetivo

`shared/regras/criatura` — o motor de regras puro do roteiro de criação de Ameaças
(`docs/core/guia_de_mestre-v4.0.0.md`), espelhando a estrutura de `shared/regras/agente`
(funções puras, zero dependências, sem I/O). É a fonte única que backend (validação) e
frontend (assistente de criação, `m4-04`) consomem — nenhuma fórmula reimplementada nos
dois lados (proibição #26).

## Entregáveis

Uma função pura por bloco do roteiro, testada isoladamente e, ao final, encadeada no caso
de teste completo "A Estátua" (exemplo fechado do guia, também fechado em `SCHEMA.md`):

1. **Atributos**: `obterBaseELimitePorVd(vd)` → base/limite/pontos de ajuste (tabela por
   faixa de VD — 0–20, 20–40, 40–60, 60–80, 80–100, 100+; limite base+3, exceto 80–100
   base+4 e 100+ base+5); `validarRealocacaoAtributos` (até 3 pontos de um atributo para
   outros, pode zerar a origem, nunca ultrapassa o limite).
2. **Modificadores**: `calcularValorModificador(tipo, vd)` — valor por VD (base em VD 5:
   Forte +0/Médio -1/Fraco -2/Frágil -3; a cada +5 de VD: Forte +2,5/Médio +2/Fraco
   +1,5/Frágil +1, arredondado para baixo) e `calcularAtributoEfetivo(atributoFinal,
   modificador, vd)`.
3. **Saúde**: `calcularVidaMaxima(vd, tenacidade)` = VD × multiplicador da Tenacidade
   (tabela DESCARTAVEL ×10 … ABSOLUTA ×120).
4. **Defesa**: `calcularDefesaBase(vd)` = 15 + VD ÷ 2; `possuiContraAtaque(modificadorLuta)`
   (só quando Luta é Forte).
5. **Resistências/Fraquezas**: `calcularLimiteResistencias(vd, quantidadeFraquezasExtras)` =
   2×VD × (1 + 0,25 × fraquezas além da 1ª); `calcularCustoResistencia(valor, ehSubtipo)`
   (Dano Geral conta em dobro; subtipo conta metade — 2 pontos gastam 1 do limite);
   `validarFraqueza(valor, somaResistencias)` (mínimo 5 ou metade da soma de resistências,
   o que for maior); `calcularMultiplicadorCriticoFraqueza(ehSubtipo)` (3× tipo amplo, 4×
   subtipo).
6. **Regeneração**: `calcularValorRegeneracao(vidaMaxima, intensidade, modo)` — % da Vida
   Máxima por intensidade/modo (tabela passiva vs. condicional).
7. **Deslocamento**: `sugerirDeslocamentoTerrestre(destreza)` (tabela de referência, valor
   sugerido — o Mestre pode sobrescrever; a função só sugere, nunca trava).
8. **Cadência/Iniciativa**: `calcularBonusIniciativaSugerido(vd)` ≈ 10% da VD (sugestão, não
   trava); turnos por rodada seguem `CadenciaEnum` (SINGULAR=1…FRENETICA=4+), sem fórmula —
   é escolha de conceito.
9. **Ataques**: `obterDanoReferenciaPorVd(vd, custoAcao)` — tabela de dano de referência
   (Movimento/Padrão/Completa/Turno) por faixa de VD; função só de **consulta/sugestão**,
   nunca valida/trava o dano digitado pelo Mestre (o documento é claro: é referência, não
   teto).
10. **Validação de coerência** (`validarFichaCriatura(dados: FichaCriaturaDadosDto)`):
    soma de resistências ≤ limite calculado, ao menos 1 fraqueza declarada, exatamente
    2/3/3/2 modificadores Forte/Médio/Fraco/Frágil (um por atributo), ao menos um modo de
    deslocamento preenchido — retorna lista de violações (mesmo padrão de retorno usado em
    `shared/regras/agente` para o service consumir).
11. **Caso de teste completo**: montar "A Estátua" (VD 30, Padrão ×35 → Vida 1.050, Defesa
    30, Limite de Resistências 60, Físico 36 + Balístico 16, Fraqueza Explosão 20) e
    confirmar que o motor reproduz os valores do exemplo do guia.

## Critérios de Aceite

- Todas as funções puras, testadas contra as tabelas do "Guia de Criação de Ameaças".
- O caso de teste "A Estátua" reproduz os valores do documento (critério de aceite do
  milestone).
- Nenhuma constante de regra duplicada fora de `shared/regras/criatura` (proibições
  #26/#27); reusa `shared/regras/agente` só onde o conceito é **idêntico** (nenhum caso
  identificado até agora — atributos/modificadores de criatura têm fórmula própria).

## Fora de Escopo

- `FichaCriaturaDadosDto` (contrato, `m4-01`, pré-requisito desta task).
- Uso do motor no backend (`m4-03`) ou no frontend (`m4-04`).
- `shared/regras/npc` (`m4-06`).

## Dependências

- `m4-01` (contrato `FichaCriaturaDadosDto`).
- `docs/core/guia_de_mestre-v4.0.0.md` — "Guia de Criação de Ameaças" (fonte de verdade;
  documento vence código, proibição #27).
