# m6-08-impersonacao-administrativa.spec.md

> Extensão 8 do milestone `m6-gestao-usuarios-papeis.spec.md`.

> **Antes de qualquer UI:** ler `docs/design/DESIGN.md` e consumir os tokens do tema "Terminal
> de Contenção" (`docs/design/tema/`). O componente análogo aprovado é a linha de usuário da
> gestão administrativa (`m6-05`): preservar sua densidade, hierarquia, botões de ação e
> comportamento responsivo.

## Objetivo

Permitir que um `ADMIN`, pela tela `/admin/usuarios`, encerre sua sessão atual e abra uma sessão
real como o usuário selecionado, sem conhecer nem alterar a senha da conta. A finalidade é testar e
dar suporte reproduzindo exatamente as permissões e a experiência daquele usuário.

## Comportamento Fixado

- A ação se chama **"Logar como"** e exige confirmação explícita com o nome e o login do alvo.
- Ao confirmar, o backend emite um token novo para a identidade selecionada e o frontend
  **substitui** integralmente a sessão administrativa pela sessão retornada.
- Não existem duas sessões simultâneas, token administrativo oculto, banner de impersonação ou
  botão "voltar ao admin". Para recuperar a conta administrativa, é necessário encerrar a sessão
  impersonada e fazer login novamente com as credenciais do admin.
- A sessão emitida possui exatamente o tipo, `tokenVersao`, id, nome e login atuais da conta alvo.
  Depois da troca, guards, menus, REST e WebSocket tratam o navegador como aquele usuário, sem
  privilégio administrativo residual.

## Entregáveis

1. **Contrato compartilhado** de entrada com o id do usuário alvo e retorno compatível com
   `UsuarioAutenticadoDto`. O nome deve seguir `.agents/skills/dto-conventions/SKILL.md` durante a
   implementação; nenhum DTO expõe senha ou hash.
2. **Endpoint administrativo** no módulo de usuário, protegido por
   `@TiposPermitidos(TipoUsuarioEnum.ADMIN)`, que:
   - recupera a conta alvo pelo banco, incluindo tipo e versão de token atuais;
   - recusa conta inexistente ou com `is_deleted = true`;
   - recusa impersonar a própria conta, pois isso não produz troca de identidade;
   - emite o JWT pelo mesmo mecanismo canônico do login, sem validar, receber, redefinir ou revelar
     a senha do alvo;
   - não altera `token_versao` e não derruba outras sessões já abertas pelo usuário alvo.
3. **Rastreabilidade persistente** da operação, registrando no banco o id do admin de origem, o id
   do usuário alvo e a data da impersonação. O registro deve ser inserido somente após a validação
   bem-sucedida e nunca conter token, senha ou hash. A migration e o SQL seguem as regras de
   `BaseEntity`, nomes explícitos e `INSERT ... SELECT` do projeto.
4. **Ação na gestão de usuários**: cada conta ativa diferente do admin atual oferece o botão
   "Logar como". Contas excluídas e a própria linha não oferecem a ação.
5. **Confirmação inline** no padrão da tela: informa que a sessão administrativa será encerrada
   e exige confirmar ou cancelar. Cliques externos/cancelamento não trocam a sessão.
6. **Troca de sessão no frontend** via responsabilidade explícita do `SessaoService`: persistir o
   `UsuarioAutenticadoDto` retornado como a única sessão, atualizar Signals/consumidores e navegar
   para `/painel`. O cliente WebSocket deve acompanhar a troca pelo mecanismo de sessão existente.
7. **Testes** de controller/service/repository e frontend cobrindo autorização, validações,
   auditoria, substituição integral da sessão, navegação e ausência do botão nos alvos proibidos.

## Critérios de Aceite

- Um admin consegue selecionar uma conta ativa, confirmar "Logar como" e chegar a `/painel` com
  id, nome, login, tipo e token pertencentes ao usuário alvo.
- Depois da troca, uma rota exclusiva de admin é negada quando o alvo não é `ADMIN`; nenhum token
  ou privilégio da sessão anterior permanece acessível no frontend.
- `NORMAL`, `TESTER` e requisições sem sessão não conseguem usar o endpoint.
- Conta excluída, id inexistente e o próprio admin são recusados sem substituir a sessão atual.
- A operação bem-sucedida deixa um registro persistente ligando admin, alvo e data, sem material
  de credencial.
- A senha do alvo não é solicitada, alterada, retornada nem registrada.
- A UI respeita o análogo da `m6-05`, funciona em `1920×1080` e `360×800`, não gera overflow e
  mantém alvos de toque de no mínimo 44 px.

## Fora de Escopo

- Manter a sessão administrativa em paralelo ou oferecer "voltar ao admin".
- Impersonar conta excluída ou contornar `token_versao`, tipo e permissões do alvo.
- Permitir impersonação por `TESTER`, mestre de campanha ou qualquer tipo diferente de `ADMIN`.
- Alterar senha, tipo, estado de exclusão ou demais dados da conta durante a operação.
- Uma tela geral de consulta/exportação dos registros de auditoria.

## Dependências

- `m6-02` (autorização global, sessão fresca e `tokenVersao`).
- `m6-05` (tela e service de gestão administrativa, `SessaoService` com tipo global).
- `m6-07` deve incluir a nova ação em sua validação mobile caso ainda não esteja concluída
  quando esta spec for executada; se já estiver, a própria `m6-08` assume o gate visual completo.
