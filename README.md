<div align="center">

# ⬡ THIRD EYE

### Open-Source Global Intelligence & Reconnaissance Platform

<img width="1254" height="1254" alt="third-eye" src="https://github.com/user-attachments/assets/23e9b6f5-d358-4a0e-9caf-2ade85059c9b" />

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![MapLibre](https://img.shields.io/badge/MapLibre_GL-GPU_Rendered-396CB2?style=for-the-badge)](https://maplibre.org)
[![License](https://img.shields.io/badge/License-MIT-D4AF37?style=for-the-badge)](LICENSE)
[![Stars](https://img.shields.io/github/stars/eli-labz/Third-Eye?style=for-the-badge&color=FFD700)](https://github.com/eli-labz/Third-Eye/stargazers)
[![Forks](https://img.shields.io/github/forks/eli-labz/Third-Eye?style=for-the-badge&color=4CAF50)](https://github.com/eli-labz/Third-Eye/network/members)
[![Issues](https://img.shields.io/github/issues/eli-labz/Third-Eye?style=for-the-badge)](https://github.com/eli-labz/Third-Eye/issues)

**A real-time global intelligence dashboard that aggregates live flight tracking, CCTV networks, earthquake monitoring, conflict zone mapping, and 24/7 news feeds into a single GPU-accelerated interface.**

[🌐 Live Demo](https://geospatialcommand.center) · [🐛 Report Bug](https://github.com/eli-labz/Third-Eye/issues) · [✨ Request Feature](https://github.com/eli-labz/Third-Eye/issues) · [⭐ Star This Repo](https://github.com/eli-labz/Third-Eye/stargazers)

> **If Third Eye is useful to you, please consider giving it a ⭐ — it helps the project grow and reach more people!**

</div>

---

## 🔍 Overview

Third Eye is a **production-grade OSINT platform** that provides real-time situational awareness across 13+ intelligence domains — all in one GPU-accelerated interface. Built with Next.js 16 and MapLibre GL, every data point is rendered via WebGL for **60fps performance** even with thousands of concurrent entities on-screen.

No API keys required to get started. Clone, run, and you're live in under 2 minutes.

---

## ✨ Why Third Eye?

- 🌍 **16 live data layers** — aviation, maritime, CCTV, seismic, fires, news, weather, space, cyber, conflict, crypto, sanctions, and more
- ⚡ **WebGL-powered** — GPU-accelerated map rendering, not DOM-based. Handles thousands of entities at 60fps.
- 🔑 **Zero-key startup** — all core layers work out of the box with public, keyless APIs
- 🐳 **Docker-ready** — single-command self-hosting with prebuilt GHCR image
- 🧰 **Built-in RECON toolkit** — port scanner, DNS lookup, WHOIS, SSL inspector, IP intelligence, CVE scanner, crypto wallet tracer, and OFAC sanctions search
- 📡 **Telegram OSINT** — geoparsed public channel posts plotted on the map in real time
- 💰 **Crypto intelligence** — BTC + ETH wallet tracing with live OFAC SDN sanctions cross-check
- 🏠 **Self-hostable** — CasaOS one-click install supported

---

## 🗺️ Intelligence Domains

| Domain | Data Points | Sources |
|--------|------------|---------|
| ✈️ **Aviation** | Commercial, Private, Military, Jets | OpenSky Network |
| 🚢 **Maritime** | 39 Global Ports, 10 Chokepoints | Static Naval Intel |
| 📷 **CCTV** | 2,000+ Cameras | TfL, WSDOT, Caltrans, NYC DOT, VicRoads + more |
| 🌋 **Seismic** | Real-time M2.5+ | USGS Earthquake API |
| 🔥 **Fires** | Active Hotspots | NASA FIRMS |
| 📺 **News** | 24/7 Live Streams | 25+ Global Broadcasters |
| 🌪️ **Weather** | Severe Events | NASA EONET |
| 🛰️ **Space** | Solar Weather, Satellites | NOAA SWPC, N2YO |
| 🛡️ **Cyber** | CVE Threats, Vulnerability Scanning | NVD, Custom Scanner |
| ⚔️ **Conflict** | 13 Active Zones | Static OSINT Intel |
| 💰 **Crypto** | BTC + ETH Wallet Tracing, OFAC SDN Match | blockstream.info, Blockscout, OpenSanctions |
| 🚫 **Sanctions** | Person / Org / Vessel SDN Search | OpenSanctions (US OFAC SDN mirror) |
| 📱 **Telegram OSINT** | Geoparsed Posts from Public Channels | t.me/s/ web preview |

---

## 🏗️ Architecture

<img width="1800" height="1280" alt="third-eye-workflow" src="https://github.com/user-attachments/assets/062fe299-f2f5-40b3-92f1-16fa294c9482" />

---

## 🚀 Quick Start

### Option 1 — npm (2 minutes)

```bash
git clone https://github.com/eli-labz/Third-Eye.git
cd Third-Eye
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — done. No API keys needed.

### Option 2 — Docker

```bash
git clone https://github.com/eli-labz/Third-Eye.git
cd Third-Eye
cp .env.template .env   # optional — configure keys / port
docker compose up -d
```

### Option 3 — Prebuilt Image (fastest)

```bash
docker pull ghcr.io/aiacos/third-eye:latest
docker run -d -p 3000:3000 --env-file .env ghcr.io/aiacos/third-eye:latest
```

> 💡 **Custom port:** Set `THIRDEYE_PORT` in `.env` to change the published host port without editing the compose file.

---

## ⚙️ Configuration

Third Eye works **without any API keys** — all core layers use public, keyless sources. Copy `.env.template` to `.env` and configure only what you need:

```env
# Published host port (container always listens on 3000). Default: 3000
THIRDEYE_PORT=3000

# RECON scanner backend — generate key with: openssl rand -hex 32
SCANNER_URL=
SCANNER_KEY=

# Optional — for higher rate limits
FIRMS_API_KEY=         # NASA FIRMS
OPENSKY_CLIENT_ID=     # OpenSky OAuth2
OPENSKY_CLIENT_SECRET=
N2YO_API_KEY=          # N2YO satellites
AIS_API_KEY=           # aisstream.io maritime
```

> Without `SCANNER_URL`/`SCANNER_KEY` the RECON toolkit returns `503`; every other layer works out of the box.

---

## 🛠️ Features In Depth

### Intelligence Layers
- **16 toggleable data layers** with real-time entity counts
- **GPU-accelerated rendering** — all map data rendered via WebGL, not DOM
- **Progressive loading** — data fetched on-demand when layers are activated
- **Viewport-aware** — only loads relevant data for the visible region

### RECON Toolkit
- **Port Scanner** — TCP connect scan with service fingerprinting
- **DNS Lookup** — Full record resolution (A, AAAA, MX, NS, TXT, CNAME)
- **WHOIS** — Domain/IP registration data (auto-cross-checked against OFAC SDN)
- **SSL/TLS Inspector** — Certificate chain analysis
- **IP Intelligence** — Geolocation, ASN, threat reputation (auto-cross-checked against OFAC SDN)
- **Vulnerability Scanner** — CVE lookup against NVD database
- **Crypto Wallet Trace** — BTC + ETH lookup (balance, tx history, OFAC SDN sanctions flag)
- **OFAC Sanctions Search** — Full-text search across persons, organizations, vessels, and aircraft

### Live Broadcast Network
- **25+ live 24/7 news streams** from global broadcasters
- Click any news dot on the map to open the live stream
- Feeds from NBC, CBS, ABC, Sky News, Al Jazeera, France 24, NHK, WION, and more

### Telegram OSINT Layer
- **Public-channel feed** scraped from the unauthenticated web preview — no Bot API token, no MTProto
- Overridable channel list via `THIRDEYE_TELEGRAM_CHANNELS`
- Posts geoparsed against a multilingual place dictionary (EN + Cyrillic + Arabic) and plotted on the map

### Crypto Wallet Intelligence
- **BTC** via blockstream.info (Esplora API, keyless)
- **ETH** via Blockscout's public ETH instance (keyless)
- Every lookup auto-cross-checked against the OFAC SDN sanctioned-address list
- Sanctioned wallets surface a red **SANCTIONED — OFAC SDN** badge

### Conflict Zone Monitoring
- **13 active conflict/tension zones** with severity-coded markers
- Active Wars: Ukraine, Gaza, Sudan, Myanmar, DRC, Yemen
- High Tension: Syria, Lebanon, Sahel, Somalia, Red Sea
- Elevated: Taiwan Strait, Korean DMZ

### Performance
- **75% reduction in edge requests** vs initial release
- Aggressive polling relaxation (15-30 min intervals for stable data)
- Static data served from memory — zero external API calls for news feeds

---

## 🖥️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Map Engine | MapLibre GL JS (WebGL) |
| Animations | Framer Motion |
| Icons | Lucide React |
| Styling | Custom CSS Design System |
| Deployment | Vercel Edge Network |

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `F` | Toggle flight layers |
| `E` | Toggle earthquakes |
| `S` | Toggle satellites |
| `D` | Toggle day/night cycle |
| `Escape` | Close panels |

---

## 🤝 Contributing

Contributions are what make the open-source community amazing. Any contributions you make are **greatly appreciated**.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 🗺️ Roadmap

- [ ] WebSocket-based live flight position updates
- [ ] User-configurable Telegram channel watchlist (UI)
- [ ] Dark/light map theme toggle
- [ ] Export layer data as GeoJSON / CSV
- [ ] Historical playback mode
- [ ] Mobile-responsive layout

Have an idea? [Open a feature request!](https://github.com/eli-labz/Third-Eye/issues)

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

---

<div align="center">

**Built with ❤️ by [eli-labz](https://github.com/eli-labz)**

⭐ **If you find Third Eye useful, please star the repo — it helps others discover it!** ⭐

[![Star History Chart](https://api.star-history.com/svg?repos=eli-labz/Third-Eye&type=Date)](https://star-history.com/#eli-labz/Third-Eye&Date)

</div>
