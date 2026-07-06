# m1-14-paridade-deploy-arquivamento.spec.md

> Task 14/14 do milestone `m1-calculadora-paridade.spec.md`.

## Objetivo

Fechar o M1: verificação de paridade lado a lado das 6 abas, deploy de produção na
Cloudflare e arquivamento do repo antigo — satisfazendo os critérios de aceite da milestone.

## Entregáveis

1. **Checklist de paridade lado a lado** (site antigo × novo) nas 6 abas (agente, dt,
   novo-agente, patente, descanso, compras), com divergências resolvidas ou documentadas
   (o documento do sistema vence sobre o código antigo).
2. **Verificação de "sem duplicação"**: confirmar que nenhuma regra de jogo está no
   front/back — tudo em `shared/regras` — e que 100% das fórmulas têm teste.
3. **Deploy de produção na Cloudflare**: o deploy nativo da m0-07 (Cloudflare Pages puxando
   do Git) publica no push para `master`; validar a calculadora no ar e **offline do backend**
   (Render dormindo não afeta).
4. **Arquivar `contratados-calculadora`**: marcar o repo antigo como arquivado e atualizar as
   referências em `docs/CONTEXT.md` / `README.md`.

## Critérios de Aceite

- Todos os critérios de aceite da `m1-calculadora-paridade.spec.md` satisfeitos.
- Calculadora nova no ar na Cloudflare, funcional sem backend; repo antigo arquivado.

## Fora de Escopo

- Novas features que não existem no site antigo.
- Login, campanhas, fichas, tempo real (M2+).

## Dependências

- Todas as tasks anteriores do M1 (`m1-01` a `m1-13`).
