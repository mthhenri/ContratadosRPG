import { Component, DestroyRef, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize, Subscription, timer, exhaustMap, take, takeWhile, timeout } from 'rxjs';
import type { SessaoTranscricaoResumoDto, DispositivoResumoDto, DispositivoVinculoRecuperadoDto } from '@contratados-rpg/shared/dtos/transcricao';
import { SessaoService } from '../../core/services/sessao.service';
import { Cartao } from '../../shared/ui/cartao/cartao.component';
import { Botao } from '../../shared/ui/botao/botao.component';
import { Campo } from '../../shared/ui/campo/campo.component';
import { Icone } from '../../shared/icone/icone.component';
import { TranscricaoService } from './transcricao.service';
import { criarUriAbertura, estadoAbertura } from './abertura';
/** Análogos: Perfil (cartões/formulário) e Biblioteca (lista privada do Mestre). */
@Component({
  selector: 'app-transcricoes', imports: [RouterLink, ReactiveFormsModule, Cartao, Botao, Campo, Icone],
  templateUrl: './transcricao.page.html', styleUrl: './transcricao.page.scss',
})
export class Transcricoes {
  private readonly api = inject(TranscricaoService);
  private readonly rota = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  protected readonly conta = inject(SessaoService).usuario;
  protected readonly campanhaId = Number(this.rota.snapshot.paramMap.get('campanhaId'));
  protected readonly pedidoId = this.rota.snapshot.paramMap.get('identificador');
  /** Índices dos cartões seguem os que a rota realmente mostra: sem lacuna nem início em 02. */
  protected readonly indiceDispositivos = this.campanhaId && !this.pedidoId ? '02' : '01';
  protected readonly indiceInstalacao = this.pedidoId ? '02' : this.campanhaId ? '03' : '02';
  protected readonly sessoes = signal<SessaoTranscricaoResumoDto[]>([]);
  protected readonly dispositivos = signal<DispositivoResumoDto[]>([]);
  protected readonly pedido = signal<DispositivoVinculoRecuperadoDto | null>(null);
  protected readonly ocupado = signal(false);
  protected readonly mensagem = signal('');
  protected readonly erro = signal('');
  protected readonly formulario = this.fb.nonNullable.group({ titulo: ['', [Validators.required, Validators.maxLength(120)]] });
  protected readonly codigo = this.fb.nonNullable.control('', [Validators.required, Validators.pattern(/^[A-Fa-f0-9]{8}$/)]);
  private acompanhamento?: Subscription;
  constructor() {
    const destroy = inject(DestroyRef);
    destroy.onDestroy(() => this.acompanhamento?.unsubscribe());
    if (this.pedidoId) this.api.recuperarPedido(this.pedidoId).subscribe({ next: p => this.pedido.set(p), error: () => this.erro.set('Vínculo indisponível ou expirado. Inicie novamente no aplicativo.') });
    else this.carregar();
  }
  private carregar(): void {
    if (this.campanhaId) this.api.listarSessoes(this.campanhaId).subscribe({ next: s => this.sessoes.set(s), error: () => this.erro.set('Não foi possível carregar as sessões. Verifique sua conexão e permissão de Mestre.') });
    this.api.listarDispositivos().subscribe({ next: d => this.dispositivos.set(d), error: () => this.erro.set('Não foi possível carregar os dispositivos.') });
  }
  protected criar(): void {
    if (this.formulario.invalid || this.ocupado()) return;
    this.ocupado.set(true); this.erro.set('');
    this.api.criarSessao(this.campanhaId, this.formulario.getRawValue().titulo.trim()).pipe(finalize(() => this.ocupado.set(false))).subscribe({ next: () => { this.formulario.reset(); this.carregar(); }, error: () => this.erro.set('Não foi possível criar a sessão.') });
  }
  protected confirmar(): void {
    if (!this.pedidoId || this.codigo.invalid || this.ocupado()) return;
    this.ocupado.set(true); this.erro.set('');
    this.api.confirmar(this.pedidoId, this.codigo.value.toUpperCase()).pipe(finalize(() => this.ocupado.set(false))).subscribe({ next: () => { this.pedido.set(null); this.mensagem.set('Dispositivo vinculado. Volte ao aplicativo.'); }, error: () => this.erro.set('Não foi possível confirmar. Confira o código, o prazo e sua permissão de Mestre.') });
  }
  protected revogar(id: string): void {
    if (this.ocupado()) return; this.ocupado.set(true);
    this.api.revogar(id).pipe(finalize(() => this.ocupado.set(false))).subscribe({ next: () => { this.mensagem.set('Dispositivo desconectado. Resultados locais são preservados.'); this.carregar(); }, error: () => this.erro.set('Não foi possível revogar. Tente novamente com conexão.') });
  }
  protected abrir(sessaoId: number): void {
    if (this.ocupado()) return;
    this.acompanhamento?.unsubscribe(); this.ocupado.set(true); this.erro.set('');
    this.api.criarIntencao(sessaoId).subscribe({ next: i => {
      try { window.location.href = criarUriAbertura(i.identificador); }
      catch { this.mensagem.set('Não recebemos confirmação do aplicativo.'); }
      this.acompanhamento = timer(0, 1000).pipe(take(121), exhaustMap(() => this.api.consultarIntencao(i.identificador).pipe(timeout(5000))), takeWhile(e => !e.confirmada && !e.expirada, true), finalize(() => this.ocupado.set(false))).subscribe({
        next: e => this.mensagem.set(estadoAbertura(e.confirmada, e.expirada)),
        error: () => this.mensagem.set('Não recebemos confirmação do aplicativo. Verifique sua conexão.'),
        complete: () => { if (this.mensagem() === estadoAbertura(false, false)) this.mensagem.set(estadoAbertura(false, true)); },
      });
    }, error: () => { this.ocupado.set(false); this.erro.set('Não foi possível solicitar a abertura. Verifique sua conexão e permissão de Mestre.'); } });
  }
}
