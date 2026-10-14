# Task 03 — aplicativo Windows e vínculo: desenho aprovado

Base: `d7e6892e97ecb211a4a8acde7591cedc6ada35ba`.
Autor pediu continuar a próxima spec em 2026-10-14. Ordem revisada: 03 antes de 02.
A 01 permanece active pelos gates globais registrados; esta continuação não a
recertifica nem autoriza corrigir a Oficina ou publicar. Branch local `feat/transcricoes-03`.

**Decisões aprovadas em 2026-10-14 (“Vamos para a 03”):** D-02 (stack/distribuição) e D-03 (vínculo).
O autor autorizou seguir a 03 após a apresentação deste desenho. Entregáveis 1 e 6 atendidos; sem publicação externa.

## Objetivo e fronteira

Instalar no Windows x64, vincular à conta pelo site e abrir sessão autorizada;
inspecionar recursos e mostrar estados de vínculo/contexto/falha/offline.
Sem inferência, importação completa, fila/outbox, player, atualização automática,
credencial BYOK ou nuvem: pertencem às specs 02/04/05/06/08/09.
Áudio nunca sobe à API para abrir o app. Não iniciar servidor HTTP no computador.

## D-02 — proposta de stack e distribuição

**Recomendação:** Python + PySide6, empacotado com PyInstaller em distribuição
`onedir`, instalado por Inno Setup x64, por usuário Windows (sem exigir Python
manual nem privilégios administrativos para uma instalação por usuário).

Código em `desktop/transcriber/` com `pyproject.toml`, fontes/testes e definição
PyInstaller; instalador/build em subpastas do mesmo módulo. Não criar quarto
workspace npm nem duplicar o frontend Angular. Worker da 04 será um subprocesso
separado do shell, com contrato explícito e cancelamento; ele não é implementado aqui.
`onedir` evita extração completa a cada abertura e facilita bibliotecas/modelos grandes.

| Alternativa | Consequência |
|---|---|
| PySide6/PyInstaller/Inno Setup (recomendada) | Uma linguagem com o futuro worker; UI Qt e avisos/licenças dos redistribuíveis precisam ser incluídos; build Windows obrigatório |
| Electron + worker Python | Aproxima UI do stack web, adiciona Chromium/Node, bundle maior e IPC entre JS/Python; amplia manutenção de segurança |
| .NET/WPF + worker Python | Integração Windows nativa, acrescenta C#/.NET e ponte com Python; distribuição self-contained maior e duas stacks |

UI do aplicativo: janela simples de vínculo, conta, contexto da sessão, status,
recursos e desconectar; identidade visual derivada do Terminal de Contenção com
mapeamento explícito dos tokens do tema para Qt. Não inventar uma identidade nova.
Qt não consome componentes Angular: equivalentes de controles serão próprios do
app e documentados no seu análogo visual, sem ampliar `shared/ui/` para isso.
UI web consome integralmente os primitivos existentes; se faltar um, propor ao autor.

Distribuição inicial por instalador local versionado e hash de integridade;
sem upload/release externo nesta execução. Assinatura Authenticode é recomendada
para entrega pública, mas necessita certificado/ambiente do mantenedor: não
comprar nem criar serviço de assinatura. Sem assinatura, declarar essa limitação
no artefato e validar comportamento real do Windows/antivírus; não prometer ausência
de alertas nem orientar desativar proteção. Incluir avisos/licenças aplicáveis.
Atualizações nesta V1 por instalador escolhido pelo usuário, sem auto-update remoto.

## D-03 — proposta de vínculo e credencial

### Fluxo

1. No app, “Vincular conta” gera segredo aleatório de 256 bits e o protege com
   DPAPI no escopo do usuário Windows. Envia à API somente o hash SHA-256, o nome
   do dispositivo e uma solicitação de vínculo com prazo de **10 minutos**.
2. A API devolve id público/código de conferência da solicitação. O app abre a
   URL de confirmação no navegador; ela não leva segredo, JWT ou path local.
3. Usuário faz login no site e confirma explicitamente o dispositivo e o código
   exibido no app. Só quem é Mestre de uma campanha ativa pode vincular.
4. A confirmação amarra o registro à identidade validada pelo servidor e à
   `tokenVersao` atual. O segredo que já estava no app passa a autenticar apenas
   endpoints próprios de dispositivo/transcrição; não vira JWT geral do site.
5. App consulta status/contexto usando seu segredo como Bearer em HTTPS;
   servidor compara hash e relê conta/dispositivo/papel. Segredo não é devolvido
   pelo servidor nem colocado em URL, logs ou exportações.

A credencial é **restrita ao módulo**, revogável e expira após **90 dias de
inatividade** (proposta para aprovação). Reuso autorizado registra último uso;
revogação da conta/tokenVersao ou dispositivo invalida o vínculo antes disso.
Após expiração, usuário vincula novamente; nada local é apagado como efeito colateral.
A solicitação pendente não dá acesso a conta/campanha nem autenticação geral.

A integração deve garantir autenticação própria nas rotas do app, com guard do
módulo testado em todas as operações. Não ampliar o que o JWT web consegue fazer,
nem aceitar o segredo de dispositivo nos controllers dos módulos existentes.
Se necessário contornar guards globais, o bypass será explicitamente limitado à
classe/rota com guard de dispositivo obrigatório; OpenAPI deve anunciar essa
autenticação e testes devem provar que a rota nunca fica anônima. A iniciação de
solicitação anônima só cria estado pendente, com controle de abuso técnico/expiração,
sem listar identidade ou registro de terceiros. Não criar cota comercial.

### Cancelamento e desconexão

O app prova seu segredo também para cancelar pedido ainda pendente, sem depender
 de JWT ou de um dispositivo já confirmado. `DELETE /transcricao/vinculo` revoga
pedido e dispositivo na mesma transação: bloqueia primeiro o pedido, depois
atualiza dispositivo com snapshot novo. Se confirmação vencer a corrida, o
cancelamento inclui o dispositivo recém-criado. Pedido cancelado nunca confirma.
HTTP 401 sozinho não prova cancelamento: o app preserva o segredo protegido e
revogação pendente. Enquanto existir pedido/segredo anterior, novo vínculo exige
desconectar primeiro; confirmação no browser antes do refresh não perde credencial.

### Abertura pelo site

- “Abrir no aplicativo” cria intenção opaca para a sessão, de **uso único**, com
  prazo de **2 minutos**, e navega para `contratados-transcriber://abrir/<id>`.
- URI aceita somente comando de abertura e identificador esperado; não admite
  código, host arbitrário, segredo ou path. A intenção não autentica por si.
- App vinculado resgata pela API; servidor valida conta/dispositivo, Mestre
  atual, sessão/campanha ativa e titular da intenção antes de consumir. Id
  adulterado/expirado/repetido/para outra conta falha com mensagem segura.
- Site acompanha confirmação pelo backend. Falta de confirmação mostra “Não
  recebemos confirmação do aplicativo”, com abrir novamente/instrução de instalar
  e abertura manual. Não deduzir instalação só por temporizador/foco do navegador.
- Sem rede, app pode abrir sua janela e explicar que resolver nova sessão exige
  conexão. Continuidade local já autorizada pertence à 04/05 e será preservada.

Sem loopback HTTP e sem ponte de áudio nesta task. Reprodução de WAV continua
D-04 antes da 06; escolha de framework não autoriza servidor de arquivos local.

### Contas, cache e impersonação

Secretos por conta protegidos pelo Windows; metadados em namespaces separados por
origem da API + usuário resolvido pelo servidor. Troca de conta desativa o contexto
anterior e não carrega diretório de outra conta por parâmetro de URI. Desconectar
revoga vínculo online ou marca revogação pendente offline, sem apagar resultados
não sincronizados. Não prometer revogação remota imediata de PC desconectado.

DPAPI protege entre usuários Windows, mas não promete isolamento contra processos
maliciosos executados como o mesmo usuário Windows/administrador. Não entregar
conteúdo de outra conta pela interface; pasta/cache não é autorização para API.

O JWT atual não distingue login direto de impersonação (SessaoTokenService emite a
identidade do alvo). Proposta: **manter essa semântica existente**, sem alterar a
impersonação global nesta task; vínculo aprovado nesse contexto pertence ao alvo
Mestre e fica explicitamente visível/revogável por ele no site. Proibir vínculo
impersonado exigiria nova informação auditável no JWT/login e outro recorte de
segurança; não implementar essa alteração global sem autorização adicional.

## Integração web e dados

Nova UI mínima de sessões e de vínculo/dispositivos sob campanha/conta, necessária
para “abrir a sessão no app” (01 ainda não tem telas). Usar os endpoints 01; não
antecipar editor/glossário/importação das specs seguintes. Análogos: lista de
campanhas/Biblioteca, formulário/modal de perfil e app-coluna-acoes do Mestre.
Rotas lazy de transcrição precedem a rota genérica de campanha; permissão no backend.

DTOs/enum/validators no shared, serviços e repositórios donos em módulos pequenos;
solicitação, dispositivo e intenção com BaseEntity, hash do segredo, prazos e
transições transacionais. Registro de credencial nunca inclui segredo em claro.
Consumo da intenção e confirmação do vínculo precisam de testes concorrentes e
respostas seguras quando confirmação/resposta se perder; não construir confirmação
que dependa de devolver uma credencial irrecuperável depois de um commit.

## Verificação e limitações do ambiente

Testes locais: fluxo de dispositivo, expiração/revogação, tokenVersao, papéis,
replay, contas cruzadas, parsing de URI, cache, recurso ausente e transições.
Backend com JWT/guard de dispositivo/OpenAPI em banco descartável; web real em
1920×1080, 1366×768, 960×1080 e 360×800, bases clara/escura e teclado/44px.

App/instalador: Windows x64 limpo, instalação sem Python manual, protocolo
registrado/desinstalado, DPAPI, abertura via site/navegador, erros/DPI/teclado e
máquina compartilhada. Este ambiente é Linux, sem .NET/PowerShell/Wine ou host
Windows selecionado. Código e testes portáveis podem avançar aqui; produzir e
certificar executável/instalador e comportamentos Windows exige host Windows.
Não gerar falso binário ou declarar task done só por teste Linux.
Não criar runner, VM externa, serviço, release ou deploy sem autorização própria.
