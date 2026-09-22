# ui-37-iniciativa-mestre-layout.spec.md

> Spec avulsa, fora da fila de milestone. Leva para a tela real **"Iniciativa" — visão do mestre**
> o layout aprovado pelo autor na POC "POC Tela de Iniciativa" (artifact
> `https://claude.ai/artifact/F8t3V7BWmQ85NA4Byx4tHr`, v9), construída sobre os primitivos e tokens
> do sistema. Vale **somente** para o mestre com um encontro carregado; a visão do jogador/
> espectador não muda.

## Objetivo

Reorganizar a tela de condução do combate do mestre num palco de uma só vista: coluna de ações à
esquerda, trilha de turnos, palco central (condução do turno, ficha resumida de quem age e grade
de todos os combatentes) e coluna fixa de rolagens à direita — sem retirar nenhuma função que o
mestre já tem hoje (montar, rolar/pedir iniciativa, iniciar, avançar/voltar, encerrar, dano/cura,
editar, histórico de encontros). Nenhuma regra nova: `ordemRodada`, Cadência, permissão e
`revelado` continuam vindo prontos do backend/`shared/regras`.

## Análogo aprovado (registro do `design-fidelity`)

| Parte da tela | Análogo no código | O que se herda |
|---|---|---|
| Casca (coluna + conteúdo) | `detalhe-mestre.page` + `app-coluna-acoes` | coluna 56/200px encostada na topbar e na borda (`margin` negativo), categorias, tooltip, barra fixa no mobile, `min-height` |
| Cabeçalho | `.detalhe-mestre__cabecalho` | `app-botao-icone` de voltar, índice `//`, `h1` mono 20px, régua, `app-chip` de estado |
| Cartões da grade | `app-cartao-combatente` em `.grade--compacta` (m7-05, ui-16) | receita compacta 58px, etiquetas, Cadência, "Turno N de M", steppers, morrendo/agiu |
| Ficha resumida | `.ficha-mini`/`.ficha-resistencia` de `ficha-campanha-card` + `app-barra-recurso` | caixas de Reações e Resistências por tipo de dano, barras 6px, hachura na `--cor-ficha` |
| Rolagens | `historico-rolagens-sidebar` + `resultado-rolagem` compacto | cabeçalho (d20 · título · régua · contagem), item com faixa lateral na `--cor-ficha`, dados em silhueta |
| Condução | `.painel__bloco--vez` da tela atual + `app-botao`/`app-botao-icone` | moldura acesa (accent) quando alguém age; voltar/avançar; "Encerrar" `perigo` |
| Estado vazio | `app-estado-vazio` compacto | ficha resumida antes do combate |

## Decisões de layout (números do autor, POC v9)

- **Trilha** 262px (1920), nome do combatente (até 2 linhas), avatar 36px, iniciativa à direita.
- **Rolagens** `clamp(300px, 23.44vw, 450px)` — 450px em 1920, encolhe em telas menores.
- **Ficha resumida** 310px de largura, do topo da linha de combate até o rodapé do palco; foto
  **quadrada** cobrindo a largura da coluna; Resistências em **3 + 2** (5 caixas); Reações em
  grade de 2 colunas.
- **Grade** `repeat(auto-fill, minmax(260px, 1fr))`, cartão compacto sempre (não depende de
  `colunasGrade()`).
- Breakpoints: `bp.tablet` (1080px) — colunas empilham, a trilha vira faixa horizontal de chips
  56px sem nome, ficha resumida vira linha (foto 84px ao lado da identidade), Rolagens desce com
  altura fixa; `bp.mobile` (560px) — `app-coluna-acoes` vira a barra fixa inferior, cartão volta
  às métricas cheias, alvos de 44px.

## Entregáveis

1. **`painel-encontro.page`** ganha um ramo de mestre (`ehMestre() && encontro()`), sem mexer no
   ramo de jogador/espectador nem nos estados "carregando" e "sem encontro" (formulário "Abrir
   combate"), que mantêm o cabeçalho atual.
   - `app-coluna-acoes` (`id="iniciativa-mestre"`, rótulo "Ações da iniciativa"): categoria
     **Combate** — Selecionar combatentes, Adicionar avulso, Editar combatentes (alternável),
     Encerrar combate — e **Ferramentas** — Calculadora, Caderno. Itens de combate só aparecem com
     o encontro mutável; "Editar" só com combatentes.
   - Cabeçalho: voltar, `//`, "Iniciativa · {nome}", nome da campanha, `app-chip` de estado
     (Montagem / Em combate / Encerrado — `rotuloStatusEncontro`), régua e — como hoje — "Combate atual" (lendo um
     encerrado) e "N encerrados" (abre o painel do histórico).
   - Painéis do seletor de combatentes e do avulso continuam abrindo entre a condução e o corpo do
     palco.
2. **`ColunaAcoesItem`** ganha `[pressionado]` (opcional, `boolean | null`): item de alternância
   (Editar, Selecionar, Adicionar avulso) — `aria-pressed` + o mesmo destaque `--ativo`, sem o
   `aria-current="page"` que só cabe a item de rota. Compatível com todos os consumidores atuais.
3. **`app-trilha-turnos`** (`modules/encontro/componentes/`): contadores Rodada/Turno (ou
   "Situação"), lista da ordem com item ativo, "já agiu" (avatar apagado) e "Turno N de M" para
   Cadência > 1; `aria-current="step"` no ativo; `appTooltip` com o estado do turno; rola até o
   ativo (vertical no desktop, horizontal na faixa).
4. **`app-conducao-turno`**: barra da vez. Em combate: voltar · "Age agora" + nome + ações
   restantes · avançar (primário) · Encerrar. Em montagem: "Aguardando / Combate ainda não
   iniciado" + Pedir iniciativa, Rolar iniciativas, Iniciar combate (mesmas condições de
   `disabled` de hoje). Encerrado: só o estado, sem ações.
5. **`app-resumo-combatente`**: ficha resumida de quem age — foto quadrada (`appFocoImagem`, ou
   sigla sobre a hachura), origem, nome, "Abrir ficha", chips de Ameaça/Cadência, barras de Vida/
   Energia, Reações (só as defesas que existem) e Resistências (5 tipos; ocultas para avulso/NPC,
   que vêm com `resistencias: null`). Antes do combate: `app-estado-vazio` "Ninguém age ainda.".
6. **Coluna de Rolagens fixa**: `HistoricoRolagensSidebar` ganha `[fixo]` — renderiza o painel
   como coluna da página (sem gatilho, sem fundo, sem fechar, sem animação), reaproveitando itens/
   esqueleto/vazio/"carregar mais". O ramo de mestre usa `[fixo]="true"`; o feed flutuante segue
   idêntico para os demais usos.
7. **Extração de leitura** para `encontro-leitura.util.ts` (funções puras, testadas): turnos por
   rodada, linha de origem, defesas exibidas e sigla do combatente — usadas pelo cartão, pela
   trilha e pela ficha resumida, sem duplicar a regra. O cartão passa a consumir as funções e o
   comportamento observável dele **não muda**.
8. **Grade do mestre**: `grade--compacta` fixa + `auto-fill`; cartões, steppers, "Receber dano",
   edição e remoção idênticos.
9. Sem `style=""` inline, sem seletor de ID, sem hex/fonte/raio hardcoded; todo controle usa o
   primitivo de `shared/ui/` com a API completa (`app-botao`, `app-botao-icone`, `app-chip`,
   `app-barra-recurso`, `app-estado-vazio`, `app-coluna-acoes`, `app-segmentado` não é usado).
10. `docs/design/DESIGN.md`: registrar a composição da visão do mestre e o `[pressionado]`.

## Critérios de Aceite

- `npm run test --workspace=frontend` verde: specs novos de `trilha-turnos`, `conducao-turno`,
  `resumo-combatente`, do util e do `[fixo]` da sidebar; specs existentes de `painel-encontro`,
  `cartao-combatente` e `coluna-acoes` atualizados para o novo DOM do mestre (jogador intacto),
  sem enfraquecer nenhuma asserção de comportamento (permissões, `disabled`, confirmações,
  chamadas ao `EncontroService`).
- Lint sem erro novo e build de produção sem aviso novo.
- **Gate visual obrigatório** (`verify`, stack real, `1920×1080` e `360×800`): montagem
  (vazia, com combatentes sem iniciativa, completa), combate (início, meio, virada de rodada,
  Cadência > 1, morrendo, avulso, criatura), encerrado (histórico), modo Editar, seletor e avulso
  abertos, coluna retraída/expandida, estado persistido em `localStorage`. Comparar com a POC v9
  e com `detalhe-mestre`. Sem overflow horizontal; foco visível; alvos de 44px no mobile.
- Visão do jogador e do espectador sem diferença visual ou funcional (comparar antes/depois).

## Fora de Escopo

- Visão do jogador/espectador e prévia de jogador (`iniciativa-leitura`).
- Estados "carregando" e "sem encontro" do mestre (permanecem como hoje).
- Nova regra de iniciativa, Cadência, permissão ou revelação; qualquer mudança de backend/DTO.
- Barra de condução no rodapé fixo do mobile (a POC aprovou a condução no fluxo da página e a
  coluna de ações como barra inferior).

## Dependências

`ui-16` (cartão), `ui-17`/`ui-34` (coluna de ações e migração dos painéis flutuantes),
`ui-22` (resultado de rolagem compacto), `m7-05`/`m7-06`/`m7-08` (tela atual). Registro do
encaminhamento em `HISTORY.md` ao concluir.
