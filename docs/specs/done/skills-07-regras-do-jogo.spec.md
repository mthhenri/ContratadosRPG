# skills-07-regras-do-jogo.spec.md

> Task 7/9 do guarda-chuva `skills-agentes.spec.md`. Skill nova: `regras-do-jogo`.

## Objetivo

Criar a skill `regras-do-jogo`, que conduz qualquer mudança em fórmula, progressão ou regra de
domínio: achar a fonte da verdade no documento certo, localizar o ponto exato do motor puro em
`shared/src/regras/`, e não deixar consumidor derivado para trás.

## Motivação

É a classe de defeito mais densa do repositório. Dos problemas **abertos** hoje, três são
divergência entre o motor e `docs/core/`:

- `P-030` — Vida/Energia/Defesa/Esquiva/Bloqueio divergem entre a ficha e o painel do mestre.
  Causa: valor **stored** persistido no JSONB (`dados.derivados`/`dados.estado`) contra valor
  **efetivo** que a ficha soma só na leitura (amplificadores portados, Proteções equipadas).
  `FichaService.paraResumoPublico` e `encontro-combatente.mapper.ts` leem só o stored.
- `P-029` — bônus de Maestria de Vigor e Tanque alcançam resistência criada por modificação,
  porque o cálculo incide sobre o stat já fundido com modificações.
- `P-018` — guia de criação não respeita a mecânica de Civil: `dadosCivil`
  (`shared/src/regras/dados/progressao-civil.dados.ts`) só define Treinamento 0–5, mas o passo
  "Novo agente" roda a fórmula de Nível/Prestígio igual para Civil.

O padrão se repete: a regra existe no documento, o motor implementa uma parte, e um consumidor
derivado (resumo público, mapper do Encontro, um passo do guia) fica fora. `CONVENTIONS.md`
("Motor de Regras") e `MEMORY.md` §1 já dizem que **o documento vence o código** — falta o
caminho operacional.

## Entregáveis

1. **`regras-do-jogo/SKILL.md`** nas duas pastas, cobrindo:
   - **Fonte da verdade por assunto:** `docs/core/sistema-v4.1.0.md` para regra de jogador e
     `docs/core/guia_de_mestre-v4.0.0.md` para ameaça/criatura/NPC; em conflito com o código, o
     documento vence e o código muda — nunca o contrário sem decisão do autor.
   - **Mapa fórmula → arquivo**: tabela ligando assunto ao diretório de `shared/src/regras/`
     (`agente/`, `compras/`, `criatura/`, `dados/`, `descanso/`, `dt/`, `encontro/`,
     `identidade/`, `novo-agente/`, `patente/`, `rolagem/`), montada conferindo o conteúdo real
     de cada pasta.
   - **Restrições do motor:** funções puras + dados tipados, zero dependência, sem I/O e sem
     estado; nada de framework; permissão e persistência nunca entram; frontend e backend
     consomem o **mesmo** motor — fórmula nunca é reimplementada de um lado só.
   - **A armadilha stored vs efetivo** (`P-030`), como seção própria: o que é persistido no JSONB,
     o que é somado na leitura, e a obrigação de listar **todos** os consumidores antes de fechar
     — `FichaService.paraResumoPublico`, `encontro-combatente.mapper.ts`, a ficha, o Inventário,
     o catálogo "Adicionar itens", o Encontro. Um cálculo novo "por cima" precisa nascer em
     função pura compartilhada, não numa das telas.
   - **A armadilha do stat fundido** (`P-029`): bônus que incide sobre stat-base não pode ser
     aplicado ao valor já fundido com modificações.
   - **A armadilha da classe fora da tabela** (`P-018`): antes de aplicar uma progressão, conferir
     se a classe/categoria tem entrada na tabela de dados; Civil tem Treinamento 0–5 e nenhuma
     noção de Prestígio, e função de progressão devolve lista vazia fora da faixa **sem avisar**.
   - **Teste obrigatório:** toda fórmula com teste unitário validado contra o documento, citando
     a seção usada; `npm run test --workspace=shared` antes de qualquer outra coisa.
   - **Checklist de fecho:** documento citado (arquivo e seção), função pura no lugar certo,
     teste contra o documento, consumidores atualizados, nenhuma fórmula duplicada fora de
     `shared/src/regras/`.
2. **Ponteiros** para `docs/CONVENTIONS.md` ("Motor de Regras"), `MEMORY.md` §1/§2 e
   `SYSTEM.SPEC.md` — a skill executa, o documento define.
3. **`description` como gatilho**: fórmula, cálculo, regra do jogo, progressão, nível, patente,
   atributo, dano, resistência, energia, vida, maestria, habilidade, Civil/Experimento/classe —
   e disparando também em "o valor está errado na tela X", que é como o defeito costuma chegar.
4. **Corte de tamanho**: se passar de ~150 linhas, mover as três armadilhas para
   `regras-do-jogo/references/armadilhas.md` nas duas pastas.

## Critérios de Aceite

- Cada diretório citado no mapa existe em `shared/src/regras/` e o assunto atribuído a ele
  confere com o que há dentro (conferir arquivo a arquivo, não pelo nome da pasta).
- Cada arquivo/símbolo citado nas armadilhas existe hoje (`FichaService.paraResumoPublico`,
  `encontro-combatente.mapper.ts`, `shared/src/regras/dados/progressao-civil.dados.ts`) —
  conferir com `grep` e corrigir o caminho se tiver mudado.
- A skill não reescreve nenhuma fórmula do jogo. Fórmula só existe em `docs/core/` e no motor;
  copiá-la para a skill criaria uma terceira versão para divergir.
- **Validação por uso:** pegar um cálculo já implementado e correto (por exemplo `calcularVida`),
  percorrer a skill do zero e confirmar que ela leva ao documento certo, ao arquivo certo e à
  lista de consumidores certa. Depois repetir o percurso sobre `P-030` (sem corrigir) e confirmar
  que a skill teria apontado os dois consumidores esquecidos. Registrar os dois exercícios no
  fecho.
- `diff -r .claude/skills .agents/skills` vazio.
- Fecho completo conforme `AGENTS.md`.

## Fora de Escopo

- **Corrigir `P-018`, `P-029` ou `P-030`.** Cada um tem spec própria ou dependência de decisão do
  autor: `ficha-resumo-stats-efetivos.spec.md`, `resistencia-protecao-base-bonus.spec.md` e
  `civil-guia-criacao.spec.md` (esta depende de 4 decisões do autor). Continuam abertos depois
  desta task.
- Alterar qualquer arquivo de `shared/src/regras/` ou de `docs/core/`.
- Auditar o motor inteiro em busca de outras divergências. Se o trabalho de mapeamento revelar
  uma nova, registrar em `PROBLEMS.md` e seguir.
- Regra de NPC (`m4-06`), ainda em backlog — a skill cobre o mapa do que existe hoje.

## Dependências

- `skills-01` (contrato). Independente das demais.

## Riscos e Mitigação

- **Mapa nascer errado.** Uma tabela assunto → diretório escrita de memória é pior que nenhuma:
  manda o agente ao arquivo errado com confiança. Mitigado pelo critério de aceite que exige
  conferência arquivo a arquivo.
- **Skill virar tratado de regras do jogo.** Mitigado pelo critério que proíbe reproduzir
  fórmula: o papel é levar ao documento, não substituí-lo.
