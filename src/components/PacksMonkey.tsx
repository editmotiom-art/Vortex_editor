import { useEffect, useMemo, useState } from 'react';
import { SECOES_MONKEY, type PackMonkey } from '../data/packsMonkey';
import { useUI } from '../store/ui';
import { useEditor } from '../store/editor';
import { lerPasta } from '../lib/driveIndex';
import type { ItemDrive } from '../lib/driveIndex';
import { urlFuncao } from '../lib/api';
import { PACKS_PRONTOS } from '../data/packsProntos';
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

/**
 * O editor só usa vídeo, áudio e imagem. Ordenar assim faz o primeiro item
 * da lista ser algo que REALMENTE baixa para a timeline — antes o topo era
 * um .zip/.aep e o clique parecia "não funcionar".
 */
const ordem: Record<string, number> = { video: 0, audio: 1, image: 2, outro: 3 };
const ordenar = (lista: ItemDrive[]): ItemDrive[] =>
  [...lista].sort((a, b) => ordem[tipoUtil(a.nome)] - ordem[tipoUtil(b.nome)]);

export function PacksMonkey() {
  const { toast } = useUI();
  const plano = useUI((s) => s.sessao?.plano ?? 'nenhum');
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
  const [modo, setModo] = useState<'pronto' | 'packs'>(() => (PACKS_PRONTOS.length ? 'pronto' : 'packs'));

  useEffect(() => {
    const id = lerPastaAberta();
    if (!id) return;
    const achado = buscarPacks('').find((p) => idDaPasta(p) === id);
    if (achado) void abrir(achado, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cotas = COTAS[plano] ?? COTAS.nenhum;

  /** packs do Drive que já têm vídeo/áudio/imagem soltos (mapeados pelo script) */
  const packsComMidia = useMemo(() => {
    const nomes = new Set(PACKS_PRONTOS.map((p) => p.nome.toLowerCase()));
    return buscarPacks('').filter((p) => nomes.has(p.nome.toLowerCase())).slice(0, 10);
  }, []);

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
      setArquivos(ordenar(arqs));
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
        setArquivos(ordenar(a2));
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

  async function baixar(item: ItemDrive, naTimeline = false) {
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
      const link = linkDownloadDrive(item.id);
      // 1) pergunta o tamanho de verdade antes de baixar (o Drive mente no Content-Length)
      const meta = await fetch(urlFuncao('ferramentas'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ acao: 'arquivo', url: link, meta: 1 }),
      })
        .then((r) => r.json())
        .catch(() => ({ ok: false }) as Record<string, unknown>);
      const tamanho = Number((meta as { tamanho?: number }).tamanho ?? 0);

      if (meta && (meta as { ok?: boolean }).ok && tamanho > 80 * 1024 * 1024) {
        // 2) grande demais para o servidor do editor → baixa no computador,
        //    com uma mensagem que explica o motivo (nada de "não funcionou")
        const a = document.createElement('a');
        a.href = link;
        a.rel = 'noreferrer';
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast(
          `“${item.nome}” tem ${(tamanho / 1048576).toFixed(0)} MB: o download começou no seu computador (o servidor só move até 80 MB).`,
          'warn',
        );
        setUso(registrarDownload(1));
        return;
      }

      // 3) cabe no servidor → vem para a aba Mídia
      const res = await fetch(urlFuncao('ferramentas'), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ acao: 'arquivo', url: link }),
      });
      if (!res.ok) {
        const erro = await res
          .json()
          .then((j) => String((j as { erro?: string }).erro ?? ''))
          .catch(() => '');
        throw new Error(erro || `servidor respondeu ${res.status}`);
      }
      const blob = await res.blob();
      if (blob.size < 1024) throw new Error('o arquivo veio vazio');
      const local = URL.createObjectURL(blob);
      const tipo = item.tipo === 'video' || item.tipo === 'audio' || item.tipo === 'image' ? item.tipo : null;
      if (!tipo) throw new Error('este formato não abre no editor (use ↗ computador e baixe no seu aparelho)');
      const asset = addAsset({
        name: item.nome,
        kind: tipo,
        url: local,
        durationMs: tipo === 'image' ? 5000 : 0,
        origin: 'pack',
        sizeBytes: blob.size,
      });
      // duração real do arquivo (antes ficava 0 e o clipe saía com 5 s fixos)
      if (tipo !== 'image') {
        const el = document.createElement(tipo === 'audio' ? 'audio' : 'video');
        el.src = local;
        el.onloadedmetadata = () => {
          if (Number.isFinite(el.duration) && el.duration > 0) {
            useEditor.getState().updateAssetDuration(asset.id, Math.round(el.duration * 1000));
          }
        };
      }
      setUso(registrarDownload(1));
      if (naTimeline) {
        /* o botão diz "+ timeline": então o clipe entra na timeline também */
        const add = (window as unknown as { __vortexAddMedia?: (id: string) => void }).__vortexAddMedia;
        if (add) add(asset.id);
        toast(`“${item.nome}” na timeline e na aba Mídia`, 'ok');
      } else {
        toast(`“${item.nome}” na aba Mídia`, 'ok');
      }
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
            <b>Este pack é de instalação</b> (ZIP/RAR/AEP para After Effects, Premiere ou Photoshop) — nenhum
            desses formatos abre dentro do editor. Dá para baixar no computador pelo botão{' '}
            <b>↗ computador</b> de cada arquivo ou pela pasta inteira no Drive.
            {idDaPasta(aberto) && (
              <>
                {' '}
                <a href={aberto.drive} target="_blank" rel="noreferrer">
                  abrir a pasta no Drive ↗
                </a>
              </>
            )}
            <div style={{ marginTop: 8 }}>
              Quer coisa que entre na timeline agora, sem instalar nada? Use a aba{' '}
              <b>✦ Biblioteca → ♪ Músicas e arquivos</b> (músicas, efeitos, fotos e vídeos livres) — ou me diga{' '}
              <b>“conteúdo do editor”</b>: eu carrego os packs que têm vídeo, áudio e imagem soltos.
            </div>
            {packsComMidia.length > 0 && (
              <div className="pk-subpastas" style={{ marginTop: 8 }}>
                {packsComMidia.map((pc) => (
                  <button key={pc.id} className="btn ghost sm" onClick={() => void abrir(pc)}>
                    ▸ {pc.nome}
                  </button>
                ))}
              </div>
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
                  title={`${a.nome.split('.').pop()?.toUpperCase()} não abre no editor — baixa para o computador`}
                >
                  ↗ computador
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
        {arquivos.some((a) => tipoUtil(a.nome) === 'outro') && (
          <div className="pk-aviso" style={{ marginTop: 8 }}>
            Arquivos <b>.zip/.aep/.psd/.ttf</b> não entram na timeline (o navegador não abre esses formatos):
            use <b>↗ computador</b> para baixar no seu aparelho. Vídeo, áudio e imagem baixam direto com <b>↓</b>.
          </div>
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

      <div className="lib-modo" style={{ marginBottom: 8 }}>
        <button className={modo === 'pronto' ? 'active' : ''} onClick={() => setModo('pronto')}>
          ▶ Pronto para usar ({PACKS_PRONTOS.length})
        </button>
        <button className={modo === 'packs' ? 'active' : ''} onClick={() => setModo('packs')}>
          ◫ Todos os 163 packs
        </button>
      </div>

      {modo === 'pronto' && (
        <div className="pk-lista">
          {PACKS_PRONTOS.filter((p) => !busca.trim() || p.nome.toLowerCase().includes(busca.toLowerCase())).map((p) => (
            <div key={p.id} className="pk-pronto">
              <div className="pk-pronto-topo">
                <span className="pk-emoji">{emoji(p.secao)}</span>
                <span className="pk-info">
                  <b>{p.nome}</b>
                  <small>
                    {p.secao} · {p.arquivos.length} arquivo(s) que abrem no editor
                  </small>
                </span>
              </div>
              {p.arquivos.map((a) => (
                <div key={a.id} className="pk-arquivo">
                  <span className="pk-ico">{iconeTipo(a.tipo)}</span>
                  <span className="pk-nome" title={a.nome}>
                    {a.nome}
                  </span>
                  <button
                    className="btn primary sm"
                    disabled={baixando === a.id}
                    onClick={() => void baixar({ id: a.id, nome: a.nome, tipo: a.tipo } as ItemDrive, true)}
                  >
                    {baixando === a.id ? '…' : '+ timeline'}
                  </button>
                </div>
              ))}
            </div>
          ))}
          {PACKS_PRONTOS.length === 0 && (
            <div className="pk-aviso">
              Nada mapeado ainda: rode <code>node scripts/mapear-packs-prontos.mjs</code> para ler o Drive.
            </div>
          )}
        </div>
      )}

      {modo === 'packs' && (
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

      )}

      {modo === 'packs' && (
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
      )}
    </div>
  );
}
