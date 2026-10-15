# Task 03 — implementação local e verificação

Branch `feat/transcricoes-03`, base `d7e6892e`. D02/D03 aprovadas pelo autor em
2026-10-14 após apresentação do desenho. A spec permanece **active**, sem
recertificar a 01 ou autorizar publicação, nuvem ou correções fora do recorte.

## Resultado implementado

- Contratos readonly no shared; migration 0038 com pedido, dispositivo e intenção.
- Backend: início limitado tecnicamente por processo, confirmação explícita de
  Mestre no site, segredo armazenado somente por hash, revogação própria,
  tokenVersao/exclusão e 90 dias de inatividade; credencial nunca autentica JWT web.
- Prova do segredo permite cancelar também pedido pendente. Cancelamento bloqueia
  o pedido e, com statement posterior, revoga dispositivo cuja confirmação venceu
  a corrida. Não apagar segredo por um 401; não substituir vínculo antes de revogar.
- Intenção de dois minutos, conta/sessão vinculadas, uso único e autorização atual
  de Mestre; guard do dispositivo e transação de resgate com revalidação.
- Site: sessões/criação/abertura do Mestre, confirmação do dispositivo e revogação
  pelo perfil. Instruções manuais permanecem disponíveis sem alegar detecção de
  instalação; download público não é oferecido antes de autorização de distribuição.
- Desktop: shell Qt, cliente HTTPS sem redirects, timeout/limite técnico de resposta,
  parsing fechado da URI, DPAPI sem fallback plaintext e namespace origem+conta.
  Falhas/offline preservam resultados; ações de rede fora da thread de interface.
- Código de PyInstaller onedir e instalador Inno Setup x64 por usuário, protocolo
  HKCU, menu Iniciar/desinstalação, hash local e mensagem nativa de erro de startup.
  Nenhum executável/instalador foi produzido neste host Linux.

## Verificações executadas

Evidência bruta somente local em `.artifacts/transcricoes-03-agente-windows-e-vinculo/`.
Não depende de publicar capturas para compreender o resultado abaixo.

| Verificação | Resultado |
|---|---|
| `npm run build --workspace=shared` | Aprovado |
| `npm run build --workspace=backend` | Aprovado após atualização dos contratos OpenAPI |
| `npm run build --workspace=frontend` | Aprovado; aviso preexistente de bundle acima de 450 kB (598 kB) |
| `npm run test --workspace=shared` | 1276/1276 |
| Service de dispositivo + OpenAPI focados | 17/17; suíte completa também executou esses testes |
| `TESTAR_POSTGRES_DISPOSITIVO=1 npm run test --workspace=backend -- dispositivo-postgres.spec.ts` | 14/14 em PostgreSQL 16 real, descartável |
| `TESTAR_API_DISPOSITIVO=1 npm run test --workspace=backend -- dispositivo-api.spec.ts` | 9/9 com Nest compilado, JWT/guards e PostgreSQL reais |
| `QT_QPA_PLATFORM=offscreen PYTHONPATH=desktop/transcriber/src /workspace/transcriber-03-venv/bin/python -m unittest discover -s desktop/transcriber/tests` | 16/16, incluindo Qt; plataforma Linux não certifica DPAPI/instalador Windows |
| `python -m compileall -q desktop/transcriber` | Aprovado |
| Testes Angular novos: `ng test --watch=false --include=src/app/modules/transcricao/*.spec.ts` | 6/6 após ajuste offline; conjunto afetado (transcrição + Perfil + Detalhe Mestre) 66/66 antes desse ajuste |
| `npm run lint --workspace=shared` | Aprovado, com warnings do repositório |
| `npm run lint --workspace=backend` | Aprovado, inclusive tsc de specs; warnings existentes/estilo |
| `npm run lint --workspace=frontend` | Dois erros preexistentes da Oficina; nenhuma alteração nessa fonte |
| `npm run test --workspace=backend` | 1139 aprovados, 2 falhas preexistentes de regra-peca, 59 opt-in/skips; testes reais desta task executados separadamente |
| `NODE_OPTIONS=--max-old-space-size=8192 npm run test --workspace=frontend` | Encerrado com código 137; suíte global não certificada |
| `npm run repo:test` | 14/14 |
| `npm run repo:verificar` / `git diff --check` | Organização aprovada / sem erro de whitespace; staged conferido antes do commit |

As duas falhas backend são os testes “cria o arquétipo com a habilidade inicial
vazia dentro dele” e “é atômico: falha ao criar a filha não deixa o arquétipo pela
metade”, já reproduzidos na base da 01. Lint frontend acusa
`oficina-texto.component.ts:234/235` (`no-irregular-whitespace`), fonte preservada.
Não corrigidos de passagem. Execuções iniciais de frontend em paralelo com builds
foram encerradas/uma captura caiu; os resultados finais abaixo são separados dessas
execuções incompletas. Não tratar exit 137 como teste aprovado ou defeito provado.

## Segurança e concorrência verificadas

Pedido pendente não autentica app, não revela conta e não confirma sem JWT;
ADMIN/TESTER/jogador sem papel de Mestre não vinculam. JWT web não autentica app;
segredo do app não autentica campanha. Formato/entrada extra rejeitados antes de SQL.
Código diferente, pedido expirado/duplicado, conta errada, credencial revogada,
exclusão/tokenVersao e 90 dias sem uso rejeitados. Web revoga somente dispositivo
próprio; app cancela pedido por prova do segredo sem depender de confirmação.

Dois confirmadores/resgates concorrentes produzem no máximo um sucesso; revogação
que vence resgate impede contexto; mudança de tokenVersao entre guard e resgate
rejeitada. Cancelamento após esperar confirmação revoga dispositivo recém-criado.
Falha de autorização na sessão dá rollback do consumo. Transferência de Mestre
rejeitada em REST real sem consumir intenção. Migration UP/DOWN exercitada somente
no banco descartável; nenhum banco existente foi migrado.

## Inspeção visual e jornada web

Chromium local com Angular, API e banco reais. Login real; campanha/sessão de teste;
confirmação pelo código no site, prova do segredo vinculada e fallback de app ausente
sem rede ou sem confirmação. Revogação verificada numa janela separada do protocolo
nativo; perda de internet mostra feedback na tela. Nenhum Windows foi simulado.

24 capturas: sessões, vínculo e dispositivos × 1920×1080, 1366×768, 960×1080,
360×800 × base clara/escura. Sem overflow horizontal, controles com alvo ≥44 px,
zero erros de página; capturas adicionais de fallback/revogação/offline.
Inspeção pelo agente principal: títulos, quebra dos textos, cartões/botões/campos
comparados a Perfil/Biblioteca e tokens canônicos. Inspeção expôs inputs nativos sem
identidade visual: aplicado o análogo de campo de Perfil. Também expôs toast técnico
na perda de rede: tratamento pertence à tela, sem alterar interceptor global.
Foco por teclado exercitado; comportamento do diálogo/protocolo Windows segue aberto.

## Revisão independente e correções

Uma revisão somente leitura por `review_transcricao_03`, sem re-revisão. Dois P2:

1. Desconectar pedido pendente apagava segredo após 401, embora pedido continuasse
   confirmável. Teste RED reproduziu; cancelamento por prova, serializado com
   confirmação, corrigiu. Tests Qt/PostgreSQL/REST GREEN.
2. Confirmar no browser antes de refresh permitia sobrescrever segredo ao vincular
   novamente. Teste RED reproduziu; existência de segredo/pedido agora exige
   concluir desconexão antes de novo vínculo. Teste GREEN.

A inspeção Qt encontrou perda do objeto de sinais após trabalho assíncrono;
teste da janela ficou RED e passou ao manter o job vivo até o callback.

Casos não julgados pela revisão: instalação/build nativo, DPAPI real, IPC Windows,
desinstalação, alertas/redistribuíveis e DPI. Permanecem gates abertos.
Arquivamento mantém a decisão da 01 (distinto de exclusão e não revoga acesso); não
alterado silenciosamente nesta task. Nenhum achado menor foi deferido pelo revisor.

## Gates abertos e estado final

Windows x64 limpo: construir binários/instalador, verificar redistribuíveis/licenças
reais e eventual assinatura, instalar/desinstalar sem Python manual, protocolo
registrado/desregistrado, browser→app/IPC real, DPAPI entre usuários, contas na mesma
máquina, DPI 100/150/200%, teclado, offline/ocupado e antivírus. Este host Linux não
possui Windows/PowerShell/Inno Setup; não há certificado ou instalador verificável.

Gates globais: duas falhas backend/lint frontend preexistentes e suíte frontend
completa não certificada. A 03 fica active. A 02 continua backlog e depende da 03;
04–07 não iniciadas; 08–09 bloqueadas até autorização própria. Sem push, PR remoto,
merge, release, deploy ou uso de credenciais de produção.

## Preparação reproduzível do banco descartável

Os testes opt-in usam exclusivamente PostgreSQL 16 em 127.0.0.1:55439, banco
`transcricao_test`, usuário postgres e senha pública de teste
`transcricao_local_test`. Nunca usam .env/credencial de produção. Criar container
novo com essa configuração, aplicar os blocos UP das migrations 0001–0038 em
ordem numérica (cada uma em transação), iniciar backend compilado com porta53101,
JWT secreto de teste `transcricao_segredo_somente_teste_local`, storage local e
origem frontend `http://localhost:54301`. Rodar PostgreSQL antes de REST/browser:
a suíte SQL faz DOWN/UP da 0038 e deve terminar antes da inspeção/REST, nunca
concorrer com ela. A massa e os cenários reproduzíveis vivem nas specs de teste
versionadas; artefatos locais são somente suas saídas e capturas.

## Revisão visual complementar e correções (2026-10-15)

Nova inspeção pelo agente principal, no app real (API + Postgres descartável),
contra o análogo Perfil: 3 telas (sessões, vínculo, dispositivos) + Perfil ×
1920×1080, 1366×768, 960×1080, 360×800 × base clara/escura (32 capturas, só em
`.artifacts/transcricoes-visual/`). Defeitos encontrados e corrigidos:

- Botões sem `[tamanho]` (minúsculos, sem caixa alta/ícone): agora `tamanho="medio"` com
  `app-icone`, como Perfil; removido o padding local que sobrescrevia o primitivo.
- Índices de cartão fixos (vínculo mostrava 01→03; dispositivos começava em 02): agora
  derivados da rota (`indiceDispositivos`/`indiceInstalacao`).
- Coluna à esquerda: `margin: var(--space-24) auto` usava token inexistente (escala vai
  a `--space-20`), invalidando a declaração; agora `margin: 0 auto`.
- Link "Dispositivos de transcrição" do Perfil sem tamanho/ícone e colado ao aviso.
- Lista sem separadores e colada ao formulário.

Verificado: zero overflow horizontal, zero erro de página, alvos ≥44 px nas telas de
transcrição; specs de transcrição e perfil (14 testes) e eslint (0 erros) verdes.
Não coberto: estados de pedido expirado/inválido, offline, revogação em clique e
diálogo/protocolo Windows; dica do campo (texto pequeno) pertence ao `app-campo`.
