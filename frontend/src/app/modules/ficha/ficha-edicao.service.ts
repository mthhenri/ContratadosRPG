import { DestroyRef, Injectable, WritableSignal, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, debounceTime, switchMap } from 'rxjs';

import {
  calcularAreaPercepcao,
  calcularAtributosEfetivos,
  calcularDefesa,
  calcularDerivados,
  calcularDeslocamento,
  calcularEnergia,
  calcularInventario,
  calcularLimiteHabilidadesPorTurno,
  calcularProficiencia,
  calcularVida,
  contarMarcosDanoFurtivo,
  incrementarDanoFurtivo,
  calcularDanoCorpo,
  obterBonusAtributos,
  type BonusAtributos,
} from '@contratados-rpg/shared/regras/agente';
import { aplicarFormacaoAosDerivados, removerFormacaoDosDerivados } from '@contratados-rpg/shared/regras/identidade';
import type {
  FichaAtributosDto,
  FichaComboDto,
  FichaDerivadosDto,
  FichaFragmentoConsumidoDto,
  FichaHabilidadeDto,
  FichaIdentidadeDto,
  FichaInventarioDto,
  FichaJogadorDadosDto,
  FichaOrigemDto,
  FichaRecuperadaDto,
  FichaRolagemDto,
} from '@contratados-rpg/shared/dtos/ficha';

import { FichaService } from './ficha.service';
import { normalizarEntrada, type EntradaAgente } from './status-derivado';
import type { CondicoesFicha } from './condicoes-ficha';
import type { EstadoSanidade } from './componentes/ficha-sanidade/ficha-sanidade.component';
import {
  AjusteAtributos,
  AjusteCampoDados,
  AjusteClasse,
  AjusteDerivado,
  AjusteResistencia,
  AjusteVitalidade,
} from './componentes/ficha-visualizacao/ficha-visualizacao.component';

/**
 * Os ~19 handlers `ajustar*` que aplicam o ajuste otimista local e persistem em lote via
 * `FichaService` (`alterarFicha`, debounced) — extraídos de `VisualizarPage` (m3-10…m3-50) na
 * m2-20 para serem reusados por `CampanhaDetalhe` (visão do jogador) sem duplicar as ~19 chamadas.
 * Cada instância vive presa a uma única ficha exibida (`inicializar`, chamado uma vez no
 * `constructor` da página): `fichaId` é uma função porque `CampanhaDetalhe` troca a ficha exibida
 * (`fichaExibidaId`) sem recriar o componente.
 *
 * **Não** injetado com `providedIn: 'root'` de propósito — cada página que precisa dele o declara
 * em `providers: [FichaEdicaoService]` para ganhar sua própria instância (duas fichas abertas ao
 * mesmo tempo, ex.: `VisualizarPage` numa aba e `CampanhaDetalhe` noutra, nunca compartilham
 * estado de persistência).
 */
@Injectable()
export class FichaEdicaoService {
  private readonly fichaService = inject(FichaService);
  private readonly destroyRef = inject(DestroyRef);

  /** Estado do auto-save exposto ao cabeçalho da página ("Salvando…"/"Salvo"). */
  readonly estadoPersistencia = signal<'ocioso' | 'salvando' | 'salvo'>('ocioso');
  private temporizadorSalvo: ReturnType<typeof setTimeout> | null = null;

  private readonly ajustePendente = new Subject<void>();
  /**
   * `true` enquanto há uma edição local não persistida — exposto só para quem faz merge de
   * tempo real (`VisualizarPage.absorverRemoto`, m3-17); `CampanhaDetalhe` não precisa lê-lo.
   */
  readonly edicaoPendente = signal(false);
  /** Último documento vindo do servidor — base do merge de três vias de quem o usa. */
  private readonly fichaBaseSignal = signal<FichaRecuperadaDto | null>(null);
  readonly fichaBase = this.fichaBaseSignal.asReadonly();

  private ficha!: WritableSignal<FichaRecuperadaDto | null>;
  private obterFichaId!: () => number;
  private iniciado = false;

  /** Liga o composable à ficha exibida da página — chamado uma vez, no `constructor`. */
  inicializar(ficha: WritableSignal<FichaRecuperadaDto | null>, fichaId: () => number): void {
    if (this.iniciado) {
      return;
    }
    this.iniciado = true;
    this.ficha = ficha;
    this.obterFichaId = fichaId;

    this.ajustePendente
      .pipe(
        debounceTime(500),
        switchMap(() => {
          const fichaAtual = this.ficha()!;
          return this.fichaService
            .alterarFicha(this.obterFichaId(), {
              nome: fichaAtual.nome,
              cor: fichaAtual.cor,
              oculta: fichaAtual.oculta,
              dados: fichaAtual.dados,
            })
            .pipe(
              catchError(() => {
                this.edicaoPendente.set(false);
                this.estadoPersistencia.set('ocioso');
                return EMPTY;
              }),
            );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (fichaAlterada) => {
          this.ficha.set(fichaAlterada);
          this.fichaBaseSignal.set(fichaAlterada);
          this.edicaoPendente.set(false);
          this.marcarSalvo();
        },
      });
  }

  /** Redefine a base do merge (carga inicial, refetch, ou um remoto absorvido sem edição pendente). */
  definirBase(ficha: FichaRecuperadaDto | null): void {
    this.fichaBaseSignal.set(ficha);
  }

  private marcarSalvo(): void {
    this.estadoPersistencia.set('salvo');
    if (this.temporizadorSalvo) clearTimeout(this.temporizadorSalvo);
    this.temporizadorSalvo = setTimeout(() => this.estadoPersistencia.set('ocioso'), 2000);
  }

  private agendarPersistencia(): void {
    this.edicaoPendente.set(true);
    this.estadoPersistencia.set('salvando');
    this.ajustePendente.next();
  }

  ajustarVitalidade(ajuste: AjusteVitalidade): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    const estado = { ...fichaAtual.dados.estado, [ajuste.campo]: ajuste.valor };
    this.ficha.set({ ...fichaAtual, dados: { ...fichaAtual.dados, estado } });
    this.agendarPersistencia();
  }

  ajustarDerivado(ajuste: AjusteDerivado): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    const derivados = { ...(fichaAtual.dados.derivados ?? {}), [ajuste.chave]: ajuste.valor };
    this.ficha.set({ ...fichaAtual, dados: { ...fichaAtual.dados, derivados } });
    this.agendarPersistencia();
  }

  ajustarResistencia(ajuste: AjusteResistencia): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    const derivadosAtuais = fichaAtual.dados.derivados ?? {};
    const resistencias = { ...(derivadosAtuais.resistencias ?? {}), [ajuste.tipo]: ajuste.valor };
    const derivados = { ...derivadosAtuais, resistencias };
    this.ficha.set({ ...fichaAtual, dados: { ...fichaAtual.dados, derivados } });
    this.agendarPersistencia();
  }

  ajustarAtributos(ajuste: AjusteAtributos): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    const dadosNovos: FichaJogadorDadosDto = {
      ...fichaAtual.dados,
      atributos: ajuste.atributos,
      maestria: ajuste.maestria,
      modificadoresTeste: ajuste.modificadoresTeste,
      dadosTeste: ajuste.dadosTeste,
    };
    this.ficha.set({ ...fichaAtual, dados: this.aplicarProgressao(fichaAtual.dados, dadosNovos) });
    this.agendarPersistencia();
  }

  ajustarClasse(ajuste: AjusteClasse): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    const bonusAntes = obterBonusAtributos({
      classe: fichaAtual.dados.classe,
      arquetipo: fichaAtual.dados.arquetipo,
    });
    const bonusDepois = obterBonusAtributos({ classe: ajuste.classe, arquetipo: ajuste.arquetipo });
    const dadosNovos: FichaJogadorDadosDto = {
      ...fichaAtual.dados,
      classe: ajuste.classe,
      arquetipo: ajuste.arquetipo,
      atributos: this.aplicarDeltaBonus(fichaAtual.dados.atributos, bonusAntes, bonusDepois),
    };
    const dados =
      ajuste.classe === fichaAtual.dados.classe
        ? this.aplicarProgressao(fichaAtual.dados, dadosNovos)
        : this.recalcularSaude(dadosNovos);
    this.ficha.set({ ...fichaAtual, dados });
    this.agendarPersistencia();
  }

  private recalcularSaude(dados: FichaJogadorDadosDto): FichaJogadorDadosDto {
    const entrada = normalizarEntrada(dados.classe, dados.nivel, dados.atributos);
    const vidaMaxima = calcularVida(entrada);
    const energiaMaxima = calcularEnergia(entrada);
    return {
      ...dados,
      estado: {
        ...dados.estado,
        vidaMaxima,
        energiaMaxima,
        vidaAtual: Math.min(dados.estado.vidaAtual, vidaMaxima),
        energiaAtual: Math.min(dados.estado.energiaAtual, energiaMaxima),
      },
      derivados: calcularDerivados(dados.classe, dados.nivel, dados.atributos, dados.habilidades),
    };
  }

  private aplicarDeltaBonus(
    atributos: FichaAtributosDto,
    bonusAntes: BonusAtributos,
    bonusDepois: BonusAtributos,
  ): FichaAtributosDto {
    const resultado = { ...atributos };
    (Object.keys(resultado) as (keyof FichaAtributosDto)[]).forEach((chave) => {
      resultado[chave] = resultado[chave] - (bonusAntes[chave] ?? 0) + (bonusDepois[chave] ?? 0);
    });
    return resultado;
  }

  ajustarSanidade(sanidade: EstadoSanidade): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    const dadosAtuais = fichaAtual.dados;
    const estado = {
      ...dadosAtuais.estado,
      sequelas: sanidade.sequelas,
      traumas: sanidade.traumas,
      lesoes: sanidade.lesoes,
    };
    let dados: FichaJogadorDadosDto = { ...dadosAtuais, estado };

    const permanentesAntes = dadosAtuais.estado.lesoes.filter((lesao) => lesao.permanente);
    const permanentesDepois = sanidade.lesoes.filter((lesao) => lesao.permanente);
    const efetivoAntes = calcularAtributosEfetivos(dadosAtuais.atributos, permanentesAntes);
    const efetivoDepois = calcularAtributosEfetivos(dadosAtuais.atributos, permanentesDepois);
    if (!this.mesmoMapaAtributos(efetivoAntes, efetivoDepois)) {
      const progredido = this.aplicarProgressao(
        { ...dadosAtuais, atributos: efetivoAntes },
        { ...dados, atributos: efetivoDepois },
      );
      dados = { ...progredido, atributos: dadosAtuais.atributos };
    }

    this.ficha.set({ ...fichaAtual, dados });
    this.agendarPersistencia();
  }

  ajustarCondicoes(condicoes: CondicoesFicha): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    const estado = { ...fichaAtual.dados.estado, ...condicoes };
    this.ficha.set({ ...fichaAtual, dados: { ...fichaAtual.dados, estado } });
    this.agendarPersistencia();
  }

  private mesmoMapaAtributos(a: FichaAtributosDto, b: FichaAtributosDto): boolean {
    return (Object.keys(a) as (keyof FichaAtributosDto)[]).every((chave) => a[chave] === b[chave]);
  }

  ajustarHabilidades(habilidades: readonly FichaHabilidadeDto[]): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    this.ficha.set({ ...fichaAtual, dados: { ...fichaAtual.dados, habilidades } });
    this.agendarPersistencia();
  }

  ajustarInventario(inventario: FichaInventarioDto): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    this.ficha.set({ ...fichaAtual, dados: { ...fichaAtual.dados, inventario } });
    this.agendarPersistencia();
  }

  ajustarRolagens(rolagens: readonly FichaRolagemDto[]): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    this.ficha.set({ ...fichaAtual, dados: { ...fichaAtual.dados, rolagens } });
    this.agendarPersistencia();
  }

  ajustarCombos(combos: readonly FichaComboDto[]): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    this.ficha.set({ ...fichaAtual, dados: { ...fichaAtual.dados, combos } });
    this.agendarPersistencia();
  }

  /** Histórico de Fragmentos Potencializador consumidos (m3-64) — aba Extras, acima da Afinidade. */
  ajustarFragmentosConsumidos(fragmentosConsumidos: readonly FichaFragmentoConsumidoDto[]): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    this.ficha.set({ ...fichaAtual, dados: { ...fichaAtual.dados, fragmentosConsumidos } });
    this.agendarPersistencia();
  }

  ajustarAnotacoes(anotacoes: string): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    this.ficha.set({ ...fichaAtual, dados: { ...fichaAtual.dados, anotacoes } });
    this.agendarPersistencia();
  }

  ajustarHistoria(historia: string): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    this.ficha.set({ ...fichaAtual, dados: { ...fichaAtual.dados, historia } });
    this.agendarPersistencia();
  }

  ajustarNome(nome: string): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    this.ficha.set({ ...fichaAtual, nome });
    this.agendarPersistencia();
  }

  /** Cor de identidade visual (m3-61, relacional — fora do `dados`) — mesmo padrão de {@link ajustarNome}. */
  ajustarCor(cor: string | null): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    this.ficha.set({ ...fichaAtual, cor });
    this.agendarPersistencia();
  }

  /** Ficha oculta (m3-65, relacional — fora do `dados`) — mesmo padrão de {@link ajustarCor}. */
  ajustarOculta(oculta: boolean): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    this.ficha.set({ ...fichaAtual, oculta });
    this.agendarPersistencia();
  }

  /**
   * Avatar da ficha (m3-62) — **imediato**, não passa pelo `agendarPersistencia` debounced: o
   * upload em si já é a persistência (`FichaService.alterarImagem`, multipart), não uma edição de
   * campo em lote. Atualiza o signal local só com a `imagemUrl` devolvida pelo backend ao concluir.
   */
  ajustarImagem(arquivo: File): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    this.estadoPersistencia.set('salvando');
    this.fichaService
      .alterarImagem(this.obterFichaId(), arquivo)
      .pipe(
        catchError(() => {
          this.estadoPersistencia.set('ocioso');
          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((resultado) => {
        const fichaAgora = this.ficha();
        if (fichaAgora) {
          this.ficha.set({ ...fichaAgora, imagemUrl: resultado.imagemUrl });
        }
        this.marcarSalvo();
      });
  }

  /** Remove o avatar da ficha (m3-62) — mesmo modelo imediato de {@link ajustarImagem}. */
  removerImagem(): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    this.estadoPersistencia.set('salvando');
    this.fichaService
      .excluirImagem(this.obterFichaId())
      .pipe(
        catchError(() => {
          this.estadoPersistencia.set('ocioso');
          return EMPTY;
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((resultado) => {
        const fichaAgora = this.ficha();
        if (fichaAgora) {
          this.ficha.set({ ...fichaAgora, imagemUrl: resultado.imagemUrl });
        }
        this.marcarSalvo();
      });
  }

  ajustarPersonalidade(personalidade: string): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    const identidade: FichaIdentidadeDto = { ...this.identidadeAtual(fichaAtual), personalidade };
    this.ficha.set({ ...fichaAtual, dados: { ...fichaAtual.dados, identidade } });
    this.agendarPersistencia();
  }

  ajustarContrato(contrato: string): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    this.ficha.set({ ...fichaAtual, dados: { ...fichaAtual.dados, contrato } });
    this.agendarPersistencia();
  }

  ajustarOrigem(origem: FichaOrigemDto): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    const origemAnterior = this.identidadeAtual(fichaAtual).origem;
    const derivadosAtuais = fichaAtual.dados.derivados;
    const derivados = derivadosAtuais
      ? aplicarFormacaoAosDerivados(
          origemAnterior ? removerFormacaoDosDerivados(derivadosAtuais, origemAnterior.formacao) : derivadosAtuais,
          origem.formacao,
        )
      : derivadosAtuais;
    const identidade: FichaIdentidadeDto = { ...this.identidadeAtual(fichaAtual), origem };
    this.ficha.set({ ...fichaAtual, dados: { ...fichaAtual.dados, identidade, derivados } });
    this.agendarPersistencia();
  }

  /** Limpa a Origem (Peculiaridade a substitui, m3-41) — mestre-only: o output que dispara isto só emite sob essa trava (`ficha-visualizacao.component.ts`). */
  limparOrigem(): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    const origemAnterior = this.identidadeAtual(fichaAtual).origem;
    const derivadosAtuais = fichaAtual.dados.derivados;
    const derivados = derivadosAtuais && origemAnterior
      ? removerFormacaoDosDerivados(derivadosAtuais, origemAnterior.formacao)
      : derivadosAtuais;
    const identidade: FichaIdentidadeDto = { ...this.identidadeAtual(fichaAtual), origem: null };
    this.ficha.set({ ...fichaAtual, dados: { ...fichaAtual.dados, identidade, derivados } });
    this.agendarPersistencia();
  }

  private identidadeAtual(ficha: FichaRecuperadaDto): FichaIdentidadeDto {
    return ficha.dados.identidade ?? { personalidade: null, origem: null };
  }

  ajustarCampoDados(ajuste: AjusteCampoDados): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    let dados: FichaJogadorDadosDto = { ...fichaAtual.dados, [ajuste.campo]: ajuste.valor };
    if (ajuste.campo === 'nivel') {
      dados = this.aplicarProgressao(fichaAtual.dados, dados);
    }
    this.ficha.set({ ...fichaAtual, dados });
    this.agendarPersistencia();
  }

  private aplicarProgressao(
    antigos: FichaJogadorDadosDto,
    novos: FichaJogadorDadosDto,
  ): FichaJogadorDadosDto {
    const antes = normalizarEntrada(antigos.classe, antigos.nivel, antigos.atributos);
    const depois = normalizarEntrada(novos.classe, novos.nivel, novos.atributos);
    return {
      ...novos,
      estado: this.progredirEstado(novos.estado, antes, depois),
      derivados: this.progredirDerivados(novos.derivados, antes, depois, novos.habilidades),
    };
  }

  private progredirEstado(
    estado: FichaJogadorDadosDto['estado'],
    antes: EntradaAgente,
    depois: EntradaAgente,
  ): FichaJogadorDadosDto['estado'] {
    const deltaVida = calcularVida(depois) - calcularVida(antes);
    const deltaEnergia = calcularEnergia(depois) - calcularEnergia(antes);
    return {
      ...estado,
      vidaMaxima: estado.vidaMaxima === undefined ? undefined : estado.vidaMaxima + deltaVida,
      energiaMaxima:
        estado.energiaMaxima === undefined ? undefined : estado.energiaMaxima + deltaEnergia,
    };
  }

  private progredirDerivados(
    derivados: FichaDerivadosDto | undefined,
    antes: EntradaAgente,
    depois: EntradaAgente,
    habilidades: readonly FichaHabilidadeDto[],
  ): FichaDerivadosDto | undefined {
    if (!derivados) {
      return undefined;
    }
    const defesaAntes = calcularDefesa(antes);
    const defesaDepois = calcularDefesa(depois);
    const somar = (valor: number | undefined, delta: number): number | undefined =>
      valor === undefined ? undefined : valor + delta;
    return {
      ...derivados,
      defesa: somar(derivados.defesa, (defesaDepois?.defesa ?? 0) - (defesaAntes?.defesa ?? 0)),
      esquiva: somar(derivados.esquiva, (defesaDepois?.esquiva ?? 0) - (defesaAntes?.esquiva ?? 0)),
      bloqueio: somar(
        derivados.bloqueio,
        (defesaDepois?.bloqueio ?? 0) - (defesaAntes?.bloqueio ?? 0),
      ),
      deslocamento: somar(
        derivados.deslocamento,
        calcularDeslocamento(depois) - calcularDeslocamento(antes),
      ),
      proficiencia: somar(
        derivados.proficiencia,
        (calcularProficiencia(depois) ?? 0) - (calcularProficiencia(antes) ?? 0),
      ),
      percepcao: somar(
        derivados.percepcao,
        calcularAreaPercepcao(depois) - calcularAreaPercepcao(antes),
      ),
      inventarioMaximo: somar(
        derivados.inventarioMaximo,
        calcularInventario({ ...depois, habilidades }) - calcularInventario({ ...antes, habilidades }),
      ),
      habilidadesPorTurno: somar(
        derivados.habilidadesPorTurno,
        calcularLimiteHabilidadesPorTurno(depois) - calcularLimiteHabilidadesPorTurno(antes),
      ),
      danoFurtivo: this.progredirDanoFurtivo(derivados.danoFurtivo, antes, depois),
      danoCorpoACorpo: this.progredirDanoCorpo(derivados.danoCorpoACorpo, antes, depois),
    };
  }

  private progredirDanoFurtivo(
    stored: string | undefined,
    antes: EntradaAgente,
    depois: EntradaAgente,
  ): string | undefined {
    if (stored === undefined) {
      return undefined;
    }
    const marcos = contarMarcosDanoFurtivo(depois.nivel) - contarMarcosDanoFurtivo(antes.nivel);
    return marcos === 0 ? stored : incrementarDanoFurtivo(stored, marcos);
  }

  private progredirDanoCorpo(
    stored: string | undefined,
    antes: EntradaAgente,
    depois: EntradaAgente,
  ): string | undefined {
    if (stored === undefined) {
      return undefined;
    }
    return stored === calcularDanoCorpo(antes) ? calcularDanoCorpo(depois) : stored;
  }
}
