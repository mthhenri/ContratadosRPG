# M3-72 — Leitor global dos documentos de regras

## Objetivo

Disponibilizar o **Sistema de Regras** e o **Guia do Mestre** em um único leitor global, acessível
de qualquer rota pública ou autenticada sem retirar o usuário do contexto atual. O leitor deve
preservar a diagramação conhecida dos documentos em PDF, oferecer pesquisa textual própria e poder
ser recolhido para um utilitário flutuante durante a consulta da ficha ou das calculadoras.

## Fontes de verdade e artefatos

- `docs/core/sistema-v4.1.0.md` continua sendo a fonte de verdade editável do Sistema de Regras.
- `docs/core/guia_de_mestre-v4.0.0.md` continua sendo a fonte de verdade editável do Guia do Mestre.
- `docs/core/sistema-v4.1.0.pdf` é o artefato publicado do Sistema de Regras.
- `docs/core/guia_de_mestre-v4.0.0.pdf` é o artefato publicado do Guia do Mestre.
- `docs/core/` deve permanecer a origem única dos PDFs. O build copia os dois artefatos para a saída
  pública; não deve existir uma segunda cópia versionada manualmente em `frontend/public/`.
- Nesta versão, os dois documentos são públicos. O Guia do Mestre não exige papel de mestre.

## Decisões de produto

1. Há um único acesso chamado **Documentos**, e não um gatilho separado para cada PDF.
2. Dentro do leitor, um seletor alterna entre **Sistema** e **Guia do Mestre**.
3. O PDF é a experiência de leitura apresentada ao usuário. Não há modo Markdown nem fallback para
   Markdown dentro do leitor.
4. No desktop, o leitor é uma janela de consulta grande, não bloqueante, movível, redimensionável,
   recolhível e fechável.
5. No mobile, o leitor ocupa a tela inteira. Não há arraste nem redimensionamento.
6. Recolher mantém o estado; fechar encerra a consulta e limpa a pesquisa.
7. O leitor permanece montado e preserva seu estado durante a navegação entre rotas.
8. O estado não é persistido entre recargas ou novas sessões do navegador. Após recarregar, o leitor
   começa fechado e em geometria segura.

## Arquitetura

### Composição global

- O leitor vive no layout global e não dentro do módulo de ficha.
- O gatilho deve aparecer na topbar desktop e na navegação compacta mobile, seguindo os padrões já
  aprovados do `Layout`.
- Um serviço global de estado, com Angular Signals, coordena abertura, recolhimento, documento ativo,
  geometria da janela e estado individual de leitura dos PDFs.
- O componente visual apresenta o estado e encaminha interações. Regras de busca, limites de geometria
  e transições de estado devem permanecer fora do template.
- Não há backend, banco, DTO ou endpoint novo.

### Renderização PDF

- Usar `pdfjs-dist`, carregado sob demanda no primeiro acesso ao leitor.
- O PDF selecionado é baixado somente quando necessário; alternar para o outro documento inicia seu
  carregamento. Depois disso, vale o cache normal do navegador.
- A renderização deve incluir canvas, camada de texto selecionável/pesquisável e camada de links.
- O worker do PDF.js deve ser empacotado de maneira compatível com o build Angular e com a hospedagem
  estática no Cloudflare.
- As páginas devem ser renderizadas por demanda, priorizando a página visível e sua vizinhança.
  Canvases distantes podem ser liberados para controlar uso de memória sem perder a posição lógica.

### Publicação dos documentos

- O pipeline de build deve copiar apenas os arquivos `.pdf` necessários de `docs/core/` para URLs
  públicas estáveis sob `/documentos/`.
- A solução deve funcionar igualmente em `ng serve`, no build de produção e no fallback de rotas da
  SPA.
- A implementação deve evitar um passo manual que permita publicar PDF antigo enquanto o Markdown ou
  o PDF canônico foi alterado.

## Contrato de estado

O estado global deve distinguir:

- leitor fechado;
- leitor aberto;
- leitor recolhido;
- documento ativo;
- carregamento e erro por documento;
- página, zoom e posição de rolagem independentes para cada documento;
- termo, resultados e ocorrência atual da pesquisa;
- geometria desktop válida da janela.

Ao alternar entre Sistema e Guia do Mestre, página, zoom e rolagem de cada documento são restaurados
separadamente. A troca não deve herdar a posição arbitrária do documento anterior.

## Experiência desktop

- A janela é não modal: o conteúdo da rota continua visível e utilizável.
- A janela deve ter limites mínimos e máximos coerentes com o viewport e nunca pode ficar totalmente
  inacessível fora da tela.
- O arraste acontece somente pelo cabeçalho e não deve conflitar com seleção de texto, botões ou
  inputs.
- O redimensionamento deve manter controles e conteúdo utilizáveis, sem overflow horizontal da página.
- Ao reduzir o viewport até o breakpoint mobile, o leitor muda para tela cheia automaticamente.
- Ao retornar ao desktop, recupera a última geometria desktop ainda válida ou aplica uma geometria
  segura.

## Experiência mobile

- O leitor ocupa o viewport disponível e respeita safe areas e a navegação da aplicação.
- Os controles podem ser reorganizados em mais de uma linha, mas nenhuma ação essencial fica oculta.
- O botão de recolher devolve o usuário à rota atual e mantém um gatilho na faixa de utilitários
  compacta.
- Não há arraste ou redimensionamento por toque.
- Alvos interativos têm pelo menos `44 × 44px`.

## Cabeçalho e controles

O leitor deve oferecer:

- título **Documentos do sistema**;
- seletor segmentado **Sistema | Guia do Mestre**;
- campo de pesquisa;
- contador no formato `ocorrência atual / total`;
- ações de resultado anterior e próximo;
- página atual e total de páginas;
- reduzir zoom, percentual atual, aumentar zoom e ajustar à largura;
- recolher;
- fechar.

Semântica das ações:

- **Recolher:** mantém documento, página, zoom, rolagem e pesquisa e converte a janela no gatilho
  flutuante/compacto.
- **Fechar:** fecha o leitor e limpa a pesquisa. Na próxima abertura, usa o estado inicial de consulta.
- `Esc`: fecha o leitor somente quando o foco estiver dentro dele e sem interceptar um diálogo ou
  controle sobreposto.

## Pesquisa

- A pesquisa usa a camada textual do PDF.js e não a busca nativa do visualizador do navegador.
- A comparação ignora diferença entre maiúsculas e minúsculas e entre caracteres acentuados e suas
  formas não acentuadas.
- `Enter` avança para a próxima ocorrência e `Shift+Enter` retorna à anterior.
- Todos os resultados da página renderizada recebem destaque; a ocorrência ativa possui hierarquia
  visual mais forte.
- Navegar entre resultados leva a ocorrência ativa para a área visível.
- Busca vazia não mostra contador enganoso.
- Busca sem ocorrência mostra **Nenhuma ocorrência** e mantém o leitor operacional.
- A implementação deve cancelar ou invalidar resultados obsoletos quando o termo ou o documento muda
  durante uma busca.

## Links e navegação interna

- Links internos, sumário e referências existentes no PDF navegam dentro do leitor.
- Links externos abrem em nova aba com `noopener`/`noreferrer` ou proteção equivalente.
- Um link inválido ou não suportado não pode quebrar a renderização da página.

## Integração com utilitários globais

- O gatilho recolhido entra no conjunto dos utilitários já existentes, junto de calculadora e histórico
  de rolagens.
- A implementação deve centralizar ordem, espaçamento e piso responsivo desses gatilhos. Não adicionar
  uma terceira fórmula independente de posicionamento fixo.
- Em rotas que não exibem calculadora ou histórico, o conjunto deve ocupar o espaço sem deixar lacunas.
- Na ficha mobile, nenhum gatilho pode cobrir a navegação inferior, a bandeja de dados ou outro controle.

## Contrato visual e acessibilidade

- Usar como análogos aprovados a calculadora flutuante, o histórico de rolagens e os dialogs da ficha.
- A janela deve parecer uma ferramenta do **Terminal de Contenção**, não um visualizador nativo do
  navegador inserido em um iframe.
- Consumir exclusivamente os tokens do tema; não hardcodar cores, fontes ou raios.
- Reutilizar iconografia e padrões BEM existentes antes de criar variações.
- Preservar scrollbar global, foco visível, contraste e densidade canônicos.
- O leitor deve expor nomes acessíveis para todos os botões de ícone, anunciar carregamento/erro e
  manter ordem de foco coerente.
- Recolher devolve o foco ao gatilho; reabrir move o foco para o cabeçalho ou para o último controle
  válido. Fechar devolve o foco ao elemento que abriu o leitor quando ele ainda existir.
- O PDF deve continuar navegável por teclado, com texto selecionável e zoom que não exija rolagem
  horizontal da página da aplicação.

## Estados de carregamento e erro

- Exibir skeleton técnico durante o carregamento inicial e progresso quando o PDF.js disponibilizar
  informação confiável.
- Falha de download ou PDF incompatível mostra mensagem clara e ação **Tentar novamente**.
- Um erro em um documento não impede abrir o outro.
- Trocar de rota ou documento durante carregamento não pode deixar operações duplicadas ou atualizar o
  documento errado.
- O restante da aplicação permanece utilizável quando o leitor falha.

## Fora do escopo

- anotações ou marcações persistentes;
- favoritos;
- compartilhamento de link para página ou ocorrência;
- edição ou geração dos PDFs;
- sincronização do estado entre dispositivos;
- controle de acesso ao Guia do Mestre;
- modo de leitura em Markdown;
- indexação dos documentos no backend.

## Critérios de aceite

1. **Acesso global:** Documentos pode ser aberto em rota pública, campanha e ficha, no desktop e no
   mobile.
2. **Entrada única:** o mesmo leitor alterna entre Sistema e Guia do Mestre.
3. **Não bloqueante no desktop:** é possível consultar o PDF e continuar interagindo com a rota.
4. **Tela cheia no mobile:** o leitor usa o espaço disponível sem overflow ou controles encobertos.
5. **Recolhimento:** recolher e reabrir preserva documento, página, zoom, rolagem e pesquisa.
6. **Fechamento:** fechar limpa a pesquisa e uma nova abertura começa no estado inicial definido.
7. **Navegação entre rotas:** o leitor aberto ou recolhido sobrevive à troca de rota sem reiniciar.
8. **Pesquisa:** texto com e sem acento encontra as mesmas ocorrências; contador, navegação e destaques
   correspondem aos resultados reais.
9. **PDFs reais:** os dois arquivos de `docs/core/` são publicados e abertos corretamente no build de
   produção.
10. **Desempenho:** abrir a aplicação sem usar Documentos não baixa PDF.js nem qualquer PDF.
11. **Falhas isoladas:** erro de um documento permite tentar novamente e não impede abrir o outro.
12. **Acessibilidade:** controles têm nomes acessíveis, foco visível e restituição de foco correta.
13. **Integração:** documentos, histórico e calculadora não colidem entre si nem com a navegação móvel.
14. **Fidelidade visual:** o leitor tem densidade, hierarquia, controles e acabamento coerentes com os
    análogos aprovados e não se parece com HTML genérico ou viewer nativo embutido.

## Testes e verificação obrigatórios

### Automatizados

- Testes unitários do serviço de estado para abrir, recolher, reabrir, fechar, trocar documento e
  preservar estados independentes.
- Testes das funções puras de normalização e correspondência da pesquisa, incluindo acentos.
- Testes de invalidação de busca e carregamento obsoletos.
- Testes do componente para teclado, foco, loading, erro, retry e adaptação de viewport.
- Teste do mecanismo de publicação que prove a presença dos dois PDFs no build final.
- Build, lint e suíte completa do frontend.

### Aplicação real

Usar obrigatoriamente a skill `verify` e observar, no mínimo:

- `1920 × 1080` e `360 × 800`;
- uma rota pública, uma campanha e uma ficha;
- leitor aberto, recolhido, reaberto, fechado, carregando e em erro;
- Sistema e Guia do Mestre;
- pesquisa existente, inexistente e com variação de acento;
- primeiro, intermediário e último resultado;
- zoom mínimo/máximo previsto e ajuste à largura;
- navegação entre rotas com leitor aberto e recolhido;
- colisão com calculadora, histórico, navegação inferior e bandeja de dados;
- navegação por teclado, foco, contraste, texto selecionável e links internos/externos.

Comparar pessoalmente a aplicação renderizada com a calculadora flutuante, o histórico de rolagens e
os dialogs aprovados. Corrigir divergências antes de considerar a tarefa concluída.
