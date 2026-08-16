import { DestroyRef, Injectable, WritableSignal, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EMPTY, Subject, catchError, debounceTime, switchMap } from 'rxjs';

import type {
  FichaAtributosDto,
  FichaCriaturaAtaqueDto,
  FichaCriaturaDadosDto,
  FichaCriaturaDeslocamentoDto,
  FichaCriaturaHabilidadeDto,
  FichaCriaturaIdentidadeDto,
  FichaCriaturaModificadoresDto,
  FichaCriaturaRecuperadaDto,
  FichaCriaturaRegeneracaoDto,
  FichaCriaturaResistenciaDto,
  FichaImagemFocoDto,
} from '@contratados-rpg/shared/dtos/ficha';
import type { CadenciaEnum, NivelAmeacaEnum, PorteCriaturaEnum, TenacidadeEnum } from '@contratados-rpg/shared/enums';

import { FichaService } from './ficha.service';

/** Ajuste rápido de Vida (mesma forma de `AjusteVitalidade` do jogador, sem Energia — criatura não tem). */
export interface AjusteCriaturaVitalidade {
  readonly campo: 'vidaAtual' | 'vidaMaxima';
  readonly valor: number;
}

/**
 * Os handlers `ajustar*` que aplicam o ajuste otimista local e persistem em lote via
 * `FichaService.alterarFichaCriatura` (debounced) — mirror de `FichaEdicaoService` (jogador),
 * mas para o documento (bem menor) da criatura. Não `providedIn: 'root'` — cada página declara
 * em `providers: []` para ganhar sua própria instância (mesmo motivo de `FichaEdicaoService`).
 */
@Injectable()
export class FichaEdicaoCriaturaService {
  private readonly fichaService = inject(FichaService);
  private readonly destroyRef = inject(DestroyRef);

  readonly estadoPersistencia = signal<'ocioso' | 'salvando' | 'salvo'>('ocioso');
  private temporizadorSalvo: ReturnType<typeof setTimeout> | null = null;

  private readonly ajustePendente = new Subject<void>();
  readonly edicaoPendente = signal(false);
  private readonly fichaBaseSignal = signal<FichaCriaturaRecuperadaDto | null>(null);
  readonly fichaBase = this.fichaBaseSignal.asReadonly();

  private ficha!: WritableSignal<FichaCriaturaRecuperadaDto | null>;
  private obterFichaId!: () => number;
  private iniciado = false;

  inicializar(ficha: WritableSignal<FichaCriaturaRecuperadaDto | null>, fichaId: () => number): void {
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
            .alterarFichaCriatura(this.obterFichaId(), {
              nome: fichaAtual.nome,
              cor: fichaAtual.cor,
              imagemFoco: fichaAtual.imagemFoco,
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

  definirBase(ficha: FichaCriaturaRecuperadaDto | null): void {
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

  private atualizarDados(mudar: (dados: FichaCriaturaDadosDto) => FichaCriaturaDadosDto): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) {
      return;
    }
    this.ficha.set({ ...fichaAtual, dados: mudar(fichaAtual.dados) });
    this.agendarPersistencia();
  }

  ajustarVitalidade(ajuste: AjusteCriaturaVitalidade): void {
    this.atualizarDados((dados) => ({ ...dados, [ajuste.campo]: ajuste.valor }));
  }

  ajustarDefesa(defesa: number): void {
    this.atualizarDados((dados) => ({ ...dados, defesa }));
  }

  ajustarIdentidade(identidade: FichaCriaturaIdentidadeDto): void {
    this.atualizarDados((dados) => ({ ...dados, identidade }));
  }

  ajustarNa(na: NivelAmeacaEnum): void {
    this.atualizarDados((dados) => ({ ...dados, na }));
  }

  ajustarVd(vd: number): void {
    this.atualizarDados((dados) => ({ ...dados, vd }));
  }

  ajustarAtributos(atributos: FichaAtributosDto): void {
    this.atualizarDados((dados) => ({ ...dados, atributos }));
  }

  ajustarModificadores(modificadores: FichaCriaturaModificadoresDto): void {
    this.atualizarDados((dados) => ({ ...dados, modificadores }));
  }

  ajustarTenacidade(tenacidade: TenacidadeEnum): void {
    this.atualizarDados((dados) => ({ ...dados, tenacidade }));
  }

  ajustarResistencias(resistencias: readonly FichaCriaturaResistenciaDto[]): void {
    this.atualizarDados((dados) => ({ ...dados, resistencias }));
  }

  ajustarFraquezas(fraquezas: readonly FichaCriaturaResistenciaDto[]): void {
    this.atualizarDados((dados) => ({ ...dados, fraquezas }));
  }

  ajustarRegeneracao(regeneracao: FichaCriaturaRegeneracaoDto | undefined): void {
    this.atualizarDados((dados) => ({ ...dados, regeneracao }));
  }

  ajustarPorte(porte: PorteCriaturaEnum): void {
    this.atualizarDados((dados) => ({ ...dados, porte }));
  }

  ajustarDeslocamento(deslocamento: FichaCriaturaDeslocamentoDto): void {
    this.atualizarDados((dados) => ({ ...dados, deslocamento }));
  }

  ajustarCadencia(cadencia: CadenciaEnum): void {
    this.atualizarDados((dados) => ({ ...dados, cadencia }));
  }

  ajustarIniciativaBonus(iniciativaBonus: number | undefined): void {
    this.atualizarDados((dados) => ({ ...dados, iniciativaBonus }));
  }

  ajustarAtaques(ataques: readonly FichaCriaturaAtaqueDto[]): void {
    this.atualizarDados((dados) => ({ ...dados, ataques }));
  }

  ajustarHabilidades(habilidades: readonly FichaCriaturaHabilidadeDto[]): void {
    this.atualizarDados((dados) => ({ ...dados, habilidades }));
  }

  ajustarAnotacoes(anotacoes: string): void {
    this.atualizarDados((dados) => ({ ...dados, anotacoes }));
  }

  ajustarNome(nome: string): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) return;
    this.ficha.set({ ...fichaAtual, nome });
    this.agendarPersistencia();
  }

  ajustarCor(cor: string | null): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) return;
    this.ficha.set({ ...fichaAtual, cor });
    this.agendarPersistencia();
  }

  ajustarOculta(oculta: boolean): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) return;
    this.ficha.set({ ...fichaAtual, oculta });
    this.agendarPersistencia();
  }

  /** Enquadramento do avatar (ajuste pós-mockup) — mesmo padrão de {@link ajustarCor}. */
  ajustarImagemFoco(imagemFoco: FichaImagemFocoDto | null): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) return;
    this.ficha.set({ ...fichaAtual, imagemFoco });
    this.agendarPersistencia();
  }

  /** Avatar (imediato, fora do debounce — mesmo modelo de `FichaEdicaoService.ajustarImagem`). */
  ajustarImagem(arquivo: File): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) return;
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

  removerImagem(): void {
    const fichaAtual = this.ficha();
    if (!fichaAtual) return;
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
        this.ajustarImagemFoco(null);
      });
  }
}
