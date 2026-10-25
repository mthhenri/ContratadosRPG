# Plano — transporte de livros publicados

Spec: [livros-exportacao-publicada-e-importacao-dev.spec.md](../livros-exportacao-publicada-e-importacao-dev.spec.md).

## Objetivo e arquitetura

API administrativa exporta pacote JSON dos dois livros publicados numa leitura SQL
consistente. Contratos aditivos em shared; serialização canônica/hash e validação em
backend/transporte. Ferramenta CLI local valida, simula, substitui em transação e
preserva recuperação restaurável antes da primeira escrita. UI só solicita e baixa.

## Contrato e responsabilidades

- `LivroPacoteDto`: formato:number (1), exportacaoData:string ISO, livros:
  readonly LivroPacoteItemDto[], sha256:string hexadecimal.
- `LivroPacoteItemDto`: codigo, titulo, ordem:number, numero, formato:number,
  publicacaoData:string ISO original, nota:string|null, conteudo:LivroVersaoConteudoDto.
- Exatamente Sistema e Guia; campos de identidade/editoriais coerentes com conteudo.
  Hash SHA-256 sobre serialização canônica do objeto sem sha256 (chaves ordenadas
  recursivamente, ordem dos arrays preservada). Não é assinatura de origem.
- `backend/src/modules/livro/transporte/pacote-livros.ts`: `criarPacoteLivros(livros,
  exportacaoData?)`, `validarPacoteLivros(valor:unknown)`, `serializarCanonico(valor)`.
  Validação estrutural e dos hashes antes de qualquer I/O mutável; só formatos conhecidos.
- GET `/livros/pacotes/publicados`, ADMIN, no-store. SQL único seleciona as duas últimas
  PUBLICADA por data/id; faltante falha sem pacote parcial, sem leitura do trabalho.
- CLI nova `regras:importar-pacote`, sem mudar `regras:importar` usado no deploy:
  `--arquivo=<pacote> --usuario=<id> [--simular] [--substituir]`.
  Recuperação possui comando separado `regras:restaurar-pacote` e valida mesmo alvo local.
- Guarda existente reset-dev exige development/localhost ou127.0.0.1/contratados_rpg/
  postgres/local; porta TCP pode ser isolada. CLI constrói conexão SOMENTE da configuração
  validada, inclusive modo simular. Usuário administrador local obrigatório.
- Recuperação local ignora Git, inclui estado afetado/âncoras/histórico e alvo verificável;
  falha ao gravar/verificar o arquivo impede mutação. Conjunto inteiro em uma transação.
- UUIDs existentes, inclusive inativos, são reutilizados no mesmo livro; colisão em outro
  livro recusa. Não violar unicidade, fazer DELETE físico nem trocar identidade estável.
- Originais em docs/core e derivados só pelo exportador canônico; teste de geração usa
  destino temporário isolado para não substituir fontes oficiais por fixtures.

## Análogo e impacto antes da UI

Análogo: barra/menu Publicar da Oficina, mesma densidade, botões pequenos, ícones
genéricos de ação, feedback pela NotificacaoService e estados carregando/desabilitado.
Novo componente `OficinaExportar` ao lado do Publicar, sem ampliar primitivo; usa Botao
com variante/estilo/tamanho completos e alvo móvel44px. Sem novo ícone de domínio.
Impacto de contratos e repositórios será mapeado, preservando consumidores existentes.

## Execução e verificação

- [x] Pacote/API: testes primeiro de canonicalização, corrupção/shape, formatos,
  seleção/admin e faltantes; API/DTOs/contratos OpenAPI e testes focados.
- [x] Importação: testes primeiro de guard, prévia, autorização, recuperação, repetição,
  colisões/links/âncoras e transação/rollback/restauração reais em PostgreSQL isolado.
- [x] UI: componente/serviço de download, teste de sucesso/erro/retry e bloqueios;
  integração canônica na Oficina, nenhuma exportação exposta a usuário comum.
- [x] Integração real: origem separada e Postgres local em porta isolada com nome
  contratados_rpg; round-trip de pacote, edição/republicação local e recuperação.
  Geração Markdown/condições e conferência determinística em diretório temporário.
- [x] Principal verifica UI1920×1080/360×800, claro/escuro, estados, download e retry;
  ampliar a notebook/tela dividida conforme verify. Revisão independente de segurança,
  persistência e backup; gates build/lint/testes, repo:verificar; registrar contexto.

## Foco de revisão

Alvo/porta de DB validada diferente da conexão usada; dump incompleto; perda de edições;
hash sem metadados; UUID inativo duplicado; pai/âncoras inválidos após importação;
recovery modificando snapshot imutável; idempotência comparando só número;
exportação de rascunho/trabalho; gravação em produção ou fontes canônicas durante testes.
