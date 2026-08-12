# Design da M6-05 — Gestão de usuários

## Objetivo

Entregar uma área administrativa para gerenciar o ciclo de vida das contas, preservando a
identidade visual "Terminal de Contenção" e a densidade da listagem de campanhas.

## Navegação e autorização

- A navegação principal ganha o item `Admin` entre `Fichas` e `Calculadora`.
- O item aparece somente quando `SessaoService.usuario()?.tipo` é
  `TipoUsuarioEnum.ADMIN`.
- O item leva diretamente a `/admin/usuarios`.
- A rota é protegida por `adminGuard`; usuários não administradores são redirecionados para
  `/painel`, mesmo quando digitam a URL diretamente.
- No mobile, o item segue o padrão atual da topbar e mantém somente o ícone visível.

Não haverá submenu administrativo nesta tarefa: existe apenas uma área administrativa, e um
nível adicional de navegação não acrescentaria contexto útil.

## Estrutura visual

O componente análogo aprovado é a tela de campanhas: shell central, cabeçalho mono, busca,
controles compactos, avatares, chips e ações por registro. A tela terá:

1. cabeçalho `Gestão de Usuários`, com ação para criar conta;
2. faixa de filtros com busca por nome/login, filtro de tipo e controle de lixeira;
3. listagem paginada com identidade, login, rótulo do tipo, estado e ações;
4. estados de carregamento, vazio e lixeira vazia coerentes com o produto.

Todos os estilos consomem tokens do tema. Não haverá cores, fontes ou raios hardcoded.

## Interações por linha

- `Editar` abre, na própria linha, os campos de nome e login.
- `Redefinir senha` expande a linha e mostra somente o campo de nova senha, o controle de
  visibilidade já usado no perfil e as ações `Cancelar` e `Salvar nova senha`.
- A senha atual nunca é exibida ou recuperada.
- `Trocar tipo` expande a linha com um seletor contendo `Normal`, `Administrador` e
  `Testador`.
- Apenas um editor pode ficar aberto por vez. Salvar ou cancelar recolhe a linha.
- `Excluir` usa confirmação forte antes da chamada destrutiva.
- Na visualização da lixeira, a ação principal do registro é `Reativar`.

A criação de conta usa um painel de formulário integrado à tela, acima da listagem, para
evitar uma página separada e manter o mesmo vocabulário de expansão inline.

## Arquitetura e dados

- `UsuarioAdminService` concentra apenas o transporte HTTP dos endpoints administrativos e
  extrai `dados` de `StandardResponse`; o `UsuarioService` atual permanece responsável pelo
  perfil do próprio usuário.
- A página standalone usa Signals para estado de listagem/editor e Reactive Forms para todos
  os formulários.
- Busca, tipo, lixeira e paginação são enviados por `UsuarioListarDto`; nenhuma filtragem de
  negócio é duplicada no frontend.
- Os rótulos de tipo vêm de `tipoDescricao` na listagem e de um mapa local explícito no
  seletor, nunca do código cru.
- Erros de negócio continuam sob responsabilidade do interceptor global, que apresenta
  `StandardResponse.mensagem` em toast.

## Testes e verificação

- Testes do `adminGuard` cobrem acesso administrativo e redirecionamento.
- Testes do serviço cobrem verbo, rota, corpo/query e extração dos envelopes.
- Testes da página cobrem filtros, editores inline, criação, exclusão, reativação e recarga da
  listagem após mutações.
- Testes do layout cobrem visibilidade e destino do item `Admin`.
- A verificação ao vivo percorre desktop `1920×1080` e mobile `360×800`, incluindo listagem,
  busca/filtros, criação, edição, senha, tipo, exclusão, lixeira, reativação e bloqueio de
  usuário não administrador.

## Limites

Não inclui backend, guard genérico por tipo, tela de acesso negado nem um painel com múltiplas
seções administrativas. O refinamento mobile amplo permanece na M6-07, sem dispensar a
verificação obrigatória de ausência de quebra e overflow em `360×800` nesta tarefa.
