# m10-02-normalizador-casos-explicitos.spec.md

> Task do milestone `m10-regras.spec.md`, depois de `m10-01`. Sem UI. Fonte visual de cada bloco:
> aba *Protótipo* do exemplão (`docs/specs/done/m10-regras/m10-regras-exemplao.html`).

## Objetivo

Reconhecer, no normalizador, as estruturas do `.md` que não são texto corrido nem tabela de dados —
sobretudo **tabelas de layout** do Docs — e emiti-las como blocos tipados próprios. É a regra mais
arriscada do normalizador: os casos são uma **lista explícita**, nunca heurística aberta.

## Entregáveis

1. **Tipos novos** em `regras.model.ts` para cada caso abaixo.
2. **Casos explícitos** (cada um com fixture real e teste):
   - **Classe** — tabela de layout que abre com `⬥ <Classe>` e citação: dossiê com citação,
     Vida/Energia da classe, habilidades de classe, arquétipos (`⬦ Arquétipos  ◻ <Nome>`) cada um
     com a "Habilidade inicial do arquétipo", e habilidades gerais melhoradas (◈).
   - **Origem** — cartão: ◻ nome, citação, Formação / Especialidade / Saber de Campo.
   - **Módulos de fragmento** — cinco níveis V → I com a Energia Máxima consumida enquanto o
     fragmento está com o agente (não é custo por uso); tabela com células vazias.
   - **Equipamento** — item com nome, custo, Dano/Porte/Peso e descrição curta existente. Item de
     **Uma ou Duas Mãos** sai com **dois valores**, um por empunhadura (rótulos UMA MÃO / DUAS
     MÃOS). Modificações com empilhamento ■□ e "Bloqueia".
   - **Guia — blocos próprios:** roteiro numerado; ficha de identidade em rótulo/valor; grade de
     atributos com modificador; tipo de habilidade de criatura (PASSIVA, DE GATILHO) no lugar do
     custo de Energia.
   - **Ficha completa** (ex.: A Estátua) — só quando os padrões fixos estiverem presentes:
     "Força 3 \[Médio +9\]", "Vida Máxima: …", ataques "Nome | Ação | Teste | Dano". Faltou um
     padrão → bloco genérico com aviso (nunca ficha pela metade).
   - **Nível de ameaça** — referência ao NA vira dado (`nivel`) para o leitor pintar a silhueta.
3. **Tabela de layout não reconhecida** → bloco genérico + aviso com a linha de origem.
4. **Contagem no fecho:** quantas ocorrências de cada caso foram reconhecidas em cada documento e a
   lista dos avisos que restaram (cada um justificado ou virado `PROBLEMS`).

## Regra de ouro

Nenhum valor é calculado, corrigido ou completado pelo normalizador: o que não está escrito no
`.md` não aparece. Divergência entre o exemplão e o `.md` → o `.md` vence.

## Critérios de aceite

- Testes por caso verdes; teste de cobertura de texto da `m10-01` continua verde.
- Todas as Classes, Origens, Módulos e itens de equipamento do Sistema reconhecidos (contagem
  conferida contra o `.md`).

## Fora de escopo

Renderização (`m10-07`); descrição longa e ícone de item (só quando a escrita vier para o site).
