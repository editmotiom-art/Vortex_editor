import { useEffect, useMemo, useState } from 'react';
import { SECOES_MONKEY, type PackMonkey } from '../data/packsMonkey';
import { useUI } from '../store/ui';
import { useEditor } from '../store/editor';
import { lerPasta } from '../lib/driveIndex';
import type { ItemDrive } from '../lib/driveIndex';
import { urlFuncao } from '../lib/api';
import {
  COTAS,
  abrirPastaPack,
  buscarPacks,
  fecharPastaPack,
  gravarCachePasta,
  idDaPasta,
  lerCachePasta,
  lerPastaAberta,
  lerUso,
  linkAlternativo,
  linkDownloadDrive,
  tipoUtil,
  podeBaixar,
  registrarDownload,
} from '../lib/packsMonkeyPlan';

/**
 * BIBLIOTECA “PACK DO EDITOR 4.0”
 * ------------------------------------------------------------
 * 163 packs extraídos do PDF do Pack do Editor (Drive + espelho no Sync).
 * Entrega sob demanda: o sistema guarda só nome e link; a pasta é lida no
 * servidor quando o usuário abre, e o arquivo só desce quando ele clica ↓.
 * Cota por plano (free 5/dia · pro 60/dia · studio 300/dia) para não estourar
 * banda nem banco.
 */

const emoji = (secao: string) =>
  secao === 'After Effects' ? '◈'
  : secao === 'Premiere Pro' ? '✂'
  : secao === 'VFX Essencial' ? '✦'
  : secao === 'Design e Photoshop' ? '▣'
  : secao === 'Efeitos Sonoros' ? '♪'
  : secao === 'Trilhas e Bônus' ? '♫'
  : '★';

const iconeTipo = (t: string) => (t === 'video' ? '▶' : t === 'audio' ? '♪' : t === 'image' ? '▣' : '◫');

export function PacksMonkey() {
  const { toast } = useUI();
  const plano = useUI((s) => s.sessao?.plano ?? 'free');
  const addAsset = useEditor((s) => s.addAsset);

  const [secao, setSecao] = useState<string>('Todas');
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState<PackMonkey | null>(null);
  const [arquivos, setArquivos] = useState<ItemDrive[]>([]);
  const [subpastas, setSubpastas] = useState<{ id: string; nome: string }[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erroPasta, setErroPasta] = useState('');
  const [trilhaNomes, setTrilha] = useState<string[]>([]);
  const [baixando, setBaixando] = useState<string | null>(null);
  const [uso, setUso] = useState(() => lerUso());

  useEffect(() => {
    const id = lerPastaAberta();
    if (!id) return;
    const achado = buscarPacks('').find((p) => idDaPasta(p) === id);
    if (achado) void abrir(achado, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cotas = COTAS[plano] ?? COTAS.free;

  const lista = useMemo(() => {
    const base = busca.trim() ? buscarPacks(busca) : buscarPacks('');
    return secao === 'Todas' ? base : base.filter((p) => p.secao === secao);
  }, [secao, busca]);

  async function abrir(p: PackMonkey, silencioso = false) {
    const pastaId = idDaPasta(p);
    setAberto(p);
    setErroPasta('');
    setArquivos([]);
    setSubpastas([]);
    if (!pastaId) {
      const alt = linkAlternativo(p);
      if (!silencioso) {
        if (alt) window.open(alt, '_blank', 'noopener');
        toast('Este pack não está no Drive — abri o link alternativo (Sync).', 'warn');
      }
      return;
    }
    abrirPastaPack(pastaId);
    const cache = lerCachePasta(pastaId);
    if (cache) {
      setArquivos(
        cache.arquivos.map((a) => ({ ...a, tipo: a.tipo as ItemDrive['tipo'], pasta: p.nome, pastaId, stream: '' })),
      );
      setSubpastas(cache.pastas);
      return;
    }
    setCarregando(true);
    try {
      const { arquivos: arqs, pastas } = await lerPasta(pastaId, p.nome);
      setArquivos(arqs);
      setSubpastas(pastas);
      gravarCachePasta({
        id: pastaId,
        em: Date.now(),
        arquivos: arqs.map((a) => ({ id: a.id, nome: a.nome, tipo: a.tipo })),
        pastas,
      });
      // a maioria dos packs tem só subpastas na raiz: entra na primeira
      // para o usuário já ver arquivos (e poder baixar)
      if (!arqs.length && pastas.length) {
        setTrilha([p.nome]);
        const { arquivos: a2, pastas: p2 } = await lerPasta(pastas[0].id, pastas[0].nome);
        setArquivos(a2);
        setSubpastas(p2);
        setTrilha([p.nome, pastas[0].nome]);
        gravarCachePasta({
          id: pastas[0].id,
          em: Date.now(),
          arquivos: a2.map((a) => ({ id: a.id, nome: a.nome, tipo: a.tipo })),
          pastas: p2,
        });
      } else {
        setTrilha([p.nome]);
      }
    } catch (e) {
      setErroPasta((e as Error).message);
    } finally {
      setCarregando(false);
    }
  }

  async function baixar(item: ItemDrive) {
    const cota = podeBaixar(plano);
    if (!cota.ok) {
      toast(
        `Limite do plano ${plano}: ${cota.cota} arquivos por dia. Libere mais no plano Pro/Studio.`,
        'warn',
      );
      return;
    }
    setBaixando(item.id);
    try {
      const url = `${urlFuncao('proxy')}?url=${encodeURIComponent(linkDownloadDrive(item.id))}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`servidor respondeu ${res.status}`);
      const blob = await res.blob();
      if (blob.size < 1024) throw new Error('o arquivo veio vazio');
      const local = URL.createObjectURL(blob);
      const tipo = item.tipo === 'video' || item.tipo === 'audio' || item.tipo === 'image' ? item.tipo : null;
      if (!tipo) throw new Error('este formato não abre no editor (use ↓ e baixe no computador)');
      addAsset({
        name: item.nome,
        kind: tipo,
        url: local,
        durationMs: tipo === 'image' ? 5000 : 0,
        origin: 'pack',
        sizeBytes: blob.size,
      });
      setUso(registrarDownload(1));
      toast(`“${item.nome}” na aba Mídia`, 'ok');
    } catch (e) {
      toast(`Não consegui baixar: ${(e as Error).message}`, 'err');
    } finally {
      setBaixando(null);
    }
  }

  /* ---------------- pasta aberta ---------------- */
  if (aberto) {
    // o que o editor abre de verdade (vídeo/áudio/imagem); zip/aep/psd → Drive
    const util = arquivos.filter((a) => tipoUtil(a.nome) !== 'outro');
    const paraDrive = arquivos.length - util.length;
    return (
      <div className="pk">
        <div className="pk-topo">
          <button
            className="btn ghost sm"
            onClick={() => {
              setAberto(null);
              fecharPastaPack();
            }}
          >
            ← Voltar
          </button>
          <b>{aberto.nome}</b>
          <span className="pk-selo">{aberto.secao}</span>
          <div className="spacer" />
          {aberto.drive && (
            <a className="btn ghost sm" href={aberto.drive} target="_blank" rel="noreferrer" title="Abrir a pasta no Google Drive">
              ↗ Drive
            </a>
          )}
          {linkAlternativo(aberto) && (
            <a className="btn ghost sm" href={linkAlternativo(aberto)!} target="_blank" rel="noreferrer" title="Espelho no Sync">
              ↗ Sync
            </a>
          )}
          <span className="pk-cota">
            {uso.baixados}/{cotas} hoje
          </span>
        </div>

        {carregando && <div className="pk-aviso">Lendo a pasta no Drive…</div>}
        {paraDrive > 0 && util.length > 0 && (
          <div className="pk-aviso">
            {paraDrive} arquivo(s) de instalação abrem pelo link ↗ (o editor carrega {util.length} de mídia).
          </div>
        )}
        {erroPasta && (
          <div className="pk-aviso erro">
            {erroPasta} —{' '}
            {linkAlternativo(aberto) && (
              <a href={linkAlternativo(aberto)!} target="_blank" rel="noreferrer">
                abrir espelho no Sync ↗
              </a>
            )}
          </div>
        )}

        {subpastas.length > 0 && (
          <div className="pk-subpastas">
            {subpastas.map((sp) => (
              <button
                key={sp.id}
                className="btn ghost sm"
                onClick={() =>
                  void (async () => {
                    setCarregando(true);
                    try {
                      const { arquivos: arqs, pastas } = await lerPasta(sp.id, sp.nome);
                      setArquivos(arqs);
                      setSubpastas(pastas);
                      setTrilha((t) => [...t, sp.nome]);
                    } catch (e) {
                      toast((e as Error).message, 'err');
                    } finally {
                      setCarregando(false);
                    }
                  })()
                }
              >
                ▸ {sp.nome}
              </button>
            ))}
          </div>
        )}

        {util.length === 0 && arquivos.length > 0 && (
          <div className="pk-aviso">
            Esta pasta tem {arquivos.length} arquivo(s) para instalar no After Effects/Premiere (zip, aep, psd,
            plugins). Abra a pasta no Drive para baixar no computador — o editor só coloca na timeline vídeo,
            áudio e imagem.
            {idDaPasta(aberto) && (
              <>
                {' '}
                <a href={aberto.drive} target="_blank" rel="noreferrer">
                  abrir a pasta no Drive ↗
                </a>
              </>
            )}
          </div>
        )}

        {util.length > 0 && (
          <button
            className="btn primary pk-baixar-todos"
            onClick={() => {
              const restam = podeBaixar(plano).restam;
              const alvo = util.slice(0, Math.min(restam, 5));
              if (!alvo.length) {
                toast('Cota de hoje esgotada. Volte amanhã ou suba de plano.', 'warn');
                return;
              }
              alvo.forEach((a) => void baixar(a));
            }}
          >
            ↓ Baixar {Math.min(podeBaixar(plano).restam, 5)} para a biblioteca
          </button>
        )}

        <div className="pk-arquivos">
          {arquivos.map((a) => (
            <div key={a.id} className="pk-arquivo">
              <span className="pk-ico">{iconeTipo(a.tipo)}</span>
              <span className="pk-nome" title={a.nome}>
                {a.nome}
              </span>
              {tipoUtil(a.nome) === 'outro' ? (
                <a
                  className="btn ghost sm"
                  href={linkDownloadDrive(a.id)}
                  target="_blank"
                  rel="noreferrer"
                  title="Baixar no computador (formato de instalação)"
                >
                  ↗
                </a>
              ) : (
                <button className="btn ghost sm" disabled={baixando === a.id} onClick={() => void baixar(a)}>
                  {baixando === a.id ? '…' : '↓'}
                </button>
              )}
            </div>
          ))}
        </div>

        {!carregando && !erroPasta && arquivos.length === 0 && (
          <div className="pk-aviso">Esta pasta não tem arquivos soltos — abra uma subpasta acima.</div>
        )}
      </div>
    );
  }

  /* ---------------- catálogo ---------------- */
  return (
    <div className="pk">
      <div className="pk-topo">
        <b>Pack do Editor 4.0</b>
        <span className="pk-selo">163 packs</span>
        <div className="spacer" />
        <span className="pk-cota">
          {uso.baixados}/{cotas} downloads hoje
        </span>
      </div>

      <div className="pk-filtros">
        <input
          className="pk-busca"
          placeholder="Buscar pack (flyers, cyber, foley, mockups…)"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select className="pk-select" value={secao} onChange={(e) => setSecao(e.target.value)}>
          <option value="Todas">Todas as seções ({lista.length})</option>
          {SECOES_MONKEY.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div className="pk-lista">
        {lista.map((p) => (
          <button key={p.id} className="pk-card" onClick={() => void abrir(p)}>
            <span className="pk-emoji">{emoji(p.secao)}</span>
            <span className="pk-info">
              <b>{p.nome}</b>
              <small>{p.secao}</small>
            </span>
            <span className={`pk-tag ${p.drive ? 'drive' : 'sync'}`}>{p.drive ? 'Drive' : 'Sync'}</span>
          </button>
        ))}
        {lista.length === 0 && <div className="pk-aviso">Nenhum pack com esse nome.</div>}
      </div>
    </div>
  );
}
