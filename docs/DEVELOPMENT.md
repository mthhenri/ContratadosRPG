# Ambiente de desenvolvimento

## Trazer a publicação atual dos livros

Na Oficina, entre como administrador e use **Exportar livros publicados**. O JSON
contém a publicação atual de Sistema e Guia, mesmo com rascunhos ou edições pendentes.
Se faltar uma publicação, o download falha por inteiro. A ação apenas lê o banco.

No ambiente local, confira a conexão do `.env` da raiz antes dos comandos. A ferramenta
aceita somente `APP_AMBIENTE=development`, `DB_HOST=localhost` ou `127.0.0.1`,
`DB_NOME=contratados_rpg`, `DB_USUARIO=postgres` e `ARMAZENAMENTO_PROVEDOR=local`.
`DB_PORT` deve ser uma porta TCP válida; a conexão usa exatamente o alvo validado,
inclusive na simulação. `--usuario` é o **id de um administrador ativo local**.

```bash
npm run regras:importar-pacote -- --arquivo="C:/Downloads/livros-publicados.json" --usuario=1 --simular
npm run regras:importar-pacote -- --arquivo="C:/Downloads/livros-publicados.json" --usuario=1 --substituir
npm run regras:exportar
npm run regras:exportar -- --conferir
```

A prévia mostra as versões locais e recebidas, quantidades e substituições, incluindo
o descarte de trabalho local divergente. Confirme esse resultado antes de executar
com `--substituir`: a operação substitui os dois livros, sem mesclar edições.
Repetir sobre estado equivalente não duplica peças ou publicações. Mesmo número
editorial com conteúdo diferente exige substituição. Não use o importador inicial
`regras:importar` para esse fluxo.

Antes da escrita, a ferramenta salva e relê uma recuperação em
`.artifacts/livros-exportacao-publicada-e-importacao-dev/recuperacoes/`, informando o
caminho. Sem recuperação verificável não há substituição. O arquivo preserva o
estado lógico ativo anterior: trabalho, versões locais (inclusive rascunhos) e
âncoras antigas. Não inclui registros que já estavam excluídos. A restauração fica
vinculada ao mesmo banco e instância PostgreSQL, além de host e porta.

```bash
npm run regras:restaurar-pacote -- --arquivo="C:/caminho/recuperacao.json" --usuario=1 --simular
npm run regras:restaurar-pacote -- --arquivo="C:/caminho/recuperacao.json" --usuario=1 --substituir
```

A restauração também preserva o estado que será substituído. Guarde os arquivos de
recuperação enquanto precisar reverter. Pacotes e recuperações ficam fora do Git;
não os transforme em fixtures ou fontes de regras. O SHA-256 verifica integridade
do conteúdo e metadados, mas não comprova a procedência do arquivo.

Depois de gerar os documentos, revise o diff de `docs/core/` e dos derivados, execute
as verificações do repositório e faça o commit normalmente. A importação conserva
data e nota originais, usa autoria técnica local e não transporta histórico da origem,
usuários, fichas ou campanhas. O histórico anterior local fica substituído por soft
delete e pode ser recuperado pelo arquivo. Banco e arquivos gerados são etapas
separadas: se a geração falhar, corrija a causa e repita `regras:exportar`; o sucesso
da importação não significa que os arquivos já foram gerados ou commitados.

## Documentação de tarefas e verificação do repositório

Specs e seus anexos seguem [`SYSTEM.SPEC.md` §3.1](SYSTEM.SPEC.md#31-documentação-de-tarefa-e-artefatos-de-execução)
e o [mapa de specs](specs/README.md). Capturas e saídas brutas vão para
`.artifacts/<tarefa>/`, ignorada pelo Git. Antes de fechar uma tarefa execute
`npm run repo:test` e `npm run repo:verificar`; depois de preparar um commit,
execute `npm run repo:verificar -- --staged`. O CI verifica o índice e os espelhos.

## Cache local do Angular

O cache persistente fica em `frontend/.angular/cache-local/`, configurado por
`cli.cache.path` em `frontend/angular.json`. Continua habilitado no ambiente local;
o build habitual é `npm run build --workspace=frontend`, sem definir `CI=true`.
Confira o estado com `npm run ng --workspace=frontend -- cache info`.

Na P-104, abrir o banco LMDB do caminho anterior `.angular/cache/` encerrava o
processo nativo no Windows. A recuperação criou uma base nova pelo mecanismo
oficial de configuração do Angular, preservando a base anterior e processos em uso.
Não apague caches de sessões concorrentes. Em outra ocorrência, investigue antes
de repetir a recuperação; não há diagnóstico do defeito interno do módulo nativo.

## Banco local reproduzível

O comando abaixo **apaga sem backup** o volume PostgreSQL local deste repositório, recria o schema
pelas migrations e popula fixtures determinísticas:

```bash
npm run db:reset:dev
```

O reset recusa execução antes de chamar Docker se o ambiente não for exatamente o alvo local
canônico: `APP_AMBIENTE=development`, `DB_HOST=localhost` ou `127.0.0.1`,
`DB_NOME=contratados_rpg`, `DB_USUARIO=postgres` e `ARMAZENAMENTO_PROVEDOR=local`. Serviço e volume
não são argumentos configuráveis; o comando opera somente sobre o `docker-compose.yml` desta raiz.

Se uma etapa falhar depois da remoção do volume, execute novamente `npm run db:reset:dev`. O fluxo é
fail-fast e essa repetição é o procedimento oficial de recuperação.

Para reconciliar somente as fixtures, sem remover o volume nem outros dados locais:

```bash
npm run db:seed:dev
```

O seed é idempotente e transacional. Ele não reescreve migrations históricas nem altera a senha da
conta `senhor.contratados`.

## Contas padrão

| Login | Senha | Uso |
|---|---|---|
| `senhor.contratados` | credencial pessoal existente | mestre da campanha própria e jogador da campanha do Codex |
| `codex.dev` | `contratados.dev` | mestre da campanha própria e jogador da campanha do Matheus |
| `jogador.stub.1` | `contratados.dev` | jogador stub nas duas campanhas |
| `jogador.stub.2` | `contratados.dev` | jogador stub nas duas campanhas |
| `espectador.stub` | mesma senha das contas dev acima | espectador nas duas campanhas |

Essas credenciais compartilhadas são exclusivamente locais. O guard impede a execução do seed em
produção ou contra banco remoto.

## Cenário criado

- `Campanha do Matheus`: Matheus é mestre; Codex e os dois stubs são jogadores.
- `Campanha do Codex`: Codex é mestre; Matheus e os dois stubs são jogadores.
- Cada campanha contém uma ficha de agente de Matheus, Codex e de cada um dos dois stubs.
- As oito fichas são diferentes entre as campanhas, têm cores de identidade distintas e retratos locais.
  Atributos respeitam criação, progressão e bônus de especialização; o pacote inicial de quatro Gerais,
  escolhas de habilidades por Nível, Personalidade, Origem e preset de Iniciativa estão preenchidos.
  Vida, Energia e derivados usam `shared/regras`, com as habilidades já materializadas.
- Cada campanha também ganha ao menos uma criatura de teste (`CENARIO_DEV.criaturas`), sempre de
  posse do mestre daquela campanha e validada contra `shared/regras/criatura`. Seus ataques têm
  tipos de dano explícitos, inclusive nas fórmulas de crítico.
- Cada campanha ganha três NPCs (`CENARIO_DEV.npcs`): Civil, Operativo e Elite, com identidade,
  competências, equipamento, habilidades da biblioteca, sanidade e conduta de combate. As categorias
  exercitam ausência de Energia, reserva fixa e pool com recarga. Os NPCs pertencem ao mestre,
  não possuem retrato obrigatório e não são compartilhados nem geram rolagens públicas pelo seed.

Os convites determinísticos são `DEVMT001` e `DEVCD001`. IDs seriais não fazem parte do contrato do
cenário e não devem ser assumidos por testes ou ferramentas.

O reset recria também as tabelas de livros; o seed de campanhas não importa publicações. Para
conservar os livros locais, preserve o pacote de publicações antes do reset e restaure-o com
`regras:importar-pacote` depois (seção "Trazer a publicação atual dos livros", acima).
