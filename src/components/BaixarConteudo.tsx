import { useMemo, useState } from 'react';
import { useUI } from '../store/ui';
import { SITES_BAIXA_TUDO, consultarBaixaTudo, usarBaixaTudo } from '../lib/baixaTudo';
import { baixarParaEditor, extrairDeUrl, idDeLinkDrive, type ItemDrive } from '../lib/driveIndex';
import { chamarFuncao } from '../lib/api';
import { registrarDownload } from '../lib/contas';
import { fmtBytes } from '../lib/anim';

/* ============================================================
   BAIXAR CONTEÚDO — a ferramenta única
   ------------------------------------------------------------
   Antes eram três telas ("Baixa Tudo", "Baixar de site", "Link do Drive")
   e cada uma fazia só uma parte. Agora é UMA caixa de link que descobre
   sozinha o que é:

     · YouTube / Instagram / TikTok / X / Vimeo / SoundCloud…
         → motor Baixa Tudo (a mesma extensão), baixa o vídeo/áudio
     · drive.google.com (pasta ou arquivo) → varre a pasta e lista tudo
     · qualquer outra página             → procura as mídias da página

   Em todos os casos:
     · o que foi baixado entra na biblioteca e/ou na timeline;
     · o download é registrado na conta (aba "Downloads" do painel).
   ============================================================ */

type Fonte = 'rede' | 'drive' | 'site';

interface Entrada {
  id: string;
  nome: string;
  tipo: 'video' | 'audio' | 'image' | 'outro';
  origem: string;
  /** de onde baixar (Drive: streaming; site: url direta) */
  stream: string;
  tamanho?: number;
  estado: 'pronto' | 'baixando' | 'ok' | 'erro';
  detalhe?: string;
}

const REDES = [
  'youtube.com',
  'youtu.be',
  'youtube.com/shorts',
  'instagram.com',
  'tiktok.com',
  'twitter.com',
  'x.com',
  'facebook.com',
  'vimeo.com',
  'twitch.tv',
  'soundcloud.com',
  'reddit.com',
  'dailymotion.com',
  'pinterest.',
  'kwai.com',
  'linkedin.com',
];

const ehDrive = (u: string): boolean => /drive\.google\.com|docs\.google\.com\/file/i.test(u);

const ehRede = (u: string): boolean => {
  try {
    const h = new URL(u);
    const alvo = `${h.hostname}${h.pathname}`.toLowerCase();
    return REDES.some((r) => alvo.includes(r));
  } catch {
    return false;
  }
};

const fonteDe = (link: string): Fonte => (ehDrive(link) ? 'drive' : ehRede(link) ? 'rede' : 'site');

const tipoPorNome = (nome: string): Entrada['tipo'] => {
  const ext = (nome.split('.').pop() ?? '').toLowerCase();
  if (['mp4', 'mov', 'webm', 'mkv', 'm4v', 'avi'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext)) return 'audio';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'avif', 'svg'].includes(ext)) return 'image';
  return 'outro';
};

export function BaixarConteudo({ aoFechar }: { aoFechar?: () => void }) {
  const { toast, openModal, sessao } = useUI();
  const [link, setLink] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [prog, setProg] = useState('');
  const [itens, setItens] = useState<Entrada[]>([]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [audio, setAudio] = useState(false);
  const [qualidade, setQualidade] = useState('1080');
  const [paraTimeline, setParaTimeline] = useState(true);
  const [fonte, setFonte] = useState<Fonte | null>(null);
  const [erro, setErro] = useState('');

  const semHoras = !!sessao && sessao.papel !== 'admin' && (sessao.horasRestantes ?? 0) <= 0;

  const registrados = async (r: { nome?: string; bytes?: number; ok: boolean; detalhe?: string }, ferramenta: string, origemLink: string, origemTipo: string) => {
    const r2 = await registrarDownload({
      ferramenta,
      origem: origemTipo,
      link: origemLink,
      nome: r.nome,
      bytes: r.bytes ?? 0,
      status: r.ok ? 'ok' : 'erro',
      detalhe: r.detalhe,
    });
    if (!r2.ok && r2.erro === 'plano_esgotado') {
      toast('Seu tempo de plano acabou — renove para continuar baixando', 'warn');
      openModal('checkout');
    }
  };

  /* ---------------- ação principal ---------------- */

  const analisar = async () => {
    setErro('');
    const l = link.trim();
    if (!/^https?:\/\//i.test(l)) {
      toast('Cole um link completo (começa com https://)', 'warn');
      return;
    }
    if (semHoras) {
      toast('Você está sem horas de plano', 'warn');
      openModal('checkout');
      return;
    }
    const f = fonteDe(l);
    setFonte(f);
    setItens([]);
    setSel(new Set());
    setOcupado(true);

    try {
      /* ---------- 1. REDES SOCIAIS: motor Baixa Tudo ---------- */
      if (f === 'rede') {
        setProg('Perguntando ao motor o que existe nesse link…');
        const d = await consultarBaixaTudo(l, { audio, qualidade });
        const lista: Entrada[] = [];
        const principal = d.url ?? d.picker?.[0]?.url ?? d.tunnel?.[0] ?? d.audio ?? '';
        if (d.filename || principal) {
          lista.push({
            id: 'principal',
            nome: d.filename || 'vídeo do link',
            tipo: audio ? 'audio' : 'video',
            origem: l,
            stream: principal,
            estado: 'pronto',
          });
        }
        (d.picker ?? []).slice(1).forEach((p, i) => {
          lista.push({
            id: `picker_${i}`,
            nome: p.url.split('/').pop()?.split('?')[0] ?? `mídia ${i + 2}`,
            tipo: p.type === 'photo' ? 'image' : 'video',
            origem: l,
            stream: p.url,
            estado: 'pronto',
          });
        });
        (d.tunnel ?? []).slice(1).forEach((t, i) => {
          lista.push({ id: `tunnel_${i}`, nome: `parte ${i + 2}`, tipo: 'video', origem: l, stream: t, estado: 'pronto' });
        });
        if (d.audio && !audio) {
          lista.push({ id: 'audio', nome: 'áudio do vídeo (MP3)', tipo: 'audio', origem: l, stream: d.audio, estado: 'pronto' });
        }
        if (!lista.length) throw new Error('O motor não devolveu arquivo para esse link');
        setItens(lista);
        setSel(new Set(lista.map((i) => i.id)));
        toast(`${lista.length} mídia(s) prontas para baixar`, 'ok');
        return;
      }

      /* ---------- 2. DRIVE: varre pasta ou arquivo ---------- */
      if (f === 'drive') {
        const id = idDeLinkDrive(l);
        if (!id) throw new Error('link do Drive inválido');
        const r = await extrairDeUrl(l, (p) => setProg(`Lendo “${p.pasta}” · ${p.arquivos} arquivo(s)`));
        const uteis = r.arquivos.filter((a) => a.tipo !== 'outro');
        if (!uteis.length) throw new Error('nenhum vídeo, áudio ou imagem nessa pasta (é pública?)');
        const lista: Entrada[] = uteis.map((a: ItemDrive) => ({
          id: a.id,
          nome: a.nome,
          tipo: a.tipo,
          origem: l,
          stream: a.stream,
          estado: 'pronto',
        }));
        setItens(lista);
        setSel(new Set(lista.map((i) => i.id)));
        toast(`${lista.length} arquivo(s) em ${r.pastas} pasta(s)`, 'ok');
        return;
      }

      /* ---------- 3. PÁGINA COMUM: procura mídias ---------- */
      setProg('Procurando vídeos, áudios e imagens na página…');
      const res = await chamarFuncao('minerar', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: l }),
      });
      const dados = (await res.json()) as { ok: boolean; itens?: { url: string; type?: string; name?: string }[]; erro?: string };
      if (!dados.ok) throw new Error(dados.erro ?? 'o site não respondeu');
      const lista: Entrada[] = (dados.itens ?? []).map((i, n) => ({
        id: `site_${n}`,
        nome: i.name ?? i.url.split('/').pop()?.split('?')[0] ?? `mídia ${n + 1}`,
        tipo: i.type === 'video' ? 'video' : i.type === 'audio' ? 'audio' : 'image',
        origem: l,
        stream: i.url,
        estado: 'pronto',
      }));
      if (!lista.length) throw new Error('nenhuma mídia encontrada nessa página');
      setItens(lista);
      setSel(new Set(lista.map((i) => i.id)));
      toast(`${lista.length} mídia(s) na página`, 'ok');
    } catch (e) {
      const msg = (e as Error).message;
      setErro(msg);
      toast(msg, 'err');
    } finally {
      setOcupado(false);
      setProg('');
    }
  };

  /* ---------------- baixar ---------------- */

  const baixarSelecionados = async () => {
    const alvos = itens.filter((i) => sel.has(i.id) && i.estado === 'pronto');
    if (!alvos.length) {
      toast('Selecione ao menos um arquivo', 'warn');
      return;
    }
    setOcupado(true);
    let ok = 0;

    /* rede social: o motor é quem entrega o arquivo final */
    if (fonte === 'rede') {
      const r = await usarBaixaTudo(alvos[0].origem, { audio, qualidade, naTimeline: paraTimeline });
      if (r.ok) ok += 1;
      await registrados({ nome: r.nome, ok: r.ok }, 'Baixa Tudo', alvos[0].origem, 'rede social');
    } else {
      for (let i = 0; i < alvos.length; i += 1) {
        const a = alvos[i];
        setProg(`Baixando ${i + 1} de ${alvos.length} · ${a.nome.slice(0, 34)}`);
        setItens((atual) => atual.map((x) => (x.id === a.id ? { ...x, estado: 'baixando' } : x)));
        const itemDrive: ItemDrive = {
          id: a.id,
          nome: a.nome,
          tipo: a.tipo,
          pasta: fonte === 'drive' ? 'Drive' : 'Da web',
          pastaId: '',
          stream: a.stream,
        };
        const deu = await baixarParaEditor(itemDrive, paraTimeline);
        if (deu) ok += 1;
        setItens((atual) => atual.map((x) => (x.id === a.id ? { ...x, estado: deu ? 'ok' : 'erro' } : x)));
        await registrados(
          { nome: a.nome, ok: deu, detalhe: a.stream },
          fonte === 'drive' ? 'Drive' : 'Site',
          a.origem,
          fonte === 'drive' ? 'Google Drive' : 'página web',
        );
      }
    }

    setOcupado(false);
    setProg('');
    toast(`${ok} de ${alvos.length} baixado(s)${paraTimeline ? ' e na timeline' : ' na aba Mídia'}`, ok ? 'ok' : 'warn');
    if (ok) {
      window.dispatchEvent(new Event('vortex:fechar-gaveta'));
      if (paraTimeline) aoFechar?.();
    }
  };

  const marcarTodos = (marcar: boolean) => setSel(marcar ? new Set(itens.map((i) => i.id)) : new Set());

  const rotuloFonte = useMemo(
    () =>
      fonte === 'rede'
        ? 'Rede social / vídeo — motor Baixa Tudo'
        : fonte === 'drive'
          ? 'Google Drive — pasta ou arquivo'
          : fonte === 'site'
            ? 'Página da web — mídias encontradas'
            : '',
    [fonte],
  );

  return (
    <div className="baixar-conteudo">
      <div className="bt-topo">
        <span className="bt-selo">BAIXAR CONTEÚDO</span>
        <b>Link do vídeo, do Drive ou de qualquer página</b>
        <span className="bt-sub">uma caixa só: o sistema descobre de onde baixar</span>
      </div>

      <div className="bt-linha">
        <input
          className="bt-input"
          placeholder="cole aqui: youtube.com/… · instagram.com/reel/… · drive.google.com/drive/folders/…"
          value={link}
          onChange={(e) => {
            setLink(e.target.value);
            setErro('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void analisar();
          }}
        />
        <button className="btn primary" disabled={ocupado} onClick={() => void analisar()}>
          {ocupado ? 'Trabalhando…' : 'Analisar link'}
        </button>
      </div>

      {link.trim() && (
        <div style={{ fontSize: 11.5, color: 'var(--txt-2)', marginTop: 6 }}>
          Reconhecido como: <b>{fonteDe(link) === 'rede' ? 'vídeo de rede social' : fonteDe(link) === 'drive' ? 'Google Drive' : 'página da web'}</b>
        </div>
      )}

      <div className="bt-opcoes" style={{ marginTop: 12 }}>
        <div>
          <label className="ia-rotulo">Formato</label>
          <div className="ia-chips">
            {['1080', '720', '480', 'audio'].map((q) => (
              <button
                key={q}
                className={`chip${(q === 'audio' ? audio : !audio && qualidade === q) ? ' active' : ''}`}
                onClick={() => {
                  if (q === 'audio') setAudio(true);
                  else {
                    setAudio(false);
                    setQualidade(q);
                  }
                }}
              >
                {q === 'audio' ? 'Só áudio (MP3)' : `${q}p`}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="ia-rotulo">Destino</label>
          <div className="ia-chips">
            <button className={`chip${paraTimeline ? ' active' : ''}`} onClick={() => setParaTimeline(true)}>
              Timeline (já editável)
            </button>
            <button className={`chip${!paraTimeline ? ' active' : ''}`} onClick={() => setParaTimeline(false)}>
              Só a biblioteca
            </button>
          </div>
        </div>
      </div>

      {prog && (
        <div className="bt-prog" style={{ marginTop: 10, fontSize: 12, color: 'var(--acc)' }}>
          {prog}
        </div>
      )}
      {erro && (
        <div
          style={{
            marginTop: 10,
            padding: '9px 12px',
            borderRadius: 9,
            background: 'rgba(248,113,113,.1)',
            border: '1px solid rgba(248,113,113,.3)',
            color: '#fca5a5',
            fontSize: 12,
          }}
        >
          {erro}
          {fonte === 'site' && ' Dica: se a página esconde o vídeo, cole o link direto do arquivo (.mp4) ou use o link do Drive.'}
        </div>
      )}

      {itens.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <b style={{ fontSize: 12.5 }}>{rotuloFonte}</b>
            <span style={{ fontSize: 11.5, color: 'var(--txt-2)' }}>· {itens.length} item(s)</span>
            <div style={{ flex: 1 }} />
            <button className="btn ghost sm" onClick={() => marcarTodos(true)}>
              Marcar todos
            </button>
            <button className="btn ghost sm" onClick={() => marcarTodos(false)}>
              Limpar
            </button>
          </div>

          <div className="bc-lista">
            {itens.map((i) => (
              <label key={i.id} className={`bc-item${sel.has(i.id) ? ' sel' : ''}`}>
                <input
                  type="checkbox"
                  checked={sel.has(i.id)}
                  onChange={(e) => {
                    const s = new Set(sel);
                    if (e.target.checked) s.add(i.id);
                    else s.delete(i.id);
                    setSel(s);
                  }}
                />
                <span className="bc-ico">{i.tipo === 'video' ? '▶' : i.tipo === 'audio' ? '♪' : i.tipo === 'image' ? '▣' : '◫'}</span>
                <span className="bc-nome" title={i.nome}>
                  {i.nome}
                </span>
                {i.tamanho ? <span className="bc-tam">{fmtBytes(i.tamanho)}</span> : null}
                <span className={`bc-estado ${i.estado}`}>
                  {i.estado === 'baixando' ? '…' : i.estado === 'ok' ? '✓' : i.estado === 'erro' ? '!' : i.tipo}
                </span>
              </label>
            ))}
          </div>

          <button className="btn primary" style={{ width: '100%', marginTop: 10 }} disabled={ocupado} onClick={() => void baixarSelecionados()}>
            {ocupado ? 'Baixando…' : `⬇ Baixar ${sel.size} selecionado(s)${paraTimeline ? ' e colocar na timeline' : ''}`}
          </button>
        </div>
      )}

      {itens.length === 0 && (
        <>
          <div className="bt-sites" style={{ marginTop: 12 }}>
            {SITES_BAIXA_TUDO.map((s) => (
              <span key={s} className="bt-site">
                {s}
              </span>
            ))}
            <span className="bt-site">Google Drive</span>
            <span className="bt-site">Página com .mp4/.mp3</span>
          </div>
          <div className="hint" style={{ marginTop: 10 }}>
            Link público, sem login. Se o arquivo for grande, ele entra na biblioteca e você arrasta para a régua
            (ou já vem na timeline, se “Destino” estiver em Timeline). Cada download fica registrado na sua conta,
            em <b>Minha conta → Downloads</b>.
          </div>
        </>
      )}
    </div>
  );
}
