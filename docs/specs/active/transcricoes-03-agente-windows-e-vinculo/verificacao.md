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

## Adiantamento sem Windows (2026-10-15)

- **Desktop em Linux:** `unittest discover` da pasta `desktop/transcriber/tests`
  com Qt `offscreen` — 16/16 (núcleo 9, API 5, Qt 2; Python 3.13 aqui, 3.12 é a versão
  fixada do projeto). Não certifica DPAPI, IPC, protocolo nem comportamento Windows.
- **Janela do app renderizada offscreen** em 100%/150%/200% (`QT_SCALE_FACTOR`) e
  420 px de largura: sem corte, sobreposição ou botão fora da janela; mínimo do layout
  313×513. Evidência aproximada (fonte/estilo Windows diferem; não substitui U1–U5 do
  roteiro). **Correção (mesma data):** esta captura omitiu a folha de estilo que `main()` aplica
  (o app já era escuro, mapeado dos tokens), então a leitura "estilo nativo" estava errada;
  o que faltava era a fidelidade ao site — ver "Tema do app desktop" abaixo.
- **Estados web exercitados no app real** (desktop e 360×800): pedido inexistente,
  código errado, offline ao confirmar, vínculo com sucesso, revogação, "Abrir no
  aplicativo" sem app (fica em "Aguardando confirmação"). Zero erro de página, zero
  toast técnico. Defeitos achados e corrigidos: offline ao confirmar culpava
  "código, prazo e permissão" (agora "Sem conexão…", com teste); status/erro sem
  tratamento visual (agora erro com destaque de alerta). Pendente: o fim do tempo de
  espera de 120 s da abertura não foi esperado em tempo real.
- **Roteiro da bateria Windows** pronto em `roteiro-windows.md` (build, instalação,
  protocolo, jornada de aceite, segurança, DPI/teclado). Achado estático: o instalador
  usa `x64compatible`, que exige Inno Setup **6.3+**; README corrigido.
- Sugestão não implementada: a lista de dispositivos não mostra o último uso
  (`ultimoUso` já vem no contrato), então dispositivos com o mesmo nome são
  indistinguíveis. Depende de decisão do autor por ampliar a spec.

**Gate global do frontend (2026-10-15):** `NODE_OPTIONS=--max-old-space-size=4096 npm run
test --workspace=frontend`, máquina sem outros processos: **278 arquivos / 3482 testes
aprovados, exit 0** (sem OOM); o `test:regras` roda antes na mesma execução. Com a
suíte do backend (1142 aprovados) e `npm run lint` (0 erros nos três workspaces), os
gates globais deixam de bloquear as specs 01 e 03; sobram os gates Windows da 03.

## Tema do app desktop alinhado ao site (2026-10-15)

Decisão do autor: o app segue o estilo do site. `desktop/transcriber/src/contratados_transcriber/theme.py`
passa a ser o mapeamento único dos tokens de `docs/design/tema/_tokens.scss` (base escura) para
QSS, e a janela usa os equivalentes Qt dos padrões do site: cartão com índice (`//`, `01`, `02`),
título mono em caixa alta com régua hairline, rótulo mono em caixa alta, campo `surface-2`,
botão primário em accent, secundário em contorno e perigo em `--erro`. Análogo escolhido:
Perfil (cartões, campos e botões). Renderizado offscreen em 100%/150%/200%, largura mínima
(560) e base (640×760): sem corte, sem rolagem horizontal, nada sobreposto; os 16 testes
do desktop seguem passando. Largura mínima de 560 porque `QPushButton` não quebra linha e o
maior rótulo precisa caber. Limites, para o roteiro (U1–U5): fontes IBM Plex **não** são
embutidas (cai em Cascadia Mono/Consolas e Segoe UI) — embutir exige arquivos e aviso de
licença, decisão do autor; botões sem ícone (o site usa ícones SVG); fidelidade em Windows real
(renderização de fonte e DPI) só se confirma na bateria.

## Último uso na lista de dispositivos (2026-10-15)

Decisão do autor. A lista web passa a mostrar "Último uso: dd/MM/yy HH:mm" (`ultimoUso` já
vinha no contrato), distinguindo dispositivos com o mesmo nome. Teste novo na página.

## Estados web restantes e análise do empacotamento (2026-10-15)

- **Estados web, app real (desktop/360×800):** pedido expirado de verdade (prazo vencido no
  banco descartável): API devolve 404 em recuperar e em confirmar, a tela mostra "Vínculo
  indisponível ou expirado", sem formulário e com as instruções de instalação/abertura manual.
  Fim do tempo de espera da abertura: após ~120 s a mensagem passa a "Não recebemos
  confirmação do aplicativo." e o botão volta a ficar ativo. Teclado nas telas de sessões e
  dispositivos: ordem de foco lógica (topbar → navegação → campo → ações) e foco visível em
  todos os controles. Zero erro de página. Não coberto: leitor de tela.
- **Empacotamento (PyInstaller 6.12.0 rodado em Linux, só para análise estática do `.spec`):**
  o `transcriber.spec` é válido e gera o bundle (169 MB no Linux, números do Windows diferem).
  Achados: (1) **nenhum arquivo de licença no bundle** além de `THIRD-PARTY-NOTICES.md`, e os
  wheels do PySide6 não trazem licenças — os textos exigidos pelo próprio aviso precisam vir
  do upstream e ser versionados (gate B4); (2) o bundle leva módulos Qt que o app não usa
  (Quick, Qml, Pdf no Linux), o que aumenta tamanho e o que precisa ser licenciado — conferir
  no Windows com `coletar-evidencias.ps1` antes de decidir `excludes`. Nada disso foi alterado
  no `.spec`: não há como validar o resultado em Windows aqui.
- **Scripts de apoio** `packaging/verificar-ambiente.ps1` e `packaging/coletar-evidencias.ps1`
  escritos, **nunca executados** (sem PowerShell no ambiente Linux).

## Licenças empacotadas — B4 parcialmente fechado (2026-10-15)

Textos baixados dos repositórios oficiais nas versões usadas e versionados em
`desktop/transcriber/licencas/` (LGPL-3.0-only e GPL-3.0-only do `qt/qtbase` v6.8.3, `LICENSE` do
CPython v3.12.10, `COPYING.txt` do PyInstaller v6.12.0 — este idêntico, byte a byte, ao do pacote
instalado), com `LEIA-ME.md` registrando origem, hash e a oferta de código-fonte. O `transcriber.spec`
passa a incluir a pasta no bundle e **aborta a build** se ela estiver vazia ou ausente. Verificado
com o PyInstaller em Linux: as cinco peças entram no bundle e são idênticas às do repositório; sem a
pasta, a build falha com mensagem clara. `gnu.org` e `code.qt.io` não eram acessíveis daqui; o texto
da LGPLv3 vem do `qt/qtbase`, que é o que o Qt distribui.

**Continua aberto (não resolvido):** avisos de terceiros embutidos nas bibliotecas do Qt (ICU,
FreeType, HarfBuzz etc.) conforme o que o instalador Windows realmente leva; termos do runtime C++
da Microsoft; revisão jurídica da oferta de código-fonte. A licença do Python é a do 3.12.10; se a
máquina de build usar outro 3.12.x, conferir se o texto mudou. Nada disso é verificável sem Windows.

## Bateria Windows — primeira rodada (2026-10-15)

**Ambiente: Windows 11 Pro 10.0.26300 na máquina de desenvolvimento do autor — NÃO é VM limpa**
(tinha Python 3.12.10 e ferramentas de dev; sem snapshot). Python 3.12.10 x64, PySide6 6.8.3,
PyInstaller 6.12.0, Inno Setup 6.7.3 (instalado por `winget`, por usuário). Instalação feita só em HKCU,
sem administrador. Evidências em `.artifacts/transcricoes-03-agente-windows-e-vinculo/`.

| Passo | Resultado | Evidência |
|---|---|---|
| B0 | passou após 3 correções nos `.ps1` (abaixo) | saída do script |
| B1 | passou | venv + `requirements-build.txt` + `pip install --no-deps -e .` |
| B2 | passou | `build.ps1` completo: testes portáveis, PyInstaller e Inno sem erro |
| B3 | passou | `ContratadosTranscriber-0.3.0-Windows-x64.exe` (32,3 MB), SHA-256 `1ab52e35…c89d`, igual ao `.sha256` |
| B4 | **parcial** | as 5 peças de `licencas/` na instalação têm o mesmo SHA-256 do repositório (`LEIA-ME.md` `f96b110e…0923`). Seguem abertos: avisos de terceiros do Qt, runtime C++ da Microsoft, revisão jurídica |
| B5 | passou | `NotSigned` (instalador e executável) |
| B6 | passou após correção | `evidencias-windows-20261015-1847.md` |
| I1 | passou | instalou sem admin ("Administrative install mode: No"); atalho em Menu Iniciar\Contratados Transcriber |
| I2 | passou | `HKCU\Software\Classes\contratados-transcriber\shell\open\command` aponta para o `.exe` instalado com `"%1"` |
| I3 | **parcial** | janela abre e renderiza com o tema do site (`i3-janela-inicial.png`); aberto pelo `.exe`, **não** pelo clique no menu Iniciar; nenhum aviso de SmartScreen observado (execução local, sem Mark-of-the-Web) |
| I4 | passou, com ressalva | quebrar `QtWidgets.pyd` numa cópia: mensagem do launcher, sem traceback (`i4-falha-startup.png`). Renomear `Qt6Widgets.dll`/`Qt6Core.dll` **não** derrubou o app — as DLLs foram achadas fora da pasta (PATH desta máquina), o que prova que a máquina não era limpa |
| I5 | passou | app, atalho e chave do protocolo removidos; marcador em `%LOCALAPPDATA%\Contratados\Transcriber` preservado |
| I6 | passou | dados preservados; protocolo voltou ao registro; app reinstalado abre |
| V4 (parcial) | passou | 2ª execução com URI válida encerra sozinha e a janela já aberta recebe a intenção (pipe local; mensagem mudou para "Vincule sua conta e confirme o vínculo…"). Só a parte single-instance: sem vínculo não houve contexto de sessão |
| V6 (parcial) | passou | URI `…/abrir/not-a-uuid` rejeitada com "Abertura inválida / Nenhuma ação executada" antes de qualquer ação |
| V1–V3, V5, V7–V11 | **não executado** | exigem servidor HTTPS de teste + 2 contas de Mestre; os padrões do app apontam para a produção e nenhuma credencial/vínculo foi feito |
| S1, S2, S3–S6 | **não executado** | exigem 2º usuário Windows, vínculo real e servidor de teste (S2 só faz sentido depois do vínculo; a pasta de dados nem existe sem vínculo) |
| U1–U5 | **não executado** | exigem trocar escala do Windows, teclado/Narrador com o app em foco |

### Defeitos achados nos scripts e corrigidos (todos `.ps1` só leem/empacotam)

1. `build.ps1` e `verificar-ambiente.ps1` só procuravam o Inno em `Program Files (x86)`; o `winget`
   instala por usuário em `%LOCALAPPDATA%\Programs`. Agora também procuram em `Program Files` e no perfil.
2. `verificar-ambiente.ps1` lia a versão do `ISCC.exe`, que reporta `0.0.0.0` — a checagem "6.3+"
   falhava mesmo com a 6.7.3. Agora lê o `unins000.exe` da mesma pasta.
3. Os três `.ps1` estavam em UTF-8 sem BOM; o Windows PowerShell 5.1 os lia como ANSI e quebrava os acentos.
   Agora UTF-8 com BOM.
4. `coletar-evidencias.ps1`: o filtro de licenças não pegava `GPL-3.0-only`/`LEIA-ME.md` (listava 2 de 5) e a
   linha do executável saía vazia. Agora lista todas com SHA-256 e mostra o hash do executável.

### Achados para decisão do autor

- O bundle leva `Qt6Pdf`, `Qt6Qml`, `Qt6QmlMeta`, `Qt6QmlModels`, `Qt6QmlWorkerScript`, `Qt6Quick`, `Qt6Svg`,
  `Qt6VirtualKeyboard` e `Qt6OpenGL`, que o app não usa (só Core, Gui, Widgets, Network). Excluí-los reduz tamanho e
  o que há para licenciar; não alterado no `.spec`.
- Os endereços padrão da janela são os de produção; para os passos V/S é preciso apontar para um servidor de teste.
- O gate "máquina limpa" (I4 com DLL, I1 sem Python no sistema, I3 via SmartScreen) só se fecha numa VM.

## Bateria Windows — segunda rodada, com servidor de teste (2026-10-15)

Mesma máquina (não é VM limpa). Stack descartável só para o teste: Postgres 16 em container (127.0.0.1:55439,
migrations 0001–0038), API compilada na 53101, `ng serve` na 54301 e um proxy HTTPS (Node) em
`https://localhost:8443` servindo site e API, com CA descartável de 3 dias que o **autor** confiou em
`CurrentUser\Root` (removê-la ao fim). O app instalado foi apontado para `https://localhost:8443` pelos campos da
janela; nenhuma credencial ou servidor de produção foi usado. Três contas de teste (Mestre A, Mestre B, jogador),
semeadas por REST. O autor também mexeu no site e no app durante a rodada (confirmou o pedido `967DFE70` como
Mestre B), o que me fez refazer o S5 do zero.

| Passo | Resultado | Evidência / ressalva |
|---|---|---|
| V1 | passou | "Confira o código 97DC28BB no site…"; o app falou HTTPS com o servidor de teste (certificado validado) |
| V2 | passou | confirmado no site como Mestre A; app: "Vinculado à conta t03_mestrea"; segredo não aparece na tela |
| V3 | passou, com ressalva | URI disparada por `Start-Process contratados-transcriber://…` (handler do registro, como o navegador faria): janela mostra "Sessão mestreA \| Campanha: 1". **Não** passou pelo diálogo de permissão de um navegador real |
| V4 | passou | 1 processo antes e depois; contexto atualizado (single-instance, pipe local) |
| V5 | passou, com defeito | reabrir a intenção: "Abertura indisponível: prazo, conta ou permissão de Mestre." — mas o rótulo "Sessão: …" anterior continua na tela (P-128) |
| V6 | passou, expectativa corrigida | o roteiro dizia "rejeitada sem acessar a API". Um UUID com o último caractere trocado continua válido no formato, então chega ao servidor e é rejeitado ali; só valor fora do formato (`not-a-uuid`, rodada anterior) é barrado localmente. Roteiro ajustado |
| V7 | passou, parcial | com o app fechado, "Abrir no aplicativo" no navegador embutido ficou em "Aguardando confirmação do aplicativo…" (botão desabilitado) e o app não abriu. O fim dos 120 s e a queda para instruções já tinham sido vistos na rodada web; neste navegador o timer ficou throttled e não foi reobservado |
| V8, V9 | **não executado** | exigem um navegador real (Edge/Chrome) com o diálogo "abrir aplicativo"; o navegador embutido não dispara protocolos externos |
| V10 | passou | dispositivo revogado por `DELETE /transcricao/dispositivo/:id`; a abertura com intenção criada antes é recusada ("Vincule sua conta e confirme o vínculo…") e "Verificar" diz "Sem vínculo confirmado". Detalhe: o app não diz "revogado" e mantém o segredo morto até o usuário clicar Desconectar |
| V11 | passou | intenção criada, Mestre da campanha 1 transferido (A→jogador), abertura recusada; `consumida_em` ficou nulo (rollback) |
| S1 | **não executado** | exige uma segunda conta de usuário do Windows |
| S2 | passou, escopo limitado | o `vinculo.bin` decifra por DPAPI para `{login, namespace, origin, request_id, secret, user_id}`; o segredo **não** aparece em claro no `vinculo.bin`, na pasta de dados, na pasta de instalação, no atalho nem no registro do protocolo. Não varri TEMP nem o disco inteiro, e o app não guarda JWT |
| S3 | passou | com vínculo ativo, "Vincular conta" → "Desconecte o vínculo anterior antes de vincular outra conta."; nenhum pedido novo no servidor |
| S4 | passou, simulação | "offline" = proxy HTTPS derrubado (não mexi na rede do Windows). Desconectar offline: "Sem conexão. Resultados locais foram preservados." Com o servidor de volta, "Verificar" concluiu ("Dispositivo desconectado") e novo vínculo foi permitido |
| S5 | passou | jogador (sem papel de Mestre) tenta confirmar: 404 "Vínculo não encontrado", pedido segue sem confirmação; código errado de Mestre: 400 "Confira o código no aplicativo." |
| S6 | passou | após 10 min: confirmar → 404; site "Vínculo indisponível ou expirado"; app "Vínculo expirado/revogado. Desconecte e vincule novamente." |
| U1 | **parcial** | `QT_SCALE_FACTOR` 1, 1.5 e 2 no exe instalado (renderização Windows real, mas escala emulada pelo Qt, **não** a escala do Windows): sem corte horizontal, texto legível. Escala real 100/150/200% em Configurações → Tela não testada |
| U2 | **não executado** | |
| U3 | **parcial** | UI Automation: os 3 campos e os 3 botões são `IsKeyboardFocusable`. Ordem de Tab e anel de foco não foram exercitados |
| U4 | **parcial** | UI Automation expõe os nomes acessíveis corretos (ex.: Edit "Servidor HTTPS", Button "Vincular conta"); leitor de tela (Narrador) não executado |
| U5 | **não executado** | só o caso offline do S4 |

Achados novos: P-127 (o usuário não acha o código de vínculo) e P-128 (rótulo de sessão mantido após recusa),
ambos em `docs/context/PROBLEMS.md`. Também observado: os endereços dos campos não são lembrados entre execuções
(sempre voltam ao padrão de produção), então abrir pela URI com o app fechado usa o padrão; é esperado para o
usuário final e só atrapalha quem testa contra um servidor local.

**Estado da task:** a 03 continua `active`. Faltam S1, V8/V9, U2, U5, Narrador/Tab reais, escala real do Windows,
e os mesmos itens "máquina limpa" da primeira rodada (B4 jurídico, I1, I3, I4).

**Correções feitas depois da rodada (2026-10-15):** P-128 — `Window.work` ganhou `clear_context` e `open_uri` o usa, então qualquer
abertura recusada limpa "Sessão: …" (teste `test_rejected_open_clears_the_previous_session_label`, RED→GREEN; desktop 17/17).
P-127 — a página de vínculo do site passou a dizer que o código de oito caracteres aparece no topo da janela do app logo depois
de "Vincular conta" (página de transcrição 8/8; eslint 0 erros). Os dois saíram do `PROBLEMS.md`. Não reverificado no app instalado:
o instalador em `dist/` ainda é o da primeira rodada (sem a correção do P-128); rebuild fica para a próxima rodada com VM.

## Bateria Windows — terceira rodada, Windows Sandbox limpo (2026-10-15)

Windows Sandbox (Windows 11 Enterprise 10.0.26100, usuário `WDAGUtilityAccount`, sem Python/py/pip/git no PATH), instalador
reconstruído com as correções P-127/P-128 (`11c30f4e…feba`, igual ao da cópia dentro do Sandbox, `NotSigned`, copiado com
Mark-of-the-Web). Instalação feita à mão pelo autor; fases 2 e 3 pelo script `packaging/sandbox/verificar-no-sandbox.ps1`.
Evidência bruta em `.artifacts/transcricoes-03-agente-windows-e-vinculo/sandbox-evidencias/` (logs e 3 capturas).

| Passo | Resultado | Evidência / ressalva |
|---|---|---|
| I1 | passou | antes: `ContratadosTranscriber` não existia e não havia Python; depois: instalado em `%LOCALAPPDATA%\Programs`, sem Python no PATH. O script não registrou pedido de senha de administrador; o autor não relatou. Ressalva: a janela do `.cmd` da Fase 2 aparece como "Administrator" no Sandbox, então esse ambiente não prova sozinho a ausência de elevação (o log do Inno na máquina de desenvolvimento diz "Administrative install mode: No") |
| I2 | passou | `HKCU\Software\Classes\contratados-transcriber\shell\open\command` → `…\ContratadosTranscriber.exe "%1"` |
| I3 | passou | atalho no Menu Iniciar existe e o app abre (`sandbox-i3-app-aberto.png`). **Nenhum aviso de SmartScreen nem de antivírus** apareceu ao abrir o instalador marcado como baixado (relato do autor; sem captura). Limitação: o Sandbox tem a reputação/política do próprio ambiente, então isso não prevê o que usuários finais verão com um download real e sem assinatura |
| I4 | passou | com `QtWidgets.pyd` e `Qt6Widgets.dll` renomeados numa cópia, o app mostra "Não foi possível iniciar o Contratados Transcriber. Reinstale esta versão a partir do instalador confiável. Seus resultados locais foram preservados.", sem traceback (`sandbox-i4-falha-startup.png`). Na rodada anterior (máquina não limpa) as DLLs eram achadas fora da pasta; aqui, num Windows limpo, o teste vale também para elas |
| B4 (licenças na instalação) | passou, parcial | as 5 peças de `licencas/` instaladas no Sandbox têm SHA-256 idêntico ao de `desktop/transcriber/licencas/`. Seguem abertos os avisos de terceiros do Qt, o runtime C++ da Microsoft e a revisão jurídica |

**Estado da task:** continuam sem execução S1 (2º usuário do Windows), V8/V9 (navegador real com diálogo de protocolo), U2, U5,
Tab/Narrador reais, escala real do Windows. Os passos V/S já executados foram feitos com o instalador
da primeira rodada, anterior à correção do P-128 (que só mexe no rótulo da janela e tem teste automatizado).

## Módulos Qt não usados fora do bundle (2026-10-15)

Decisão do autor (aprovada em 2026-10-15): tirar do instalador o que o app não usa. O `transcriber.spec` passa a excluir os módulos
Python de Qml/Quick/Pdf/VirtualKeyboard/Svg/OpenGL **e** a filtrar os binários correspondentes — só excluir os módulos não bastou, porque
as DLLs voltam pelos plugins do Qt (teclado virtual, ícones SVG, PDF). Resultado medido no build Windows:

| | antes | depois |
|---|---|---|
| DLLs `Qt6*` | 13 (Core, Gui, Network, OpenGL, Pdf, Qml, QmlMeta, QmlModels, QmlWorkerScript, Quick, Svg, VirtualKeyboard, Widgets) | 4 (Core, Gui, Network, Widgets) |
| instalação | 114 MB | 93,3 MB |
| instalador | 32,3 MB | 26,6 MB (`9a5dbe93…dce1c`) |

Verificado na máquina de desenvolvimento, rodando o `dist/` novo: testes portáveis 17/17 no build; o app abre ("Sem vínculo confirmado…"),
o texto da janela é lido pelo UI Automation e a segunda execução com URI válida encerra e entrega a intenção à primeira instância (o pipe
usa o QtNetwork, que continua no pacote). Não verificado ainda: o instalador novo num Windows limpo (Sandbox) e o fluxo de vínculo contra
servidor com o pacote reduzido; ambos dependem do autor/de novo stack.
