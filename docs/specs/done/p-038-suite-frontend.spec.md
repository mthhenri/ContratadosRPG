# P-038 — Restaurar a suíte do frontend

> Task avulsa originada de `docs/context/PROBLEMS.md` P-038.

## Objetivo

Restaurar a confiabilidade da suíte completa do frontend, alinhando os fixtures e as assertivas aos
primitivos visuais atuais e eliminando o foco assíncrono disparado após o teardown do leitor de
documentos.

## Entregáveis

1. Os testes de `CampanhaDetalhe` consultam a marcação e os seletores canônicos adotados na UI-04,
   preservando a cobertura dos dois cenários afetados.
2. O teste de visão do jogador em `PainelEncontro` verifica que o `app-modal` nativo permanece
   fechado, em vez de exigir que ele seja removido do DOM.
3. `LeitorDocumentos` não tenta focar um elemento que já não existe após o componente ser
   destruído; há teste de regressão para esse ciclo de vida.

## Critérios de Aceite

- Os três arquivos afetados passam isoladamente no runner do frontend.
- `npm run test --workspace=frontend` termina sem falhas e sem erro não tratado de `focus()`.
- `npm run lint --workspace=frontend` termina sem erros.
- `npm run build --workspace=frontend` termina com sucesso.

## Fora de Escopo

- Alterar o comportamento visual ou a API dos primitivos da UI-04.
- Corrigir problemas de UI, acessibilidade ou testes fora dos três recortes apontados pela P-038.

## Dependências

Nenhuma. Consultar `docs/SYSTEM.SPEC.md`, `docs/CONVENTIONS.md` e a P-038 em
`docs/context/PROBLEMS.md`.

## Riscos e Mitigação

- Não enfraquecer testes para obter verde: cada alteração de fixture ou assertiva deve preservar o
  comportamento real que a página expõe. O teste de ciclo de vida deve reproduzir o teardown antes
  de validar a proteção.
