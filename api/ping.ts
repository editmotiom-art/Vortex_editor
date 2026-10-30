/* /api/ping — teste de vida da API na Vercel (sem dependências) */
type Res = {
  status: (codigo: number) => Res;
  json: (obj: unknown) => void;
  setHeader: (nome: string, valor: string) => void;
};

export default function handler(_req: unknown, res: Res): void {
  res.setHeader('access-control-allow-origin', '*');
  res.status(200).json({
    ok: true,
    servico: 'vortex-api',
    host: 'vercel',
    versao: '2026-10-29',
    rotas: ['/api/drive', '/api/proxy', '/api/ferramentas', '/api/ia', '/api/minerar'],
  });
}
