# Armadilhas de Campo — Regras do Jogo

Leia esta referência quando o cálculo mistura snapshot persistido, equipamento, modificação ou
progressão. A regra em si continua nos documentos de `docs/core/` e no motor compartilhado.

## Stored vs. efetivo — P-030

`dados.derivados` e `dados.estado` guardam snapshots editáveis de criação/edição. Bônus transitórios
de amplificadores portados e de Proteções equipadas são compostos na leitura e não voltam para o
JSONB: persistir esse delta transformaria um efeito transitório em override manual.

Ao alterar esse tipo de cálculo, encontre ou crie uma composição pura única em
`shared/src/regras/agente/` e percorra, no mínimo:

- a ficha que mostra o estado efetivo;
- Inventário e catálogo “Adicionar itens”, que alteram a origem dos bônus;
- `FichaService.paraResumoPublico`, que alimenta cartões/resumos;
- `backend/src/modules/encontro/encontro-combatente.mapper.ts` e os cartões do Encontro.

`P-030` é o contraexemplo: uma leitura limitada ao valor stored fez painel e Iniciativa divergirem
da ficha. Não suponha que corrigir um consumidor corrige os demais; busque os usos do símbolo e
dos campos de entrada. Veja `docs/context/PROBLEMS.md` para o estado atual do problema.

## Stat fundido — P-029

Uma modificação pode acrescentar resistência/tipo ao valor final de uma Proteção. Bônus cuja regra
incide sobre a Proteção-base — como Maestria de Vigor e Tanque — precisam receber também o recorte
da resistência-base; aplicá-los ao stat já fundido beneficia tipos criados pela modificação.

Comece em `shared/src/regras/agente/resistencia.ts`, preserve entradas distintas para base e final
e confira os mesmos resultados na ficha, no Inventário, no catálogo “Adicionar itens” e no
Encontro. O problema e a spec de correção continuam registrados em `PROBLEMS.md` `P-029`.

## Classe fora da tabela — P-018

Antes de usar uma progressão, valide se a classe/categoria tem a faixa correspondente na tabela de
dados. `shared/src/regras/dados/progressao-civil.dados.ts` define somente Treinamento Civil 0–5;
Civil não usa Prestígio. Funções de progressão podem devolver lista vazia fora da faixa sem sinalizar
erro, então um número herdado de outro fluxo pode parecer válido e eliminar benefícios em silêncio.

Ao tocar no guia ou progressão, trate Civil como ramo próprio e confira o contrato de entrada, a
tabela tipada, os rótulos de UI e o cálculo consumidor. O escopo da correção fica em
`docs/specs/backlog/civil-guia-criacao.spec.md`; esta referência só evita repetir o diagnóstico.
