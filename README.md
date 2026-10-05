# Job Posting Intelligence Scraper

A TypeScript-based job posting scraper that collects public job listings and uses a local LLM to extract structured skills from job descriptions.

## Overview

The project demonstrates an end-to-end pipeline:

**Scraping → Cleaning → LLM Extraction → Evaluation**

* Scraped **310 public job postings** from Canonical's Greenhouse job board.
* Used **Playwright** to collect full job descriptions.
* Cleaned and stored the data as JSON.
* Used **Llama 3.2 3B** through Ollama to extract technical and professional skills.
* Evaluated extraction on **30 manually annotated job postings** using precision, recall, and F1.

## Tech Stack

* TypeScript / Node.js
* Playwright
* Ollama + Llama 3.2 3B
* JSON
* Git / GitHub

## Data Source

**Canonical Greenhouse Job Board**

`https://job-boards.greenhouse.io/canonical`

The source was selected because it provides a large set of publicly accessible job postings with a consistent structure.

Before scraping, `robots.txt` was checked. The scraper uses a **1.5-second delay** between requests and only accesses publicly available pages.

## Project Structure

```text
src/
├── scraper.ts
├── cleaner.ts
└── ml/
    ├── extractSkills.ts
    └── evaluateExtraction.ts

data/
├── raw/
│   └── jobs.json
├── processed/
│   ├── jobs.json
│   └── evaluation_results.json
└── evaluation/
    ├── ground_truth.json
    └── evaluation_summary.json
```

## ML Task

The LLM extracts explicitly stated skills from job descriptions and returns structured JSON:

```json
{
  "skills": [
    "Python",
    "PostgreSQL",
    "Kubernetes"
  ]
}
```

The prompt prevents the model from inventing skills or including education, benefits, location requirements, and generic personality traits.

## Evaluation

A manually created ground-truth dataset of 30 jobs was used for evaluation.

| Metric         | Result |
| -------------- | -----: |
| Jobs evaluated |     30 |
| Precision      | 48.35% |
| Recall         | 28.71% |
| F1             | 36.03% |

The results provide a baseline for the local 3B model. The relatively low recall reflects the difficulty of extracting granular skills from long job descriptions using a small local model and exact skill matching.

## Setup

Install dependencies:

```bash
npm install
```

Install the local model:

```bash
ollama pull llama3.2:3b
```

Run the pipeline:

```bash
npx tsx src/scraper.ts
npx tsx src/cleaner.ts
npx tsx src/ml/extractSkills.ts
npx tsx src/ml/evaluateExtraction.ts
```

## Responsible Scraping

The project:

* Uses only public job postings.
* Checks `robots.txt`.
* Uses a 1.5-second request delay.
* Does not bypass authentication or access restrictions.
* Avoids collecting private information.

## Future Improvements

* Run extraction across the full 310-job dataset.
* Add semantic skill matching.
* Add deduplication.
* Compare multiple ML/LLM approaches.
* Add a second public job source.
