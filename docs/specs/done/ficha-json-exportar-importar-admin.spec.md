# ficha-json-exportar-importar-admin.spec.md

> Task avulsa. Origem: pedido do autor (2026-11-26): "um exportar bem simplão, que pega a ficha em JSON e
> copia na área de transferência ou baixa como arquivo, só para eu poder importar aqui" — para levar fichas
> de criatura reais para o agente de código analisar, antes do redesenho de Ataques/Habilidades
> (`ficha-criatura-npc-revamp-visual.spec.md`). Liberado só para administrador; os outros tipos e públicos
> ficam para depois. Não substitui `ficha-exportar-criatura-npc-agente.spec.md` (PDF/Markdown/HTML), que
> continua no backlog.

## Objetivo

Administrador exporta uma ficha de **Criatura** ou **NPC** como JSON (copiar ou baixar) e importa um JSON
nesse mesmo formato, criando uma ficha nova no próprio acervo.

## Decisões

- **Formato:** envelope `FichaCriaturaExportadaDto` / `FichaNpcExportadaDto` (`shared/src/dtos/ficha/ficha-arquivo.dtos.ts`) com
  `formato: "contratados-rpg.ficha"`, `versao: 1`, `tipo`, `exportacaoData`, `nome`, `cor` e `dados` (o
  documento de jogo exatamente como a API devolve). Sem `id`, dono, campanha, imagem, enquadramento nem
  `oculta`: identidade e posse não viajam.
- **Exportar sem endpoint novo:** lê `GET /ficha/criatura/:id` / `GET /ficha/npc/:id`, com a permissão de
  leitura de sempre.
- **Importar por rota administrativa `POST /ficha/importar`** (`FichaImportarDto { ficha }` →
  `FichaImportadaDto { id, tipo }`), `@TiposPermitidos(ADMIN)` e conferência de admin na service. A ficha
  nasce solta (`campanhaId: null`) no acervo do admin, sem evento de sala. **Valida como edição**, decisão do
  autor em 2026-11-26: a primeira versão importava por `POST /ficha/criatura`/`npc`, e a verificação ao vivo
  mostrou que 2 das 4 criaturas reais do banco local eram recusadas pela distribuição de atributos da criação
  (`validarRealocacaoAtributos`), que a edição não aplica. Criatura: `validarFichaCriatura` + cor; NPC:
  `validarDadosNpc(dados, competências presentes)` + `resolverCondicoesNpc`, o mesmo critério de
  `alterarFichaNpc`. Não exige ser mestre de alguma campanha (o admin é a autoridade da rota).
- **Onde:** acervo (`/fichas`). Menu ⋯ da ficha de Criatura/NPC ganha "Copiar JSON" e "Baixar JSON"; o
  topo ganha "Importar JSON", que abre um modal com área de colar e botão de escolher arquivo.
- **Também na ficha** (pedido do autor durante o fecho): "Exportar ▾" (`app-menu-acoes`, primitivo do menu
  "Publicar" da Oficina) no lado direito do cabeçalho da ficha de Criatura e de NPC, com os mesmos dois itens.
  Componente `ExportarFichaJson`; acervo e cabeçalho chamam a mesma ação `FichaArquivoJsonService.exportar`.
- Ficha de Agente fica fora (criação passa pelo guia e por snapshots próprios).

## Critérios de Aceite

- Admin vê as ações no acervo e o "Exportar" no cabeçalho da ficha; usuário comum não vê nenhuma.
- JSON exportado reimportado cria ficha com mesmo nome, cor e `dados`.
- JSON inválido (não é JSON, formato/versão/tipo desconhecido, sem nome/dados) mostra erro no modal sem
  chamar a API; recusa do backend mostra a mensagem dele.
- Criatura editada fora da distribuição de criação é importada; usuário não admin recebe 403.
- Testes unitários das funções de montar/ler o envelope e da página; gate visual (`verify`) em `1920×1080` e
  `360×800`: menu aberto e modal de importar, comparados ao menu e ao modal "Duplicar"/"Atribuir" do acervo.

## Fecho

[Verificação](ficha-json-exportar-importar-admin/verificacao.md).
