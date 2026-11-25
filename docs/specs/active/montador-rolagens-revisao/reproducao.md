# Reprodução ao vivo — montador de rolagens

> Anexo de `montador-rolagens-revisao.spec.md`. Feita em 25/11/2026 na aplicação real (Postgres local, backend e
> frontend de desenvolvimento, ficha "Operador Codex" do cenário de dev, aba Rolagens), em Chromium. Capturas em
> `.artifacts/montador-rolagens-revisao/` (local, ignorada). A Sessão 4 em si **não** foi reproduzida: só os
> comportamentos descritos nela.

## Antes da correção

| # | Passos | Observado | Esperado | Situação |
|---|---|---|---|---|
| R1 | Abrir o montador (1920×1080); clicar "Teste de atributo" e depois "Dados livres" (primeira vez) | O visor passa de `LUTd20kh1cm1 + PROF` para **vazio**, "Rolar" desabilita e a janela muda de 518×672 para 758×824 | Não perder a fórmula sem aviso; janela estável | Confirmado |
| R2 | Em "Dano de arma", digitar `LUTd20kh1cm1 + PROF` no visor | O editor mostrado é o de Teste, mas o segmento aceso continua **"Dano de arma"** | Segmento aceso = editor mostrado | Confirmado |
| R3 | Em "Teste de atributo", digitar `2d6` no visor | Segmento "Teste de atributo" aceso, editor de termos espremido numa janela de 518×672, cortando o conteúdo | Segmento e janela coerentes com o editor | Confirmado |
| R4 | Em "Teste de atributo", clicar Limpar | Visor vazio, "Rolar" desabilitado, mas o editor mostra LUT, PROF ligada e margem "Máximo" | Controles refletindo a fórmula, ou avisando | Confirmado (comportamento protegido por teste anterior) |
| R5 | Teste → editar (+1 dado) → Dano → Teste | O texto montado **volta** (`(LUT+1)d20kh1cm1 + PROF`) | — | **Não é defeito**: o texto é preservado entre visões |
| R6 | Margem de crítico no editor de Teste | Rótulos "Sem / Máximo / 2 maiores / 3 maiores"; "Sem" e "Máximo" rolam igual (motor) | Rótulo fiel ao motor | Confirmado por código e por teste do motor |

Itens da spec **não reproduzidos ao vivo**: perda do termo selecionado/campo de expressão ao trocar de editor
(confirmada só por leitura do código); maximizar e trocar de modelo (confirmado por código: `escolherReceita`
chamava `restaurar`).

## Divergências de cálculo (determinísticas, sem tela)

Medidas com o motor (`shared/dist`) e fixadas em `montador-resultado.spec.ts` (dados injetados):

| Atributo | Fórmula | Dados rolados | Total (dado = 10, 11, …) |
|---|---|---|---|
| Luta 1 | `LUTd20kh1` | 1 | 10 |
| Luta 1 | `(LUT-1)d20kh1` | **0** | **0** |
| Luta 0 | `LUTd20kh1` | 2, mantém o menor | 10 |
| Luta 0 | `(LUT+1)d20kh1` | 1 | 10 |
| Luta −1 | `(LUT+1)d20kh1` | **0** | **0** |
| INT 1 + SOC 1 | `(INT+SOC-3)d20kh1` | 3, mantém o menor | 10 |

Ou seja, com **um atributo** "dados a mais ou a menos" nunca entra em desvantagem (trava em 0 dado e total 0); com
**dois atributos** o mesmo caso rola 2+|n| dados e mantém o menor, como a regra do atributo zerado do Sistema.
Decisão do autor (25/11/2026): **manter o motor e só avisar na tela**.

## Depois da correção (mesma ficha, mesmos passos)

| # | Resultado |
|---|---|
| R1 | Visor vazio, mas com a nota "'Dados livres' começa do ponto de partida do modelo. A fórmula de 'Teste de atributo' continua guardada: volte a ele para retomá-la."; janela 758×824 nos três modelos, sem desmaximizar |
| R2 | Segmento "Teste de atributo" aceso |
| R3 | Segmento do modelo de dados aceso; janela única |
| R6 | Rótulos "Máximo / 2 maiores / 3 maiores"; "Máximo" aceso para fórmula sem `cm` |
| D2 | `(LUT-1)d20kh1cm1 + PROF` com Luta 1 mostra "Nenhum dado: com os dados a menos o teste não rola nenhum d20, e o total é só o que for somado." |
| D3 | Com `modificadoresTeste` luta +2 e força −1 no banco: Teste abre em `LUTd20kh1cm1 + PROF + 2` com a linha "Da ficha em LUT: +2 de modificador"; trocar para FOR dá `… - 1`; VIG volta a `VIGd20kh1cm1 + PROF` |
| 360×800 | Teste, Dados livres (com a nota) e Dano de arma sem overflow horizontal; janela cheia de 358×737 |
