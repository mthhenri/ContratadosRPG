# M4-21 — revisão visual e de usabilidade da ficha de NPC

Data: 2026-10-07. Spec: [M4-21](../m4-21-ficha-npc-revisao-visual-usabilidade.spec.md).
Pedido do autor após a M4-20; decisões tomadas na abertura: inventário no layout do Jogador,
Competência como toggle no ladrilho (amplia `app-atributo-ficha`, aprovado), habilidades
"Da biblioteca" + "Personalizada", verificação ao vivo autorizada.

## Análogo e decisões

Análogo: ficha de Jogador — `ficha-visualizacao` (retrato/cor, faixa de resumo dos atributos,
★ de Maestria no ladrilho), `ficha-inventario` (ações, catálogo, linha de item, stat e "Rolar
dano") e `ficha-habilidades` ("＋ Do sistema"/"＋ Personalizada"). Capturas do análogo da M4-20
(`m4-20-capturas/analogo-*`) serviram de referência lado a lado.

- **Patente na Identidade:** ladrilho `app-stat` fino + `app-valor-editavel` com `<select>`
  (faixa da Categoria + "Sem patente"), valor avulso. Civil mostra "—". Ajuste pedido pelo autor
  após a entrega: Patente em linha inteira abaixo de Categoria | Nível (duas colunas iguais).
- **Categoria só na Identidade.** Se a nova Categoria deixa a ficha válida, salva na hora; se
  invalida só atributos/Competências/ajustes, abre o bloco Atributos com ela no rascunho (um
  Salvar); se invalida habilidades ou inventário, a Identidade lista o motivo e nada é salvo. A
  patente fora da faixa nova sai junto e Civil zera Competências — consequências únicas, sem
  escolha pelo mestre (`aplicarCategoriaNpc`).
- **Competência no ladrilho:** botão `dado-mais` no lugar da ★ (só no modo de edição do bloco),
  borda `--accent` com brilho e selo do dado na leitura; trava atributo 0 e o limite da Categoria.
- **Habilidades:** Biblioteca de Referência do Guia v4.2.0 transcrita em
  `shared/regras/npc/biblioteca.ts` (22 modelos) e testada lendo o próprio Guia. Adicionar entra
  no rascunho do bloco: o volume da Categoria é validado no conjunto, e um PUT por item falharia
  abaixo do mínimo (ex.: Elite precisa de 4–6).
- **Equipamento:** layout do inventário do Jogador com primitivos (`app-botao` com tamanho/
  variante/estilo, `app-botao-icone`, `app-step-input`, `app-chip`, `app-campo`); bloco com
  Salvar/Cancelar mantido (editar/remover sob demanda). Equipar fora do bloco salva na hora, como
  o toggle do Jogador.

## Comandos e resultados

| Gate | Resultado |
|---|---|
| `npm run test --workspace=shared` | 69 arquivos, **1.157** testes passaram |
| `npm run test --workspace=backend` | 53 arquivos, **994** passaram, 1 skipped |
| `npm run test --workspace=frontend` | 215 arquivos, **3.053** testes passaram (+ 20 do normalizador de regras) |
| `npm run lint` | 0 erros (avisos preexistentes de estilo) |
| `npm run build --workspace=shared` / `--workspace=frontend` | passaram; aviso de orçamento do bundle inicial (557 kB) preexistente |
| Prettier HTML/SCSS do recorte, `git diff --check` | passaram |

Durante os gates: lint acusou variável de desestruturação não usada em `removerPatenteNpc`;
corrigida e testes focados repetidos.

## Revisão independente (subagente `revisor`, somente leitura)

Recebeu problema, spec e local do diff, sem a conclusão do agente principal. Achados e destino:

1. **Troca de Categoria podia abrir um bloco Atributos impossível de salvar** (violação de
   habilidades/inventário que o bloco não corrige; o teste original validava o beco) —
   **corrigido**: só abre o bloco se toda violação for de atributo/Competência/ajuste; senão a
   Identidade explica. Testes trocados por um caso salvável e um caso recusado.
2. **`blur` do `<select>` removido podia descartar o rascunho aberto pela troca** — **corrigido**
   (`cancelarAvulso` sai cedo sem valor avulso aberto) e **confirmado ao vivo**: troca real por
   `selectOption` abriu o bloco, que permaneceu aberto e salvou `VETERANO` no servidor.
3. **Patente que estoura item modificado só mostrava erro genérico** — **corrigido**: violações
   `inventário:`/`patente equivalente:` aparecem junto do ladrilho.
4. **Bloco Equipamento ainda regravava a Patente** (apagaria escolha concorrente) — **corrigido**,
   com teste de absorção remota durante a edição.
5. Divergências menores da spec (texto do Civil, nome da tabela, erros de volume no modal, teste
   de "Personalizada", asserção vazia) — **corrigidas** no código/testes ou no texto da spec.
6. Fórmula da DT e contagem de empilhamentos repetidas no frontend — **corrigidas**: vêm de
   `shared/regras/npc` (`ROTULO_FORMULA_DT_NPC`, `contarEmpilhamentosModificacoes`).

Conferido sem problema pelo revisor: Biblioteca × Guia (22 modelos), primitivo desligado por
padrão (Jogador inalterado; Criatura não o consome), merge de três vias com a remoção da chave.

## Gate visual — app real (Postgres, NestJS 3100, Angular 4300)

Playwright, mestre + leitor com concessão, NPC Elite completo (patente, 4 Competências,
Mediana/Pistola×2/Colete equipado com Resistente ×2), um Elite sem itens (troca de Categoria) e
NPC Civil. Troca de Categoria pelo `<select>` real: Lendário recusado com motivos na Identidade
([captura](../../../../.artifacts/m4-21-capturas/troca-lendario-1920.png)); Veterano abriu Atributos com a nova, corrigido
e salvo ([captura](../../../../.artifacts/m4-21-capturas/troca-veterano-1920.png)). 16 estados × 3 viewports
(`1920×1080`, `360×800`, `960×1080`): leitura, Patente em edição, Atributos em edição,
Competência desmarcada, Equipamento leitura/catálogo/Modificar, Habilidades, modal da Biblioteca,
rascunho com modelo adicionado, foco de teclado no retrato, Civil, leitor.
[Relatório](../../../../.artifacts/m4-21-capturas/relatorio.json): **zero overflow horizontal, zero erro de página,
leitor com zero controles de edição** nos três viewports.

Comparação com o análogo: mesmo produto, densidade e hierarquia; controles canônicos com
dimensão explícita; linha de item, catálogo e stat no desenho do Jogador; foco visível (anel no
retrato via `:has(:focus-visible)`); alvos de toque ≥ 44px no celular.

Correções encontradas na inspeção, antes de apresentar:
1. "Força Tarefa" quebrava e desalinhava o ladrilho de Patente → coluna mais larga para a
   Patente; depois, a pedido do autor, linha própria de largura total. Medido ao vivo com
   "Força Tarefa Especial": os três ladrilhos com a mesma altura em `1920`/`960`/`360`, sem
   overflow ([desktop](../../../../.artifacts/m4-21-capturas/identidade-patente-longa-1920.png),
   [celular](../../../../.artifacts/m4-21-capturas/identidade-patente-longa-360.png),
   [edição](../../../../.artifacts/m4-21-capturas/identidade-patente-edicao-1920.png)).
2. Stepper de quantidade/empilhamento esticado (~220px) e espremido no celular → largura fixa.
3. **No celular, o conteúdo da Biblioteca transbordava sobre o rodapé do `app-modal`** → a grade
   limita a própria altura com `appOverflowFade` (convenção do primitivo); defeito latente do
   primitivo registrado em `PROBLEMS.md`.
4. Seletor de cor invisível sem foco visível → anel no retrato.
5. Faixa DT/Competências/Modificador e botões "＋ Da biblioteca/Personalizada" quebrando texto
   no celular → DT em linha própria e rótulos sem quebra.

Capturas: [leitura desktop](../../../../.artifacts/m4-21-capturas/leitura-1920.png),
[atributos em edição](../../../../.artifacts/m4-21-capturas/atributos-edicao-1920.png),
[equipamento](../../../../.artifacts/m4-21-capturas/equipamento-leitura-1920.png),
[Modificar](../../../../.artifacts/m4-21-capturas/equipamento-modificar-960.png),
[Biblioteca no celular](../../../../.artifacts/m4-21-capturas/biblioteca-360.png),
[Civil](../../../../.artifacts/m4-21-capturas/civil-1920.png), [leitor](../../../../.artifacts/m4-21-capturas/leitor-360.png).

Limpeza: todos os usuários, campanhas e fichas descartáveis das rodadas (`m421*`/"M4-21 *") removidos por
soft delete, com concessões e vínculos.


> Organização em 2026-10-08: capturas e saídas brutas citadas neste registro
> são evidências locais em `.artifacts/`, não distribuídas no clone. A migração
> preserva os resultados e limites originais e não executa novamente os gates.
