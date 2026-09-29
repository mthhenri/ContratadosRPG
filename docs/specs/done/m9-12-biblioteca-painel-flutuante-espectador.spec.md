# m9-12-biblioteca-painel-flutuante-espectador.spec.md

> **Task avulsa pós-M9 (pedido direto do autor, 2026-09-29).** Estende a `m9-11` ao espectador, que
> lá ficou fora de escopo. Antes de qualquer UI: `docs/design/DESIGN.md` "Biblioteca de documentos"
> (bullet "Forma flutuante") e o handoff em `docs/design/tema/`.

## Objetivo

No **Painel do espectador** (`/campanhas/:id/espectador`), o item "Biblioteca" deixa de navegar e
passa a abrir a Biblioteca em painel flutuante (`BibliotecaFlutuante`, da `m9-11`), na forma
leitura. A página do espectador (`/campanhas/:id/espectador/documentos`) continua existindo e é
aberta pelo botão do próprio painel.

## Análogo aprovado

A tela da campanha na `m9-11` (`detalhe-jogador`): o item existente da coluna troca `routerLink`
por `alternar()` + `[pressionado]`, e o painel é montado fora da prévia.

## Entregáveis

1. `BibliotecaFlutuante` ganha o input `paginaRota` (opcional; padrão
   `['/campanhas', campanhaId, 'documentos']`), usado pelo botão "Abrir página da Biblioteca". Nenhum
   outro comportamento do painel muda.
2. `espectador.page`: o item "Biblioteca" da coluna (que no celular vira a barra inferior) vira
   `button` com `[pressionado]` = painel aberto e `(click)` = `alternar()`; o painel é montado com
   `ehMestre=false` e `paginaRota=['/campanhas', id, 'espectador', 'documentos']`, só fora da prévia
   do mestre. Na prévia, o item continua desabilitado com o tooltip de indisponível, como hoje.
3. `DESIGN.md` ("Forma flutuante") e `docs/context/` atualizados.

## Critérios de Aceite

- [ ] No Painel do espectador, o item "Biblioteca" abre e fecha o painel, e `[pressionado]`
      acompanha; nenhuma requisição de documento antes da primeira abertura.
- [ ] O espectador vê só o revelado, sem chip de estado nem Revelar/Ocultar; o revelado entra ao vivo
      e o aberto ocultado fecha com o aviso.
- [ ] "Abrir página da Biblioteca" leva a `/campanhas/:id/espectador/documentos` (não à rota do
      jogador, que o devolveria à campanha).
- [ ] Na prévia do mestre como espectador, o item continua desabilitado e o painel não é montado.
- [ ] Teste focado: `BibliotecaFlutuante` com `paginaRota` e o item do Painel do espectador; suíte do
      frontend, build e lint verdes.
- [ ] Gate visual (`verify` + `design-fidelity`) em `1920×1080` e `360×800`: aberto, documento
      aberto, busca, minimizado; revelar ao vivo com o mestre em outra sessão.

## Fora de Escopo

- A Iniciativa do espectador (`/campanhas/:id/espectador/iniciativa`), que não tem coluna de ações —
  decisão do autor (2026-09-29): só o Painel do espectador.
- Qualquer mudança de backend, contrato ou permissão; a presença de leitura do espectador já é
  tratada pela `m9-09`/`m9-10`.

## Dependências

- `m9-11` (em `done/`).

## Riscos e Mitigação

- **Rota errada da página para o espectador:** coberta pelo input `paginaRota` e por teste.
- **Prévia do mestre:** o papel é resolvido depois da carga (`ehMestrePreview`); o painel só é
  montado fora da prévia, e o item da prévia continua desabilitado.

## Fecho

**Concluída em 2026-09-29.** Relato em `HISTORY.md` ("m9-12").

- **Análogo:** a tela da campanha da `m9-11` (item da coluna → `alternar()` + `[pressionado]`,
  painel montado fora da prévia).
- **Viewports/estados:** espectador em `1920×1080` e `360×800` — aberto, documento aberto, busca,
  minimizado; revelar/ocultar ao vivo com o mestre em outra sessão; botão para a página do
  espectador; prévia do mestre (desabilitado, sem painel); nenhuma requisição antes de abrir.
- **Ajuste além do previsto:** o painel só é montado depois de o papel ser resolvido
  (`papelResolvido`), para um clique antes da resolução não iniciar a prévia do mestre na forma
  leitura.
- **Comandos:** `npm run test --workspace=frontend` → 176 arquivos / 2516 testes; `ng build` limpo;
  lint sem warning novo.
- **Pendências:** nenhuma.
