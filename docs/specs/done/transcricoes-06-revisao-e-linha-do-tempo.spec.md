# transcricoes-06-revisao-e-linha-do-tempo.spec.md

> **ABANDONADA em 2026-10-17 por decisão expressa do autor.** Integração desativada;
> arquivamento não significa entrega concluída. O fluxo Python pessoal permanece local.
> Este aviso substitui os estados e autorizações anteriores preservados abaixo.
> Ver [desativação](transcricoes-desativacao.spec.md).

> **Task 06/09** do guarda-chuva `transcricoes.spec.md`. Leitura, edição manual e reprodução por timestamp.

> **Estado: backlog; preparação documental. Implementação depende de aprovação expressa do autor.**
> Decisões pendentes, matriz de acesso e gates: [revisão](transcricoes/revisao.md). Anexos próprios: `transcricoes-06-revisao-e-linha-do-tempo/` no mesmo estado; evidência bruta em `.artifacts/transcricoes-06-revisao-e-linha-do-tempo/`.

## Objetivo

Fornecer ao Mestre um editor de transcrição com visualizações individual e consolidada sobre os mesmos segmentos, sincronização temporal ajustável e áudio reproduzível quando os arquivos estiverem acessíveis.

## Entregáveis

1. Tela Mestre-scoped de sessão/transcrições integrada à navegação de campanha e ao sistema visual `Terminal de Contenção` (usar componentes existentes, sem redesenhar o produto).
2. Visualização por faixa e cronologia consolidada com identificação do participante, timestamp início/fim e ordenação estável; preservar segmentos e falas simultâneas, sem fundi-las artificialmente.
3. Edição manual de texto por segmento, salvamento com estado de erro/carregamento e acesso ao texto bruto da execução. Mudança reflete nas duas visualizações porque compartilham o mesmo registro editável; nenhuma alteração automática do texto por heurística.
4. Ajuste manual do deslocamento temporal de cada faixa, com prévia da linha do tempo consolidada e preservação de tempos originais; diferenciar claramente `horário da faixa` de `horário na sessão`.
5. Reprodução por trecho vinculada ao áudio **quando acessível**: se o WAV estiver somente no disco local, implementar caminho explícito e seguro de reanexar o arquivo ou reproduzir via aplicativo autorizado. Mostrar estado de mídia indisponível com alternativa de reabrir arquivo; jamais afirmar que o servidor possui o WAV local.
6. Estados vazios, acesso negado, ausência de arquivo, falha de salvamento e versão de nova execução não aplicada.

7. Reutilizar casca campanha/Cenas e composição lista|conteúdo da Biblioteca como análogos, sem herdar permissões de documento revelado. Rotas lazy sob campanha devem preceder a rota genérica de campanha e receber parâmetro `campanhaId` compatível com o guard. Nome/URL final ficam no design aprovado D-01.
8. Recomendar correção com revisão otimista e conflito 409 (análogo de Documento): original imutável, correção explicitamente vazia válida e rascunho preservado em erro/conflito. Duas abas do mesmo Mestre não equivalem a colaboração; nenhuma pode sobrescrever silenciosamente a outra.
9. Fechar D-04/D-05 antes do editor: reprodução por seleção explícita de WAV em memória do navegador é a recomendação inicial; ponte autenticada com app é alternativa de maior manutenção. Seleção/reseleção valida correspondência com a faixa; liberar URLs temporárias ao sair e não fazer upload. Posição de reprodução usa tempo bruto da faixa, enquanto consolidado usa tempo bruto + offset; comportamento para trecho fora do áudio precisa ser definido.
10. Seleção explícita da execução alternativa deve manter correções da anterior e impedir mistura automática. Original, identidade da execução e salvamento são observáveis nas duas vistas. Offset não reescreve tempos brutos; texto transcrito é renderizado como texto seguro, sem HTML arbitrário.

## Critérios de Aceite

- Corrigir um segmento em faixa individual → mesma fala corrigida na consolidada; voltar à faixa conserva edição, enquanto texto original pode ser consultado.
- Dois segmentos de participantes distintos com interseção temporal permanecem independentes e ordenados; alterar offset de uma faixa reajusta só posições da faixa na consolidação.
- Ação de reproduzir usa o timestamp correto; quando app não está disponível e arquivo não foi reanexado, o UI explica limitação sem quebrar a edição do texto.
- Testes de permissão também cobrem URLs diretas e tentativas de acesso à mídia; jogador/espectador não recebem conteúdo oculto.
- Verificação visual real `1920×1080`, `1366×768`, `960×1080` e `360×800`, claro/escuro, com análogo aprovado e skill `verify`; testar estados individual, consolidado, edição, vazio, erro e offline.

- Duas abas editam mesma revisão: primeira salva, segunda recebe conflito e mantém rascunho; confirmar texto vazio não recupera o original por fallback falsy. Resposta atrasada não desfaz edição mais recente.
- Usar faixa A [5s,7s] com offset +2s: consolidado [7s,9s], player procura 5s no WAV; alterar offset de B não muda A. Sobreposição e empate conservam segmentos/identidades conforme contrato aprovado.
- Testar reanexação errada, arquivo ausente, permissão revogada com tela já aberta e tentativa de injetar HTML via transcrição. Recusar acesso sem expor mídia/dados e liberar estado de leitura ao invalidar autorização.
- Gate web: `1920×1080`, `1366×768`, `960×1080`, `360×800`, bases clara/escura, teclado/foco, alvo mobile 44px e sem overflow. Observar individual, consolidada, conflito, execução alternativa, erro e mídia indisponível; verificar pessoalmente com `verify` e análogos aprovados. Sem rede, registrar limite de salvamento em vez de prometer editor offline.
- Aplicar os [gates comuns](transcricoes/revisao.md#gates-de-implementação) ao recorte desta task e registrar comandos, resultados e limites no anexo proprietário. Critérios são futuros: esta revisão documental não os executou.

## Fora de Escopo

- Correções em massa por IA, suspeição automática, retranscrição de intervalo, versões recuperáveis, edição simultânea colaborativa e publicação para jogadores.

## Dependências

- `../done/transcricoes-01-sessoes-e-contratos.spec.md`, `../done/transcricoes-02-importacao-e-glossario.spec.md`, `transcricoes-05-sincronizacao-offline.spec.md`, `docs/design/DESIGN.md`.

## Riscos e Mitigação

- Reprodução web x WAV local: UX precisa pedir o arquivo novamente ou trabalhar com app ativo; evitar CORS/servidor HTTP público improvisado.
- Ajuste manual de offset e editor concorrerem: guardar timestamp bruto imutável e offset independente.
