# Verificação — regras-aberturas-leitura

## Escopo e resultado

As duas aberturas seguem centralizadas, com agrupamento editorial na fonte: oito parágrafos
no Sistema e sete no Guia. Corpo normal, negritos/tarjas pelo `RegrasInline`, lista compacta
de nomes, pausas do Guia e fechamento em itálico. Nenhuma regra, palavra ou comprimento de
tarja alterado; acrescentado um ponto entre autorização e advertência em cada livro.
Comparação automatizada contra HEAD confirmou o restante dos livros intacto.

Análogos aprovados: abertura existente `RegrasAbertura` e capa `RegrasCapa`; preservados
shell, centro, selo mono, hierarquia, cores, tarjas e controles existentes do leitor.
A projeção é pequena e local ao componente de abertura, sem responsabilidade nova de domínio
nem necessidade proporcional de um serviço. Não houve criação ou ampliação de primitivo.

## Verificação ao vivo

Skill `verify`, aplicação real já executada em localhost:4300, Edge via Playwright,
fontes carregadas. Capturadas 32 combinações: dois livros × página/painel × quatro viewports
(`1920×1080`, `1366×768`, `960×1080`, `360×800`) × claro/escuro.

Inspeção pessoal do agente principal: duas aberturas desktop escuras/claras; topo mobile da
página e painel, fim das duas aberturas após rolagem local; recortes intermediários de página
em 960 e painel em 1366. Comparação confirma identidade do mesmo produto, densidade de
leitura, selo e hierarquia canônicos, controles existentes preservados e ausência de HTML
genérico. Corpo e fechamento legíveis nas duas bases. Sem controles interativos novos;
foco/alvos do leitor permanecem os primitivos existentes, sem alteração de estilo nesta task.

Medições nos 32 recortes: sem overflow horizontal do bloco, alinhamento `center`, corpo
`normal`, fechamento `italic`, contagens 8/7. Conteúdo comprido permanece acessível na
rolagem da página e do painel; nenhum limite artificial de altura foi acrescentado.

Correção encontrada na inspeção: a mistura do itálico externo com duas sequências de tarjas
em negrito produziu asteriscos literais no primeiro parágrafo do Sistema. Troca do delimitador
externo para underscore corrigiu o Markdown; nova rodada de capturas confirmou a correção e
teste contra as duas fontes reais protege o caso.

Capturas e resultados brutos estão em `.artifacts/regras-aberturas-leitura/`, locais e
ignorados pelo Git; não acompanham o clone. Algumas capturas longas do elemento mobile
incluem sobreposição da barra sticky por causa da rolagem automática da captura; avaliação
de cortes usa as imagens de viewport `pagina-topo`, `painel-topo` e `painel-fim`.

## Gates

| Verificação | Resultado |
|---|---|
| `npm run test:regras --workspace=frontend` após a correção | 86/86 |
| `npm run test --workspaces --if-present -- --watch=false` | shared 1157; backend 995 + 1 ignorado; frontend 3215, todos passaram |
| `CI=true npm run build --workspace=frontend` final | Passou; publicação fiel ao Markdown nos dois livros |
| `npm run lint` | Zero erros, 4479 avisos existentes |
| ESLint focado nos dois arquivos TS de abertura | Zero erros/avisos |
| Prettier no SCSS tocado | Formatado |
| `npm run repo:verificar` | Organização e espelhos aprovados |

Falha corrigida da task: fixture `tarja.md` deixou de ser recorte literal após reagrupar a
fonte. Recorte corrigido sem alterar a expectativa dos cinco comprimentos; suite passou.
Falhas de ambiente superadas: isolamento bloqueou rename temporário do executor Angular
e consulta às fontes no build. Execução autorizada fora do isolamento passou; nenhum pacote
nem configuração foi modificado para contornar isso. Os 25 avisos de âncoras/grades do
normalizador e os avisos de lint não foram introduzidos pela task.

## Limites

Revisão restrita às aberturas; não certifica os demais blocos do leitor. Alterações
concorrentes de tabelas foram preservadas, sem atribuir sua implementação a esta tarefa.
P-108, revisão editorial da exportação, permanece fora do escopo; o renderer é compartilhado
com impressão, mas nenhum PDF foi certificado ou exportação do Sistema reativada.
Apresentação aprovada pelo autor, com commit autorizado após a inspeção. Sem push ou deploy.
Nenhuma pendência obrigatória do recorte entregue.
