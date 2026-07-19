# m3-31-ficha-dinheiro-salario.spec.md

> Task 31 do milestone `m3-ficha-jogador.spec.md`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).

## Objetivo

Dar à ficha um campo real e editável de **dinheiro atual** (hoje só um `0` hardcoded em
`ficha-inventario.component.ts` só pra satisfazer a assinatura de `calcularResumoCompras`)
e exibir o **Salário** (read-only, derivado da patente por prestígio).

## Entregáveis

1. `readonly dinheiro?: number;` em `FichaJogadorDadosDto`
   (`shared/src/dtos/ficha/ficha.dtos.ts`) — opcional, mesmo tratamento retrocompatível de
   `estado.vidaMaxima?` (fichas antigas no banco não têm o campo). Atualizar o comentário de
   escopo do arquivo removendo "Dinheiro" da lista "ainda fora".
2. Função pura pro dinheiro inicial (`1000 + 4D4 × 250`, doc `sistema-v4.1.0.md` ~linha 767)
   em `shared/src/regras/novo-agente/` — verificar antes se a gramática de
   `shared/src/regras/rolagem` já suporta `NdM * K`; se sim, reusar `rolarFormula`, senão
   função dedicada rolando `4D4` via o primitivo de dado existente.
3. `ficha-padrao.ts` (`construirFichaInicial`): seta `dinheiro` na criação usando o helper.
4. Visão Geral (`status-derivado.ts`, card "Informações Extras"): nova linha editável
   "Dinheiro" (mesmo mecanismo de `CampoDadosEscalar` usado por `nivel`/`prestigio`) e linha
   read-only "Salário" (`obterPatente({ prestigio }).salario`, já existe em
   `shared/src/regras/patente/patente.ts` — zero código novo de regra).
5. `ficha-inventario.component.ts`: trocar o `dinheiro: 0` hardcoded pelo valor real da
   ficha (via `@input`), fazendo o "dinheiro restante" do resumo de compras refletir a
   realidade pela primeira vez.

## Critérios de Aceite

- Ficha nova nasce com dinheiro inicial rolado dentro do intervalo esperado (2000–5000).
- Dinheiro é editável inline e persiste.
- Salário aparece, correto pra cada faixa de prestígio.
- Resumo de compras no Inventário usa o dinheiro real da ficha.

## Fora de Escopo

- Pagamento automático de salário (evento de missão).
- `BonusMonetarioDto` (fica como está, sem relação com este dinheiro persistido).

## Dependências

- `m3-10` (edição inline), `m3-14` (resumo de compras no Inventário).
