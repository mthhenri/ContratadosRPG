# M10-11 — Verificação e limites · 08/10/2026

## Escopo e decisões

Autor autorizou retirar o legado ao avançar para M10-11 e confirmou o commit
da M10-10 (`af475bec`, trailer Codex conferido). Sistema suspenso por P-108;
Guia disponível. Retirada do legado não aprova a apresentação da exportação.

- Removidos leitor antigo/mobile, PDF.js/dependências exclusivas, worker,
  scripts de cópia, checagem e entradas de assets; ambos os PDFs de `docs/core/`
  retirados. Fontes Markdown e histórico Git preservados.
- Assets locais antigos ignorados retirados; produção regenerada sem eles.
  Busca em `frontend/src`, scripts, manifest/configuração e lockfile não
  encontra consumidores da infraestrutura removida.
- Leitor atual perde apenas o download provisório. Primitivos e responsabilidades
  preservados; nenhum componente extenso ganha responsabilidade nova.
- Retirado estado CSS global exclusivo do leitor recolhido. Calculadora,
  Histórico e Caderno mantêm piso, safe-area, ordem e tamanho. Seus três testes
  de contrato continuam passando; os testes exclusivos do componente removido
  saíram com ele.
- Prestart/prebuild normalizam Markdown; pós-build compara a árvore publicada
  inteira com os livros vigentes, não apenas presença/tamanho de arquivo.
- P-105 corrigido: fontes/testes Sistema v4.1.4 e Guia v4.2.0; fixture Especialista
  extraída literalmente do documento vigente, incluindo o crítico já alterado
  nessa versão. Nenhuma regra/fórmula do motor foi modificada.
- Orientação canônica e espelhos alinhados. Skill regras-do-jogo exercitada
  nessa comparação fonte/fixture; JSON é apresentação derivada.
- M9 histórica preservada: anexo posterior substitui a premissa de reuso e
  I-058 registra a ideia futura. Guarda-chuva/exemplão M10 movidos juntos para
  done, com realocação mecânica dos ponteiros históricos.

O requisito de documentação sem PDF foi aplicado à fonte canônica e à
infraestrutura antiga. As referências à exportação nativa e a P-108 foram
mantidas para cumprir o pedido explícito do autor de registrar sua revisão.

## Gates automatizados

| Verificação | Resultado |
|---|---|
| `npm run test:regras --workspace=frontend` | 56/56; livros inteiros, cobertura literal, âncoras e geração determinística |
| `npm run build --workspace=frontend`, CI/workers=2 | passou, incluindo preparo e pós-build; Sistema 4.1.4/Guia 4.2.0 fiéis ao Markdown |
| Checagem de publicação positiva/negativa | publicação aceita; versão divergente e PDF residual rejeitados; saída restaurada |
| `ng test --watch=false`, config temporária excluindo os dois arquivos P-106 | 228 arquivos, 3096/3096 testes; config retirada após execução |
| `npm run lint` (três workspaces) | 0 erros; 5890 shared, 4475 backend, 26949 frontend avisos históricos |
| `npm run repo:test` | 7/7 |
| `npm run repo:verificar` | organização e todos os espelhos aprovados |
| `git diff --check` | sem erros |

Build conserva o aviso de orçamento: inicial 588,83kB frente a 450kB.
A primeira execução no sandbox falhou ao buscar fontes externas; build completo
fora dele passou. Testes Angular no sandbox falharam na renomeação de arquivos
temporários; repetidos fora dele passaram. Não houve alteração para contornar
esses bloqueios do ambiente.

P-106 permanece aberto: dois testes do montador conservam o caminho anterior
do corpus. Foram excluídos tanto da compilação quanto da seleção da suíte;
esse resultado não comprova esses dois arquivos. Backend/shared não tiveram
código alterado e não receberam nova execução de testes nesta tarefa.

## Inspeção da aplicação real

Análogo: página/leitor M10-10 e topbar/painel M10-08, já aprovados como padrão de
leitura; gaveta e cabeçalho seguem Biblioteca M9. Comparação com código e UI.
Servidor limpo Angular em `http://localhost:4304`, Chromium com barras visíveis.
Instância anterior substituída após o cache de desenvolvimento acusar erro
durante a remoção de dependências; nenhum defeito reproduzido na instância limpa.

| Viewport | Bases | Estados observados |
|---|---|---|
| 1920×1080 | claro/escuro | página Sistema; topbar → painel; sumário; troca Guia |
| 1366×768 | claro/escuro | mesmos estados, menor altura disponível |
| 960×1080 | claro/escuro | página em dois trilhos; painel com gaveta local |
| 360×800 | claro/escuro | página com gaveta; Escape; painel/Guia com sumário |

Agente principal inspecionou pessoalmente as 16 capturas. Mesma densidade,
hierarquia, controles e iconografia do análogo; parece parte do produto,
sem aparência de HTML genérico ou overflow horizontal. Contraste e foco dos
controles existentes preservados; alvos compactos desktop e 44px no mobile.
Sistema v4.1.4 com exportação desabilitada; Guia v4.2.0 com exportação habilitada.
Nenhum download provisório, pedido de PDF/worker antigo ou erro de página.
Não houve divergência visual de produto a corrigir neste recorte.

Evidências locais ignoradas em `.artifacts/m10-11-remocao-pdf-antigo/`: capturas
`{claro,escuro}-{1920,1366,960,360}-{pagina,painel}.png`, scripts/logs de UI,
build completo, normalização, testes Angular, lint, publicação e organização.

## Pendências

M10-11 entregue, com commit autorizado pelo autor no fecho. M10 implementada (11/11). P-108 e a spec de revisão
editorial continuam abertos; Sistema só reativa após aprovação visual do autor.
Não foi refeita nem certificada a formatação dos PDFs nesta tarefa. P-106 segue
aberto, independente da remoção.
