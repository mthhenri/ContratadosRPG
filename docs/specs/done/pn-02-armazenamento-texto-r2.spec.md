# pn-02-armazenamento-texto-r2.spec.md

> Task 2/5 do guarda-chuva `patchnotes-versao-sistema.spec.md` (entregáveis `pn-02`).

## Objetivo

Permitir que `core/armazenamento` leia e grave texto (não só imagem), nas duas implementações, para
servir os patchnotes do R2.

## Entregáveis

1. `ArmazenamentoProvedor` ganha `lerTexto({ chave }) → string | null` (nulo quando não existe) e `salvarTexto({ chave, conteudo })`, com os DTOs `ArmazenamentoTextoLer`/`ArmazenamentoTextoSalvar` no arquivo da interface.
2. `ArmazenamentoPastaEnum.PATCHNOTES` (`patchnotes/`) e `construirChaveTexto(pasta, nomeArquivo)` em `armazenamento-chave.util.ts`, que recusa nome com separador de caminho ou `..`.
3. Implementação local (disco em `backend/uploads/`) e R2 (`GetObject`/`PutObject`), com `NoSuchKey` → `null`.
4. Ajustar qualquer teste-duplo que implemente a interface.

## Critérios de Aceite

1. Testes das duas implementações no padrão dos `*.provedor.spec.ts`: ida e volta, chave inexistente → `null`, chave maliciosa recusada.
2. `npm run test --workspace=backend` e lint verdes; sem regressão em `salvarImagem`/`excluirImagem`.

## Fora de Escopo

- Módulo, endpoints e cache dos patchnotes (`pn-03`); script de publicação (`pn-05`).

## Dependências

Nenhuma.
