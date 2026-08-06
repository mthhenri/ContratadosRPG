# Subnavegação da aba Extras — Plano de Implementação

> **Para agentes executores:** SUB-SKILL OBRIGATÓRIA: usar `superpowers:executing-plans` para executar este plano inline, tarefa por tarefa. Não usar subagentes nesta tarefa.

**Objetivo:** Separar a aba Extras da ficha em `Identidade` e `Fragmentos` por meio de uma subbarra persistente, acessível e responsiva.

**Arquitetura:** A seleção será um `signal` local de apresentação dentro de `FichaVisualizacao`; nenhum DTO, rota, regra ou dado persistido muda. O template renderizará apenas o grupo ativo e o SCSS reutilizará exclusivamente os tokens existentes. Apesar de `FichaVisualizacao` ser extenso, este estado permanece local porque pertence exclusivamente à composição visual de Extras e não introduz regra nem dependência reutilizável que justificaria outro componente ou service.

**Stack:** Angular 21 standalone, Signals, template control flow (`@if`), SCSS BEM, Vitest/TestBed.

## Restrições globais

- Não criar commits. O usuário só autoriza commits quando os solicitar explicitamente.
- Os rótulos são exatamente `Identidade` e `Fragmentos`, inclusive no mobile.
- A nova montagem inicia em `Identidade`; alternar para outra aba principal e voltar preserva a seleção local.
- A subbarra deve funcionar em 360 px sem overflow e com alvo de toque mínimo de 44 px.
- Usar somente tokens já existentes; nenhum hex, fonte, raio ou breakpoint hardcoded.
- Não alterar cálculos, DTOs, permissões, URL ou persistência.

---

### Tarefa 1: Estado, renderização e contrato acessível da subbarra

**Arquivos:**

- Modificar: `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.ts`
- Modificar: `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.html`
- Modificar: `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.scss`
- Testar: `frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.spec.ts`

**Interfaces:**

- Consome: `signal` do Angular e as seis seções de Extras já existentes.
- Produz: tipo local `AbaExtras = 'identidade' | 'fragmentos'`, signal protegido `abaExtrasAtiva` e método protegido `selecionarAbaExtras(aba: AbaExtras): void`.

- [ ] **Passo 1: escrever testes que expressem o comportamento ainda ausente**

No `describe` de Extras, criar um helper que localize e acione a subbarra sem acessar detalhes privados:

```ts
function selecionarAbaExtras(raiz: HTMLElement, rotulo: 'Identidade' | 'Fragmentos'): void {
  const botao = Array.from(
    raiz.querySelectorAll<HTMLButtonElement>('.ficha-extras__navegacao-botao'),
  ).find((item) => item.textContent?.trim() === rotulo);
  expect(botao).toBeTruthy();
  botao!.click();
}
```

Adicionar testes para:

```ts
it('inicia Extras em Identidade e anuncia a seleção na subbarra', () => {
  const { raiz } = montarExtras({
    ...dados,
    identidade: { personalidade: 'Destemido', origem: origemExemplo },
  });

  const botoes = Array.from(
    raiz.querySelectorAll<HTMLButtonElement>('.ficha-extras__navegacao-botao'),
  );
  expect(botoes.map((botao) => botao.textContent?.trim())).toEqual(['Identidade', 'Fragmentos']);
  expect(botoes.map((botao) => botao.getAttribute('aria-pressed'))).toEqual(['true', 'false']);
  expect(raiz.textContent).toContain('Patente');
  expect(raiz.textContent).toContain('Origem');
  expect(raiz.textContent).toContain('Personalidade');
  expect(raiz.textContent).not.toContain('Fragmentos Consumidos');
  expect(raiz.textContent).not.toContain('Afinidade de Fragmentos');
  expect(raiz.textContent).not.toContain('Anomalia Biológica');
});

it('troca para Fragmentos e renderiza somente as seções desse recorte', () => {
  const alvo = montarExtras(dados);

  selecionarAbaExtras(alvo.raiz, 'Fragmentos');
  alvo.fixture.detectChanges();

  const botoes = Array.from(
    alvo.raiz.querySelectorAll<HTMLButtonElement>('.ficha-extras__navegacao-botao'),
  );
  expect(botoes.map((botao) => botao.getAttribute('aria-pressed'))).toEqual(['false', 'true']);
  expect(alvo.raiz.textContent).not.toContain('Patente');
  expect(alvo.raiz.textContent).not.toContain('Origem');
  expect(alvo.raiz.textContent).not.toContain('Personalidade');
  expect(alvo.raiz.textContent).toContain('Fragmentos Consumidos');
  expect(alvo.raiz.textContent).toContain('Afinidade de Fragmentos');
  expect(alvo.raiz.textContent).toContain('Anomalia Biológica');
});

it('preserva Fragmentos ao sair de Extras e voltar enquanto o componente permanece montado', () => {
  const alvo = montarExtras(dados);
  selecionarAbaExtras(alvo.raiz, 'Fragmentos');
  alvo.fixture.detectChanges();

  alvo.fixture.componentInstance['selecionarAbaStatus']('informacoes');
  alvo.fixture.detectChanges();
  alvo.fixture.componentInstance['selecionarAbaStatus']('extras');
  alvo.fixture.detectChanges();

  expect(alvo.raiz.textContent).toContain('Fragmentos Consumidos');
  expect(
    alvo.raiz.querySelector<HTMLButtonElement>('.ficha-extras__navegacao-botao--ativa')?.textContent?.trim(),
  ).toBe('Fragmentos');
});
```

No teste de modo somente leitura, confirmar que a subbarra continua presente e alternável sem fazer aparecer ações protegidas por `ajustavel()`.

- [ ] **Passo 2: executar os testes focados e confirmar a falha correta**

Executar:

```powershell
npm test --workspace=frontend -- --run frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.spec.ts
```

Resultado esperado: falha porque `.ficha-extras__navegacao-botao` e a separação dos conteúdos ainda não existem.

- [ ] **Passo 3: implementar o estado local mínimo**

Próximo aos tipos e estado de `AbaStatus`, adicionar:

```ts
type AbaExtras = 'identidade' | 'fragmentos';

protected readonly abaExtrasAtiva = signal<AbaExtras>('identidade');

protected selecionarAbaExtras(aba: AbaExtras): void {
  this.abaExtrasAtiva.set(aba);
}
```

Não ligar esse signal a input, rota, output ou documento da ficha: a preservação requerida acontece naturalmente enquanto a instância existir.

- [ ] **Passo 4: agrupar o template sob a subbarra**

No início do bloco `@if (abaStatusEfetiva() === 'extras')`, inserir:

```html
<nav class="ficha-extras__navegacao" aria-label="Seções de Extras">
  <button
    type="button"
    class="ficha-extras__navegacao-botao"
    [class.ficha-extras__navegacao-botao--ativa]="abaExtrasAtiva() === 'identidade'"
    [attr.aria-pressed]="abaExtrasAtiva() === 'identidade'"
    (click)="selecionarAbaExtras('identidade')"
  >
    Identidade
  </button>
  <button
    type="button"
    class="ficha-extras__navegacao-botao"
    [class.ficha-extras__navegacao-botao--ativa]="abaExtrasAtiva() === 'fragmentos'"
    [attr.aria-pressed]="abaExtrasAtiva() === 'fragmentos'"
    (click)="selecionarAbaExtras('fragmentos')"
  >
    Fragmentos
  </button>
</nav>
```

Envolver Patente, Origem e Personalidade em `@if (abaExtrasAtiva() === 'identidade')`. Envolver Fragmentos Consumidos, Afinidade de Fragmentos e Anomalia Biológica em `@if (abaExtrasAtiva() === 'fragmentos')`. Manter os divisores apenas entre seções do mesmo grupo, sem divisor sobrando no início ou fim.

- [ ] **Passo 5: estilizar a subbarra com tokens e responsividade intrínseca**

Dentro de `.ficha-extras`, adicionar:

```scss
&__navegacao {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 2px;
  border-bottom: 1px solid var(--border);
  background: var(--surface-2);
}

&__navegacao-botao {
  min-width: 0;
  min-height: 44px;
  border: 0;
  border-bottom: 2px solid transparent;
  padding: 8px 10px;
  background: transparent;
  color: var(--text-mute);
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: var(--tracking-label);
  cursor: pointer;

  &--ativa {
    border-bottom-color: var(--accent);
    background: var(--accent-dim);
    color: var(--accent);
  }
}
```

Não adicionar media query: o grid de duas colunas com `minmax(0, 1fr)` mantém os rótulos completos em 360 px e evita overflow por construção. Preservar o foco global definido em `docs/design/tema/_base.scss`.

- [ ] **Passo 6: ajustar os testes legados de Extras para selecionar o recorte correto**

Os testes de Patente, Origem e Personalidade continuam usando `montarExtras`. Criar `montarFragmentos` e migrar para ele os testes de Fragmentos Consumidos, Afinidade e Anomalia:

```ts
function montarFragmentos(documento: FichaJogadorDadosDto, ajustavel = false) {
  const alvo = montarExtras(documento, ajustavel);
  selecionarAbaExtras(alvo.raiz, 'Fragmentos');
  alvo.fixture.detectChanges();
  return alvo;
}
```

Usar esse helper nos testes `m3-42`, `m3-64` e `m3-67`, inclusive nos helpers locais que hoje montam diretamente Extras. Não afrouxar as asserções de conteúdo ou de permissão.

- [ ] **Passo 7: executar o teste focado até ficar verde**

Executar:

```powershell
npm test --workspace=frontend -- --run frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.spec.ts
```

Resultado esperado: arquivo inteiro verde, incluindo testes legados dos dois grupos.

---

### Tarefa 2: Gate de qualidade, verificação visual e documentação persistente

**Arquivos:**

- Revisar: os quatro arquivos da Tarefa 1
- Modificar: `docs/context/HISTORY.md`
- Modificar: `docs/context/CONTEXT.md`
- Remover ao corrigir: entrada `P-008` de `docs/context/PROBLEMS.md`
- Manter ativa até a conclusão: `docs/specs/active/m3-71-ficha-extras-subnavegacao.spec.md`
- Mover ao concluir: `docs/specs/active/m3-71-ficha-extras-subnavegacao.spec.md` para `docs/specs/done/`

**Interfaces:**

- Consome: implementação verde da Tarefa 1 e protocolo local `.agents/skills/verify/SKILL.md`.
- Produz: evidência automatizada e visual, contexto persistente atualizado e spec concluída.

- [ ] **Passo 1: revisar o diff contra a spec**

Executar:

```powershell
git diff --check
git diff -- frontend/src/app/modules/ficha/componentes/ficha-visualizacao docs/specs/active/m3-71-ficha-extras-subnavegacao.spec.md
```

Confirmar: nenhuma regra de domínio duplicada; nenhum DTO/rota/persistência alterado; nenhum hardcode visual; ações de Fragmentos permanecem protegidas por `ajustavel()`.

- [ ] **Passo 2: executar testes, lint e build proporcionais**

Executar:

```powershell
npm test --workspace=frontend -- --run frontend/src/app/modules/ficha/componentes/ficha-visualizacao/ficha-visualizacao.component.spec.ts
npm run lint --workspace=frontend
npm run build --workspace=frontend
```

Resultado esperado: todos com código de saída 0. Se houver falha preexistente, demonstrar que ela também ocorre no `HEAD` sem misturá-la ao resultado desta tarefa.

- [ ] **Passo 3: verificar a aplicação real conforme `verify`**

Subir ou reutilizar a stack real indicada pela skill e verificar, no mínimo:

- desktop: primeira entrada em Extras mostra Identidade; troca para Fragmentos; saída e retorno preservam Fragmentos;
- mobile 360 px: dois rótulos completos, alvos de 44 px, foco visível, sem corte, sobreposição ou overflow horizontal;
- modo somente leitura: subbarra funciona e não expõe ações de remoção/registro;
- contraste e indicação ativa permanecem legíveis com o tema em execução.

Registrar screenshots e resultados nos artefatos definidos pela skill `verify`.

- [ ] **Passo 4: atualizar o contexto persistente em português**

Adicionar no topo de `HISTORY.md` a narrativa da `m3-71`, editar somente as seções afetadas de `CONTEXT.md` e remover `P-008` de `PROBLEMS.md` porque a mistura de conteúdos e a descoberta da Origem deixam de depender de uma lista única em Extras. Não transformar `CONTEXT.md` em diário.

- [ ] **Passo 5: concluir a spec sem commit**

Mover `docs/specs/active/m3-71-ficha-extras-subnavegacao.spec.md` para `docs/specs/done/` somente após todos os gates obrigatórios estarem verdes. Não executar `git add` nem `git commit`; entregar todas as alterações locais para revisão do usuário.

