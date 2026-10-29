/** /api/ping — teste de vida da API na Vercel */
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(_req: VercelRequest, res: VercelResponse): void {
  res.setHeader('access-control-allow-origin', '*');
  res.status(200).json({
    ok: true,
    servico: 'vortex-api',
    host: 'vercel',
    versao: '2026-10-29',
    rotas: ['/api/drive', '/api/proxy', '/api/ferramentas', '/api/ia', '/api/minerar'],
  });
}
