# m4-21-ficha-npc-revisao-visual-usabilidade.spec.md

> Task solta do milestone `m4-ficha-criatura-npc.spec.md`, pedida pelo autor em 2026-10-07 depois
> da `m4-20`: revisão visual e de usabilidade da **ficha pronta** de NPC, aproximando-a da ficha de
> Jogador. Decisões do autor tomadas na abertura (perguntas respondidas na sessão): inventário no
> layout do Jogador, Competência como toggle no ladrilho, habilidades "Da biblioteca" +
> "Personalizada", verificação ao vivo autorizada.

## Objetivo

Reorganizar a ficha de NPC para seguir os padrões da ficha de Jogador: Patente Equivalente na
Identidade, cor e retrato no próprio avatar, Competências marcadas nos ladrilhos de atributo,
equipamento no layout do inventário do Jogador, habilidades fáceis de adicionar e abas na ordem
Conduta · Equipamento · Habilidades · Sanidade. Nenhuma fórmula muda.

## Entregáveis

### Identidade (`npc-identidade`)

1. **Patente Equivalente na Identidade.** Novo ladrilho `app-stat` fino "Patente" ao lado de
   Categoria e Nível (linha de três). O mestre edita no lugar com `app-valor-editavel` + `<select>`
   (mesmo padrão de Categoria): opções = `listarPatentesEquivalentes({ categoria })` + "Sem patente".
   Persiste só `dados.patenteEquivalente` como valor avulso (`confirmarAvulso("patenteEquivalente")`).
   Civil mostra "—" sem edição e tooltip "Civil não tem Patente Equivalente". Nunca escolhida
   automaticamente.
2. **Troca de Categoria limpa patente fora da faixa.** Ao confirmar uma Categoria cuja faixa não
   contém a patente salva, o mesmo PUT grava a Categoria nova sem `patenteEquivalente` (o backend já
   rejeita patente fora da faixa). Patente dentro da faixa é preservada. Se a Categoria nova só
   invalida atributos/Competências, abre o bloco Atributos com ela no rascunho; se invalida o que o
   bloco não corrige (habilidades, inventário), a Identidade lista o motivo e nada é salvo.
3. **Sem faixa de rodapé.** Sai a linha inferior (chips Categoria/Nível duplicados + "Cor da ficha").
4. **Cor pelo retrato**, como o Jogador (`ficha-ident__avatar`): borda de 2px e listras tingidas com
   `--cor-ficha`; para o mestre, `<input type="color">` invisível cobre o retrato inteiro (clicar no
   retrato abre o seletor), tooltip "Cor de identidade da ficha". Leitor vê só a cor.
5. **Selos do retrato visíveis.** Mantém o fundo translúcido aprovado pelo autor, mas no tamanho e na
   posição do Jogador: trocar retrato 28px no canto inferior direito (−4px), enquadrar/remover 24px
   nos cantos superiores (−4px), com borda `--border-strong`. Alvo de toque ≥ 44px no mobile.

### Atributos (`npc-atributos` + primitivo `app-atributo-ficha`)

6. **Ampliar `app-atributo-ficha`** (aprovado pelo autor) com Competência opcional:
   `mostrarCompetencia` (padrão `false`), `competencia`, `competenciaHabilitada`, `dicaCompetencia`,
   `rotuloCompetencia` (ex. `+2D6`) e `competenciaAlternada`. Edição: botão com ícone `dado-mais` no
   lugar da ★ de Maestria, ativo/desativado no mesmo estilo dela. Leitura e edição: ladrilho com
   Competência ganha borda `--accent` com brilho leve (`--accent` misturado, sem hex) e, na leitura,
   um selo com o dado da Categoria. Jogador e Criatura não mudam (padrão desligado).
7. **Seletor de Competências sai da lista.** Some a seção `npc-competencias` abaixo dos ladrilhos;
   Competência é ligada no próprio ladrilho, no modo de edição do bloco (rascunho com
   Salvar/Cancelar). Trava: atributo com valor 0 não pode ser escolhido e o limite da Categoria não
   pode ser ultrapassado (mesmas regras de `npc-competencias`, sem regra nova no frontend).
8. **Categoria não é editável no bloco Atributos.** Saem os botões de Categoria do rascunho; a
   Categoria só muda na Identidade. Dado e quantidade de Competências vêm da Categoria salva.
9. **Faixa de resumo** acima dos grupos, no lugar do resumo de Proficiência/Maestria do Jogador:
   fórmula da DT, "Competências X/Y" e "Modificador +NdM" (Civil: "Nenhuma" e "—").

### Detalhes (`npc-visualizacao`)

10. **Ordem das abas:** Conduta · Equipamento · Habilidades · Sanidade; Conduta abre por padrão.
11. **Equipamento no layout do inventário do Jogador** (`ficha-inventario`): botão primário
    "+ Adicionar itens" que abre o catálogo (busca, categorias e grade de cartões no mesmo desenho
    do Jogador); itens em linhas com nome (×quantidade), categoria, "Modificar ▾" com contagem
    quando houver patente, "Equipado/Na mochila" em Proteções, slots e ✕ com confirmação no lugar;
    linha de stat com "Rolar dano" (e Luta/Pontaria do teste M4-19). Patente sai desta aba; sem
    patente, o painel de modificação indica que ela se define na Identidade. Mantém as regras da
    M4-20 (sem orçamento, peso, amplificadores ou fragmentos; Civil sem Proteções/Explosivos) e o
    mecanismo de bloco: "+ Adicionar itens" entra no modo de edição; editar/remover por item só
    aparece nele (regra de UX do autor); Salvar/Cancelar no cabeçalho.
12. **Habilidades fáceis de adicionar.** Cabeçalho com dois `app-botao` sempre visíveis ao mestre:
    "＋ Da biblioteca" e "＋ Personalizada". "Da biblioteca" abre um `app-modal` com a Biblioteca de
    Referência do Guia filtrada pela Categoria (filtro para ver as outras), cartão por habilidade com
    tipo, custo, restrição e "Adicionar"; adicionar entra no rascunho do bloco (abre o modo de
    edição se preciso), permitindo várias de uma vez e um único Salvar — o volume mínimo/máximo da
    Categoria é validado no conjunto, então persistir uma a uma falharia abaixo do mínimo.
    "Personalizada" abre o formulário em branco já em foco, no mesmo rascunho. Editar/remover
    itens existentes continua atrás do lápis (modo de edição); Cancelar desfaz tudo.
13. **Biblioteca como dado em `shared/regras/npc`**: tabela tipada exposta por
    `listarBibliotecaHabilidadesNpc` (Categoria,
    nome neutro, nome narrativo de exemplo, tipo, custo, restrição, descrição), transcrita do Guia
    v4.2.0 ("Biblioteca de Referência": 4 Operativo, 4 Veterano, 6 Elite, 8 Lendário), com teste
    contra o documento. Adicionar da biblioteca preenche o nome narrativo com o exemplo (editável).

### Documentação

14. `docs/design/FICHA-NPC.md` atualizado (abas, Patente na Identidade, Competência no ladrilho,
    equipamento e habilidades); `DESIGN.md` registra a nova API do `app-atributo-ficha`.

## Critérios de Aceite

- `npm run test --workspaces --if-present`, `npm run lint` e `npm run build` (shared, frontend)
  passam; testes novos/ajustados para: biblioteca × Guia, primitivo com/sem Competência, patente no
  valor avulso e limpeza na troca de Categoria, ordem/padrão das abas, adicionar da biblioteca e
  personalizada, equipamento sem patente.
- Gate visual (`verify`) com análogo **ficha de Jogador** (`ficha-visualizacao` + `ficha-inventario`
  + `ficha-habilidades`) em `1920×1080` e `360×800` (e `960×1080`): leitura e edição de Identidade
  (patente, cor, selos), Atributos (Competência ligada/desligada, trava), Equipamento (catálogo
  aberto, item com modificação, proteção equipada, sem patente), Habilidades (modal da biblioteca,
  personalizada), Civil e leitor sem controles. Sem overflow, foco visível, alvos ≥ 44px.
- Jogador e Criatura sem diferença visual nos ladrilhos de atributo.

## Fora de Escopo

- Assistente de criação de NPC (Patente continua na etapa Equipamento inicial; Competências na
  etapa Atributos) — mudar o guia é outra task, se o autor quiser.
- Alterar `ficha-inventario`/`ficha-habilidades` do Jogador ou extrair primitivo de inventário.
- Qualquer fórmula, contrato JSONB, backend ou migration (a patente já é `dados.patenteEquivalente`).
- Amplificadores, fragmentos, orçamento, peso máximo, item custom no NPC.

## Dependências

- `m4-19` e `m4-20` em `done/`. Fontes: `docs/core/guia_de_mestre-v4.2.0.md` (Guia de Criação de
  NPCs), `docs/design/FICHA-NPC.md`, `docs/design/DESIGN.md`.

## Riscos e Mitigação

- **Primitivo compartilhado:** a ampliação do `app-atributo-ficha` é opcional e desligada por
  padrão; os testes existentes do Jogador continuam passando e a verificação inclui o Jogador.
- **Validação do volume de habilidades:** adicionar da biblioteca pode violar o volume da Categoria;
  o erro do backend/motor aparece no modal, sem limite duplicado na UI.
