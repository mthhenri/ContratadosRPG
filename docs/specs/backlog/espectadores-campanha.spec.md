# espectadores-campanha.spec.md

> **Milestone M8 (número sugerido, não decisão de roadmap fechada — ver `docs/context/IDEAS.md`) —
> Espectadores e Prévias de Campanha.** Nasce do pedido do autor em 2026-09-02 para permitir que
> pessoas acompanhem uma sessão sem se tornarem jogadores e para tornar a prévia do mestre fiel à
> visão real de um jogador. Este arquivo é guarda-chuva: implementar somente pelas tasks
> `espectadores-01`…`espectadores-06` abaixo.

## Objetivo

Adicionar o papel de campanha **ESPECTADOR**, que entra exclusivamente por um código de convite
próprio e acompanha, em tempo real, as rolagens públicas da campanha em um painel de leitura.
O módulo também substitui o atual “Ver como jogador”, que só troca o layout local, por uma prévia
servidor-orientada das permissões e dos dados que o jogador escolhido realmente recebe.

## Decisões de produto fechadas

1. **Papel de campanha, não tipo global.** `ESPECTADOR` entra em
   `TipoCampanhaMembroPapelEnum` e na tabela de referência
   `tipo_campanha_membro_papel`. É independente de `TipoUsuarioEnum`: uma conta NORMAL, TESTER
   ou ADMIN pode ser espectadora de uma campanha.
2. **Dois convites independentes por campanha.** A campanha possui o convite atual de jogador e
   um `codigo_convite_espectador` exclusivo. Cada código é único e pode ser regenerado pelo mestre
   sem invalidar o outro. O código recebido determina o papel no servidor; o frontend nunca envia
   nem escolhe um papel.
3. **Vínculo único e sem autoelevação.** Um usuário tem no máximo um vínculo ativo por campanha.
   Quem já é espectador não vira jogador ao informar o convite de jogador (nem o inverso): a
   tentativa é rejeitada. O mestre pode alterar explicitamente um membro entre JOGADOR e
   ESPECTADOR; transferência de mestre continua aceitando apenas JOGADOR.
4. **Escopo de leitura mínimo.** O espectador vê a identidade pública da campanha e o histórico/
   fluxo ao vivo de rolagens `PUBLICA`. Nunca vê rolagem `PRIVADA`, fichas, cadernos, inventário,
   convites, membros, criação/edição de campanha ou qualquer controle de rolagem. Uma concessão
   em `usuario_ficha_acesso` não amplia este papel; o backend a recusa para espectador.
5. **Painel próprio e compartilhável pelo mestre.** O destino do espectador é uma rota dedicada,
   “Painel do espectador”, centrada no feed de sessão. O mestre pode abri-la como prévia, mas o
   payload é o mesmo recorte público recebido por uma conta espectadora; privilégios de mestre não
   podem vazar nessa tela.
6. **Prévia de jogador é uma projeção, não uma máscara CSS.** O mestre escolhe um jogador e abre
   uma rota de prévia somente leitura. O backend calcula os dados e as permissões como se o alvo
   fosse o requisitante; a página reutiliza a composição da visão real de jogador. Assim, ficha
   não compartilhada, rolagem privada e ações indisponíveis não aparecem só porque um mestre já
   tinha os dados carregados.
7. **Iniciativa/Encontro entra em task própria.** Quando a campanha tem um encontro ativo, o
   espectador ganha a mesma visão read-only que o jogador já tem (`m7-06`/`m7-07`): ordem, turno,
   rodada, cartões de combatente e log do encontro, com a mesma regra de revelação de NPC/criatura
   — sem ampliar o que o jogador já vê. Ele nunca conduz o encontro nem rola a própria iniciativa
   (não tem ficha). Detalhado em `espectadores-05-visao-iniciativa-encontro`.

## Matriz de permissões

| Ação | Mestre | Jogador | Espectador |
|---|---:|---:|---:|
| Entrar por convite de jogador | — | ✅ | ✅, mas recebe `JOGADOR` |
| Entrar por convite de espectador | — | ✅, mas recebe `ESPECTADOR` | ✅ |
| Gerir convite/membros/papel | ✅ | ❌ | ❌ |
| Ver ficha / receber acesso de ficha | ✅ | conforme posse/concessão | ❌ |
| Disparar rolagem | ✅ | conforme permissão da ficha | ❌ |
| Ver rolagem pública da campanha | ✅ | ✅ | ✅ |
| Ver rolagem privada | autor/mestre | só se autor | ❌ |
| Abrir painel do espectador | prévia | ❌ | ✅ |
| Ver Iniciativa/Encontro ativo (leitura) | ✅ (condução) | ✅ | ✅, sem rolar |
| Abrir prévia de jogador escolhido | ✅ | ❌ | ❌ |

## Quebra em tasks

| Task | Camada | Conteúdo | Depende de |
|---|---|---|---|
| `espectadores-01` | banco + shared | Papel, segundo convite, DTOs, contratos e compatibilidade de dados existentes. | — |
| `espectadores-02` | backend + tempo real | Entrada determinada pelo código, gestão de papel, permissões e projeções seguras. | `espectadores-01` |
| `espectadores-03` | frontend | Entrada, gestão de convites/membros e Painel do espectador ao vivo. | `espectadores-02` |
| `espectadores-04` | backend + frontend | Prévia fiel da visão de jogador, sem usar os privilégios do mestre. | `espectadores-02`, `espectadores-03` |
| `espectadores-05` | backend + frontend | Visão read-only de Iniciativa/Encontro ativo, reaproveitando a tela do jogador. | `espectadores-02`, `espectadores-03` |
| `espectadores-06` | integração + visual | Regressão de permissões, sessão em tempo real e gate visual desktop/mobile. | `espectadores-03`, `espectadores-04`, `espectadores-05` |

**Ordem:** `espectadores-01 → espectadores-02 → espectadores-03`, depois `espectadores-04` e
`espectadores-05` em paralelo (independentes entre si), fechando com `espectadores-06`. A última
task é obrigatória: a utilidade do módulo depende de confirmar a separação real entre os três
papéis, não apenas de esconder controles no frontend.

## Critérios de aceite do módulo

- Um usuário autenticado que usa o código de espectador entra apenas como `ESPECTADOR`, aparece
  com esse papel para o mestre e só consegue abrir o Painel do espectador.
- Uma rolagem pública chega ao painel de outra conta espectadora em tempo real; uma privada não
  está nem no REST nem no evento recebido por ela.
- Espectador não obtém ficha nem consegue rolar por REST, rota direta, WebSocket ou concessão de
  ficha; jogador e mestre preservam os comportamentos atuais.
- Mestre abre uma prévia de jogador cuja lista de fichas, feed e ações correspondem ao recorte
  daquele jogador, não ao do mestre. A prévia não executa mutações.
- Com um encontro ativo, o espectador vê ordem, turno, rodada e cartões de combatente exatamente
  como o jogador veria (NPC não revelado continua oculto) e não encontra nenhum controle de
  condução nem consegue rolar iniciativa por conta própria.
- A experiência é verificada em `1920×1080` e `360×800`, sem overflow horizontal e com alvos de
  toque adequados.

## Fora de escopo

- Acesso anônimo, link público sem conta, chat, comentários, transmissão de áudio/vídeo ou uma
  lista pública de espectadores.
- Permissões granulares por seção/ficha para espectador; a primeira versão é deliberadamente
  “rolagens públicas ou nada”.
- Conduzir Iniciativa/Encontro como espectador (avançar turno, aplicar dano, encerrar combate) —
  condução continua exclusiva do mestre; e revelar ao espectador qualquer dado de combate que o
  jogador também não veria hoje (a regra de revelação de `m7-04`/`m7-06` não é ampliada, só lida
  por mais um papel).
- Impersonação de usuário. A prévia de jogador é limitada à campanha e não altera JWT/sessão;
  a impersonação administrativa existente continua com sua própria regra e auditoria.

## Dependências

- `m2-05-campanha-convite-membros` e `m2-10-backend-gestao-membros-campanha` (vínculo, convite e
  invariante de mestre).
- `m2-20-painel-campanha-detalhe-jogador` e `m2-21-painel-jogador-abas-ficha` (composição real da
  visão de jogador).
- `m3-27-historico-rolagem` e `m3-51-permissoes-granulares-acesso` (feed público/privado e gates
  de ficha).
- `m7-04-backend-encontro-conducao`, `m7-06-frontend-visao-jogador`, `m7-07-frontend-log-encontro`
  e `m7-13-acesso-iniciativa-campanha-jogador` (visão read-only e log do encontro reaproveitados
  por `espectadores-05`).
- `docs/design/DESIGN.md` para qualquer task de interface.

## Riscos e mitigação

- **Vazamento por reaproveitar dados do mestre:** a prévia recebe uma projeção calculada no
  backend para o alvo, nunca arrays já carregados pelo mestre filtrados no template.
- **Confundir código e papel no cliente:** o servidor resolve o código e decide o papel; a única
  entrada pública continua sendo `codigoConvite`.
- **Transformar espectador em jogador incompleto:** toda permissão de ficha/rolagem rejeita
  explicitamente `ESPECTADOR`; esconder a navegação é apenas uma camada complementar.
- **Vazar controle de condução ao reaproveitar a tela do jogador no Encontro:** a composição usada
  pelo espectador nunca recebe os handlers de rolagem/condução do mestre nem o pedido de "rolar
  minha iniciativa" — a conta não tem ficha vinculada ao encontro.
