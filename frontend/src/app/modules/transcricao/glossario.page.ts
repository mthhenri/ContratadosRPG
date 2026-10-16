import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { TRANSCRICAO_TERMO_MAXIMO, validarTermoGlossario } from '@contratados-rpg/shared/validators';
import type { TermoGlossarioTranscricaoResumoDto, IdentidadeTranscricaoResumoDto,
  FaixaTranscricaoResumoDto, SessaoTranscricaoResumoDto } from '@contratados-rpg/shared/dtos/transcricao';
import { Cartao } from '../../shared/ui/cartao/cartao.component';
import { Botao } from '../../shared/ui/botao/botao.component';
import { BotaoIcone } from '../../shared/ui/botao-icone/botao-icone.component';
import { Campo } from '../../shared/ui/campo/campo.component';
import { Chip } from '../../shared/ui/chip/chip.component';
import { EstadoVazio } from '../../shared/ui/estado-vazio/estado-vazio.component';
import { ConfirmacaoService } from '../../shared/ui/confirmacao/confirmacao.service';
import { Icone } from '../../shared/icone/icone.component';
import { TranscricaoService } from './transcricao.service';
import { formatarMilissegundos } from './glossario';

const MENSAGENS_TERMO = {
  TIPO: 'Termo inválido.', VAZIO: 'Informe o termo.', LONGO: `O termo passa de ${TRANSCRICAO_TERMO_MAXIMO} caracteres.`,
  CONTROLE: 'O termo não pode ter quebra de linha, tabulação nem caracteres invisíveis.',
} as const;

/** Glossário da campanha (CRUD do Mestre) e leitura de identidades e faixas. Análogos: Transcrições, Perfil e Biblioteca. */
@Component({
  selector: 'app-glossario-transcricao',
  imports: [RouterLink, Cartao, Botao, BotaoIcone, Campo, Chip, EstadoVazio, Icone],
  templateUrl: './glossario.page.html', styleUrl: './glossario.page.scss',
})
export class GlossarioTranscricao {
  private readonly api = inject(TranscricaoService);
  private readonly confirmacao = inject(ConfirmacaoService);
  protected readonly campanhaId = Number(inject(ActivatedRoute).snapshot.paramMap.get('campanhaId'));
  protected readonly maximo = TRANSCRICAO_TERMO_MAXIMO;
  protected readonly termos = signal<TermoGlossarioTranscricaoResumoDto[]>([]);
  protected readonly identidades = signal<IdentidadeTranscricaoResumoDto[]>([]);
  protected readonly sessoes = signal<SessaoTranscricaoResumoDto[]>([]);
  protected readonly faixas = signal<FaixaTranscricaoResumoDto[]>([]);
  protected readonly sessaoAberta = signal<number | null>(null);
  protected readonly carregado = signal(false);
  protected readonly novo = signal('');
  protected readonly modoEdicao = signal(false);
  protected readonly editandoId = signal<number | null>(null);
  protected readonly rascunho = signal('');
  protected readonly ocupado = signal(false);
  protected readonly erro = signal('');
  protected readonly erroEdicao = signal('');
  protected readonly aviso = signal('');
  protected readonly duracao = formatarMilissegundos;
  constructor() { this.carregar(); }
  private carregar(): void {
    this.api.listarTermos(this.campanhaId).pipe(finalize(() => this.carregado.set(true))).subscribe({ next: t => this.termos.set(t), error: () => this.erro.set('Não foi possível carregar o glossário. Verifique sua conexão e permissão de Mestre.') });
    this.api.listarIdentidades(this.campanhaId).subscribe({ next: i => this.identidades.set(i), error: () => this.erro.set('Não foi possível carregar as identidades.') });
    this.api.listarSessoes(this.campanhaId).subscribe({ next: s => this.sessoes.set(s), error: () => this.erro.set('Não foi possível carregar as sessões.') });
  }
  /** Mesma regra do servidor (`shared`), só para avisar antes de enviar; quem decide é o backend. */
  protected mensagemDoTermo(texto: string): string {
    if (!texto) return '';
    const resultado = validarTermoGlossario(texto);
    return resultado.valido ? '' : MENSAGENS_TERMO[resultado.motivo];
  }
  protected digitar(evento: Event): void { this.novo.set((evento.target as HTMLInputElement).value); this.aviso.set(''); this.erro.set(''); }
  protected digitarRascunho(evento: Event): void { this.rascunho.set((evento.target as HTMLInputElement).value); this.erroEdicao.set(''); }
  private mensagemDeFalha(e: unknown, padrao: string): string {
    if (e instanceof HttpErrorResponse && e.status === 0) return 'Sem conexão com o servidor. Verifique a internet e tente de novo.';
    return e instanceof HttpErrorResponse && (e.status === 400 || e.status === 409) && e.error?.mensagem ? e.error.mensagem : padrao;
  }
  protected adicionar(evento?: Event): void {
    evento?.preventDefault();
    const texto = this.novo();
    if (this.ocupado() || !texto.trim() || this.mensagemDoTermo(texto)) return;
    this.ocupado.set(true); this.erro.set(''); this.aviso.set('');
    this.api.criarTermo(this.campanhaId, texto).pipe(finalize(() => this.ocupado.set(false))).subscribe({
      next: t => { this.novo.set(''); this.aviso.set(t.parecidoCom ? `Adicionado. Já existe “${t.parecidoCom}”, que só difere no acento; mantenha os dois só se forem termos diferentes.` : 'Termo adicionado.'); this.recarregarTermos(); },
      error: e => this.erro.set(this.mensagemDeFalha(e, 'Não foi possível adicionar o termo.')),
    });
  }
  private recarregarTermos(): void { this.api.listarTermos(this.campanhaId).subscribe({ next: t => this.termos.set(t) }); }
  protected alternarEdicao(): void { this.modoEdicao.update(v => !v); this.cancelar(); }
  protected editar(t: TermoGlossarioTranscricaoResumoDto): void { this.editandoId.set(t.id); this.rascunho.set(t.termo); this.erroEdicao.set(''); }
  protected cancelar(): void { this.editandoId.set(null); this.erroEdicao.set(''); }
  protected salvar(evento?: Event): void {
    evento?.preventDefault();
    const id = this.editandoId(); const texto = this.rascunho();
    if (id === null || this.ocupado()) return;
    const invalido = !texto.trim() ? 'Informe o termo.' : this.mensagemDoTermo(texto);
    if (invalido) { this.erroEdicao.set(invalido); return; }
    this.ocupado.set(true); this.erroEdicao.set('');
    this.api.alterarTermo(id, texto).pipe(finalize(() => this.ocupado.set(false))).subscribe({
      next: t => { this.cancelar(); this.aviso.set(t.parecidoCom ? `Salvo. Já existe “${t.parecidoCom}”, que só difere no acento.` : 'Termo salvo.'); this.recarregarTermos(); },
      error: e => this.erroEdicao.set(this.mensagemDeFalha(e, 'Não foi possível salvar o termo.')),
    });
  }
  protected async excluir(t: TermoGlossarioTranscricaoResumoDto): Promise<void> {
    await this.confirmacao.confirmar({
      titulo: 'Excluir termo', mensagem: `Excluir ${t.termo}? Transcrições já feitas não mudam.`, entidade: t.termo, rotuloConfirmar: 'Excluir',
      aoConfirmar: () => new Promise<void>((resolver, rejeitar) => this.api.excluirTermo(t.id).subscribe({
        next: () => { this.aviso.set('Termo excluído.'); this.recarregarTermos(); resolver(); },
        error: e => { this.erro.set(this.mensagemDeFalha(e, 'Não foi possível excluir o termo.')); rejeitar(e); },
      })),
    }).catch(() => false);
  }
  protected verFaixas(sessaoId: number): void {
    if (this.sessaoAberta() === sessaoId) { this.sessaoAberta.set(null); return; }
    this.sessaoAberta.set(sessaoId); this.faixas.set([]); this.erro.set('');
    this.api.listarFaixas(sessaoId).subscribe({ next: f => { if (this.sessaoAberta() === sessaoId) this.faixas.set(f); }, error: () => this.erro.set('Não foi possível carregar as faixas desta sessão.') });
  }
}
