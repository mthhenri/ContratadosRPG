# Roteiro da bateria Windows — task 03

Objetivo: fechar os gates Windows da spec sem depender de ninguém reinterpretar a spec.
Cada passo diz **o que fazer**, **o resultado esperado** e **onde registrar**. Este roteiro
só organiza a execução; os requisitos continuam na [spec](../transcricoes-03-agente-windows-e-vinculo.spec.md)
e as decisões em `design.md`. Resultados entram na tabela final e em `verificacao.md`;
capturas e logs brutos ficam em `.artifacts/transcricoes-03-agente-windows-e-vinculo/`
(ignorada pelo Git). Nada aqui publica, assina ou distribui o instalador.

## 0. Preparação

- VM ou PC Windows 10/11 x64 **limpo** (sem Python, sem Inno Setup), com snapshot para voltar.
- Máquina de build (pode ser outra): Python 3.12 x64, **Inno Setup 6.3 ou superior** (o instalador
  usa `x64compatible`, que não existe antes da 6.3 — o README diz apenas "6"), checkout do repositório.
- Servidor de teste HTTPS acessível pela VM (o cliente do app só fala HTTPS e valida certificado).
  O site precisa estar na versão com a rota `/transcricoes/vinculo/:identificador`.
- Duas contas de Mestre no site (A e B), cada uma com campanha e uma sessão de transcrição;
  uma terceira conta sem papel de Mestre; duas contas de usuário do Windows na VM (U1 e U2).
- Anotar: versão do Windows, versões de Python/PySide6/PyInstaller/Inno Setup, SHA-256 do instalador.

## 1. Build (máquina de build)

| # | Passo | Esperado |
|---|-------|----------|
| B1 | `cd desktop/transcriber`; seguir o README (venv, `requirements-build.txt`, `pip install --no-deps -e .`) | Dependências instalam sem erro |
| B2 | `./packaging/build.ps1` | Testes portáveis (16) passam; PyInstaller e Inno Setup concluem |
| B3 | Conferir `dist/ContratadosTranscriber-0.3.0-Windows-x64.exe` e o `.sha256` | Hash confere com `Get-FileHash` |
| B4 | Abrir `THIRD-PARTY-NOTICES.md` e comparar com o conteúdo empacotado (PySide6/Qt, PyInstaller, runtime) | Toda licença redistribuída está citada; registrar lacunas |
| B5 | Verificar assinatura (`Get-AuthenticodeSignature`) | Registrar "sem assinatura" ou o certificado; limitar a afirmação ao que foi visto |

## 2. Instalação, protocolo e desinstalação (VM limpa, usuário U1)

| # | Passo | Esperado |
|---|-------|----------|
| I1 | Executar o instalador sem Python no sistema | Instala por usuário, sem pedir administrador; atalho no menu Iniciar |
| I2 | `reg query HKCU\Software\Classes\contratados-transcriber\shell\open\command` | Aponta para o executável instalado com `"%1"` |
| I3 | Abrir pelo menu Iniciar | Janela abre; aviso de SmartScreen/antivírus, se houver, é registrado |
| I4 | Abrir sem Python e sem terminal; verificar a janela de falha (renomear uma DLL do Qt numa cópia) | Mensagem do `launcher.py`, sem traceback |
| I5 | Desinstalar | Remove app e chave do protocolo; **mantém** `%LOCALAPPDATA%\Contratados\Transcriber` |
| I6 | Reinstalar após I5 | Dados locais preservados; protocolo volta a funcionar |

## 3. Vínculo, abertura e revogação (jornada de aceite)

| # | Passo | Esperado |
|---|-------|----------|
| V1 | Em "Vincular conta" informar servidor/site de teste e vincular como Mestre A | Mostra código; abre o navegador no site |
| V2 | No site (conta A), confirmar com o código | App passa a "vinculado"; segredo não aparece na tela nem em log |
| V3 | No site, abrir a sessão e clicar "Abrir no aplicativo" | Navegador pede permissão; app abre **no contexto da sessão** (título correto) |
| V4 | Repetir V3 com o app já aberto | Uma única instância; contexto atualizado (single-instance, pipe local) |
| V5 | Clicar a mesma intenção duas vezes (reabrir a URI da barra de endereço) | Segunda tentativa rejeitada com mensagem clara |
| V6 | Alterar o identificador da URI (último caractere) e abrir | Rejeitada sem acessar a API |
| V7 | Fechar o app e clicar "Abrir no aplicativo" | Site mostra "Aguardando…" e, sem confirmação, cai nas instruções manuais |
| V8 | Desinstalar o protocolo (I5) e clicar "Abrir no aplicativo" | Mesma queda para instruções manuais; sem travar |
| V9 | Recusar a permissão no diálogo do navegador | Mesma queda; site não declara "app não instalado" |
| V10 | Revogar o dispositivo no site e abrir a sessão de novo | App recusa com mensagem clara; tentativas anteriores falham |
| V11 | Transferir o papel de Mestre da campanha e abrir a sessão pelo app antigo | Contexto negado |

## 4. Segurança e contas na mesma máquina

| # | Passo | Esperado |
|---|-------|----------|
| S1 | Vincular em U1; entrar em U2 e abrir o app | U2 não vê nem usa a credencial de U1 (DPAPI por usuário) |
| S2 | Procurar o segredo em texto claro: `findstr /s /i` em `%LOCALAPPDATA%\Contratados`, logs e registro | Nenhum segredo/JWT em texto claro |
| S3 | Vincular a conta B sem desconectar a A | Recusado até concluir a desconexão anterior |
| S4 | Desconectar offline (cabo/Wi-Fi desligado) | Contexto limpo; segredo preservado para revogar depois; ao reconectar, "Verificar vínculo" conclui |
| S5 | Vínculo com conta sem papel de Mestre | Recusado |
| S6 | Pedido de vínculo expirado (esperar 10 min) | Rejeitado; site mostra mensagem de expirado |

## 5. Interface, DPI e acessibilidade (janela do app)

| # | Passo | Esperado |
|---|-------|----------|
| U1 | Abrir em 100%, 150% e 200% de escala (Configurações → Tela) | Sem corte, sobreposição nem botão fora da janela; evidência em captura |
| U2 | Reduzir a janela até o mínimo e ampliar | Texto quebra; nada some |
| U3 | Usar só o teclado (Tab/Shift+Tab/Enter/Espaço) | Todos os controles alcançáveis, foco visível, ordem lógica |
| U4 | Leitor de tela (Narrador) nos rótulos dos campos | Campos anunciados com o rótulo correto |
| U5 | App ocupado (durante uma operação) e offline | Botões desabilitados/feedback claro; sem janela travada |

Nota para quem registrar U1: o app hoje usa o estilo nativo do Qt, sem a identidade visual do
site. Isso é decisão pendente do autor, não defeito deste roteiro.

## 6. Fecho

Preencher a tabela com **passou / falhou / não executado** e a evidência de cada passo.
Falhas viram itens em `PROBLEMS.md`; só passos executados contam como verificados.

| Passo | Resultado | Evidência |
|-------|-----------|-----------|
| B1…B5, I1…I6, V1…V11, S1…S6, U1…U5 | _(preencher)_ | _(arquivo em `.artifacts/`)_ |
