# m4-01-contrato-ficha-criatura-dados.spec.md

> Task 1/10 do milestone `m4-ficha-criatura-npc.spec.md`.

## Objetivo

Fechar em código a **forma final do documento JSONB `ficha.dados`** para a ficha de
criatura (Ameaça) — o contrato tipado `FichaCriaturaDadosDto` em `shared/src/dtos/ficha/`,
derivado do capítulo "Guia de Criação de Ameaças" (`docs/core/guia_de_mestre-v4.0.0.md`).
O design já está **fechado** em `SCHEMA.md` (seção "FichaCriaturaDadosDto") — esta task
**codifica** esse design, não o reabre. Pura camada `shared/`: sem migration, sem service,
sem endpoint, sem frontend, sem `shared/regras/criatura` (isso é `m4-02`).

## Entregáveis

1. **Enums novos** em `shared/src/enums/` (string enum, `SCREAMING_SNAKE_CASE`, sem tabela
   `tipo_*` — conteúdo de jogo do JSONB, §10.3): `NivelAmeacaEnum` (NULA/BAIXA/MEDIA/ALTA/
   EXTREMA/CATASTROFICA/APOCALIPTICA), `OrigemCriaturaEnum` (SCP_ADAPTADO/ORIGINAL),
   `ComportamentoCriaturaEnum` (CACADORA/TERRITORIAL/OPORTUNISTA/INDIFERENTE/INTELIGENTE/
   CAOTICA), `ModificadorCriaturaEnum` (FORTE/MEDIO/FRACO/FRAGIL), `TenacidadeEnum`
   (DESCARTAVEL/FRAGIL/PADRAO/ROBUSTA/RESISTENTE/IMPLACAVEL/ABSOLUTA),
   `RegeneracaoModoEnum` (PASSIVA/CONDICIONAL), `RegeneracaoIntensidadeEnum`
   (RESIDUAL/MODERADA/ALTA/SEVERA/IMPARAVEL), `PorteCriaturaEnum` (MINUSCULO/MEDIO/GRANDE/
   ENORME/GIGANTE/TITANICO/COLOSSAL), `CadenciaEnum` (SINGULAR/DUPLA/TRIPLICE/FRENETICA),
   `CustoAcaoEnum` (MOVIMENTO/PADRAO/COMPLETA — genérico, não prefixado por "Criatura": pode
   servir NPC/outros consumidores futuros do mesmo conceito de ação) e
   `HabilidadeTipoCriaturaEnum` (PASSIVA/ATIVA/GATILHO). **Reusar** `TipoDanoEnum` (já tem
   `GERAL`) para o `tipo` de resistências/fraquezas/dano de ataque — não redefinir
   (proibição #21).
2. **`FichaCriaturaDadosDto`** + sub-DTOs em `shared/src/dtos/ficha/` (novo arquivo, ex.
   `ficha-criatura.dtos.ts`, exportado pelo `index.ts` do subpath `./dtos/ficha` já
   existente — sem novo subpath no `package.json`): `identidade` (designação, origem,
   conceito, natureza física, comportamento, motivação, gancho único, tema de horror
   opcional), `na` (`NivelAmeacaEnum`), `vd` (number), `atributos` (**reusa**
   `FichaAtributosDto` de `ficha.dtos.ts` — mesmos 10 campos, sem redefinir),
   `modificadores` (mapa dos mesmos 10 atributos → `ModificadorCriaturaEnum`),
   `tenacidade`, `vidaMaxima`/`vidaAtual` (snapshot editável, mesma filosofia `m3-10`),
   `defesa` (snapshot editável), `resistencias`/`fraquezas` (`{ tipo: TipoDanoEnum, subtipo:
   string | null, valor: number }[]`), `regeneracao?` (modo/intensidade/valor absoluto/
   condição), `porte`, `deslocamento` (terrestre/voador/aquatico/sobrenatural, todos
   opcionais, ao menos um preenchido), `cadencia`, `iniciativaBonus?`, `ataques[]` (nome,
   atributo `keyof FichaAtributosDto`, custoAcao, dano string, tipoDano, area boolean,
   efeito opcional), `habilidades[]` (nome, tipo, descrição, restrição opcional) e
   `anotacoes?` (mesmo tratamento privado — só dono/mestre — da ficha de jogador). Forma
   exata: ver `SCHEMA.md` "FichaCriaturaDadosDto".
3. **Sem Maestria** — o campo não existe no contrato (decisão fixada na abertura do
   milestone: Maestria é exclusiva de jogador).
4. **`interface readonly` pura**, como todos os DTOs do shared — **sem class-validator**
   (decisão vigente do projeto, `CONTEXT.md` §5: DTOs não são classes, o backend não liga
   `ValidationPipe`; validação estrutural fica documentada campo a campo aqui, validação de
   regra de negócio é do service em `m4-03`).
5. **`SCHEMA.md`** — remover o marcador "codificar no M4" da seção
   `FichaCriaturaDadosDto`, apontando para o arquivo/linha onde o contrato agora vive em
   código.
6. Cada campo, faixa e enum conferido contra `docs/core/guia_de_mestre-v4.0.0.md`
   ("Guia de Criação de Ameaças") — **o documento vence o código** (§16 #27).

## Critérios de Aceite

- `FichaCriaturaDadosDto` compila no `shared`, exportado pelo subpath `./dtos/ficha`,
  consumível por backend e frontend sem redefinição.
- Forma bate 1:1 com o exemplo fechado em `SCHEMA.md` (que já reflete "A Estátua").
- Nenhum campo/enum duplica um conceito já existente no shared (`FichaAtributosDto`,
  `TipoDanoEnum` reusados, não redefinidos).
- `SCHEMA.md` reflete o contrato como fechado/codificado, não mais como esboço.
- **Nenhum** service, repository, migration, endpoint, `shared/regras/criatura` ou
  frontend nesta task.

## Fora de Escopo

- `shared/regras/criatura` — motor de regras e validação de coerência (`m4-02`).
- Backend (CRUD, permissões) — `m4-03`.
- Frontend — `m4-04`.
- `FichaNpcDadosDto` (`m4-05`).

## Dependências

- M3 completo (`FichaAtributosDto`, `FichaJogadorDadosDto`, `TipoDanoEnum`,
  `TipoFichaEnum` já com `CRIATURA` seedado desde `m3-02`).
- Design fechado em `SCHEMA.md` (seção "FichaCriaturaDadosDto") e
  `docs/core/guia_de_mestre-v4.0.0.md` ("Guia de Criação de Ameaças").
