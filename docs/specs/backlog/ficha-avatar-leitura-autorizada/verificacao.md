# Avatar autorizado — verificação local e gate externo aberto

## Estado em 20/10/2026

Implementação e verificação **locais** aprovadas. A spec permanece ativa: falta testar
a configuração real R2/CDN e executar seu corte operacional. O autor decidiu manter
esse gate aberto enquanto a parte local é concluída. Este registro não confirma
privacidade das URLs de produção nem invalidação de caches externos.

As quatro specs anteriores foram concluídas em sequência, com commits próprios:
`0c0f4b25`, `c65e9e42`, `d7fed945`, `f81cbcfa`. Este corte registra somente a quinta.

## Implementação e fronteiras

- Novos avatares: `/uploads/fichas/<uuid.ext>`, autenticados pela API. Pasta FICHAS
  local ou bucket R2 privado distinto, obrigatório na configuração. Nenhuma URL
  assinada reutilizável substitui a autorização vigente.
- FichaService consulta fatos de ficha, papéis e concessões em um único snapshot
  antes e depois do I/O. A autorização final reutiliza seu núcleo síncrono, sem
  outra espera antes de devolver bytes. Dono/mestre preservados; prévias avaliam
  o observador indicado depois de validar o mestre solicitante.
- Jogador visível mantém a identidade da carteirinha para membros autenticados,
  inclusive sem concessão de ficha completa. Ocultação suspende essa identidade
  para terceiros. Criatura/NPC usam a concessão; espectador só recebe jogadores
  públicos. Revogar concessão de criatura bloqueia avatar; revogar ficha completa
  de jogador visível não apaga a identidade pública já definida pelo produto.
- `/uploads/agentes/...` deixa de ser estático. Ficha ativa exige autorização;
  avulso ativo preserva leitura pública. Sem vínculo ativo, 404 mesmo com arquivo
  fisicamente no disco. Documentos e patchnotes conservam seus caminhos.
- Avatar, inclusive 401/403/404: `private, no-store`, `Vary: Authorization`,
  `nosniff`, sem ETag/304. StreamableFile não recebe o envelope JSON.
- Frontend usa HttpClient e objectURL por assinatura; limpa/cancela e revoga ao
  trocar sessão/contexto, invalidar ou reconectar. Sem cache compartilhado entre
  contas. URLs externas não recebem JWT por esse transporte. Falha usa o fallback
  existente, sem imagem quebrada ou aviso repetido.

## Impacto medido

`npm run impacto -- --simbolo imagemUrl`: 63 consumidores e 57 testes encontrados;
complementado por busca de img, AGENTES, uploads e renderização imperativa.

| Consumidor avaliado | Classe e resultado |
|---|---|
| FichaService: upload/substituição/exclusão | pedido; pasta privada e emissão preservada |
| FichaVisualizacao, CriaturaVisualizacao, NpcIdentidade | pedido/acompanha; transporte e fallback |
| FichaCampanhaCard, CartaoFichaAcervo | pedido; cartões preservados |
| DetalheJogador, DetalheMestre | pedido; membros/carteirinhas e preview |
| EspectadorFichaCard, CriaturaEsquadraoCard | acompanha; recortes preservados |
| EsquadraoCenaJogador | acompanha; consumidor da cena |
| TrilhaTurnos, SeletorCombatentes, CartaoCombatente, ResumoCombatente | pedido; ficha/avulso distintos |
| AjusteEnquadramentoImagem | acompanha; fonte privada e controles preservados |
| PreviewAvatar e preview manual do Acervo | pedido; assinatura cancelável |
| DocumentoService, PatchnoteService | distintos; mesmas pastas/URLs |
| Provedores/fábrica/configuração, faxina e migração | acompanha; pasta/bucket e ciclo de arquivo |
| Interceptor e OpenAPI | acompanha; resposta binária documentada |

Adaptados 15 templates e dois previews imperativos. Não houve controle, variante,
token, estilo ou layout novo. Nos componentes extensos, apenas conexão com o
transporte extraído em service/pipe; nenhuma autorização nova mora na UI.

## Gates executados

| Gate | Resultado |
|---|---|
| `npm run test --workspace=shared` | 1.340 aprovados, 77 arquivos |
| `npm run test --workspace=backend` | 1.313 aprovados; 99 ignorados em 8 arquivos já desabilitados |
| `npm run test --workspace=frontend` | 3.596 aprovados, 286 arquivos; sem erros não tratados |
| Builds shared/backend | aprovados |
| Build frontend produção, `CI=true`, um worker | aprovado; inicial 600,81 kB, aviso de orçamento 450 kB |
| `npm run lint` | zero erros; avisos de estilo existentes e do recorte |
| OpenAPI | regenerado e testado |
| `npm run repo:verificar` | organização e espelhos aprovados |

Build com cache local terminou com falha nativa Windows `3221225477`; sem cache
persistente (`CI=true`) a produção compilou. Tentativa em sandbox também encontrou
DNS de fontes indisponível. Nenhuma configuração permanente foi alterada para isso.
Dois testes antigos esperavam URL direta; agora verificam URL entregue ao transporte
e blob no DOM. Falhas foram corrigidas antes da suíte final aprovada.

Testes cobrem matriz de observadores, solta, prévia forjada, papel/posse/campanha,
concessões e mutações durante I/O e última consulta factual; traversal/symlink,
inventário recursivo, 404 e seleção de bucket. HTTP real usa Nest/Passport e pedidos
condicionais. **SDK R2 simulado não constitui teste real R2/CDN.**

## Aplicação real e comparação visual

API 3101, SPA 4301, Postgres real. Banco `contratados_auditoria_medias` e cópia de
uploads em `.artifacts/ficha-avatar-leitura-autorizada/uploads`; banco/arquivos
originais preservados. Observações realizadas em 19–20/10.

- REST: 25 leituras principais; upload, substituição/exclusão; B/S negados quando A
  oculta, A/M preservados, exibir restaura. Prévia M como B/S sem privilégio M.
- Legado: 9 leituras reais de `agentes/dev`, M/A autorizados, B/S/anônimo negados.
  Sem vínculo, arquivo ainda no disco recebe 404. URL antiga de avulso fechada e
  nova pública; ficha solta excluída por soft delete deixa de servir imagem.
- Migração simulada/aplicada na cópia: oito referências e dois órfãos inicialmente;
  depois avulso reemitido em URL pública nova, origem antiga copiada/removida.
  SHA-256 e diário recuperável verificados. Documentos/patchnotes preservados.
- Nove jornadas em quatro viewports: campanha J/M, acervo, ficha, criatura, NPC,
  encontro, prévia J e espectador. Imagens com largura natural positiva, sem erro
  de página/500 ou overflow horizontal.
- Hover ampliado, ocultar/exibir sem reload, dono preservado e limpeza de prévia/S.
  B desconectado não recebeu a invalidação; ao reconectar removeu cartão/avatar.
  Sentinela confirmou ausência de reload. Imagem permitida retida no browser antes
  da ocultação não restaurou o cartão ao ser liberada.
- Enquadramento e preview do acervo funcionaram; Cancelar fecha. No celular,
  Confirmar alcançável por rolagem, foco e hit-test. Negação controlada 403 no browser
  mostrou placeholder sem img quebrada em desktop/mobile; a negação REST é real.

Análogos: os próprios cartões, carteirinhas, identidade, trilha e enquadramento
aprovados antes da mudança. Inspeção pessoal do principal em 1920×1080, 360×800,
960×1080 e 1366×768: mesma densidade/hierarquia, controles/ícones, sem HTML genérico
ou overflow novo; foco, contraste e alcance mobile preservados. Enquadramento mobile
exige rolagem para botões, que foram observados e alcançados. Capturas/scripts/logs
são locais e ignorados em `.artifacts/`; este texto registra método e limites.

## Revisão e correções

Revisão independente Codex (modelo padrão), somente leitura: três achados
procedentes corrigidos. Autorização ainda aguardava após snapshot (agora factual
único/núcleo síncrono); NavigationCancel/Error mantinham bloqueio (retomada no
contexto atual); origem de avulso poderia pertencer a ficha excluída (reemissão de
todos os avulsos no corte, preservando só novos destinos comprovados pelo diário).

A API real encontrou ainda `?` de regex interpretado pelo Knex como binding.
Regex sem `?` e testes com compilador Knex real corrigiram os dois repositórios;
depois a matriz REST passou. Revisão final conferiu camadas, fonte única de
permissão, SQL parametrizado/soft delete, DTOs compartilhados e diff.
Delegação: implementadores Codex (modelo padrão) para backend/shared e frontend;
revisor independente Codex (modelo padrão). Integração/inspeção visual pelo principal.

## Pendências que impedem fecho integral

1. Ambiente controlado R2/CDN com dois buckets e aliases reais.
2. Confirmar bucket FICHAS sem r2.dev/domínio público; testar API, origem e URL
   conhecida antes/depois das mutações, com todos os observadores.
3. Testar transição, remoção de origens, purge de aliases/CDN e repetir leituras
   anônimas/negadas/condicionais sem cache.
4. Aprovação própria do corte em produção segundo [plano](plano.md) e DEPLOY.

Sem deploy, push ou migração em produção. Bytes já baixados permanecem fora do
controle do site. P-132 continua aberto no recorte externo. O commit local conserva
a spec em active e não aprova os gates pendentes.
