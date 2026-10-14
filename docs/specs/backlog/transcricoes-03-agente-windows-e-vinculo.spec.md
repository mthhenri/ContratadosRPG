# transcricoes-03-agente-windows-e-vinculo.spec.md

> **Task 03/09** do guarda-chuva `transcricoes.spec.md`. Instalador e vínculo seguro do aplicativo auxiliar.

> **Estado: backlog; preparação documental. Implementação depende de aprovação expressa do autor.**
> Decisões pendentes, matriz de acesso e gates: [revisão](transcricoes/revisao.md). Anexos próprios: `transcricoes-03-agente-windows-e-vinculo/` no mesmo estado; evidência bruta em `.artifacts/transcricoes-03-agente-windows-e-vinculo/`.

## Objetivo

Disponibilizar um aplicativo Windows instalável que possa ser vinculado à conta do Mestre e aberto a partir da sessão no site, sem expor credenciais e sem precisar de Python manual.

## Entregáveis

1. Seleção e justificação técnica de stack/empacotamento do aplicativo Windows, compatível com execução do worker Python e atualizações controladas; apresentar escolha ao autor se afetar experiência, manutenção ou custo.
2. Instalador Windows 64 bits, inicialização, desinstalação e mensagens de falhas de dependência; distribuição verificável em máquina limpa ou VM. Nenhuma execução obrigatória via terminal.
3. Fluxo de vinculação de dispositivo à conta usando autorização pelo site e credenciais limitadas/revogáveis; suportar desconexão. Protocolo de abertura contextual sem segredo permanente na URI (por exemplo custom URI contendo somente identificador opaco de intenção de curta validade).
4. Site identifica aplicativo ausente ou não responsivo e oferece instrução/instalação em vez de deixar a jornada travada.
5. Checagem de recursos locais/compatibilidade e canal seguro para obter contexto **autorizado** de campanha/sessão; dados do Mestre A nunca acessam cache do Mestre B na máquina compartilhada.

6. Antes de construir o app, fechar D-02/D-03: stack/instalador, localização no monorepo sem pressupor quarto workspace npm, distribuição, credencial de dispositivo, prazo/renovação/revogação e transporte site↔app. Recomendar shell Windows com worker Python empacotado e vínculo aprovado no navegador; isso é proposta, não escolha aprovada de framework ou protocolo.
7. A abertura contextual é intenção de uso único/curta validade e não autentica por si: app vinculado resolve contexto no servidor com autorização atual. Não carregar senha, JWT web, BYOK, texto privado, comando de shell ou caminho arbitrário na URI. Expiração, consumo repetido, adulteração e conta errada são rejeitados.
8. Credenciais do dispositivo ficam protegidas pelo sistema Windows (alternativa concreta sujeita a D-03); caches/outbox são separados por conta. Desconectar não elimina resultado pendente silenciosamente. Expiração durante offline pausa apenas operações que exigem servidor, sem autenticar como outro usuário.
9. Se houver ponte loopback, exigir interface somente local, origem autorizada, autenticação própria, defesa contra CSRF/replay/DNS rebinding e seleção explícita dos arquivos. O `auth-token.interceptor` atual injeta JWT em toda chamada: uma ponte não pode recebê-lo por acidente. URI customizada não prova instalação; ausência de confirmação deve apresentar caminho manual claro, sem alegar detecção infalível do navegador.

## Critérios de Aceite

- Jornada numa instalação Windows limpa: baixar → instalar → vincular conta → abrir sessão no site → aplicativo abre no contexto correto → desconectar/revogar → tentativas anteriores falham com mensagem clara.
- Protocolo de abertura não carrega JWT, chave de provedor nem dados privados na URL; tokens/segredos não constam em logs/arquivos exportáveis.
- Testes para link expirado, sessão sem permissão, troca de conta, aplicativo ausente e perda de internet após vínculo.
- Verificação visual e de usabilidade do instalador/app e site; padrões de Angular e `docs/design/DESIGN.md` nos controles web; `1920×1080`, `1366×768`, `960×1080` e `360×800` no site; tamanhos aplicáveis e DPI no aplicativo Windows.

- Testar replay/alteração da intenção, origem não permitida, duas contas no mesmo Windows e credencial de dispositivo revogada; antigo Mestre não resolve contexto após transferência de papel.
- Verificar app ausente, app ocupado/não responsivo, protocolo não registrado e recusa do navegador. UI mantém instalação/abertura manual disponível; não depender somente de temporizador de foco.
- Instalar/desinstalar sem Python manual em Windows x64 limpo; registrar versões, artefato, assinatura ou ausência e limitações. Proteger downloads/atualização de binários/modelos contra execução de origem adulterada. Distribuição/publicação só mediante autorização própria; nenhum deploy nesta revisão.
- Aplicar os [gates comuns](transcricoes/revisao.md#gates-de-implementação) ao recorte desta task e registrar comandos, resultados e limites no anexo proprietário. Critérios são futuros: esta revisão documental não os executou.

## Fora de Escopo

- macOS, Linux, versão portátil, abertura automática de arquivos do sistema sem ação do Mestre e inferência Whisper (task 04).
- Exigir exposição de servidor HTTP público no PC do Mestre.

## Dependências

- `../active/transcricoes-01-sessoes-e-contratos.spec.md`; autenticação do site e `docs/SYSTEM.SPEC.md`; `docs/design/DESIGN.md`.

## Riscos e Mitigação

- Driver/antivírus/empacotamento em Windows: construir prova de instalação desde cedo e documentar limitações reais.
- Vínculo offline: permitir conclusão de tarefas já autorizadas localmente; sincronização respeita revogação e autenticação de retorno.
