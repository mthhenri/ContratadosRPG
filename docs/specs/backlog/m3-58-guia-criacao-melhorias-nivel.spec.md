# m3-58-guia-criacao-melhorias-nivel.spec.md

> Task 55 do milestone `m3-ficha-jogador.spec.md`. **Trio do guia de criação (`m3-57`…`m3-59`)** —
> acrescenta ao guia da `m3-57` o passo que gasta as **melhorias de nível**.

> **Antes de codar:** reler `docs/core/sistema-v4.1.0.md` — "Níveis e Melhorias de Agente" (a
> tabela de bônus por nível), "Habilidades" e "Jogando como um Civil". **O documento vence**
> (proibição #27).

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema (proibição #29).

## Objetivo

Um agente que entra numa campanha em andamento raramente começa no Nível 0 — e cada nível
concede **habilidades e fortificações que o jogador escolhe**. Hoje nada disso é oferecido na
criação: a ficha nasce só com a Habilidade Inicial do arquétipo/subclasse e o jogador precisa
descobrir sozinho, na tabela do documento, quantas habilidades ainda lhe cabem. Este passo gasta
esse orçamento dentro do guia.

## Ponto de partida

`calcularProgressaoAcumulada` (`shared/src/regras/agente/progressao.ts`) já devolve a contagem
exata do Nível 1 até o nível informado: `atributos`, `habilidadesGerais`, `habilidadesClasse`,
`habilidadesClasseOuArquetipo`, `habilidadesOutraClasse`, `fortificacoes` e `habilidadesCivis`.
A `m3-57` já consome o campo `atributos` (orçamento de pontos); os demais continuam **sem
consumidor**. O seletor de habilidades do catálogo já existe (`componentes/ficha-habilidade-seletor`,
`m3-13`).

## Entregáveis

1. **Passo 06 // MELHORIAS** no guia (entre Identidade e Recursos), **exibido apenas quando o
   Nível/Treinamentos escolhido no passo 03 é maior que 0** — trilha e numeração dos passos se
   ajustam.
2. **Um contador por tipo de vaga**, alimentado por `calcularProgressaoAcumulada`, cada um com o
   seu seletor filtrado ao escopo certo do catálogo:
   - Habilidades **Gerais**;
   - Habilidades de **Classe**;
   - Habilidades de **Classe ou Arquétipo** (o jogador escolhe de qual lado gastar);
   - Habilidades de **outra classe / outro arquétipo da sua classe** (níveis 5/10/15/20);
   - **Fortificações de Personalidade** (níveis 7/14) — entrada de texto que vira habilidade de
     categoria `PERSONALIDADE`, como já modelado no contrato (`m3-01`/`m3-23`);
   - Habilidades **Civis**, quando a classe é Civil.
   Vaga preenchida é marcada; a Habilidade Inicial concedida no passo 02 aparece como já obtida e
   **não** consome vaga.
3. **Trava dura com "modo livre"**, igual à do orçamento de atributos da `m3-57`: não avança com
   vaga sobrando, não deixa escolher a mesma habilidade duas vezes, e o "modo livre" (sempre
   disponível ao mestre) libera. Sem regra nova no backend.
4. **Resumo dos ganhos automáticos** do nível — os que **não** são escolha, só informação: dano
   furtivo acumulado, habilidades por turno, Proficiência e Defesa por nível. Lidos dos derivados
   já calculados (`calcularDerivados`), sem fórmula nova no frontend (proibição #26).
5. **Mobile**: contadores e seletores em coluna única, listas do catálogo com rolagem própria e
   alvos de toque ≥44px; o passo pode ser o mais longo do guia e não pode empurrar o rodapé fixo.

## Critérios de Aceite

- Criar um agente de Nível 5 pelo guia obriga a escolher exatamente as vagas que a tabela do
  documento concede até o Nível 5 — e a ficha criada chega ao Postgres com todas elas em
  `dados.habilidades`, com a categoria correta.
- Nível 0 não vê o passo.
- Um Civil vê vagas de Habilidade Civil e não vê vagas de arquétipo.
- Fortificação de Personalidade criada no guia aparece na aba Habilidades da ficha como habilidade
  de Personalidade.
- Não é possível concluir com vaga sobrando (salvo "modo livre"), nem escolher a mesma habilidade
  duas vezes.

## Fora de Escopo

- **Subir de nível numa ficha já criada** (usar o mesmo passo como "assistente de level up" fora do
  guia). É o caminho natural depois desta task, mas exige decidir onde ele mora na ficha e como
  interage com a edição livre da `m3-10` — merece spec própria.
- Trocar Fortificação por habilidade de classe/arquétipo (o documento permite; é escolha de mesa
  feita com o mestre, não fluxo de criação).
- Validação server-side da contagem de habilidades — o backend segue sem regra nova.

## Dependências

- `m3-57` (guia, shell e estado), `m3-13` (seletor de habilidades do catálogo), `m3-01`/`m3-23`
  (contrato de habilidades e Personalidade), `m1-02` (tabela de progressão em `shared/regras`).
