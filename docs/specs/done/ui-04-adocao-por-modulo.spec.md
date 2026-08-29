# ui-04-adocao-por-modulo.spec.md


> Task 4/5 do guarda-chuva `ui-biblioteca-componentes.spec.md`. É a maior da série — pode ser
> quebrada em `ui-04a`…`ui-04g` (uma por módulo) se o gate visual de um módulo não couber numa
> sessão. Origem: `PROBLEMS.md` `P-034`.

## Objetivo

Adotar os primitivos de `shared/ui/` em todo o frontend, apagando as cópias BEM locais que eles
substituem, sem alterar um pixel do que está na tela.

## Entregáveis

Um entregável por módulo, na ordem abaixo — do menor risco ao maior. Cada módulo é uma unidade
fechada: adota, apaga as cópias, cumpre o gate visual e só então o próximo começa.

1. **`usuario` + `acesso-negado`** (3 componentes; 541 linhas de template, 1.079 de SCSS).
2. **`simulacao`** (10 componentes; 1.934 de template, 2.862 de SCSS). Já consome o `Stepper` —
   aqui ele passa a vir de `shared/ui/`.
3. **`shared`** (18 componentes; 1.558 de template, 2.672 de SCSS). A biblioteca de composição do
   projeto passando a consumir a de primitivos: `bandeja-dados`, `calculadora-flutuante`,
   `configuracoes-tema`, `historico-rolagens-sidebar`, `leitor-documentos`, `receber-dano`,
   `resultado-rolagem`, `layout`.
4. **`campanha`** (5 componentes; 2.315 de template, 4.089 de SCSS).
5. **`encontro`** (7 componentes; 1.362 de template, 2.587 de SCSS).
6. **`pagina-caderno`** (2 componentes; 554 de template, 1.183 de SCSS). Atenção ao editor
   Milkdown/Yjs: o SCSS dele estiliza DOM de terceiro (ProseMirror) e **não** é candidato a
   primitivo.
7. **`ficha`** (21 componentes; 13.169 de template, 16.913 de SCSS). Metade do frontend. Faça por
   último e, dentro dele, comece pelos menores (`criatura-*-lista`, `cartao-ficha-acervo`,
   `guia-formula`) antes de `ficha-inventario` (2.577 de template) e `ficha-visualizacao` (2.881).

Em cada módulo:

- trocar marcação e classes pelos primitivos;
- **apagar** o bloco BEM local que virou primitivo — a task não terminou enquanto a cópia existir;
- manter intacto o que é específico do componente (layout da tela, blocos de domínio como
  `.ficha-inv__*`, `.sanidade__*`); primitivo é o controle, não a tela;
- registrar a variação de linhas de SCSS do módulo.

## Critérios de Aceite

- Para cada primitivo, o seletor base existe em **exatamente um** arquivo de `shared/ui/`:
  `grep -rlE '^\s*\.(botao|campo|selecao|card|stat|stepper|chip-classificacao|abas)\s*[,{]'
  frontend/src` retorna só os arquivos da biblioteca. Partida medida em 2026-08-28: `.botao` em
  **20** arquivos, `.campo` em 17, `.stat` em 5, `.card` em 5, `.stepper` em 4,
  `.chip-classificacao` em 3.
- **SCSS total do frontend menor que as 32.393 linhas de partida.** O número final e o delta por
  módulo entram no fecho. Se o total **subir**, a adoção falhou — os primitivos viraram mais uma
  camada em vez de substituir as cópias.
- Suíte do frontend e `npm run lint` (raiz) sem erro novo a cada módulo; `P-033` relatado à parte.
- **Gate visual (proibição #31) por módulo**, não no fim: captura de referência **antes** de tocar
  no módulo e comparação depois, em `1920×1080` e `360×800`, percorrendo os estados de cada tela
  (vazio, cheio, foco, erro, desabilitado, item longo, e os estados que a tela tiver de próprio).
  Pixel diff **zero**; qualquer diferença é justificada item a item ou corrigida antes de fechar o
  módulo.
- Nenhum `PROBLEMS.md` novo criado por esta task. Defeito **preexistente** descoberto durante a
  comparação é registrado e deixado como está.

## Fora de Escopo

- **Melhorar qualquer tela.** Espaçamento, hierarquia, cor, densidade e comportamento permanecem
  idênticos. Pixel diff zero é o critério, e "ficou melhor assim" é divergência.
- **Decompor os componentes gigantes.** `ficha-inventario` e `ficha-visualizacao` encolhem de
  SCSS, não de responsabilidade. A decomposição do TS/HTML é outra frente.
- Corrigir `P-005`, `P-008`, `P-018` ou qualquer defeito visual conhecido que vá aparecer no
  caminho.
- Estilizar DOM de terceiro (ProseMirror/Milkdown, `pdfjs`) com primitivos.
- PrimeNG (`ui-05`).

## Dependências

- `ui-01`, `ui-02` e `ui-03` em `done/`. Começar antes de a biblioteca estar completa obriga a
  passar duas vezes pelo mesmo módulo — e a segunda passada custa outro gate visual inteiro.

## Riscos e Mitigação

- **É aqui que a série pode virar uma regressão visual grande e silenciosa.** Mitigação: o gate é
  **por módulo**, com referência capturada antes; nenhum módulo fecha sem a comparação. Um módulo
  por vez também mantém o diff revisável.
- **Cansaço de gate.** Sete módulos, dois viewports, muitos estados: a tentação é aceitar "está
  parecido". O critério é pixel diff, não impressão — e é o motivo de a task poder ser quebrada em
  sete.
- **Primitivo que não cobre um caso real.** Vai acontecer, provavelmente na `ficha`. A saída
  correta é estender o primitivo (com o caso real documentado) e reprocessar os módulos já feitos
  se a extensão mudar o visual — nunca reintroduzir uma cópia local "só nesse caso".
