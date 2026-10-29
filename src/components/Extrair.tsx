import { useMemo, useState } from 'react';
import { useUI } from '../store/ui';
import {
  baixarParaEditor,
  baixarVarios,
  extrairDeUrl,
  type ItemDrive,
} from '../lib/driveIndex';
import { fmtBytes } from '../lib/anim';
import { transcreverParaTimeline, transcricaoDisponivel } from '../lib/transcricao';
import { chamarFuncao, urlFuncao } from '../lib/api';

/**
 * EXTRAIR CONTEÚDO — link do Drive, página da web ou arquivos
 * Lista tudo o que encontrou, deixa escolher e baixa em massa para o editor.
 */
export function Extrair() {
  const { toast, closeModal } = useUI();
  const [aba, setAba] = useState<'drive' | 'site' | 'contas'>('drive');
  const [link, setLink] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [prog, setProg] = useState('');
  const [itens, setItens] = useState<ItemDrive[]>([]);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [filtro, setFiltro] = useState<'todos' | 'video' | 'audio' | 'image'>('todos');
  const [urlSite, setUrlSite] = useState('');

  const filtrados = useMemo(
    () => (filtro === 'todos' ? itens : itens.filter((i) => i.tipo === filtro)),
    [itens, filtro],
  );

  const contar = (t: ItemDrive['tipo']) => itens.filter((i) => i.tipo === t).length;

  const extrair = async () => {
    if (!link.trim()) {
      toast('Cole o link da pasta do Drive', 'warn');
      return;
    }
    setOcupado(true);
    setItens([]);
    setSel(new Set());
    try {
      const r = await extrairDeUrl(link, (p) => setProg(`Lendo “${p.pasta}” · ${p.arquivos} arquivo(s)`));
      setItens(r.arquivos);
      setSel(new Set(r.arquivos.filter((a) => a.tipo !== 'outro').map((a) => a.id)));
      toast(
        r.arquivos.length
          ? `${r.arquivos.length} arquivo(s) encontrados em ${r.pastas} pasta(s)`
          : 'Nenhum arquivo encontrado — verifique se a pasta é pública',
        r.arquivos.length ? 'ok' : 'warn',
      );
    } catch (e) {
      toast((e as Error).message, 'err');
    } finally {
      setOcupado(false);
      setProg('');
    }
  };

  const extrairSite = async () => {
    if (!/^https?:\/\//i.test(urlSite)) {
      toast('Cole o endereço completo da página', 'warn');
      return;
    }
    setOcupado(true);
    setItens([]);
    try {
      const res = await chamarFuncao('minerar', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ url: urlSite }),
      });
      const dados = (await res.json()) as {
        ok: boolean;
        itens?: { url: string; type?: string; name?: string }[];
        erro?: string;
      };
      if (!dados.ok) throw new Error(dados.erro ?? 'o site não respondeu');
      const lista: ItemDrive[] = (dados.itens ?? []).map((i, n) => ({
        id: `site_${n}_${Math.random().toString(36).slice(2, 8)}`,
        nome: i.name ?? i.url.split('/').pop() ?? `midia-${n}`,
        tipo: i.type === 'video' ? 'video' : i.type === 'audio' ? 'audio' : 'image',
        pasta: 'Da web',
        pastaId: '',
        stream: i.url,
      }));
      setItens(lista);
      setSel(new Set(lista.map((l) => l.id)));
      toast(`${lista.length} mídia(s) encontradas na página`, lista.length ? 'ok' : 'warn');
    } catch (e) {
      toast(`Não consegui extrair: ${(e as Error).message}`, 'err');
    } finally {
      setOcupado(false);
    }
  };

  const baixarSelecionados = async () => {
    const alvos = itens.filter((i) => sel.has(i.id) && i.tipo !== 'outro');
    if (!alvos.length) {
      toast('Selecione ao menos um arquivo', 'warn');
      return;
    }
    setOcupado(true);
    let ok = 0;
    for (let i = 0; i < alvos.length; i += 1) {
      setProg(`Baixando ${i + 1} de ${alvos.length} · ${alvos[i].nome.slice(0, 32)}`);
      if (await baixarParaEditor(alvos[i])) ok += 1;
    }
    setOcupado(false);
    setProg('');
    toast(`${ok} arquivo(s) estão na aba Mídia`, ok ? 'ok' : 'warn');
    if (ok) {
      window.dispatchEvent(new Event('vortex:fechar-gaveta'));
      closeModal();
    }
  };

  /** baixa os itens e já monta na timeline (o usuário vê o resultado na hora) */
  const levarParaTimeline = async (ids: string[]) => {
    const alvos = itens.filter((i) => ids.includes(i.id) && i.tipo !== 'outro');
    if (!alvos.length) {
      toast('Selecione ao menos um vídeo, áudio ou imagem', 'warn');
      return;
    }
    setOcupado(true);
    let ok = 0;
    for (let i = 0; i < alvos.length; i += 1) {
      setProg(`Preparando ${i + 1} de ${alvos.length} · ${alvos[i].nome.slice(0, 32)}`);
      if (await baixarParaEditor(alvos[i], true)) ok += 1;
    }
    setOcupado(false);
    setProg('');
    toast(`${ok} mídia(s) na timeline`, ok ? 'ok' : 'warn');
    if (ok) {
      window.dispatchEvent(new Event('vortex:fechar-gaveta'));
      closeModal();
    }
  };

  return (
    <div className="extrair">
      <div className="tabs" style={{ marginBottom: 12 }}>
        <button className={`tab${aba === 'drive' ? ' active' : ''}`} onClick={() => setAba('drive')}>
          🔗 Link do Drive
        </button>
        <button className={`tab${aba === 'site' ? ' active' : ''}`} onClick={() => setAba('site')}>
          🌐 Página da web
        </button>
        <button className={`tab${aba === 'contas' ? ' active' : ''}`} onClick={() => setAba('contas')}>
          🎙 Transcrição
        </button>
      </div>

      {aba === 'drive' && (
        <div className="ex-bloco">
          <h4>Cole o link de uma pasta do Drive</h4>
          <p>
            Funciona com pastas compartilhadas como “qualquer pessoa com o link”. O sistema lê a pasta, entra nas
            subpastas e lista tudo para você baixar de uma vez.
          </p>
          <div className="ex-linha">
            <input
              className="ex-input"
              placeholder="https://drive.google.com/drive/folders/…"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
            <button className="btn primary" disabled={ocupado} onClick={() => void extrair()}>
              {ocupado ? 'Extraindo…' : 'Extrair tudo'}
            </button>
          </div>
        </div>
      )}

      {aba === 'site' && (
        <div className="ex-bloco">
          <h4>Extrair mídias de qualquer página</h4>
          <p>Cole o endereço da página — o servidor busca e lista imagens, vídeos e áudios.</p>
          <div className="ex-linha">
            <input
              className="ex-input"
              placeholder="https://site.com/pagina"
              value={urlSite}
              onChange={(e) => setUrlSite(e.target.value)}
            />
            <button className="btn primary" disabled={ocupado} onClick={() => void extrairSite()}>
              {ocupado ? 'Buscando…' : 'Buscar mídias'}
            </button>
          </div>
        </div>
      )}

      {aba === 'contas' && (
        <div className="ex-bloco">
          <h4>Transcrição automática → legendas</h4>
          <p>
            Selelcione um áudio na aba <b>Mídia</b>, volte aqui e toque em transcrever. O navegador ouve o áudio e
            cria uma legenda na timeline para cada frase.
            {!transcricaoDisponivel() && (
              <>
                {' '}
                <b>Este navegador não tem reconhecimento de fala</b> — abra no Chrome, Edge ou Safari atualizado.
              </>
            )}
          </p>
          <button
            className="btn primary"
            disabled={!transcricaoDisponivel()}
            onClick={() => {
              const ed = document.getElementById('entrada-midia-global') as HTMLInputElement | null;
              void ed;
              const estado = (window as unknown as { __vortexAssets?: { id: string; name: string; url: string; kind: string }[] })
                .__vortexAssets;
              const audio = estado?.find((a) => a.kind === 'audio' || a.kind === 'video');
              if (!audio) {
                toast('Adicione um áudio ou vídeo na aba Mídia primeiro', 'warn');
                return;
              }
              void transcreverParaTimeline(audio.url, 'pt-BR');
            }}
          >
            Transcrever e criar legendas
          </button>
        </div>
      )}

      {prog && <div className="ex-prog">{prog}</div>}

      {itens.length > 0 && (
        <>
          <div className="ex-resumo">
            {(['todos', 'video', 'audio', 'image'] as const).map((t) => (
              <button
                key={t}
                className={`chip${filtro === t ? ' active' : ''}`}
                onClick={() => setFiltro(t)}
              >
                {t === 'todos' ? `Tudo (${itens.length})` : t === 'video' ? `Vídeos (${contar('video')})` : t === 'audio' ? `Áudios (${contar('audio')})` : `Imagens (${contar('image')})`}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <button className="btn ghost sm" onClick={() => setSel(new Set(filtrados.map((f) => f.id)))}>
              Marcar todos
            </button>
            <button className="btn ghost sm" onClick={() => setSel(new Set())}>
              Nenhum
            </button>
            <button className="btn primary sm" disabled={ocupado} onClick={() => void baixarSelecionados()}>
              ↓ Baixar {sel.size} para a biblioteca
            </button>
            <button
              className="btn ghost sm"
              disabled={ocupado}
              onClick={() => void levarParaTimeline(Array.from(sel))}
              title="Baixa e monta os itens selecionados na timeline"
            >
              ▸ {sel.size} na timeline
            </button>
          </div>

          <div className="ex-lista">
            {filtrados.slice(0, 400).map((a) => (
              <label key={a.id} className={`ex-item${sel.has(a.id) ? ' on' : ''}`}>
                <input
                  type="checkbox"
                  checked={sel.has(a.id)}
                  onChange={(e) => {
                    const novo = new Set(sel);
                    if (e.target.checked) novo.add(a.id);
                    else novo.delete(a.id);
                    setSel(novo);
                  }}
                />
                <span className={`ex-ico ex-${a.tipo}`}>
                  {a.tipo === 'video' ? '▶' : a.tipo === 'audio' ? '♪' : a.tipo === 'image' ? '▣' : '◫'}
                </span>
                <span className="ex-nome">{a.nome}</span>
                <span className="ex-pasta">{a.pasta}</span>
                <button
                  className="btn ghost sm"
                  title="Baixar para a biblioteca"
                  onClick={(e) => {
                    e.preventDefault();
                    void baixarVarios([a], 1);
                  }}
                >
                  ↓
                </button>
                <button
                  className="btn ghost sm"
                  title="Usar na timeline"
                  onClick={(e) => {
                    e.preventDefault();
                    void levarParaTimeline([a.id]);
                  }}
                >
                  ▸
                </button>
              </label>
            ))}
            {filtrados.length > 400 && (
              <div className="ex-mais">Mostrando 400 de {filtrados.length} — refine o filtro.</div>
            )}
          </div>
        </>
      )}

      {!ocupado && itens.length === 0 && (
        <div className="hint" style={{ marginTop: 10 }}>
          <b>Dica:</b> no Drive, clique com o botão direito na pasta → <b>Compartilhar</b> →{' '}
          <b>Qualquer pessoa com o link</b>. Depois cole o link aqui e toque em Extrair tudo.
        </div>
      )}
    </div>
  );
}

/* expõe uma referência aos assets para a transcrição */
export function registrarAssets(): void {
  // preenchido pelo App
}

export { fmtBytes };
