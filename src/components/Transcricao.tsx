import { useRef, useState } from 'react';
import { useEditor } from '../store/editor';
import { useUI } from '../store/ui';
import { criarLegendas } from '../lib/pro';
import { transcreverUrl, transcricaoDisponivel, type LinhaTranscricao } from '../lib/transcricao';
import {
  VOZES,
  gerarAudioVoz,
  inserirNarracao,
  lerVozEscolhida,
  narrarTexto,
  salvarVozEscolhida,
  testarVoz,
} from '../lib/voz';

/**
 * TRANSCRIÇÃO + VOZ
 * ------------------------------------------------------------
 * Duas coisas no mesmo painel:
 *
 *  1. TRANSCRIÇÃO — reconhecimento de fala do navegador (grátis) a partir de
 *     um arquivo local ou de uma URL, gerando legenda frase por frase.
 *  2. VOZ — escolhe a voz, escreve/escolhe o texto e joga a narração na
 *     trilha de áudio no playhead (ou no tempo exato de cada frase).
 *
 * A voz vem pronta da função `ferramentas` (MP3), então toca na hora: nada de
 * esperar renderização nem depender de `speechSynthesis`.
 */

export function Transcricao() {
  const { toast } = useUI();
  const doc = useEditor((s) => s.doc);
  const playhead = useEditor((s) => s.playhead);

  const [url, setUrl] = useState('');
  const [idioma, setIdioma] = useState('pt-BR');
  const [frases, setFrase] = useState<LinhaTranscricao[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [parcial, setParcial] = useState('');

  /* voz */
  const [vozId, setVozId] = useState(() => lerVozEscolhida().id);
  const [textoVoz, setTextoVoz] = useState('');
  const [gerando, setGerando] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const voz = VOZES.find((v) => v.id === vozId) ?? VOZES[0];
  const disponivel = transcricaoDisponivel();

  const transcrever = async (alvo: string) => {
    if (!alvo.trim()) {
      toast('Informe o arquivo ou o link do áudio/vídeo', 'warn');
      return;
    }
    setOcupado(true);
    setFrase([]);
    setParcial('');
    try {
      const r = await transcreverUrl(alvo, idioma, (p) => setParcial(p.slice(-120)));
      if (!r.ok) {
        toast(`Transcrição: ${r.erro ?? 'nada reconhecido'}`, 'warn');
        return;
      }
      setFrase(r.linhas);
      toast(`${r.linhas.length} frase(s) reconhecida(s) — revise e crie a legenda`, 'ok');
    } finally {
      setOcupado(false);
      setParcial('');
    }
  };

  const legendar = () => {
    if (!frases.length) return;
    const n = criarLegendas(frases);
    toast(`${n} legenda(s) criadas na timeline`, 'ok');
  };

  /** 🔊 de cada frase: gera a voz daquela frase e coloca no tempo dela */
  const narrarFrase = async (f: LinhaTranscricao) => {
    const audio = await gerarAudioVoz({ texto: f.texto, voz });
    if (!audio) {
      toast('Não consegui gerar a voz desta frase', 'err');
      return;
    }
    await inserirNarracao(audio, {
      nome: `Voz · ${f.texto.slice(0, 22)}`,
      inicioMs: f.inicioMs,
      duracaoMs: Math.max(audio.duracaoMs, f.fimMs - f.inicioMs),
    });
  };

  /** narra todas as frases, cada uma no seu tempo */
  const narrarTodas = async () => {
    if (!frases.length) {
      toast('Transcreva ou escreva as frases primeiro', 'warn');
      return;
    }
    setGerando(true);
    let n = 0;
    for (const f of frases) {
      // eslint-disable-next-line no-await-in-loop
      const audio = await gerarAudioVoz({ texto: f.texto, voz });
      if (audio) {
        // eslint-disable-next-line no-await-in-loop
        await inserirNarracao(audio, {
          nome: `Voz · ${f.texto.slice(0, 22)}`,
          inicioMs: f.inicioMs,
          duracaoMs: Math.max(audio.duracaoMs, f.fimMs - f.inicioMs),
        });
        n += 1;
      }
    }
    setGerando(false);
    toast(`${n} narração(ões) na trilha de áudio`, n ? 'ok' : 'err');
  };

  const ouvir = async () => {
    const alvo = textoVoz.trim() || frases.map((f) => f.texto).join(' ');
    if (!alvo) {
      toast('Escreva o texto para ouvir a voz', 'warn');
      return;
    }
    setGerando(true);
    try {
      const audio = await gerarAudioVoz({ texto: alvo, voz });
      if (!audio) {
        toast('Não consegui gerar o áudio agora', 'err');
        return;
      }
      audioRef.current?.pause();
      const el = new Audio(audio.url);
      audioRef.current = el;
      await el.play().catch(() => toast('Toque na tela e tente de novo (bloqueio do navegador)', 'warn'));
    } finally {
      setGerando(false);
    }
  };

  const arquivoLocal = (f: File | null) => {
    if (!f) return;
    const local = URL.createObjectURL(f);
    setUrl(local);
    void transcrever(local);
  };

  const clipesComAudio = doc.elements.filter((e) => e.type === 'video' || e.type === 'audio');

  return (
    <div className="tr-painel">
      {/* ---------------- 1. origem ---------------- */}
      <div className="tr-bloco">
        <div className="tr-titulo">1. De onde vem o áudio</div>
        <div className="tr-linha">
          <input
            className="tr-input"
            placeholder="Cole o link do vídeo/áudio ou escolha um arquivo"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button className="btn primary sm" onClick={() => void transcrever(url)} disabled={ocupado}>
            {ocupado ? 'Ouvindo…' : 'Transcrever'}
          </button>
        </div>
        <div className="tr-linha">
          <label className="btn ghost sm tr-arquivo">
            ⤒ Escolher arquivo
            <input
              type="file"
              accept="audio/*,video/*"
              hidden
              onChange={(e) => arquivoLocal(e.target.files?.[0] ?? null)}
            />
          </label>
          <select className="tr-select" value={idioma} onChange={(e) => setIdioma(e.target.value)}>
            <option value="pt-BR">Português (Brasil)</option>
            <option value="pt-PT">Português (Portugal)</option>
            <option value="en-US">Inglês</option>
            <option value="es">Espanhol</option>
          </select>
        </div>
        {clipesComAudio.length > 0 && (
          <div className="tr-sugestoes">
            {clipesComAudio.slice(0, 4).map((c) => {
              const asset = doc.assets.find((a) => a.id === c.assetId);
              if (!asset) return null;
              return (
                <button key={c.id} className="chip" onClick={() => void transcrever(asset.url)}>
                  ▶ {c.name}
                </button>
              );
            })}
          </div>
        )}
        {!disponivel && (
          <p className="tr-aviso">
            Este navegador não tem reconhecimento de fala. Use Chrome, Edge ou Safari atualizado — a voz
            (abaixo) funciona em qualquer um.
          </p>
        )}
        {parcial && <p className="tr-parcial">“{parcial}”</p>}
      </div>

      {/* ---------------- 2. frases ---------------- */}
      {frases.length > 0 && (
        <div className="tr-bloco">
          <div className="tr-titulo">2. Frases reconhecidas ({frases.length})</div>
          <ul className="tr-frases">
            {frases.map((f, i) => (
              <li key={i}>
                <span className="tr-tempo">{(f.inicioMs / 1000).toFixed(1)}s</span>
                <span className="tr-frase">{f.texto}</span>
                <button
                  className="btn ghost sm tr-voz-btn"
                  title="Gerar a voz desta frase no tempo dela"
                  onClick={() => void narrarFrase(f)}
                >
                  🔊
                </button>
              </li>
            ))}
          </ul>
          <button className="btn primary sm" onClick={legendar}>
            ▤ Criar legenda na timeline
          </button>
        </div>
      )}

      {/* ---------------- 3. voz ---------------- */}
      <div className="tr-bloco tr-voz">
        <div className="tr-titulo">3. Voz e narração</div>
        <div className="tr-linha">
          <select
            className="tr-select"
            value={vozId}
            onChange={(e) => {
              setVozId(e.target.value);
              salvarVozEscolhida(e.target.value);
            }}
          >
            {VOZES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nome}
              </option>
            ))}
          </select>
          <button className="btn ghost sm" onClick={() => void ouvir()} disabled={gerando}>
            {gerando ? 'Gerando…' : '▶ Ouvir teste'}
          </button>
        </div>

        <textarea
          className="tr-textarea"
          placeholder="Escreva o texto da narração ou use as frases transcritas acima…"
          value={textoVoz}
          onChange={(e) => setTextoVoz(e.target.value)}
        />

        <div className="tr-voz-acoes">
          <button
            className="btn primary sm"
            disabled={gerando}
            onClick={() =>
              void narrarTexto(textoVoz || frases.map((f) => f.texto).join(' '), { voz })
            }
          >
            🎙 Narrar no playhead
          </button>
          <button className="btn ghost sm" disabled={gerando || !frases.length} onClick={() => void narrarTodas()}>
            🎙 Narrar todas as frases
          </button>
          <span className="tr-dica">
            {playhead > 0 ? `entra em ${(playhead / 1000).toFixed(1)}s` : 'entra no início'}
          </span>
        </div>
        <p className="tr-dica">
          A voz é gerada no servidor e entra como clipe de áudio — pode arrastar, cortar e exportar junto com o
          vídeo.
        </p>
      </div>
    </div>
  );
}
