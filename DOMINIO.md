# Vortex — endereços e estado do sistema

## Endereço oficial (usar este)

**https://vortex-editor-beta.vercel.app**

- Site (200) e API (`/api/ping` 200, serviço `vortex-api`) no mesmo domínio.
- Bundle publicado e conferido: `index-DipBY5Ft.js` (rodada do plano por horas).
- Vídeo de apresentação embutido: `/demo-vortex.mp4` (55,9 s · 1920×1080 · 4,2 MB).

Alternativas:
- `https://vortex-editor-gwyd.vercel.app` (mesmo projeto, endereço antigo)
- espelho estático `https://editmotiom-art.github.io/Vortex_editor/pages/` (sem API própria; usa a API do beta)

## Banco (Supabase) — contas, planos e pagamentos

Projeto: `pufuealhmnyllrqholye` (região sa-east-1).

| Tabela | Guarda |
| --- | --- |
| `vortex_usuarios` | conta, hash bcrypt da senha, papel (cliente/admin) |
| `vortex_sessoes` | tokens de sessão (30 dias) |
| `vortex_planos` | horas compradas: início, fim, tipo, origem (cadastro, admin, pagamento) |
| `vortex_pagamentos` | pedidos: status, valor, referência, comprovante |
| `vortex_downloads` | histórico de tudo que cada cliente baixou |
| `vortex_config` | horas de teste, horas e preços de cada plano, chave PIX |

RLS ligado e **sem nenhuma policy**: o navegador não lê tabela nenhuma. Só pode chamar
as funções `vortex_*`, que conferem o token e o papel de admin no próprio banco.

## Regras do plano (implementadas)

- Não existe plano grátis. Conta nova ganha **horas de teste** definidas em `#admin → Horas de plano` (padrão 1h).
- Plano é soma de horas: Pro = 24h, Studio = 168h (configurável). Horas novas somam ao que resta.
- Barra de progresso com o tempo restante no topo do editor, no painel do cliente e no aviso de bloqueio.
- Pagamento **não libera nada sozinho**: o cliente gera um pedido (referência VX…), manda o comprovante,
  e o admin confirma em `#admin → Pagamentos`. Aí as horas entram.
- Sem horas: o editor abre, exportar/baixar/IA mostram o aviso com a barra zerada.

## Comandos

```
npm run build                 # tipos + pacote
npm run vercel:dev            # http://localhost:3001 (site + api/*)
node testarTudo.mjs <URL>     # 24 provas
node testeHumano.mjs <URL>    # 35 verificações
node provarPlano.mjs <URL>    # 12 provas de segurança/plano contra o banco
node provarUi.mjs <URL>       # 10 provas de interface (barra, admin, download)
node gravar-showcase.mjs <URL>   # grava a tela do vídeo de apresentação
node montar-showcase.mjs         # monta public/demo-vortex.{mp4,webm}
```
