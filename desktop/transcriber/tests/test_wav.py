import hashlib
import struct
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from contratados_transcriber.wav import WavInvalido, calcular_hash, inspecionar_wav
from wav_fixtures import (FORMATO_ADPCM, FORMATO_EXTENSIBLE, FORMATO_FLOAT, chunk, silencio, tom, wav)


class WavTests(unittest.TestCase):
    def setUp(self):
        self.pasta = TemporaryDirectory()
        self.addCleanup(self.pasta.cleanup)

    def arquivo(self, nome: str, conteudo: bytes) -> Path:
        caminho = Path(self.pasta.name) / nome
        caminho.write_bytes(conteudo)
        return caminho

    def codigo(self, nome: str, conteudo: bytes) -> str:
        with self.assertRaises(WavInvalido) as contexto:
            inspecionar_wav(self.arquivo(nome, conteudo))
        return contexto.exception.codigo

    # --- formatos e duração -------------------------------------------------
    def test_pcm16_mono_informa_parametros_e_duracao_ao_milissegundo(self):
        info = inspecionar_wav(self.arquivo("1-joao.wav", wav(tom(48000))))
        self.assertEqual((info.canais, info.taxa_hz, info.bits, info.formato), (1, 48000, 16, "PCM"))
        self.assertEqual(info.duracao_ms, 1000)
        self.assertEqual(info.nome_arquivo, "1-joao.wav")
        self.assertEqual(info.tamanho_bytes, len(wav(tom(48000))))
        self.assertFalse(info.sem_fala)
        self.assertEqual(info.silencio_inicial_ms, 0)

    def test_estereo_24_bits_e_float32_e_8_bits(self):
        casos = [(2, 44100, 24, 1), (2, 48000, 32, 1), (1, 16000, 32, FORMATO_FLOAT), (1, 8000, 8, 1)]
        for canais, taxa, bits, formato in casos:
            with self.subTest(canais=canais, taxa=taxa, bits=bits, formato=formato):
                dados = tom(taxa // 2, canais, bits, formato)
                info = inspecionar_wav(self.arquivo(f"c{canais}{bits}.wav", wav(dados, canais=canais, taxa=taxa, bits=bits, formato=formato)))
                self.assertEqual((info.canais, info.taxa_hz, info.bits), (canais, taxa, bits))
                self.assertEqual(info.duracao_ms, 500)
                self.assertFalse(info.sem_fala)

    def test_duracao_arredonda_ao_milissegundo_mais_proximo(self):
        # 44100 Hz: 441 quadros = exatamente 10 ms; 1 quadro = 0,0227 ms -> 0 ms; 22 quadros = 0,4989 ms -> 0 ms; 23 -> 1 ms
        self.assertEqual(inspecionar_wav(self.arquivo("a.wav", wav(tom(441), taxa=44100))).duracao_ms, 10)
        self.assertEqual(inspecionar_wav(self.arquivo("b.wav", wav(tom(22), taxa=44100))).duracao_ms, 0)
        self.assertEqual(inspecionar_wav(self.arquivo("c.wav", wav(tom(23), taxa=44100))).duracao_ms, 1)

    def test_wave_format_extensible_pcm(self):
        info = inspecionar_wav(self.arquivo("e.wav", wav(tom(48000, 2), canais=2, formato=FORMATO_EXTENSIBLE)))
        self.assertEqual((info.canais, info.formato, info.duracao_ms), (2, "PCM", 1000))

    def test_chunks_extras_e_padding_de_tamanho_impar_nao_atrapalham(self):
        antes = (chunk(b"LIST", b"INFOISFT\x05\x00\x00\x00abcd\x00"), chunk(b"id3 ", b"x" * 7))
        info = inspecionar_wav(self.arquivo("l.wav", wav(tom(24000), antes=antes)))
        self.assertEqual(info.duracao_ms, 500)

    def test_nome_unicode_e_preservado(self):
        info = inspecionar_wav(self.arquivo("José-Çã_日本.wav", wav(tom(4800))))
        self.assertEqual(info.nome_arquivo, "José-Çã_日本.wav")

    # --- silêncio inicial e offsets ----------------------------------------
    def test_silencio_inicial_conhecido_e_medido_sem_deslocar_nada(self):
        dados = silencio(72000) + tom(48000)  # 1,5 s de silêncio + 1 s de tom
        info = inspecionar_wav(self.arquivo("s.wav", wav(dados)))
        self.assertEqual(info.silencio_inicial_ms, 1500)
        self.assertEqual(info.duracao_ms, 2500)  # a duração continua sendo a do arquivo inteiro
        self.assertFalse(info.sem_fala)

    def test_atraso_conhecido_entre_duas_faixas_aparece_como_diferenca_de_silencio_e_de_duracao(self):
        base = inspecionar_wav(self.arquivo("a.wav", wav(tom(48000))))
        atrasada = inspecionar_wav(self.arquivo("b.wav", wav(silencio(36000) + tom(48000))))  # 750 ms depois
        self.assertEqual(atrasada.silencio_inicial_ms - base.silencio_inicial_ms, 750)
        self.assertEqual(atrasada.duracao_ms - base.duracao_ms, 750)

    def test_diferenca_de_duracao_sozinha_nao_e_apresentada_como_desalinhamento(self):
        # O módulo só mede; não existe campo de "offset sugerido" que desloque timestamps por silêncio/duração.
        campos = set(inspecionar_wav(self.arquivo("x.wav", wav(tom(4800)))).__dataclass_fields__)
        self.assertNotIn("offset_ms", campos)
        self.assertNotIn("deslocamento_ms", campos)

    def test_silencio_no_meio_e_no_fim_nao_conta_como_inicial(self):
        info = inspecionar_wav(self.arquivo("m.wav", wav(tom(2400) + silencio(48000) + tom(2400))))
        self.assertEqual(info.silencio_inicial_ms, 0)

    def test_estereo_conta_a_fala_de_qualquer_canal(self):
        quadro_silencio = bytes(4)
        quadro_canal_direito = struct.pack("<hh", 0, 20000)
        dados = quadro_silencio * 4800 + quadro_canal_direito * 480  # 100 ms de silêncio, depois só o canal direito
        info = inspecionar_wav(self.arquivo("r.wav", wav(dados, canais=2)))
        self.assertEqual(info.silencio_inicial_ms, 100)

    def test_faixa_sem_fala_e_marcada_e_o_silencio_vira_a_duracao_inteira(self):
        info = inspecionar_wav(self.arquivo("mudo.wav", wav(silencio(48000))))
        self.assertTrue(info.sem_fala)
        self.assertEqual(info.silencio_inicial_ms, 1000)
        self.assertIn("SEM_FALA", info.avisos)

    def test_ruido_abaixo_do_limiar_conta_como_silencio_e_acima_como_fala(self):
        baixo = tom(4800, amplitude=0.0003)    # ~ -70 dBFS
        alto = tom(4800, amplitude=0.01)       # ~ -40 dBFS
        self.assertTrue(inspecionar_wav(self.arquivo("b.wav", wav(baixo))).sem_fala)
        self.assertFalse(inspecionar_wav(self.arquivo("a.wav", wav(alto))).sem_fala)

    def test_arquivos_grandes_sao_lidos_em_blocos_e_a_posicao_do_primeiro_som_e_exata(self):
        silencio_longo = silencio(48000 * 20)  # 20 s
        info = inspecionar_wav(self.arquivo("g.wav", wav(silencio_longo + tom(48))))
        self.assertEqual(info.silencio_inicial_ms, 20000)

    # --- erros isolados -----------------------------------------------------
    def test_extensao_falsa_texto_ou_mp3(self):
        self.assertEqual(self.codigo("falso.wav", b"isto nao e um wav, e so texto"), "NAO_RIFF")
        self.assertEqual(self.codigo("mp3.wav", b"ID3\x03\x00" + bytes(200)), "NAO_RIFF")
        self.assertEqual(self.codigo("avi.wav", b"RIFF" + struct.pack("<I", 4) + b"AVI "), "NAO_RIFF")

    def test_arquivo_vazio_e_cabecalho_incompleto(self):
        self.assertEqual(self.codigo("vazio.wav", b""), "CABECALHO_INCOMPLETO")
        self.assertEqual(self.codigo("curto.wav", wav(tom(100))[:20]), "CABECALHO_INCOMPLETO")

    def test_truncado_com_dados_declarados_maiores_que_o_arquivo(self):
        inteiro = wav(tom(48000))
        self.assertEqual(self.codigo("cortado.wav", inteiro[: len(inteiro) // 2]), "TRUNCADO")

    def test_sem_fmt_e_sem_data(self):
        self.assertEqual(self.codigo("sem-fmt.wav", wav(tom(100), com_fmt=False)), "SEM_FMT")
        self.assertEqual(self.codigo("sem-data.wav", wav(b"", com_data=False)), "SEM_DATA")

    def test_formato_nao_suportado_e_parametros_invalidos(self):
        self.assertEqual(self.codigo("adpcm.wav", wav(bytes(100), formato=FORMATO_ADPCM, bits=4)), "FORMATO_NAO_SUPORTADO")
        self.assertEqual(self.codigo("zero.wav", wav(tom(100), canais=0)), "PARAMETROS_INVALIDOS")
        self.assertEqual(self.codigo("taxa0.wav", wav(tom(100), taxa=0)), "PARAMETROS_INVALIDOS")

    def test_arquivo_sem_nenhuma_amostra(self):
        self.assertEqual(self.codigo("zero-amostras.wav", wav(b"")), "SEM_AMOSTRAS")

    def test_dados_que_nao_fecham_quadros_inteiros_sao_truncamento(self):
        self.assertEqual(self.codigo("quebrado.wav", wav(tom(100) + b"\x01")), "TRUNCADO")

    def test_streaming_com_tamanho_de_data_zero_ou_ffffffff_usa_o_resto_do_arquivo_e_avisa(self):
        for declarado in (0, 0xFFFFFFFF):
            with self.subTest(declarado=declarado):
                info = inspecionar_wav(self.arquivo(f"stream{declarado}.wav", wav(tom(48000), tamanho_data=declarado)))
                self.assertEqual(info.duracao_ms, 1000)
                self.assertIn("TAMANHO_DATA_AJUSTADO", info.avisos)

    def test_tamanho_riff_errado_e_tolerado(self):
        info = inspecionar_wav(self.arquivo("riff.wav", wav(tom(4800), tamanho_riff=4)))
        self.assertEqual(info.duracao_ms, 100)

    def test_diretorio_e_inexistente_nao_viram_excecao_generica(self):
        with self.assertRaises(WavInvalido) as contexto:
            inspecionar_wav(Path(self.pasta.name))
        self.assertEqual(contexto.exception.codigo, "ILEGIVEL")
        with self.assertRaises(WavInvalido) as contexto:
            inspecionar_wav(Path(self.pasta.name) / "nao-existe.wav")
        self.assertEqual(contexto.exception.codigo, "ILEGIVEL")

    def test_a_mensagem_de_erro_nao_vaza_o_caminho_absoluto(self):
        with self.assertRaises(WavInvalido) as contexto:
            inspecionar_wav(self.arquivo("falso.wav", b"texto"))
        self.assertNotIn(self.pasta.name, str(contexto.exception))
        self.assertIn("falso.wav", str(contexto.exception))

    # --- hash local, repetidos e alterados --------------------------------
    def test_hash_do_conteudo_e_local_e_detecta_arquivo_alterado_ou_repetido(self):
        original = wav(tom(4800))
        a = self.arquivo("a.wav", original)
        b = self.arquivo("copia-renomeada.wav", original)
        alterado = self.arquivo("alterado.wav", original[:-2] + bytes([original[-2] ^ 1, original[-1]]))
        self.assertEqual(calcular_hash(a), hashlib.sha256(original).hexdigest())
        self.assertEqual(calcular_hash(a), calcular_hash(b))
        self.assertNotEqual(calcular_hash(a), calcular_hash(alterado))
        self.assertEqual(inspecionar_wav(a).duracao_ms, inspecionar_wav(alterado).duracao_ms)  # a duração sozinha não percebe a alteração

    def test_info_nao_carrega_hash_nem_caminho(self):
        campos = set(inspecionar_wav(self.arquivo("x.wav", wav(tom(4800)))).__dataclass_fields__)
        self.assertFalse({"hash", "sha256", "hash_sha256", "caminho", "path"} & campos)


if __name__ == "__main__":
    unittest.main()
