# campanhas-missoes-esquadrao-levantamento.spec.md

> Task avulsa de **levantamento** (investigação e proposta de divisão; **não é implementação**). Origem: o
> autor mencionou "de passagem", ao pedir o calendário (Sessão 5, 10/11/2026), que também precisa **remodelar a
> parte de campanhas** e **fazer a parte de "missões do esquadrão"**, e que isso não deve entrar sem
> planejamento. Pedido **B (escopo vizinho)** de `PEDIDO_CLAUDE_CODE_SPECS_SITE.md`. Só especificação.
> Retoma e amplia `I-017` (Base, esquadrões e histórico) e `m5-guia-missao.spec.md`, ambas ainda abertas.

## Objetivo

Descrever o **estado atual** das áreas de campanha e de missão/esquadrão, os **problemas**, e propor uma
**divisão em specs menores**, ordenadas e com dependências, para o autor aprovar antes de qualquer execução. O
calendário (`calendario-campanha-mundo.spec.md`) deve poder sair **antes** e depender o mínimo deste trabalho.

## Estado atual encontrado

### O que existe (campanha como mesa)

| Peça | Onde | Observação |
|---|---|---|
| Campanha | tabela `campanha` (`nome`, `descricao`, `codigo_convite`, `codigo_convite_espectador`); backend `modules/campanha` (~2.855 linhas) com 18 endpoints em `campanha.controller.ts`: CRUD, entrar por convite, membros, papel, transferir mestre, regenerar convites, **`PUT :id/estado`** e **inventário do esquadrão** | A campanha **é a mesa**: não é uma operação nem uma missão |
| Membros e papéis | `campanha_membro` + `tipo_campanha_membro_papel` (`MESTRE`, `JOGADOR`, `ESPECTADOR`) | Um mestre por campanha; papel transferível |
| Estado "Na Base / Em Missão" | booleano `naBase` em `campanha`; `PUT :id/estado`; evento `campanha:estado-alterado` | **Único estado de missão do sistema.** Só controla o acesso de jogadores ao inventário do esquadrão e o selo exibido nas telas do mestre e do jogador |
| Esquadrão | **não é entidade.** Existe implícito: o conjunto de fichas de jogador da campanha, o **Inventário do Esquadrão** (`/campanhas/:id/inventario…`), o **Caderno do Esquadrão** (Yjs) e a Biblioteca | A ficha do agente **não informa a qual esquadrão pertence** (`I-017`) |
| Cena e Encontro | `cena` (PLANEJADA → ATIVA → ENCERRADA, tipos, `ordem`), `encontro` (iniciativa) ligado à cena | Cena é "o que acontece na mesa", **sem data de jogo e sem missão** |
| Documentos | Biblioteca (`documento`, pastas por cargo) | Pode guardar briefings, mas não há "briefing de missão" |
| Telas | `modules/campanha/paginas`: `lista`, `criar`, `entrar`, `detalhe` (shell), `detalhe-mestre` (713 linhas de TS), `detalhe-jogador` (845), `espectador`, `previa-jogador`, `historico-rolagens-janela` | Duas páginas de detalhe grandes e paralelas (mestre e jogador); ver Problemas |
| Mestre vê | abas Esquadrão · Criaturas · NPCs (`CampanhaFichasAbas`, `m4-15`), cenas, Biblioteca, caderno, calculadora | |

### O que não existe

- **Entidade Missão** (nome, objetivo, criatura, descrição, prestígio, datas, status, resultado) e **Esquadrão**.
- **Histórico de missões** e de **participação** (quem participou de quê).
- Qualquer vínculo **cena ↔ missão**, **encontro ↔ missão** ou **ficha ↔ esquadrão**.
- Qualquer registro de **Prestígio concedido por missão** (a ficha guarda só `prestigio`, derivando a Patente
  via `shared/regras/patente`).
- Calendário do mundo (spec à parte).

### O que o livro define sobre missão (`docs/core/sistema-v4.1.5.md` §"Missões", l.2575-2620)

Uma missão é entregue a um esquadrão de **4 a 6 agentes** classe E com até **2 patentes** de diferença; tem
**Criatura, Descrição, Objetivo e Prestígio** (base 1, o mestre pode ocultar o valor); **tipos**: **Missão Direta**
(1 ou 2 dias operacionais, padrão das sessões independentes) e **Campanha** (múltiplos dias operacionais); **dias
operacionais** marcados pelo mestre (pausáveis); **recompensas** (Prestígio, salário base, adicional por dia em
campo em campanhas, pagamento adiantado, falha remove prestígio); **retorno à base** (check-in, itens fora da
patente). **Terminologia:** o livro chama "Campanha" um **tipo de missão**; o site chama "campanha" a **mesa**.

### Pedidos e specs já existentes que tocam o tema

| Item | Estado | Relação |
|---|---|---|
| `I-017` (IDEAS) — Base, esquadrões e histórico operacional | aberta | Propõe Base ⊃ Esquadrão ⊃ agentes + histórico de missões/campanhas; decisões abertas: "campanha e missão são a mesma entidade em durações diferentes ou a campanha contém missões?", mudança de esquadrão preservando histórico, vários esquadrões por campanha, vínculo na ficha/usuário/participação |
| `m5-guia-missao.spec.md` (backlog) | placeholder do M5 | Assistente de criação de missão (objetivos, ameaças, recompensas); "escopo intencionalmente aberto"; depende de M4 (concluído) |
| `I-009` (IDEAS) — Redução de módulo de fragmentos | aberta | Depende de "esperar uma missão", **conceito que não existe no app** |
| `campanha-detalhe-mestre-coluna-acoes`, `m2-19`, `m2-20`, `m4-15` (done) | concluídas | Histórico do layout atual |
| `calendario-campanha-mundo.spec.md` | backlog (nova) | Marca missões como eventos tipados **sem** entidade; `missao_id` nulo adiado |

## Problemas identificados (hipóteses a confirmar, com evidência na investigação)

1. **Sem modelo de missão:** o jogo gira em torno de missões, o site não as conhece; o estado "Em Missão" é um
   interruptor sem contexto (qual missão? desde quando? com quem?).
2. **Colisão de nomes:** "campanha" (mesa) × "Campanha" (tipo de missão) × "esquadrão" (conjunto implícito).
3. **Esquadrão implícito:** inventário e caderno "do esquadrão" pertencem à campanha, não a uma entidade; não há
   como preservar histórico quando agentes entram, saem ou morrem.
4. **Páginas de detalhe monolíticas e duplicadas** (mestre ≈ 700 linhas de TS + 677 de SCSS; jogador ≈ 850 + 1.092),
   com decisões de papel repetidas; cada novo recurso (calendário, missões) tende a engordá-las.
5. **Sem histórico:** nada responde "quais missões esse esquadrão já cumpriu?" ou "quem estava nela?".
6. **Regras de missão não ancoradas:** Prestígio, salário por duração, adiantamento e retorno à base são calculados
   à mão ou nas calculadoras, sem uma missão que os origine (ver `I-009`).

## Proposta de divisão em specs menores (a aprovar)

Ordem sugerida, cada item com **spec própria**, entregável e verificável isoladamente:

| # | Spec filha | Escopo | Depende de |
|---|---|---|---|
| 0 | **Decisão de glossário** | Fixar os termos (mesa/campanha, missão, missão longa, esquadrão, operação) e onde cada um aparece; sem código | — |
| 1 | `calendario-campanha-mundo` | **Já especificada**; missão como evento tipado | 0 (nomes) |
| 2 | **Entidade missão (núcleo)** | Tabela `missao` por campanha: nome, tipo (Direta/longa), objetivo, criatura, descrição, status (planejada/ativa/concluída/fracassada), datas de jogo, Prestígio concedido; CRUD do mestre; leitura por papel; tempo real | 0, 1 recomendado |
| 3 | **Estado "Em Missão" ligado à missão** | Substituir o interruptor `naBase` por derivação da missão ativa (ou mantê-lo como cache), preservando o gate do inventário | 2 |
| 4 | **Esquadrão como entidade** | `esquadrao` (nome, "Esquadrão 251"), membros atuais e antigos com datas, ficha ↔ esquadrão; sem Base ainda | 2; `I-017` |
| 5 | **Participação e histórico** | Quem participou de cada missão; linha histórica do esquadrão; ligação com eventos de morte/entrada do calendário | 2, 4 |
| 6 | **Vínculo cena/encontro ↔ missão** | Uma cena pertence a uma missão; filtro e histórico | 2 |
| 7 | **Recompensas da missão** | Prestígio, salário base e por dia em campo, adiantamento, retorno à base, usando `shared/regras/patente`/`compras` | 2, 5; regras do livro |
| 8 | **Remodelar telas de campanha** | Quebrar `detalhe-mestre`/`detalhe-jogador` em componentes e rotas por área; navegação (Visão geral, Missões, Esquadrão, Cenas, Biblioteca, Calendário) | 2, 4; `auditoria-visual-geral-site` |
| 9 | **Guia de missão (M5)** | Assistente de criação de missão sobre o modelo de 2 | 2, `m5-guia-missao` |
| 10 | **Base** (`I-017` completo) | Base ⊃ esquadrões; serviços da Base | 4; decisão do autor |

Pontos de **corte seguro** para entregar valor sem o resto: **(0 + 1)** calendário; **(2 + 3)** missões simples;
**(4 + 5)** histórico do esquadrão. As demais podem esperar.

### Princípios da divisão

- Cada spec tem **dono único** de cada dado (campanha, missão, esquadrão) e **não migra o legado de uma vez**.
- Migrações de dados reversíveis e **soft delete**; nenhum campo do estado atual (`naBase`) é removido antes de a
  substituição estar em produção.
- Regras de jogo continuam no motor (`shared/regras`) e no livro (Oficina); esta divisão **não altera regra**.
- Tempo real segue o padrão broadcast-only e invalidador sem dados; permissões na service.
- Cada UI nova passa pelo gate visual e pelos primitivos de `shared/ui`.

## Entregáveis (deste levantamento)

> Anexos em `campanhas-missoes-esquadrao-levantamento/`; sem código de produto.

1. **`estado-atual.md`**: inventário confirmado no código e **na tela real** (`verify`), com: endpoints, tabelas
   e colunas; DTOs de campanha/membro/inventário/estado; telas e rotas por papel; eventos de socket e salas;
   componentes gigantes e suas responsabilidades; pontos de acoplamento com ficha, cena, documento, caderno.
2. **`problemas.md`**: lista numerada com evidência (arquivo:linha, captura, fala do autor na sessão) e
   gravidade; separando defeito de **lacuna de modelo**.
3. **`modelo-proposto.md`**: diagrama de entidades (campanha, missão, esquadrão, participação, cena, calendário),
   cardinalidades e as **decisões abertas de `I-017`** com alternativas e recomendação (uma missão por vez ou
   várias? uma campanha com mais de um esquadrão? o vínculo agente-esquadrão fica na ficha, no usuário ou numa
   participação histórica?).
4. **`divisao.md`**: a tabela acima, refinada, com **specs filhas esboçadas** (objetivo, fora de escopo,
   dependência, tamanho), **ordem**, **riscos de migração** e **o que depende de decisão do autor**.
5. **`impacto.md`**: análise `gerenciamento-de-impacto` de cada consumidor de `campanha`, `naBase`, `campanha:estado-alterado`
   e das páginas de detalhe.
6. Atualização de `IDEAS.md` (`I-017`, `I-009`) e `MEMORY.md` se algum ponteiro mudar; as specs filhas **só**
   entram em `docs/specs/backlog/` após aprovação do autor.

## Critérios de Aceite

- O inventário cobre **todos** os endpoints do módulo de campanha, todas as páginas de `modules/campanha/paginas`
  e todos os eventos de socket de campanha, com a contagem conferida por comando.
- Cada problema tem evidência verificável; hipótese sem evidência fica marcada como hipótese.
- A divisão responde, para cada spec filha: qual dado ela cria, quem o lê, quem o escreve, o que não toca.
- O calendário comprova **independência**: `calendario-campanha-mundo` pode ser executada sem nenhuma das specs
  2-10, e a proposta mostra exatamente onde `missao_id` entra depois.
- O autor aprova ou ajusta a divisão. Nada de código, migration, `docs/core/` ou tela alterado.
- `npm run repo:verificar` sem alerta.

## Fora de Escopo

- Implementar qualquer entidade, migration, endpoint ou tela (inclusive Missão e Esquadrão).
- Alterar regra de missão, Prestígio, salário ou retorno à base (livro/Oficina).
- Remover ou renomear `naBase` e o estado Na Base/Em Missão.
- O calendário (spec própria) e a auditoria visual geral.
- Guia de criação de missão (M5) além de registrar a dependência.

## Dependências

- Nenhuma para investigar. `calendario-campanha-mundo` e `auditoria-visual-geral-site` são **paralelas**.
- Fontes: `docs/SYSTEM.SPEC.md` §9 e §14, `docs/SCHEMA.md`, `IDEAS.md` (`I-017`, `I-009`), `m5-guia-missao.spec.md`,
  `docs/core/sistema-v4.1.5.md` (Missões), skills `gerenciamento-de-impacto`, `tempo-real`, `verify`.

## Riscos e Mitigação

- **Virar implementação disfarçada:** o produto são documentos; proibido criar tabela ou endpoint.
- **Modelo grande demais de uma vez** (Base ⊃ Esquadrão ⊃ Missão): mitigado pelos cortes seguros e por adiar Base.
- **Decidir por inferência:** as decisões de `I-017` são do autor; sem resposta, ficam como alternativas.
- **Migração de dados vivos:** campanhas em uso (a do Esquadrão 251) não podem perder histórico; cada spec filha
  precisa de plano de migração e reversão.
- **Terminologia mudar no meio:** fechar o glossário (spec 0) antes de nomear tabelas e telas.

## Estratégia de verificação

Conferências por comando (contagem de endpoints, rotas e eventos), observação da aplicação real nos papéis
mestre, jogador e espectador (`verify`), revisão do relatório pelo autor, `repo:verificar`.

## Perguntas abertas

1. **Glossário:** adotar "missão" para a unidade de jogo e reservar "campanha" para a mesa, renomeando o tipo de
   missão longa? Ou outro vocabulário?
2. **O que significa "remodelar a parte de campanhas"?** Quais dores concretas (tela do mestre, do jogador, criação,
   entrada, lista, navegação)? Há algo que quebrou ou confundiu nas Sessões 4 e 5?
3. **O que o autor espera de "missões do esquadrão":** histórico das missões cumpridas? planejamento das próximas?
   briefing para os jogadores? controle de Prestígio e pagamento? tudo isso?
4. **Uma campanha pode ter mais de um esquadrão** ou continua 1:1?
5. **Agente que muda de esquadrão** preservando histórico: precisa existir já?
6. **Onde mora o vínculo agente–esquadrão:** na ficha, no usuário ou numa participação histórica própria?
7. **A "Base"** (`I-017`) entra neste ciclo ou fica para depois?
8. **O que acontece com o interruptor "Na Base / Em Missão"** quando houver missão: derivado ou independente?
9. **Prioridade:** além do calendário, qual corte seguro entra primeiro: missões simples (2+3) ou histórico do
   esquadrão (4+5)?
