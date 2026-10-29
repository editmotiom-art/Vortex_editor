/**
 * /api/minerar — versão Vercel da função netlify/functions/minerar.ts
 * A lógica é a mesma (server/ponte.ts adapta Request → IncomingMessage).
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { responder } from '../server/ponte.js';
import funcao from '../netlify/functions/minerar.js';

export const config = { maxDuration: 60 };

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  await responder(req, res, funcao as unknown as (r: Request) => Promise<Response>);
}
