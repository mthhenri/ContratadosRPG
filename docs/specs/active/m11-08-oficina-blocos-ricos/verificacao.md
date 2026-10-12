# m11-08 — verificação por fatia

Spec: [`m11-08-oficina-blocos-ricos.spec.md`](../m11-08-oficina-blocos-ricos.spec.md). A task é fatiada por bloco
(uma entrega e um gate por fatia); ela só vai para `done/` quando todas as fatias estiverem fechadas.

| Fatia | Blocos | Situação |
|---|---|---|
| 1 | Equipamento, Modificação, Amplificador | **fechada** (esta verificação) |
| 2 | Classe, Arquétipo, Subclasse | **fechada** (seção abaixo) |
| 3 | Origem, Termos | aberta |
| 4 | Ficha de criatura, Roteiro | aberta |
| 5 | Tabela, Grade, Faixas, Níveis de ameaça | aberta |

## Fatia 1 — Equipamento, Modificação e Amplificador

### O que mudou
- `shared`: itens dos três containers carregam `peca` na projeção da Oficina; validador com pendências de
  conteúdo (custo, peso e descrição do equipamento, dano sem valor, empilhamento fora de `/^■+□*$/`, efeito,
  bloqueia, `categoria` vazia) e estrutural (dano sem rótulo válido ou sem trechos); esqueleto de
  modificação e amplificador nasce com `■`.
- Frontend: `oficina-dados.ts` (leitura e escrita por caminho no `dados`), `OficinaTexto` com `caminho` e
  `opcional`, `OficinaStore.alterarCampo`, `app-oficina-empilhamento` (dois `app-step-input`), os três
  renderers com modo edição e o "+" do fim da lista; o menu do "+" abre junto do botão.
- Correção de camada herdada da m11-07: slots "+" e ferramentas da peça passaram para `z-index: 1`, abaixo da
  barra presa do leitor (no celular o "+" cobria a barra).

### Análogo e decisões
Análogo aprovado: o próprio bloco na Leitura (mesmos componentes) e o padrão de edição da m11-06 (campo no
lugar, ferramentas na peça selecionada, "+" no fim). Sem seleção, a Oficina desenha o mesmo que a Leitura;
contadores de empilhamento, botão de tipo de dano, remover dano, "+ Dano" e campos opcionais vazios (porte,
especificações, duração) só aparecem no item selecionado (botões por item sob demanda). Todos os controles
usam primitivos de `shared/ui` (`app-botao`, `app-botao-icone`, `app-chip`, `app-step-input`,
`app-empilhamento`, `app-menu-insercao`); nenhum primitivo novo.

### Resultados
- shared 1241, backend 1093 (12 ignorados já existiam), frontend 3350 testes; lint sem erros nos três.
- Gate visual no app real (ng serve 4301 → backend 3101, banco isolado com os dois livros importados) em
  1920×1080 e 360×800 (este com toque emulado): leitura × Oficina sem seleção, item selecionado, dano
  trocado/adicionado/removido, opcional, empilhamento, menu do "+", bloco novo vazio, equipamento novo com
  pendência, container novo (Equipamentos) com item. Sem overflow horizontal e sem erro de console.
- Ida e volta: editar na Oficina, publicar rascunho de teste e ler — equipamentos e modificações idênticos
  aos da Oficina (texto e caixas de empilhamento). Pendências do livro de trabalho: só as dos itens de teste.
- Os livros importados não ganham nenhuma pendência nova (`importador.spec` exige árvore sem pendências).

### Achados da verificação
- Só ao vivo: "+" por cima da barra no celular; nome da modificação em coluna de uma letra com os contadores
  no mesmo grid; menu alinhado à borda da linha. Corrigidos.
- Revisão independente (`revisor`): entrega atrasada do campo recriava dano removido (timer não limpo no
  destroy; escrita em caminho cujo pai sumiu), "+ Dano"/"Remover" liam a lista do template em vez do store,
  adicionar/remover dano se fundia no Desfazer, categoria vazia sem pendência, `TIPOS_COM_TELA` sem os
  containers, rótulos acessíveis genéricos, área de toque do botão de tipo de dano invadindo a linha de baixo.
  Todos corrigidos, exceto o limite abaixo.

### Limites
- O botão do tipo de dano é `app-botao` sem `[tamanho]`, com a tipografia herdada do selo (para não mudar o
  desenho); no celular a área de toque estendida (`::after`) fica abaixo de 44 px e o botão de remover dano
  (44 px, do primitivo) engorda o selo só no item selecionado. Decisão do autor se isso deve virar variante do
  primitivo.
- O "+" insere só no fim da lista de cada bloco (no meio, use duplicar e mover).
- Sem teste automatizado para a entrega atrasada com o item já removido (coberta por revisão e pela guarda).
- Só Chromium.

## Fatia 2 — Classe, Arquétipo e Subclasse

### O que mudou
- `shared`: pendências de conteúdo — Vida/Energia iniciais e progressão da classe e da subclasse, atributos bônus
  de arquétipo e subclasse, classe da subclasse e custos do experimento (ao menos um, sem linha vazia). Os livros
  importados não ganham pendência (o `importador.spec` exige árvore limpa).
- Frontend: nome da classe, subclasse e arquétipo editável no lugar (só o texto, como o título da seção; renomear
  com âncora continua sendo o F2 do sumário); citação do arquétipo; atributos bônus de arquétipo e subclasse
  (campo de texto no lugar dos selos, na Oficina); Vida/Energia iniciais e a linha "Por nível" (`app-regras-saude`
  com `peca`); classe da subclasse; custos do experimento (editar, adicionar, remover, só no item selecionado).
  A habilidade inicial e as de classe/arquétipo/subclasse já eram editáveis (m11-06).
- Fora desta fatia: a tabela de progressão da classe (`cabecalho`/`linhas`) fica para a fatia 5.

### Verificação
- Testes: shared 1244, backend 1093 (12 ignorados já existiam), frontend 3353; lint sem erros.
- Gate visual (pilha isolada, banco com os dois livros) em 1920×1080 e 360×800 com toque: classe, arquétipo e
  subclasse na Leitura e na Oficina, edição da Vida inicial, bônus, custos (adicionar com pendência e remover).
  Sem overflow e sem erro de console. Ida e volta: publicar rascunho (0 pendências) e a Leitura mostra o valor
  editado.
- Sem revisão independente nesta fatia: ela só reaproveita a maquinaria já revisada na fatia 1 (`caminho`,
  `alterarCampo`); os pontos de risco (lista lida do store, passo sem fusão) seguem o mesmo padrão.

### Limites
- Na Oficina o arquétipo e a subclasse mostram o texto dos bônus como campo, não como selos.
- Digitar o nome não gera âncora nova depois da primeira (igual ao título da seção); use F2 para renomear.
