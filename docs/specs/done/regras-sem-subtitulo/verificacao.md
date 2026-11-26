# Verificação — regras-sem-subtitulo

> Anexo de `regras-sem-subtitulo.spec.md`. 25/11/2026. Capturas em `.artifacts/regras-sem-subtitulo/` (ignorada).

## Gates

| Verificação | Resultado |
|---|---|
| Testes novos antes da mudança | 2 falharam pelo motivo esperado (publicação repetia "Nova Era"; linha vazia desenhada) |
| `npm run test --workspace=backend` | 82 arquivos passados (9 ignorados), 1.361 testes (100 ignorados) |
| Frontend, suíte completa com `NODE_OPTIONS=--no-experimental-webstorage` | 298 arquivos, 3.685 testes passados |
| Frontend sem essa opção (Node 26.13.0) | 33 arquivos falham por `localStorage` indefinido — `P-138`, ambiente |
| `tsc` backend e frontend, build do frontend | ok |
| ESLint nos arquivos tocados | 0 erros (avisos de aspas, padrão dos arquivos do backend) |

## Aplicação real

Leitor `/regras/sistema` em 1920×1080 e 360×800, base escura, com o subtítulo atual e com ele vazio (resposta da API
reescrita no navegador, sem tocar no banco): sem a linha, ficam selo de versão e "Contratados", sem vão sobrando e sem
overflow horizontal. Análogo: a própria capa.

## Não verificado

- Publicação real pela Oficina (o autor publica); base clara; exportação de `docs/core/`, que só muda após publicar.
