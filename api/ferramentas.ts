/**
 * /api/ferramentas — versão Vercel da função netlify/functions/ferramentas.ts
 * A lógica é a mesma (server/ponte.ts adapta Request → IncomingMessage).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { responder } from '../server/ponte';
import funcao from '../netlify/functions/ferramentas';

export const config = { maxDuration: 60 };

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await responder(req, res, funcao as unknown as (r: Request) => Promise<Response>);
}
