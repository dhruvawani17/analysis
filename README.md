# AI Data Analyst Agent

An AI-powered data analysis platform. Upload datasets, ask questions in natural language, get automatic EDA, ML model recommendations, and downloadable reports.

## Quick Start

### Prerequisites
- Python 3.11+ (with uv)
- Node.js 20+
- Docker (optional, for PostgreSQL)

### Backend

```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Environment

Copy `.env.example` to `.env` and fill in your API keys for your chosen LLM provider.

## LLM Providers

Set `LLM_PROVIDER=openai|anthropic|gemini` in `.env` and provide the corresponding API key. The system uses LiteLLM under the hood, so many more providers are supported — see [LiteLLM docs](https://docs.litellm.ai/docs/providers).

## Architecture

```
Frontend (Next.js) ──HTTP/SSE──▶ FastAPI ──▶ LLM Provider (LiteLLM)
                                        ──▶ LangGraph Agent
                                        ──▶ PostgreSQL / SQLite
                                        ──▶ Parquet (data storage)
```

## Build Phases

1. ✅ Scaffold — monorepo, skeleton backend, skeleton frontend
2. ⬜ Ingestion — upload CSV/XLSX/JSON, dataset overview
3. ⬜ EDA + AI Summary — cleaning, profiling, LLM summary
4. ⬜ NL Q&A — natural language to pandas, chat interface
5. ⬜ Auto ML — problem detection, model training & comparison
6. ⬜ Report — downloadable PDF report
