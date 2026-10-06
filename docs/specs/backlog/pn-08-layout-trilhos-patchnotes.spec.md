# pn-08-layout-trilhos-patchnotes.spec.md

> Task 2/5 do guarda-chuva `pn-revisao-pagina-patchnotes.spec.md`. Muda a casca da página. O
> conteúdo dos trilhos chega nas tasks seguintes: o sumário em `pn-09` e a lista de versões
> enriquecida em `pn-10`.

## Objetivo

Tirar a página do bloco central de 1120px. Em tela larga ela passa a ter **três zonas** (versões,
nota e trilho direito), com os trilhos fixos durante a rolagem. O **cabeçalho fica compacto**, no
topo do trilho de versões. O texto da nota **não** fica mais largo que a medida de leitura.

## Entregáveis

1. **Contêiner e grid** (container query, como hoje). Os limites abaixo são os do protótipo
   aprovado e se confirmam no corte visual:
   - `≥ ~1240px`: três colunas, com versões ~250px, nota fluida e trilho direito ~260px.
     `max-width` de ~1400px no lugar de 1120px. **`1366×768` entra em três zonas** (decisão da
     bancada; a spec original previa duas).
   - `720–1239px`: duas colunas, com versões e nota. O trilho direito some e o conteúdo dele vai
     para o topo da nota (`pn-09` e `pn-11`).
   - `< 720px`: uma coluna, com as versões em faixa horizontal, como hoje.
2. **Trilhos `sticky`** sob a topbar (`top: calc(var(--altura-topbar) + var(--space-16))`).
   - Altura máxima da viewport menos a topbar, com rolagem interna própria. Precedente: commit
     `69725c87`, lista que rola por dentro no Notebook.
   - Nesta task o trilho direito existe como região vazia que só aparece quando houver conteúdo.
     Ele não é renderizado vazio.
3. **Cabeçalho compacto**: some a faixa própria com eyebrow, título e apresentação.
   - Em tela de duas ou três colunas, o eyebrow `// Patchnotes` e o título "Novidades do sistema"
     ocupam o topo do trilho de versões, sobre um filete. A frase de apresentação sai.
   - No mobile ficam numa linha acima da faixa de versões.
   - O `<h1>` continua sendo único na página.
4. **Botão do ADMIN (`pn-06`) preservado**: vai para o canto direito do cabeçalho compacto, com o
   mesmo primitivo, os mesmos inputs, o mesmo comportamento e o mesmo teste de visibilidade.
   - No mobile mantém os 44px.
5. **Medida de leitura**: em três zonas o Markdown pode ir a `15px` e `70ch`, que é o máximo.
   - Nenhum parágrafo passa da largura medida antes da task na mesma viewport mais a folga desse
     ajuste.
6. **Estados preservados**: carregando, índice vazio, 404 e 503.
   - Os documentos de contenção continuam centralizados fora do grid.
7. **`docs/design/DESIGN.md`**: registrar o padrão "página de leitura em trilhos", com breakpoints,
   `sticky` e a regra da medida.

Análogos aprovados:
- trilho fixo lateral: `.criar__resumo` (`modules/ficha/paginas/criar/criar.page.scss`);
- leitura longa: Biblioteca de documentos;
- referência de composição: protótipo da bancada, conjunto **Definido** (ver guarda-chuva).

## Critérios de Aceite

1. Teste de página: o cabeçalho compacto renderiza o `<h1>`, e o botão do ADMIN continua ausente
   para visitante e `NORMAL` e presente para `ADMIN`.
2. Suítes e lint de `frontend` verdes.
3. Gate visual (`verify` + `design-fidelity`) em `1920×1080`, `1366×768`, `960×1080` e `360×800`:
   - número de colunas por viewport;
   - trilhos fixos durante a rolagem longa da `1.4.0`;
   - rolagem interna do trilho em `1366×768`;
   - largura do parágrafo medida antes e depois;
   - sem overflow horizontal;
   - os quatro estados;
   - visitante e ADMIN.

## Fora de Escopo

- O conteúdo do sumário (`pn-09`).
- Título, agrupamento e "Novo" na lista de versões (`pn-10`).
- Resumo e rodapé (`pn-11`).

## Dependências

`pn-06` concluída. Pode correr em paralelo com `pn-07`.

## Riscos e Mitigação

- **"Mais amplo" virar texto esticado.** O entregável 5 é o limite, e o gate mede.
- **Trilho cortado em notebook.** A rolagem interna é obrigatória e é verificada em `1366×768`.
