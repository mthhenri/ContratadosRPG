# M3-72 — Leitor global dos documentos de regras

## Objetivo

Disponibilizar o **Sistema de Regras** e o **Guia do Mestre** em um único leitor
global, acessível em rotas públicas e autenticadas sem retirar o usuário do
contexto atual. A experiência deve preservar a diagramação e a nitidez dos PDFs,
sem manter no sistema um segundo motor de renderização ou pesquisa.

## Fontes de verdade e publicação

- docs/core/sistema-v4.1.0.md e docs/core/guia_de_mestre-v4.0.0.md continuam
  sendo as fontes editáveis.
- docs/core/sistema-v4.1.0.pdf e docs/core/guia_de_mestre-v4.0.0.pdf são os
  artefatos publicados.
- docs/core/ permanece a origem única dos PDFs. O build os disponibiliza sob
  /documentos/, sem uma segunda cópia versionada no frontend.
- Os dois documentos são públicos nesta versão.

## Decisões de produto

1. Há um único acesso global chamado **Documentos**.
2. Dentro da janela, um seletor alterna entre **Sistema** e **Guia do Mestre**.
3. O PDF é a única experiência de leitura; não há modo Markdown.
4. No desktop, o leitor é uma janela grande, não modal, móvel, redimensionável,
   recolhível, maximizável e fechável.
5. A janela pode ocupar qualquer posição segura da viewport, inclusive sobre a
   topbar. Seu empilhamento fica acima da navegação e dos demais utilitários.
6. No mobile, o leitor ocupa a tela inteira e não oferece arraste ou
   redimensionamento.
7. Recolher mantém a instância do visualizador montada e preserva o estado que o
   navegador conseguir manter. Fechar desmonta a consulta e restaura o documento
   inicial.
8. O leitor permanece montado durante a navegação entre rotas, mas seu estado não
   é persistido após recarregar a aplicação.

## Decisão de simplificação — viewer nativo

Durante a validação visual da primeira implementação, o leitor próprio baseado em
PDF.js apresentou baixa nitidez e duplicação visual de texto provocada pela
sobreposição entre canvas e camada textual. A busca própria também ampliou
consideravelmente a complexidade sem produzir uma experiência melhor que a do
navegador.

Por decisão do autor, a implementação final:

- incorpora cada PDF com o visualizador nativo do navegador em um iframe;
- delega ao visualizador nativo renderização, seleção textual, busca, páginas,
  zoom, impressão, download e navegação interna;
- remove pdfjs-dist, worker, canvas, camada textual, camada de links,
  virtualização e índice de busca próprios;
- não tenta acessar nem reproduzir o estado interno do plugin de PDF;
- aceita que aparência, atalhos e disponibilidade de incorporação podem variar
  conforme navegador e sistema operacional.

Essa decisão prioriza qualidade do documento, simplicidade operacional e menor
superfície de bugs. Um leitor próprio só deve voltar em tarefa futura se uma
limitação concreta do viewer nativo justificar esse custo.

## Arquitetura

### Composição global

- O leitor vive no Layout, não dentro da ficha.
- O gatilho aparece na navegação global para usuários autenticados ou não.
- Um serviço global com Angular Signals coordena apenas abertura, recolhimento,
  documento ativo e geometria desktop.
- Não há backend, banco, DTO ou endpoint novo.
- O componente e o serviço são carregados sob demanda no primeiro acesso.

### Visualização

- Somente o PDF selecionado é incorporado.
- A URL vem do catálogo estático DOCUMENTOS_REGRAS.
- Alternar documento atualiza o src do mesmo iframe.
- O iframe permanece no DOM enquanto a janela estiver recolhida, evitando
  reinicialização desnecessária do viewer.
- Ao fechar, o componente interno é desmontado e a próxima abertura começa pelo
  Sistema.

### Publicação

- O pipeline automatizado publica somente os dois PDFs canônicos em /documentos/.
- A solução funciona em desenvolvimento e no build de produção.
- Uma verificação de build confirma presença, tamanho e identidade dos arquivos
  publicados.

## Experiência desktop

- A janela é não modal e não bloqueia a rota.
- O arraste ocorre somente pelo cabeçalho e ignora botões e controles.
- Os limites usam toda a viewport: x e y podem chegar a zero.
- A janela nunca pode ficar totalmente inacessível fora da tela.
- O redimensionamento respeita dimensões mínimas e a área disponível.
- O z-index permite que a janela passe sobre a topbar.
- Maximizar ocupa toda a viewport da aplicação; restaurar recupera a geometria
  anterior. Essa ação não usa a Fullscreen API nem esconde o navegador.

## Experiência mobile

- A janela ocupa toda a viewport e respeita safe areas.
- Não há arraste nem redimensionamento.
- Seletor, recolher e fechar permanecem acessíveis com alvos de pelo menos
  44 × 44px.
- Os controles internos do PDF são responsabilidade do viewer disponível no
  navegador. Em ambientes que não incorporam PDF, o comportamento pode ser
  abrir ou baixar o documento externamente.

## Cabeçalho e controles do sistema

O shell oferece:

- título **Documentos do sistema**;
- seletor **Sistema | Guia do Mestre**;
- indicação de que busca, páginas e zoom estão na barra do PDF;
- recolher;
- maximizar/restaurar no desktop;
- fechar.

Não há campo de busca, contador de ocorrências, paginação ou zoom duplicados no
shell do sistema.

## Integração e acessibilidade

- O gatilho recolhido integra a pilha global de utilitários.
- A janela usa os tokens, densidade, hierarquia e padrões BEM do Terminal de
  Contenção; somente a superfície interna do PDF pertence ao navegador.
- Botões de ícone possuem nomes acessíveis e foco visível.
- Recolher move o foco ao gatilho; reabrir volta ao cabeçalho; fechar devolve o
  foco ao elemento que abriu o leitor, quando ele ainda existir.
- Esc fecha a janela quando o foco estiver no shell. Eventos de teclado
  capturados pelo plugin interno permanecem sob responsabilidade do navegador.

## Fora do escopo

- renderização própria de PDF;
- busca, destaques ou contador de ocorrências próprios;
- controle programático de página e zoom do viewer nativo;
- anotações, favoritos ou marcações persistentes;
- compartilhamento de link para página;
- modo Markdown;
- controle de acesso ao Guia do Mestre;
- compatibilização visual da toolbar interna entre navegadores.

## Critérios de aceite

1. Documentos abre em rotas públicas e autenticadas, no desktop e no mobile.
2. O mesmo leitor alterna entre Sistema e Guia do Mestre.
3. Os PDFs são exibidos com a nitidez do viewer nativo, sem canvas ou texto
   duplicado produzido pela aplicação.
4. Busca, seleção, páginas e zoom são oferecidos pelo viewer do navegador quando
   suportados.
5. A janela desktop é não modal, pode passar sobre a topbar, maximiza/restaura
   sem perder a geometria anterior e permanece alcançável.
6. O leitor usa tela cheia no mobile sem overflow do shell.
7. Recolher mantém o iframe montado; fechar o remove.
8. O leitor sobrevive à troca de rota enquanto aberto ou recolhido.
9. Os dois PDFs canônicos são publicados corretamente no build.
10. Abrir a aplicação sem usar Documentos não baixa nenhum PDF.
11. O shell mantém nomes acessíveis e restituição de foco.
12. Documentos, histórico, calculadora, navegação móvel e bandeja não criam
    colisões sem alternativa de acesso.

## Verificação obrigatória

### Automatizada

- estado: abrir, recolher, reabrir, fechar, selecionar documento e geometria;
- componente: URLs canônicas, ausência do pipeline próprio, manutenção do iframe
  ao recolher, remoção ao fechar, foco, desktop e mobile;
- integração do gatilho global e publicação dos PDFs;
- testes focados, build de produção e lint proporcional ao escopo.

### Aplicação real

Usar a skill verify uma vez ao final do corte integrado e observar:

- 1920 × 1080 e 360 × 800;
- uma rota pública e uma autenticada representativa;
- Sistema e Guia do Mestre;
- nitidez, seleção textual e busca nativa;
- arraste até o topo, redimensionamento, maximizar/restaurar, recolher, reabrir
  e fechar;
- navegação entre rotas;
- ausência de texto duplicado e de overflow no shell;
- foco, contraste e alvos de toque.

Repetir a verificação visual somente se a primeira sessão revelar correções que
precisem ser confirmadas.
