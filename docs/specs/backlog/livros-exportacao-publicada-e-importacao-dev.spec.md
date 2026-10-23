# livros-exportacao-publicada-e-importacao-dev.spec.md

> Task avulsa · backlog · definição com o autor em 2026-10-22.
> Exportar em produção e importar no desenvolvimento **sempre a publicação atual**,
> para manter o banco local e a cópia gerada do Git acompanhando o livro oficial.

## Objetivo

Permitir ao administrador baixar um pacote estruturado dos livros publicados, sem
acesso direto ao banco de produção. Importar esse pacote no ambiente local e usar
o exportador existente para gerar os documentos e dados derivados que serão revisados
e commitados, sem editar manualmente `docs/core/`.

## Decisões e recorte

- **Acordado:** exportação pela administração; pacote estruturado; somente a versão
  `PUBLICADA` atual; importação no banco de dev; geração posterior para o Git.
- **Escolhas técnicas desta spec:** um pacote JSON com Sistema e Guia, cada qual com
  sua publicação atual, obtidas numa leitura consistente. A importação é ferramenta
  local, sem endpoint de escrita em produção. Não exige sincronização direta entre bancos.
- A versão atual é determinada pela ordenação de publicação existente, não pelo maior
  número editorial. `4.1.4 → 4.2.0` é exemplo; nenhuma versão é fixada no código.
- Esta task não transporta histórico. A consulta de mudanças em produção está na
  [spec própria](../done/livros-mudancas-publicadas-para-leitores.spec.md) e usa o histórico
  que já existe no banco de origem. Não há dependência de implementação entre elas.

## Entregáveis

> Anexos em `livros-exportacao-publicada-e-importacao-dev/`, ao lado da spec.
> Saídas brutas em `.artifacts/livros-exportacao-publicada-e-importacao-dev/` (ignoradas).

1. **Download administrativo.** Ação identificada como “Exportar livros publicados”
   na administração da Oficina, com carregamento, sucesso e erro recuperável. A API
   exige `ADMIN`, inclusive para requisição direta; resolve exclusivamente as versões
   publicadas atuais, mesmo que o admin esteja editando ou visualizando um rascunho.
   Se faltar publicação de qualquer livro esperado, falha claramente sem pacote parcial.
   Exportar é leitura: não publica, não altera peças e não grava no banco de produção.

2. **Contrato portátil e versionado.** Pacote com versão do formato de transporte,
   instante de exportação e, para cada livro, código, título, ordem, número editorial,
   formato do conteúdo, data original da publicação, nota e fotografia completa.
   Preservar `LivroVersaoConteudoDto`, identificadores estáveis das peças, hierarquia,
   tipos, dados, ordem, âncoras, referências internas e `ancorasAntigas`.
   Não transportar credenciais, usuários, ids relacionais dependentes do ambiente,
   cópia de trabalho, rascunhos ou publicações anteriores. Incluir hash de integridade
   do conteúdo e metadados, com serialização definida e teste; hash não é assinatura
   nem prova de procedência. O contrato vive em `shared/`, sem duplicação entre camadas.
   Ausência de nota continua válida; quando contiver Markdown, preservar o texto integral.

3. **Importação local com prévia.** Comando documentado recebe o caminho do pacote,
   valida formato, estrutura completa, integridade, códigos suportados e unicidade dos
   livros/identificadores antes de escrever. Modo de simulação apresenta origem declarada,
   versões locais e recebidas, quantidade de peças e quais livros serão substituídos,
   inclusive aviso de edições locais que seriam descartadas. Formato incompatível,
   pacote incompleto, duplicado ou malformado falha sem alteração.
   O comando bloqueia qualquer alvo fora do banco de desenvolvimento local permitido,
   conferindo ambiente, host, banco e usuário conforme as travas de `db:reset:dev`;
   `NODE_ENV` sozinho não basta. Exige usuário administrador **local** válido para autoria
   das operações; não procura nem recria o usuário de produção.

4. **Substituição explícita, atômica e repetível.** Importar num livro já existente
   exige opção explícita de substituição; sem ela, recusa sem mutação. Antes de substituir,
   salvar recuperação local verificável do estado afetado (cópia de trabalho, versões e
   âncoras anteriores), com caminho informado e procedimento de restauração documentado;
   falha ao preservar a recuperação impede a escrita. Arquivo de recuperação fica fora
   do versionamento e só é gerado após validar o alvo local.
   Todos os livros entram em uma transação; falha no segundo reverte o primeiro.
   A cópia de trabalho local passa a representar a fotografia recebida e a publicação
   atual local passa a ser a importada, conservando data editorial e nota originais;
   autoria técnica é local. Registros anteriores afetados são substituídos com soft delete,
   sem tocar campanhas, fichas, usuários ou outros dados. Mesma importação repetida sobre
   estado equivalente é operação sem mudança, sem duplicar peças/publicações. Mesmo número
   com conteúdo diferente nunca é tratado como equivalente só pelo número.

5. **Adaptação correta da fotografia à Oficina.** Resolver a diferença entre links
   congelados por âncora e links de trabalho por identificador, restaurar o mapa de âncoras
   antigas e remapear somente ids relacionais locais. Reutilizar validadores/projeções
   existentes e validar nos modos de fotografia e trabalho. Não chamar cegamente o
   importador inicial: ele foi feito para fixtures e sobrescreve a nota de publicação.
   Comparar o livro importado com o recebido para provar equivalência de leitura e
   estabilidade dos identificadores, inclusive após uma edição/publicação local de teste.

6. **Geração e operação documentadas.** Após a importação, executar
   `npm run regras:exportar`: gerar `docs/core/` com cabeçalhos/hashes canônicos e os
   derivados já previstos, como `condicoes.dados.ts`. Documentar em `docs/DEVELOPMENT.md`
   o fluxo download → simulação → importação → geração → revisão do diff → commit,
   comandos efetivamente criados, recuperação e limites. Falha na geração de arquivos
   deve ser reportada como etapa pendente, com possibilidade de repetir; não alegar
   atomicidade entre banco e sistema de arquivos. Pacotes baixados e recuperações não
   viram fontes concorrentes nem fixtures rastreadas por acidente.

## Critérios de Aceite

- Fixture de origem com publicação atual, anterior, rascunho e trabalho divergentes:
  pacote contém somente a atual de cada livro, com árvore e metadados esperados.
  Visitante, `NORMAL` e `TESTER` não conseguem usar a exportação administrativa.
- Testes de pacote adulterado/incompatível/incompleto, versão ausente, alvo não local,
  usuário inválido, falta da opção de substituição e falha na recuperação: zero mutações.
- Integração PostgreSQL comprova rollback entre os dois livros, repetição sem duplicação,
  substituição explícita, isolamento dos demais dados e restauração do estado anterior.
  Incluir conteúdo diferente com mesmo número editorial.
- Round-trip cobre peças ricas, links internos, âncora renomeada e links antigos:
  leitura local equivalente à origem; Oficina editável; republicação local mantém
  identificadores e referências válidos. Estado anterior pode ser recuperado.
- Exercitar ponta a ponta com banco de origem de teste e banco local isolado, sem mutar
  produção. Após importar, `npm run regras:exportar` e
  `npm run regras:exportar -- --conferir` passam; segunda execução não gera novo diff.
  Registrar que isso não equivale a teste operacional em produção.
- UI: análogo **menu Publicar e estados da Oficina**, em
  `frontend/src/app/modules/regras/oficina/oficina-publicar.component.*` e
  `oficina-barra.component.*`. Antes de editar, inspecionar e registrar shell, densidade,
  hierarquia, ícones, controles e responsividade. Reutilizar `shared/ui/` com API completa;
  ausência de primitivo exige decisão do autor, não contorno local.
  Gate `design-fidelity` + `verify`, inspeção pessoal do principal em `1920×1080` e
  `360×800`, claro/escuro: download, espera, falha/nova tentativa e ausência para não-admin.
  Comparar ao análogo; sem overflow, foco e toque corretos.
- Testes focados e gates de integração: testes/lint dos três workspaces, build,
  `npm run repo:verificar`; relatório com resultados, falhas preexistentes e limites.
  Aplicar `gerenciamento-de-impacto` a contratos/reuso, `dto-conventions` aos DTOs
  e `sql-migrations` às gravações/alterações de schema. Não executar importação destrutiva
  no banco de trabalho do autor para produzir evidência.

## Fora de Escopo

Sincronização automática ou bidirecional; acesso direto ao banco de produção;
importação pela UI ou em produção; merge de edições locais; transporte do histórico,
rascunhos ou usuários; dump geral do banco; mudanças de regras; edição manual dos
Markdown gerados; commit/push automático; alteração do seed/reset para importar o pacote
automaticamente; implementação da consulta pública de mudanças.

## Dependências

- `docs/SYSTEM.SPEC.md` §§1.1 e 3.1; `docs/CONVENTIONS.md`; `docs/SCHEMA.md`;
  `docs/DEVELOPMENT.md`; `docs/design/DESIGN.md` e `docs/design/tema/`.
- M11 concluída: `m11-03-importador-livros.spec.md`,
  `m11-04-publicacao-e-leitura-por-papel.spec.md` e
  `m11-10-troca-fonte-da-verdade.spec.md` em `docs/specs/done/`.
- Bases: `backend/src/modules/livro/{importador,exportador}/`,
  `backend/tools/regras/`, `shared/src/livro/` e contratos em `shared/src/dtos/livro/`.

## Riscos e Mitigação

- **Perder trabalho local:** simulação, substituição explícita e recuperação restaurável.
- **Confundir formato de transporte com versão editorial:** campos distintos e recusa
  de formato desconhecido; nunca inferir versão do conteúdo pelo nome do arquivo.
- **Histórico local divergir da origem:** esta operação substitui o recorte local; o
  pacote não promete reconstruir histórico nem comprovar mudanças de versões não trazidas.
- **Snapshot aparentemente correto com links quebrados:** teste após edição/publicação,
  incluindo âncoras antigas, além de comparação visual da leitura.
