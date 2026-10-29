# Análise dos "plugins" — o que encontrei no seu Drive

Você disse que mandou uns plugins, mas **nenhum plugin de edição veio anexado** no chat.
Fui procurar no seu Drive e analisei o que existe lá. O resultado:

---

## ❌ O que NÃO serve para o editor

Na sua pasta principal há **~40 arquivos ZIP de sistemas PHP prontos**:

| Arquivo | O que é | Serve? |
|---|---|---|
| `eWallet v3.0` | Script PHP de carteira digital | Não |
| `NFTBOX v1.4.6` | Marketplace de NFT | Não |
| `UltimateDesk`, `HESK`, `SofDesk` | Sistemas de helpdesk/ticket | Não |
| `Vizmo`, `linkdrop`, `DomainsKit` | Scripts PHP avulsos | Não |
| `66analytics`, `Meticulous` | Painel de analytics | Não |
| `Belloo`, `foodyman`, `foodking` | Delivery/apps | Não |
| `LicenseBox` | Gerenciador de licenças PHP | Não |
| `AI Engine`, `ChatGPT SaaS` | Scripts PHP de IA | Não |

**Por que não servem:** são aplicações PHP completas (com banco MySQL próprio), não plugins que se
encaixam num editor React. Adaptar qualquer um custaria mais que reescrever — e todos rodam em
PHP, enquanto o Vortex é front-end + funções serverless.

> ⚠️ Vários desses são versões "nulled" (piratas) de produtos do CodeCanyon. Não recomendo usar
> em produto comercial: risco jurídico e, quase sempre, backdoor embutido.

---

## ✅ O que REALMENTE vale: as 17 pastas do vault

Isso sim é ouro para o editor. Mapeei todas e já estão **dentro do sistema**, na aba
**Conteúdo → Meu Drive**:

| Pasta do Drive | Categoria | Como o editor usa |
|---|---|---|
| Typography | template | Tipografia animada com keyframes |
| Fonts | fonte | Seletor de fonte do inspetor |
| Emojis | imagem | Sobreposição na timeline |
| Green Screen Animations | vídeo | Chroma key automático |
| Still Textures | imagem | Blend de textura |
| Transitions & Overlays | overlay | Transições entre clipes |
| Luts | cor | Color grading |
| Callout Mogrt File | template | Chamadas/anotações animadas |
| Animated Letters | vídeo | Letras para abertura |
| Shadow emojis | imagem | Destaques |
| Icons | imagem | UI e ícones |
| Motion Backgrounds | vídeo | Fundos em loop |
| Social Animations | template | Posts e stories |
| Peter McKinnon Presets | cor | Presets de revelação |
| Vfx | vídeo | Efeitos com blend screen |
| 3d Hands | vídeo | Mãos para explicação |
| Sfx | áudio | Trilha de efeitos sonoros |

Mais os packs já catalogados: **2.000+ XMLs Alight Motion**, **SFX 10.000+**, **1.000+ motion
backgrounds**, **100+ overlays**, **fontes**, **10 GB de assets de thumbnail**, **30 GB Envato**,
**2.500 itens Designsburner**, **+1.500 vídeos virais**.

---

## 🎯 O plano para colocar tudo dentro do editor (5 etapas)

### 1. Metadados primeiro
Ler nome, tamanho e tipo de cada arquivo das 17 pastas e gravar **só isso** no banco.
Resultado: catálogo pesquisável em segundos, sem mover 1 byte de mídia.

### 2. Packs pequenos instaláveis
Tudo abaixo de 2 GB vira pack com download sob demanda (Drive → blob → biblioteca).
Resultado: SFX, overlays, LUTs e templates prontos para arrastar na timeline.

### 3. Áudio com transcrição
Extrair waveform e transcrever os packs de voz/aula; indexar por frase.
Resultado: busca por fala dentro do áudio + legendas automáticas.

### 4. XMLs do Alight Motion
Rodar o leitor de XML e converter cada projeto em cena editável do Vortex.
Resultado: os 2.000+ templates viram itens da biblioteca, aplicáveis com 1 clique.

### 5. Acervos grandes
Pastas acima de 20 GB ficam só indexadas, com link direto para o Drive.
Resultado: zero custo de armazenamento; o editor aponta para a origem.

---

## Sobre os plugins de edição (Premiere / AE / Photoshop)

Nas anotações antigas apareciam `Premier, After Plugins`, `Dehancer Pro`, `Halation Effect Preset`.
**Isso é o que vale de verdade** — mas são plugins de programas de desktop (.prproj, .aep, .cube),
não de navegador. O que dá para aproveitar:

- **LUTs (.cube)** → sim, o editor já tem camada de cor; basta ler o arquivo
- **Presets de halation** → viram receita de efeito (não o plugin em si)
- **Overlays e SFX** → sim, entram como mídia normal
- **Plugins compilados (.aex, .plugin)** → não, são binários de desktop

Se você tiver os arquivos desses packs, é só subir no Drive e eu indexo igual aos outros.

---

## Resumo executivo

| Item | Veredito |
|---|---|
| 40 ZIPs de sistemas PHP | ❌ descartar |
| 17 pastas do vault | ✅ já integradas no catálogo |
| 2.000+ XMLs | ✅ rota de importação definida |
| Plugins de desktop (Premiere/AE) | ⚠️ só LUTs e mídia aproveitáveis |
| Plugins de navegador | ⚠️ nenhum recebido |
