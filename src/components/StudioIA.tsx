import { useState } from 'react';
import { useUI } from '../store/ui';
import { useEditor } from '../store/editor';
import { lerConfig } from '../lib/config';

/**
 * ESTÚDIO DE IA — gerar imagem/vídeo por texto direto no editor
 * Usa a chave configurada no painel administrativo (fica no servidor).
 */

const ESTILOS = [
  { id: '', nome: 'Padrão' },
  { id: 'cinematic lighting, 35mm film, shallow depth of field, Hollywood color grading', nome: 'Hollywood' },
  { id: 'anime key visual, vibrant colors, dynamic composition', nome: 'Anime' },
  { id: 'analog film grain, kodak portra, natural light', nome: 'Analógico' },
  { id: '3d render, octane, studio lighting, product shot', nome: '3D Studio' },
  { id: 'minimal flat illustration, clean vector', nome: 'Vetor' },
  { id: 'cyberpunk neon night city, volumetric fog', nome: 'Cyberpunk' },
];

const TAMANHOS = [
  { id: '1024x1024', nome: 'Quadrado 1:1' },
  { id: '1024x1792', nome: 'Vertical 9:16' },
  { id: '1792x1024', nome: 'Horizontal 16:9' },
];

export function StudioIA({ aoFechar }: { aoFechar?: () => void }) {
  const { toast } = useUI();
  const [prompt, setPrompt] = useState('');
  const [estilo, setEstilo] = useState('');
  const [tamanho, setTamanho] = useState('1024x1792');
  const [gerando, setGerando] = useState(false);
  const [previa, setPrevia] = useState<string | null>(null);
  const cfg = lerConfig();

  const gerar = async () => {
    if (prompt.trim().length < 4) {
      toast('Descreva a imagem com mais detalhes', 'warn');
      return;
    }
    setGerando(true);
    setPrevia(null);
    try {
      const completo = estilo ? `${prompt}. ${estilo}` : prompt;
      const res = await fetch('/.netlify/functions/ia', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tipo: 'imagem', prompt: completo, tamanho }),
      });
      const tipo = res.headers.get('content-type') ?? '';
      if (!tipo.includes('json')) {
        toast(
          'A geração por IA roda no servidor da Netlify. Neste preview local não existe servidor de funções — publique ou use o site no ar.',
          'warn',
        );
        setGerando(false);
        return;
      }
      const dados = (await res.json()) as {
        ok: boolean;
        erro?: string;
        modo?: string;
        url?: string;
        b64?: string;
      };
      if (!dados.ok) {
        toast(dados.erro ?? 'A IA não respondeu', 'warn');
        setGerando(false);
        return;
      }
      const url = dados.url ?? (dados.b64 ? `data:image/png;base64,${dados.b64}` : '');
      if (!url) {
        toast('A IA respondeu sem imagem', 'warn');
        setGerando(false);
        return;
      }
      setPrevia(url);
      toast('Imagem gerada — confira a prévia abaixo', 'ok');
    } catch (e) {
      toast(`Falha: ${(e as Error).message}`, 'err');
    } finally {
      setGerando(false);
    }
  };

  const usarNoEditor = async () => {
    if (!previa) return;
    try {
      let urlFinal = previa;
      let tamanhoBytes = 0;
      if (!previa.startsWith('data:')) {
        const blob = await fetch(previa).then((r) => r.blob());
        tamanhoBytes = blob.size;
        urlFinal = URL.createObjectURL(blob);
      }
      const ed = useEditor.getState();
      const asset = ed.addAsset({
        name: `IA · ${prompt.slice(0, 28)}`,
        kind: 'image',
        url: urlFinal,
        durationMs: 5000,
        origin: 'library',
        sizeBytes: tamanhoBytes,
      });
      const trilha = ed.trilhaPara('image');
      if (trilha) {
        ed.addElement({
          type: 'image',
          name: `IA · ${prompt.slice(0, 20)}`,
          trackId: trilha.id,
          start: ed.playhead,
          duration: 4000,
          sourceIn: 0,
          assetId: asset.id,
          transform: {
            x: { base: ed.doc.settings.width / 2, keyframes: [] },
            y: { base: ed.doc.settings.height / 2, keyframes: [] },
            scale: { base: 1, keyframes: [] },
            rotation: { base: 0, keyframes: [] },
            opacity: { base: 1, keyframes: [] },
          },
          blend: 'normal',
          effects: [],
          volume: 1,
          locked: false,
          hidden: false,
          color: '#a78bfa',
        });
      }
      toast('Imagem adicionada à timeline', 'ok');
      aoFechar?.();
    } catch (e) {
      toast(`Não consegui usar a imagem: ${(e as Error).message}`, 'err');
    }
  };

  const desligada = !cfg.ia.ativo || !cfg.ia.chave;

  return (
    <div className="estudio-ia">
      {desligada && (
        <div className="ia-aviso">
          <b>IA ainda não está ligada.</b> O administrador precisa colar a chave em{' '}
          <code>#admin → Inteligência artificial</code>. Enquanto isso, você pode usar toda a biblioteca e o acervo
          do Drive normalmente.
        </div>
      )}

      <label className="ia-rotulo">O que você quer gerar?</label>
      <textarea
        className="ia-prompt"
        rows={3}
        placeholder="ex.: retrato cinematográfico de um homem de terno caminhando na chuva, luz azul de neon, lente 85mm"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <div className="ia-linha">
        <div>
          <label className="ia-rotulo">Estilo</label>
          <div className="ia-chips">
            {ESTILOS.map((e) => (
              <button
                key={e.nome}
                className={`chip${estilo === e.id ? ' active' : ''}`}
                onClick={() => setEstilo(e.id)}
              >
                {e.nome}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="ia-linha">
        <div>
          <label className="ia-rotulo">Formato</label>
          <div className="ia-chips">
            {TAMANHOS.map((t) => (
              <button
                key={t.id}
                className={`chip${tamanho === t.id ? ' active' : ''}`}
                onClick={() => setTamanho(t.id)}
              >
                {t.nome}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button className="btn primary" style={{ width: '100%', marginTop: 10 }} disabled={gerando} onClick={() => void gerar()}>
        {gerando ? 'Gerando…' : '✦ Gerar imagem'}
      </button>

      {previa && (
        <div className="ia-previa">
          <img src={previa} alt="Prévia gerada pela IA" />
          <div className="ia-previa-acoes">
            <a className="btn ghost sm" href={previa} target="_blank" rel="noreferrer" download>
              Baixar arquivo
            </a>
            <button className="btn primary sm" onClick={() => void usarNoEditor()}>
              Usar no editor
            </button>
          </div>
        </div>
      )}

      <div className="hint" style={{ marginTop: 10 }}>
        Vídeo por IA: o mesmo botão gera clipes quando o provedor configurado no admin suportar vídeo (Veo, Runway,
        Sora). O resultado entra como clipe na timeline, do mesmo jeito.
      </div>
    </div>
  );
}
