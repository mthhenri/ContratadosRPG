# livros-mudancas-publicadas-para-leitores.spec.md

> Task avulsa · concluída em 2026-10-22 · definição com o autor em 2026-10-22.
> Evidências e limites em [verificacao.md](livros-mudancas-publicadas-para-leitores/verificacao.md).
> “O que mudou” para o jogador: notas editoriais em **Markdown**, seguidas
> automaticamente apenas dos blocos adicionados, removidos e alterados.

## Objetivo

Permitir ao leitor acompanhar mudanças entre publicações oficiais de um livro sem
reler o documento inteiro. Combinar a explicação escrita pelo administrador com
uma comparação automática e fiel dos blocos afetados.

## Decisões e recorte

- **Acordado:** notas em Markdown na publicação; blocos alterados abaixo delas;
  antes/depois e diferenças destacadas; seção de origem e link para a regra atual;
  comparação anterior → atual por padrão, com escolha de publicação mais antiga.
- **Escolhas técnicas desta spec:** manter o destino na publicação atual e permitir
  selecionar a origem entre publicações anteriores do mesmo livro. No salto de várias
  publicações, mostrar notas das publicações percorridas em ordem cronológica, cada uma
  identificada, e comparação acumulada direta entre origem e atual. Isso preserva as
  explicações intermediárias sem repetir cada alteração de bloco a cada publicação.
- Não é necessário abrir o livro antigo inteiro para usar a funcionalidade. A leitura
  integral de versões anteriores já disponível ao admin não será estendida nesta task.
- Versões `4.1.4`, `4.1.5` e `4.2.0` são exemplos. Histórico disponível é o que está
  preservado no banco; não inventar publicação anterior ou mudanças retroativas.

## Entregáveis

> Anexos em `livros-mudancas-publicadas-para-leitores/`, ao lado da spec.
> Saídas brutas em `.artifacts/livros-mudancas-publicadas-para-leitores/` (ignoradas).

1. **Notas editoriais em Markdown.** Substituir o campo de texto simples “O que mudou
   (opcional)” do diálogo de publicação pelo `EditorMarkdown` canônico de `shared/ui/`.
   Armazenar o Markdown na nota da própria fotografia publicada, reutilizando o contrato
   existente quando compatível; nota permanece opcional e pertence àquela publicação.
   Preservar títulos, listas, negrito, itálico e links; renderizar pelo caminho canônico
   seguro do projeto, sem HTML executável nem URLs perigosas. Notas antigas de texto
   simples continuam legíveis, sem exigir migração editorial manual.
   Nota não é gerada automaticamente nem substitui o comparador. Não criar um segundo
   campo concorrente ou confundir essas notas com as patchnotes da versão do site.

2. **Entrada “O que mudou” no leitor.** Disponível nas superfícies de leitura página
   e painel de Regras, sem precisar entrar na Oficina. Abre a consulta com livro, origem
   e destino identificados; padrão é publicação imediatamente anterior → atual.
   O seletor de origem lista apenas publicações anteriores daquele livro, identificadas
   por número e data para desambiguar eventuais números repetidos. Ordenação editorial
   segue a cronologia de publicação existente, com desempate estável, não cálculo semântico
   do número. Fechar a consulta retorna à leitura atual preservando sua posição.

3. **Consulta publicada autorizada.** API fornece somente metadados públicos necessários,
   notas e comparação de publicações `PUBLICADA`. Mesma disponibilidade da leitura
   publicada para visitante e usuário `NORMAL`; `TESTER` e `ADMIN` podem usar a consulta
   pública sem misturá-la com seus rascunhos ou trabalho. Validar situação e vínculo ao
   livro no backend, inclusive para ids manipulados em URL/requisição direta.
   Não liberar os endpoints administrativos existentes indiscriminadamente nem expor
   autoria interna, dados de usuário, cópia de trabalho ou rascunhos. Permissões de
   edição e leitura administrativa existentes permanecem regidas pelo contrato atual.

4. **Somente os blocos afetados.** Reutilizar `compararLivros` e o diff de texto rico
   de `shared/src/livro/`, sem implementar um segundo motor. Para bloco alterado,
   apresentar antes/depois com destaque de palavras e mudanças de formatação; para novo,
   só o conteúdo adicionado; para removido, só o anterior. Mostrar título/caminho legível
   da seção. Valores, listas, tabelas, fórmulas e blocos ricos devem ser compreensíveis
   como conteúdo do livro, nunca JSON bruto ou nomes internos de propriedades.
   Incluir contexto suficiente do bloco para entender a alteração, sem inserir capítulos
   ou subárvores inteiras que continuaram iguais. Mudanças em containers não duplicam
   todas as filhas; adição/remoção de uma subárvore aparece agrupada, sem cópias repetidas.
   Movimento puro aparece como aviso de localização anterior/nova, sem fingir mudança
   textual; bloco também alterado não deve ter seu texto repetido pelo movimento.

5. **Navegação e acessibilidade.** Link de cada mudança vai à regra na publicação atual,
   quando ela existir, usando identificadores/âncoras canônicos e o mapa de renomeações.
   Peça sem âncora própria pode levar à seção ancestral existente; removida não recebe
   link quebrado: indicar remoção e oferecer seção atual somente se houver destino válido.
   Em seleção antiga → atual, o link continua levando à atual, não a um texto histórico
   apresentado como vigente. Diferenciar adição/remoção por rótulo/marcação além de cor,
   com ordem de leitura compreensível e navegação por teclado.

6. **Notas e comparação coerentes.** Notas aparecem antes dos blocos; no salto de várias
   versões, cada nota mantém seu número e data. Se uma mudança intermediária tiver sido
   revertida, ela pode constar nas notas históricas, mas não no diff acumulado sem efeito
   líquido; deixar clara a distinção entre histórico editorial e diferença entre extremos.
   Tratar publicação sem nota, ausência de anterior, ausência de diferenças, carregamento,
   erro/nova tentativa e troca rápida de livro/origem, descartando respostas antigas.
   Primeira publicação informa que não existe anterior; não lista o livro todo como novo.
   Se houver notas e zero diferenças de conteúdo, continuar mostrando as notas com estado
   explícito “sem alterações de conteúdo”. Não reconstruir histórico a partir de fixtures.

7. **Integração sem acoplamento indevido.** Compartilhar apresentação/cálculo que se
   provar comum com a gaveta da Oficina, mantendo a autorização e o estado de leitura
   separados da edição. Avaliar extração antes de aumentar `RegrasLeitor` ou `OficinaMudancas`;
   registrar a decisão proporcional ao escopo. A publicação de uma versão passa a fornecer
   a nota e a comparação após nova consulta; notificações em tempo real não são requisito.
   Atualizar contratos/documentação afetados e registrar evidências e limites.

## Critérios de Aceite

- Cenário com três publicações, rascunho mais recente e trabalho divergente: leitor comum
  compara só as oficiais; padrão escolhe as duas últimas publicadas. Acesso direto a
  rascunho, versão de outro livro e versão inexistente é recusado sem vazamento de conteúdo.
  Confirmar visitante/`NORMAL` e ausência de regressão em `TESTER`/`ADMIN`.
- Publicar com Markdown real (título, lista, destaque e link), recarregar e confirmar
  persistência/renderização. Exercitar texto simples legado, nota vazia e conteúdo
  malicioso; nenhum script ou protocolo perigoso é executado.
- Corpus de comparação cobre nova, removida, alterada, movida, mudança de formatação,
  fórmula/valor/tabela/lista, container e subárvore. Só blocos afetados aparecem;
  capítulo inalterado não é renderizado como parte do resultado; rótulos e caminhos
  são legíveis; links válidos e nenhum link indevido para peças removidas.
- Comparação antiga → atual verifica notas intermediárias ordenadas e diff dos extremos,
  incluindo mudança revertida e números editoriais repetidos. Sem anterior não gera
  uma lista equivalente ao livro completo. Mesmo conteúdo com notas diferentes exibe
  notas e estado correto. Troca rápida de origem/livro não restaura resposta obsoleta.
- Análogos: gaveta `oficina-mudancas.component.*` para blocos/diferenças,
  `oficina-publicar.component.*` para publicação, ambos em
  `frontend/src/app/modules/regras/oficina/`, e `shared/ui/editor-markdown/` para edição.
  Antes de editar, registrar inspeção e mapeamento de shell, densidade, hierarquia,
  espaçamento, controles, estados, ícones e responsividade. Usar tokens e primitivos
  com API completa; se faltar cobertura, perguntar ao autor antes de criar/contornar.
- Gate `design-fidelity` + `verify` na aplicação real, inspeção pessoal do principal em
  `1920×1080` e `360×800`, claro/escuro, página e painel: abrir/fechar, trocar origem,
  ler notas, percorrer todos os tipos de bloco, navegar à regra, sem anterior/nota/mudanças,
  espera/erro/nova tentativa; publicar nota como admin e consultar como leitor comum.
  Comparar aos análogos, confirmar densidade, hierarquia, controles canônicos, foco,
  contraste, alvos de toque e ausência de overflow da superfície; tabelas extensas
  devem seguir o padrão canônico de rolagem local.
- Testes focados e gates de integração: testes/lint dos três workspaces, build e
  `npm run repo:verificar`. Aplicar `gerenciamento-de-impacto` aos consumidores e
  contratos compartilhados, `dto-conventions` ao definir contratos novos e
  `sql-migrations` se houver mudança de persistência. Relatório discrimina comandos,
  resultados, comparação visual, correções, falhas preexistentes e pendências.

## Fora de Escopo

Abrir versões antigas integrais para jogadores; escolher destino histórico arbitrário;
expor rascunho/trabalho a leitores comuns; gerar notas por IA; reescrever notas antigas;
editar publicação histórica; mudar numeração editorial ou regras de jogo; migração de
fichas entre versões; notificações, selo de novidades não lidas e preferências por usuário;
sincronização em tempo real (`I-061`); patchnotes do site; reconstrução de histórico ausente;
exportação/importação entre ambientes, tratada na outra spec.

## Dependências

- `docs/SYSTEM.SPEC.md`, `docs/CONVENTIONS.md`, `docs/SCHEMA.md`,
  `docs/design/DESIGN.md` e `docs/design/tema/`.
- Em `docs/specs/done/`: `m11-04-publicacao-e-leitura-por-papel.spec.md`,
  `m11-05-comparador-puro.spec.md` e `m11-09-oficina-mudancas-e-publicar.spec.md`.
- Bases: `backend/src/modules/livro/`, `shared/src/livro/comparar-livros.ts`,
  `shared/src/livro/diff-texto-rico.ts`, `shared/src/dtos/livro/`,
  `frontend/src/app/modules/regras/oficina/` e `frontend/src/app/shared/ui/editor-markdown/`.
- Publicações anteriores precisam existir no banco para haver comparação. A
  [importação para dev](../backlog/livros-exportacao-publicada-e-importacao-dev.spec.md) traz só
  a atual: seu aceite usa histórico semeado em banco isolado, sem ampliar aquele pacote.

## Riscos e Mitigação

- **Liberar histórico administrativo por engano:** recorte público específico e validação
  de cada publicação no backend, não só filtro no seletor.
- **Mostrar um diff tecnicamente correto e ilegível:** conteúdo visual dos blocos,
  contexto por seção e corpus rico, sem despejo de estruturas internas.
- **Markdown contornar proteção existente:** usar editor/renderização canônicos e testes
  de links/HTML hostis, sem parser paralelo ou inserção de HTML não sanitizado.
