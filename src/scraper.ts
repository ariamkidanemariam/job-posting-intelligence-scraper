import { chromium } from "playwright";
import { writeFile } from "fs/promises";

const API_URL = "https://boards-api.greenhouse.io/v1/boards/canonical/jobs";

const DELAY_MS = 1500;

type GreenhouseJob = {
  id: number;
  title: string;
  company_name: string;
  location?: {
    name?: string;
  };
  absolute_url: string;
  first_published?: string;
};

type ScrapedJob = {
  source: string;
  job_id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  first_published: string | null;
  scraped_at: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const response = await fetch(API_URL);

  if (!response.ok) {
    throw new Error(`Greenhouse API request failed: ${response.status}`);
  }

  const data = await response.json();
  const jobs: GreenhouseJob[] = data.jobs;

  console.log(`Jobs discovered: ${jobs.length}`);

  const browser = await chromium.launch({
    headless: true,
  });

  const page = await browser.newPage();

  const scrapedJobs: ScrapedJob[] = [];

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];

    console.log(`[${i + 1}/${jobs.length}] Scraping: ${job.title}`);

    try {
      await page.goto(job.absolute_url, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      const title = (
        await page.locator("h1").first().innerText()
      ).trim();

      const location =
        (await page.locator(".job__header").innerText())
          .split("\n")
          .filter(Boolean)[1]
          ?.trim() ||
        job.location?.name ||
        "";

      const description = (
        await page.locator(".job__description.body").first().innerText()
      ).trim();

      scrapedJobs.push({
        source: "Canonical",
        job_id: String(job.id),
        title,
        company: job.company_name,
        location,
        description,
        url: job.absolute_url,
        first_published: job.first_published || null,
        scraped_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error(`Failed to scrape ${job.absolute_url}`, error);
    }

    await sleep(DELAY_MS);
  }

  await browser.close();

  console.log(
    `\nSuccessfully scraped: ${scrapedJobs.length}/${jobs.length}`
  );

  await writeFile(
    "data/raw/jobs.json",
    JSON.stringify(scrapedJobs, null, 2),
    "utf-8"
  );

  console.log("\nSaved scraped jobs to data/raw/jobs.json");
}

main();