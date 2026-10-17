# Roteiro das pendências Windows — task 02

Só organiza a execução do que exige a máquina e as mãos do autor; requisitos ficam na
[spec](../transcricoes-02-importacao-e-glossario.spec.md). Capturas e logs brutos vão para
`.artifacts/transcricoes-02-importacao-e-glossario/` (ignorada pelo Git). Nada aqui publica,
assina ou distribui o instalador. Use **servidor e site de teste**, nunca produção.

Pré-requisito: instalador gerado com `desktop/transcriber/packaging/build.ps1` a partir do commit
da 02.6 ou posterior, instalado como na 03 (certificado de teste confiado pelo autor).

| # | Passo | Esperado |
|---|-------|----------|
| U1 | Configurações do Windows → Tela → Escala 100%, 150%, 200% (sair e entrar na sessão se pedir) e abrir o app com uma sessão aberta e 3–4 WAVs importados | Cartão "03 Importação" sem texto cortado nem sobreposição; botões e campos legíveis |
| U2 | Reduzir a janela até a largura mínima e ampliá-la até maximizar | Sem barra horizontal; nome de arquivo longo cortado no meio, nome inteiro na dica |
| U3 | Só teclado: Tab/Shift+Tab percorre Conexão → Selecionar → faixas (participante, deslocamento, botões) → Idioma → Registrar; Enter/Espaço aciona; foco visível | Ordem igual à visual; nenhum controle inalcançável |
| U4 | Narrador (Win+Ctrl+Enter): navegar pelos campos e botões de uma faixa | Cada campo e botão é anunciado com nome compreensível; estado "Confirmada/Erro" lido junto do nome |
| U5 | Durante "Registrar" (com rede lenta ou desligando o Wi‑Fi) | Janela não congela; mensagem de ocupado/sem conexão; nada apagado, e registrar de novo não duplica faixa |
| S1 | Criar um 2º usuário do Windows (ação do autor), vincular a conta A no usuário 1, entrar no usuário 2 | Usuário 2 aparece sem vínculo e não lê credencial nem importação do usuário 1 |
| V8 | Desinstalar o app (mantém dados) e clicar "Abrir no aplicativo" no site, em Edge ou Chrome reais | Site cai nas instruções manuais, sem travar |
| V9 | Reinstalar, clicar "Abrir no aplicativo" e **recusar** o diálogo do navegador | Mesma queda; o site não afirma "app não instalado" |
| F1 | Arrastar WAVs reais do Craig (ou qualquer WAV) para a janela e usar "Selecionar arquivos WAV" | Ambos os caminhos importam; um arquivo não-WAV vira erro isolado |
| F2 | Registrar no servidor de teste e conferir no site (Glossário e faixas) | Faixas aparecem com nome, participante e deslocamento; nenhum áudio saiu do computador |

Registrar resultado e evidência de cada linha na seção de fecho de `plano.md`.
