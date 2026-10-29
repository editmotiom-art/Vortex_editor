import { useState } from 'react';
import { useUI } from '../store/ui';
import { SITES_BAIXA_TUDO, usarBaixaTudo } from '../lib/baixaTudo';

/**
 * BAIXA TUDO DENTRO DO SISTEMA
 * ------------------------------------------------------------
 * Cola o link do vídeo (YouTube, Instagram, TikTok, Vimeo, X…) e o arquivo
 * entra na biblioteca e na timeline. O mesmo motor da extensão que você usa,
 * agora sem sair do editor.
 */
export function BaixaTudo({ aoFechar }: { aoFechar?: () => void }) {
  const { toast } = useUI();
  const [link, setLink] = useState('');
  const [qualidade, setQualidade] = useState('1080');
  const [somenteAudio, setSomenteAudio] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const [historico, setHistorico] = useState<Array<{ nome: string; ok: boolean }>>([]);

  const baixar = async () => {
    const l = link.trim();
    if (!/^https?:\/\//i.test(l)) {
      toast('Cole um link que comece com https://', 'warn');
      return;
    }
    setBaixando(true);
    const r = await usarBaixaTudo(l, { audio: somenteAudio, qualidade, naTimeline: true });
    setBaixando(false);
    setHistorico((h) => [{ nome: r.nome ?? l.slice(0, 42), ok: r.ok }, ...h].slice(0, 8));
    if (r.ok) {
      setLink('');
      aoFechar?.();
    }
  };

  return (
    <div className="baixa-tudo">
      <div className="bt-topo">
        <span className="bt-selo">EXTENSÃO INTEGRADA</span>
        <b>Baixa Tudo</b>
        <span className="bt-sub">o vídeo entra direto na timeline</span>
      </div>

      <label className="ia-rotulo">Link do vídeo</label>
      <div className="bt-linha">
        <input
          className="bt-input"
          placeholder="https://www.youtube.com/watch?v=…  ·  instagram.com/reel/…  ·  vimeo.com/…"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void baixar();
          }}
        />
        <button className="btn primary" disabled={baixando} onClick={() => void baixar()}>
          {baixando ? 'Baixando…' : '⬇ Baixar'}
        </button>
      </div>

      <div className="bt-opcoes">
        <div>
          <label className="ia-rotulo">Qualidade</label>
          <div className="ia-chips">
            {['1080', '720', '480', 'audio'].map((q) => (
              <button
                key={q}
                className={`chip${(q === 'audio' ? somenteAudio : !somenteAudio && qualidade === q) ? ' active' : ''}`}
                onClick={() => {
                  if (q === 'audio') setSomenteAudio(true);
                  else {
                    setSomenteAudio(false);
                    setQualidade(q);
                  }
                }}
              >
                {q === 'audio' ? 'Só áudio (MP3)' : `${q}p`}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bt-sites">
        {SITES_BAIXA_TUDO.map((s) => (
          <span key={s} className="bt-site">
            {s}
          </span>
        ))}
      </div>

      {historico.length > 0 && (
        <div className="bt-hist">
          {historico.map((h, i) => (
            <div key={`${h.nome}-${i}`} className={`bt-hist-item ${h.ok ? 'ok' : 'err'}`}>
              <span>{h.ok ? '✓' : '!'}</span>
              <span className="bt-hist-nome">{h.nome}</span>
            </div>
          ))}
        </div>
      )}

      <div className="hint" style={{ marginTop: 10 }}>
        Funciona com link público. O arquivo é baixado pelo mesmo motor da extensão “Baixa Tudo” e entra como clipe
        na timeline — depois você corta, aplica look e exporta normalmente.
      </div>
    </div>
  );
}
