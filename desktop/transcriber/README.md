# Contratados Transcriber — task 03

> **Integração abandonada em 2026-10-17 por decisão do autor.** O fluxo Python
> pessoal local já atende à necessidade. O site não oferece mais telas, endpoints,
> vínculo nem abertura de sessões pelo aplicativo. Este diretório fica preservado
> como código histórico inativo; os procedimentos abaixo documentam a implementação
> anterior e não representam uma integração disponível ou uma entrega planejada.
> Ver [desativação](../../docs/specs/done/transcricoes-desativacao.spec.md).

Shell Windows x64 em Python 3.12/PySide6. Nenhum Whisper, upload, importação, fila ou
credencial cloud. Usuário final abre pelo menu Iniciar; não precisa Python ou terminal.

## Desenvolvimento e build Windows

Em checkout local, com Python 3.12 x64 e Inno Setup 6.3 ou superior (o instalador usa `x64compatible`) instalados na máquina de build:

```powershell
cd desktop/transcriber
python -m venv .venv
.venv/Scripts/Activate.ps1
python -m pip install -r requirements-build.txt
python -m pip install --no-deps -e .
./packaging/build.ps1
```

Antes do build, `./packaging/verificar-ambiente.ps1`; depois da instalação, `./packaging/coletar-evidencias.ps1`
(relatório em `.artifacts/`). Ambos só leem; executados em Windows 11 em 2026-10-15 (ver `verificacao.md` da task).

Build não publica nem assina. Instalador e SHA-256 em `dist/`; sem certificado
Authenticode fornecido pelo mantenedor, permanece sem assinatura e pode mostrar avisos.
Não desative as proteções do Windows. Hash acompanha o artefato local e não substitui
assinatura ou origem confiável. Conferir redistribuíveis e avisos antes de distribuição.

## Tema

`src/contratados_transcriber/theme.py` mapeia os tokens de `docs/design/tema/_tokens.scss` (base escura) para QSS;
cartões, rótulos, campos e botões são os equivalentes Qt dos padrões do site. Mudou um token do tema? Atualize só o mapa `TOKENS`.

## Testes portáveis

```bash
PYTHONPATH=desktop/transcriber/src python -m unittest discover -s desktop/transcriber/tests
```

Credenciais usam exclusivamente DPAPI do usuário Windows, sem fallback plaintext.
URI aceita apenas `contratados-transcriber://abrir/<uuid>`; segredo nunca está na URI.
Cliente só usa HTTPS, valida certificados, recusa redirect e limita tamanho/tempo.
API/site podem ser configurados conscientemente na janela; uma URI nunca os altera.
IPC entre instâncias usa named pipe Qt restrito ao usuário Windows, sem HTTP loopback.
Cache futuro é separado por origem + ID de conta do servidor; URI não escolhe conta.
Desconectar offline limpa contexto e preserva segredo cifrado para tentar revogação
quando voltar a conexão. Troca de conta exige concluir a desconexão anterior.
Desinstalar mantém resultados/credenciais locais; revogue no site antes de desinstalar.

## Estado da verificação Windows

A task 03 está concluída (`docs/specs/done/transcricoes-03-agente-windows-e-vinculo/verificacao.md`). Build x64, instalação por usuário sem
Python, protocolo, DPAPI, vínculo/revogação e falha de startup foram verificados em Windows 11 e num Windows Sandbox limpo. Ficaram como
pendências conscientes (herdadas pelas tasks 02 e 07): segundo usuário do Windows, DPI/teclado/Narrador reais, avisos de terceiros do Qt,
assinatura Authenticode e SmartScreen. Para repetir a verificação num ambiente limpo, use `packaging/sandbox/verificar-no-sandbox.ps1`.
