# m3-10-ficha-edicao-inline-maestria-stats-editaveis.spec.md

> Task 10 do milestone `m3-ficha-jogador.spec.md`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema
> "Terminal de Contenção" (`docs/design/tema/`). Nada de hex/fonte/raio solto (proibição #29).
> O protótipo `docs/design/examples/ficha-de-jogador.html` é o alvo de fidelidade desktop.

> **Revisão constitucional.** Esta task **revisa deliberadamente** o princípio "nenhum derivado é
> persistido" do `m3-01` para **Vida máxima e Energia máxima**, e o critério de coerência
> "HP ≤ máximo" do `m3-03`/§11. Onde este spec conflitar com `m3-01`/`m3-03` já entregues, **este
> vence** e as fontes constitucionais (`SYSTEM.SPEC §10.4/§11/§14`, `SCHEMA.md`, JSDoc do contrato)
> são atualizadas junto. O **documento de jogo continua vencendo** o código (proibição #27): a
> Maestria segue `docs/core/sistema-v4.1.0.md` ("⬥ Maestrias").

## Objetivo

Tornar a ficha de jogador **editável no próprio lugar** e dar ao usuário **liberdade total** sobre
os valores, sem que o motor de regras sobrescreva as edições. O motor de regras deixa de arbitrar
faixas do estado salvo: passa a ser um **gerador de valores iniciais na criação** e uma **ajuda de
progressão**, não uma trava. Adiciona a **Maestria** de atributo ao contrato. Motivação do autor:
poder refletir eventos de campanha na ficha (ex.: o mestre reduzir a Vida máxima de um agente) — algo
impossível enquanto tudo é sempre recalculado.

## Modelo — de "derivado sempre" para "snapshot na criação, depois editável"

1. **Vida máxima e Energia máxima passam a ser persistidas** em `FichaEstadoDto`
   (`vidaMaxima`, `energiaMaxima`). São **calculadas uma vez na criação** por `shared/regras/agente`
   (`calcularVida`/`calcularEnergia`) e, a partir daí, **editáveis** e nunca mais recalculadas
   automaticamente a partir de classe/nível/atributos.
2. **Retrocompatibilidade:** os campos são **opcionais no tipo**; quando ausentes (fichas criadas
   antes desta task), o front/back caem no **derivado** (`calcularVida`/`calcularEnergia`) como
   fallback. Uma ficha salva por esta task sempre grava os dois.
3. **Vida/Energia atual podem exceder a máxima.** Cai a trava "atual ≤ máximo" (no front e no back).
   A Energia continua podendo negativar. O único piso da UI de ajuste rápido é **0 para a Vida**; a
   Energia não tem piso rígido de UI (o documento permite negativar).
4. **Subir de nível soma progressão, não recalcula.** Ao alterar o `nivel` de N para M, a Vida/Energia
   máxima **stored** recebe o **delta** `calcularVida({…, nivel:M}) − calcularVida({…, nivel:N})`
   (idem Energia), preservando qualquer ajuste manual anterior. Não existe função de delta pronta em
   `shared/regras` — o delta é essa diferença de dois cálculos (atributos constantes). Baixar o nível
   subtrai simetricamente. (Implementado onde o `nivel` é editado — ver Entregável 4.)
5. **Todos os demais derivados também são persistidos e editáveis** — "**nada é exclusivamente
   calculado**" (pedido do autor). Entra o bloco **`FichaJogadorDadosDto.derivados`** (Defesa,
   Esquiva, Bloqueio, Deslocamento, Proficiência, Dano C.a.C., Dano Furtivo, Percepção, Inventário
   máximo, Hab./Turno, DT de atributo…): **snapshot na criação** (`shared/regras`) e depois
   **editáveis** um a um, exatamente como Vida/Energia máximas. Cada um tem seu **lápis** na coluna
   "Informações Extras" (Entregável 9). Campos ausentes (fichas antigas) caem no cálculo como
   fallback. A **Patente** segue rótulo derivado do Prestígio; um override editado mora em `derivados`.

## Maestria (novo campo do contrato)

6. **`FichaJogadorDadosDto.maestria`**: `keyof FichaAtributosDto | null` — o atributo que carrega a
   Maestria, ou `null`. Persistido no `dados`. Segue `sistema-v4.1.0.md`:
   - **Única na ficha** (um atributo por vez);
   - só marcável em atributo com **6+ pontos**;
   - efeito de jogo (bônus permanente por atributo) é **conteúdo de regra do documento** — a ficha só
     guarda **qual** atributo tem a Maestria; o texto do bônus é exibição derivada da tabela do
     documento, não persistido.
7. **`shared/regras`** ganha um validador puro de Maestria (atributo válido, valor ≥ 6, unicidade
   implícita pelo campo único) reusável por front (habilitar/desabilitar o toggle) e back (rejeitar
   `maestria` inválida).

## Edição no próprio lugar — **granular, por pedaço** (retira o formulário separado)

8. **Sem botão global de "Editar a ficha inteira".** O `FichaFormulario` (`m3-06`) é **aposentado**;
   a tela da ficha (`paginas/visualizar` + `FichaVisualizacao`) passa a editar **pedaço a pedaço**,
   cada trecho com seu próprio gatilho (um **lápis** discreto ao lado do rótulo/valor). Clicar o
   lápis abre **só aquele trecho** em edição, com confirmar/cancelar locais; o resto da ficha continua
   em leitura. Nada de trocar a tela toda por um formulão. (Vida/Energia já são editáveis assim —
   passos − / + e clique-para-digitar; esta task estende o padrão aos demais campos.)
9. **Trechos editáveis (cada um com seu lápis):**
   - **Nível** — lápis ao lado; edita só o nível (subir/baixar **soma/subtrai** o delta de
     Vida/Energia máxima, Entregável 4).
   - **Prestígio** — lápis; edita só o prestígio (a Patente re-deriva).
   - **Classe / Arquétipo** (ou Classe / subclasse Experimento) — lápis; troca só isso, num
     mini-editor com os `<select>` de classe e de arquétipo lado a lado.
   - **Atributos** — **um** lápis no cabeçalho do card abre **todos** os dez ao mesmo tempo (cada box
     vira um campo editável); confirmar/cancelar valem para o grupo inteiro. A **Maestria** é marcada
     aqui (ver Entregável 6): um alvo por atributo, habilitado só com 6+.
   - **Codinome** e **Anotações** — lápis/clique no próprio texto.
   - **Vida/Energia atual e máxima** — já in loco (passos e digitação); a **máxima** também vira
     clique-para-digitar.
10. **Liberdade total (override do mestre/jogador):** os mini-editores **não travam** por limites de
    classe/nível — digita-se qualquer valor. As faixas viram **sugestão**, não trava. O backend
    **não rejeita** por faixa (Entregável 14); só valida **forma** (camada 1) e a regra de Maestria.
11. **Cada confirmação persiste aquele trecho** via `alterarFicha` (documento inteiro, com o trecho
    alterado) — otimista na tela, como o ajuste rápido de Vida/Energia. Sem um "Salvar" global.
12. **Acesso de visualização vira menu → dialog.** O painel de concessão (m3-04) **sai** do corpo da
    tela (ocupa espaço demais): um botão/menu discreto no cabeçalho abre um item "Acesso de
    visualização" que abre uma **dialog** (PrimeNG) para conceder/revogar acesso a membros da
    campanha. Mesma lógica/serviço de m3-04; só muda a embalagem (menu + dialog).
13. **Criação** deixa de abrir formulário denso: "Nova ficha" cria uma ficha **padrão** (classe base
    default, atributos base, nível inicial, Vida/Energia máximas **snapshot** e atuais = máximas) e
    **abre a ficha** — já editável pedaço a pedaço. Cancelar volta à lista.

## Backend

14. **`ficha.service.ts` — afrouxar `validarDadosContraRegras`:** remover as travas de faixa do estado
    salvo (Vida/Energia atual ≤ máximo; atributo/nível dentro do limite de classe). Manter a
    **validação estrutural** (camada 1) e adicionar a **validação de Maestria** (atributo válido e
    ≥ 6; senão `BusinessException`). **`criarFicha`** grava o **snapshot** de `vidaMaxima`/
    `energiaMaxima` no `dados` no ato da criação (via `shared/regras`).
15. Permissões e autoria inalteradas (§14). Evento `ficha:alterada` inalterado (broadcast-only, m3-05).

## Critérios de Aceite

- Dono/mestre edita cada trecho da ficha **em contexto** (lápis por campo; atributos em grupo), **sem**
  botão global de editar e **sem** página/rota separada; o `FichaFormulario` não é mais usado.
- O **acesso de visualização** não ocupa mais o corpo da tela — vira **menu → dialog**.
- Vida/Energia **máxima** são editáveis e **persistem**; **atual pode passar da máxima**; recarregar
  mantém os valores íntegros (backend não rejeita por faixa).
- Subir/baixar o nível **soma/subtrai** a progressão de Vida/Energia à máxima stored, **preservando**
  ajuste manual anterior (não recalcula do zero).
- **Maestria**: marcável só em atributo com 6+, única na ficha, persistida; o backend rejeita
  `maestria` inválida.
- Ficha criada abre **já em edição no próprio lugar**, com Vida/Energia máximas = snapshot e atuais =
  máximas.
- Fichas antigas (sem `vidaMaxima`/`energiaMaxima`) **abrem sem erro** (fallback derivado).
- Padrões do front: standalone, Signals, Reactive Forms (sem `ngModel`), `.scss`/BEM, tokens
  (proibições #16/#17/#18/#29). `shared/regras` continua zero-dep e fonte única (proibição #26).

## Fora de Escopo

- **Abas da ficha** (Visão Geral / Combate / Inventário / Habilidades / Sanidade / Rolagens) — o
  scaffold e a navegação são a task **`m3-11`**. Aqui entra só a aba "Visão Geral" (o que já existe:
  identidade, vitalidade, atributos, informações extras) editável.
- **Editores das sub-coleções** — sequelas/traumas/lesões (`m3-12`), habilidades (`m3-13`),
  inventário (`m3-14`), presets de rolagem (`m3-15`). Aqui só os campos escalares + `derivados`.
- Tempo real / reconciliação de `ficha:alterada` com edição em andamento (`m3-08`, ver impacto lá).
- Refinamento mobile dedicado (`m3-09`).
- Efeito mecânico da Maestria em rolagens/testes (motor de jogo em play) — só a marcação/persistência
  aqui.

## Impacto em specs posteriores (propagação)

- **`m3-ficha-jogador.spec.md` (umbrella):** o critério "HP ≤ máximo calculado" e o modelo "stats
  derivados ao vivo" deixam de valer para Vida/Energia máximas — anotar a revisão.
- **`m3-08-frontend-tempo-real-mestre`:** o alvo do live-update é agora a **tela editável** (não mais
  read-only); `ficha:alterada` recebido precisa reconciliar com **edição local em andamento** — nova
  consideração a registrar.
- **`m3-09-refinamento-mobile-ficha`:** o split "criação/edição/visualização" some (tela única
  editável no lugar); a superfície a refinar muda — anotar.
- **`m4-ficha-criatura-npc`:** decidir se a criatura adota a mesma convenção "snapshot na criação +
  máximos editáveis" (provável, por consistência; a criatura já tende a stats stored no `SCHEMA.md`).
  Maestria é mecânica de atributo de **jogador** — não se aplica a criaturas.
- **Constituição/doc:** `SYSTEM.SPEC §10.4/§11/§14`, `SCHEMA.md` e o JSDoc de `ficha.dtos.ts` são
  atualizados nesta task (revisão do "nada derivado persistido" para Vida/Energia máximas + Maestria).

## Dependências

- `m3-01` (contrato `dados` — revisado aqui), `m3-03` (backend CRUD/validação — afrouxada aqui),
  `m3-06` (`FichaFormulario`, aposentado), `m3-07` (`FichaVisualizacao`/tela única — base do editor).
- M1 (`shared/regras/agente`: `calcularVida`/`calcularEnergia`/`obterLimitesClasse`) e M2
  (sessão/guard/interceptor).
