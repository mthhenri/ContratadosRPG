# Reset e seed reproduzível do banco de desenvolvimento

**Data:** 2026-08-11  
**Estado:** design aprovado; aguardando revisão do documento antes do plano de implementação

## Objetivo

Tornar o banco PostgreSQL local descartável e reproduzível. Um único comando deve apagar todo o
estado acumulado de desenvolvimento, recriar o schema pelas migrations vigentes e popular um
cenário pequeno e estável para testes manuais de autenticação, campanhas, membros, permissões e
fichas de agente.

O fluxo é exclusivamente local. Ele não pode operar contra produção, Supabase ou qualquer banco
remoto.

## Comando e fluxo

O repositório terá o comando raiz `npm run db:reset:dev`. O fluxo será:

1. Validar todas as proteções de ambiente antes da primeira operação destrutiva.
2. Derrubar somente os recursos do PostgreSQL definidos pelo `docker-compose.yml` deste projeto e
   remover seu volume local de dados.
3. Subir o PostgreSQL e aguardar o healthcheck.
4. Executar todas as migrations com o Knex.
5. Executar um seed TypeScript de desenvolvimento.
6. Validar a presença e os relacionamentos das fixtures e apresentar um resumo final.

O reset é deliberadamente destrutivo e não cria backup. Essa decisão vale apenas para o banco
local de desenvolvimento e foi autorizada pelo autor em 2026-08-11.

## Proteções contra ambiente incorreto

O reset deve falhar antes de remover qualquer dado quando uma destas condições não for atendida:

- `APP_AMBIENTE` precisa ser exatamente `development`;
- `DB_HOST` precisa identificar a máquina local (`localhost`, `127.0.0.1` ou o serviço local do
  Compose, conforme o ponto de execução);
- o serviço, o projeto Compose e o volume alvo precisam ser os definidos pelo repositório;
- a configuração não pode conter host ou identificador associado a Supabase/produção;
- os comandos filhos devem encerrar o fluxo imediatamente ao falhar.

O script não aceitará URL de banco arbitrária nem receberá nome de volume, container ou banco por
argumento. Assim, o usuário não consegue ampliar acidentalmente o alvo do reset.

## Separação entre migrations e fixtures

As migrations continuam responsáveis somente pelo schema e pelos dados de referência necessários
em todos os ambientes. Fixtures descartáveis ficam em um seed próprio de desenvolvimento.

A migration histórica `0003 - Tabela usuario.sql` não será reescrita. Ela continuará criando a
conta inicial do autor, pois alterar uma migration já aplicada produziria divergência entre bancos.
O novo seed localizará essa conta pelo login `senhor.contratados` e preservará sua senha.

O seed será idempotente: poderá ser executado mais de uma vez sem duplicar usuários, campanhas,
membros ou fichas. Relações serão resolvidas por chaves de negócio estáveis durante a criação, sem
assumir IDs seriais específicos.

## Contas de desenvolvimento

O cenário terá quatro contas:

| Papel no cenário | Login | Nome |
|---|---|---|
| Autor | `senhor.contratados` | `Matheus` |
| Agente de testes | `codex.dev` | `Codex` |
| Jogador stub 1 | `jogador.stub.1` | `Jogador Stub 1` |
| Jogador stub 2 | `jogador.stub.2` | `Jogador Stub 2` |

A conta do autor mantém a credencial já existente. As outras três contas compartilham uma senha
simples e fixa, documentada junto ao comando de desenvolvimento, e o seed grava somente seu hash
bcrypt. O seed deve recusar execução fora de `development`; essas credenciais nunca são dados de
produção.

## Campanhas e membros

Serão criadas duas campanhas estáveis:

| Campanha | Mestre | Jogadores |
|---|---|---|
| `Campanha do Matheus` | Matheus | Codex, Jogador Stub 1, Jogador Stub 2 |
| `Campanha do Codex` | Codex | Matheus, Jogador Stub 1, Jogador Stub 2 |

Isso permite testar com os mesmos dados:

- visão e permissões do mestre;
- visão e permissões do jogador;
- equipe com vários membros;
- atribuição de dono de ficha;
- alternância entre uma campanha própria e uma campanha alheia.

Convites e demais campos gerados devem usar valores determinísticos válidos para desenvolvimento,
sem depender de dados aleatórios para identificar as campanhas.

## Fichas de agente

O seed criará somente fichas do tipo agente/jogador. Criaturas e NPCs ficam fora do escopo porque
esse fluxo ainda não existe no produto.

Serão criadas quatro fichas:

| Ficha | Dono | Campanha | Cor de identidade |
|---|---|---|---|
| Agente principal do Matheus | Matheus | Campanha do Matheus | distinta e válida |
| Agente do Codex | Codex | Campanha do Matheus | distinta e válida |
| Agente do Matheus | Matheus | Campanha do Codex | distinta e válida |
| Agente principal do Codex | Codex | Campanha do Codex | distinta e válida |

Cada ficha terá uma cor de identidade explícita e diferente das demais. As cores respeitarão o
formato e as validações atuais do campo `ficha.cor`.

O JSONB `dados` deve ser construído a partir de uma fixture mínima válida conforme os DTOs e regras
atuais de `shared/`. O seed não copiará dumps antigos nem perpetuará estruturas obsoletas. O
conteúdo precisa ser suficiente para abrir, visualizar e editar cada ficha pela aplicação real.

As fichas não terão imagens inicialmente. Arquivos locais e fixtures de upload poderão ser tratados
em uma tarefa posterior caso tragam valor para testes de armazenamento.

## Estrutura de implementação

As responsabilidades serão separadas em unidades pequenas:

- um orquestrador de reset, responsável apenas pelas proteções e pelos comandos Docker/Knex;
- um seed de desenvolvimento, responsável pela composição das fixtures e persistência;
- funções puras para descrever e validar o cenário esperado;
- scripts npm na raiz e no backend para fornecer a interface de execução.

O seed usará a camada de conexão do Knex apropriada para ferramentas de banco. Ele não passará por
controllers HTTP nem iniciará o NestJS, pois a finalidade é preparar infraestrutura local antes de
subir a aplicação.

## Falhas e recuperação

Qualquer falha encerra o processo com código diferente de zero e informa a etapa que falhou. Se o
erro ocorrer após a remoção do volume, o banco poderá estar vazio ou parcialmente recriado; rodar
novamente `npm run db:reset:dev` será o caminho oficial de recuperação.

O seed deve executar suas inserções relacionais em transação. Uma falha de fixture não deixará uma
mistura parcialmente populada depois que as migrations tiverem terminado.

## Verificação

A implementação deverá demonstrar:

- testes automatizados das proteções, incluindo rejeição de ambiente não development e host remoto;
- teste da descrição do cenário e de suas relações esperadas;
- reset real do volume local autorizado;
- migrations aplicadas do zero;
- seed concluído e repetido sem duplicação;
- consulta ao banco confirmando quatro usuários, duas campanhas, oito vínculos de campanha
  (dois mestres e seis jogadores) e quatro fichas com cores;
- login real com `senhor.contratados` e `codex.dev`;
- inspeção da aplicação real confirmando que ambos veem a campanha própria como mestre e a campanha
  oposta como jogador, e que as quatro fichas abrem corretamente.

Se a aplicação real ou o banco local não puderem ser executados, a tarefa permanecerá aberta; build
e testes isolados não substituirão essa verificação operacional.

## Fora de escopo

- qualquer reset, seed ou alteração de dados em produção;
- backup dos dados locais atuais;
- imagens de personagem e teste de upload;
- criaturas ou NPCs;
- dados volumosos para carga ou performance;
- IDs seriais fixos como contrato público;
- alteração da senha da conta `senhor.contratados`.
