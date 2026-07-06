# m2-03-usuario-perfil-senha.spec.md

> Task 3/8 do milestone `m2-auth-campanhas.spec.md`.

## Objetivo

Completar o módulo `usuario` com os endpoints self-service do usuário autenticado: recuperar
o próprio perfil e trocar a própria senha. Usa o `@ActiveUser()` e o guard global entregues
na m2-02.

## Entregáveis

1. **DTOs** em `shared/src/dtos/usuario/` (CONVENTIONS/`dto-conventions`): recuperação de
   perfil (saída **sem** a `senha`) e troca de senha
   (complemento `Senha` inteiro antes do verbo → `UsuarioSenhaAlterarDto`, com `senhaAtual` e
   `novaSenha`) e sua saída.
2. **Perfil** — endpoint que retorna os dados do usuário autenticado (`@ActiveUser()`), nunca
   a senha.
3. **Troca de senha** — service valida a `senhaAtual` (`bcrypt.compare`); se incorreta →
   `BusinessException`; grava a `novaSenha` encriptada (bcrypt). Repository só faz o SQL de
   alteração da coluna `senha` (soft-delete-safe, `WHERE is_deleted = false`).
4. Controller burra; service com a regra; repository só SQL — camadas conforme §7.

## Critérios de Aceite

- Perfil retorna os dados do usuário logado sem expor a senha.
- Troca de senha exige `senhaAtual` correta; senha incorreta é rejeitada com
  `BusinessException`; a nova senha fica encriptada (bcrypt).
- Teste de service para o caminho feliz e para a senha atual incorreta.

## Fora de Escopo

- Registro e login (m2-02).
- Recuperação de senha por e-mail (fora do v1).
- Administração de usuários por terceiros; edição de perfil de outro usuário.
- Frontend (m2-06).

## Dependências

- `m2-02` (`@ActiveUser()`, guard global, repositório de `usuario`).
