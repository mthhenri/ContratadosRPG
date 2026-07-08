# m3-04-ficha-acesso-visualizacao.spec.md

> Task 4/9 do milestone `m3-ficha-jogador.spec.md`.

## Objetivo

Concessão e revogação de **acesso de visualização** de uma ficha a outro membro da campanha
(`usuario_ficha_acesso`), fechando a matriz de permissões §14 — o "outro membro vê só com
linha em `usuario_ficha_acesso`". Só apresentação de dados de acesso; edição por terceiros
**nunca** existe.

## Entregáveis

1. **DTOs** em `shared/src/dtos/ficha/`: conceder / concedido, revogar / revogado, listar
   acessos / resumo. **Complemento inteiro antes do verbo**: `FichaAcessoConcederDto`
   (nunca `FichaConcederAcessoDto` — CONVENTIONS / proibição de complemento partido).
2. **`concederAcesso`** e **`revogarAcesso`** (service): só o **dono** ou o **mestre** da
   campanha concedem/revogam — validado no service (único árbitro — proibição #28);
   `UnauthorizedAccessException` caso contrário. **`listarAcessos`** de uma ficha.
   Idempotência garantida pelo índice único parcial
   `uix_usuario_ficha_acesso_ficha_usuario_ativo`; revogação é soft delete.
3. **Integração com a leitura de permissão de `m3-03`**: `recuperarFicha`/`listarFichas`
   para "outro membro" passam a considerar a linha de acesso concedida.
4. **Repository** dono das queries de `usuario_ficha_acesso` (SELECT com `is_deleted = false`;
   INSERT `... SELECT ... RETURNING`; soft delete na revogação; proibição #23).
5. **Testes de service**: quem pode conceder/revogar e o efeito na visibilidade da ficha.

## Critérios de Aceite

- Terceiro só enxerga a ficha **após** o acesso ser concedido; a revogação volta a ocultá-la.
- Só dono ou mestre concede/revoga (não-autorizado → `UnauthorizedAccessException`).
- Matriz §14 fechada e coberta por testes.

## Fora de Escopo

- Tempo real (WebSocket) — `m3-05`.
- Frontend — `m3-07` (UI de concessão) / demais telas.
- Edição por terceiros (não existe — só visualização).

## Dependências

- `m3-03` (módulo `ficha` e a leitura de permissão a estender).
- `m3-02` (tabela `usuario_ficha_acesso`).
