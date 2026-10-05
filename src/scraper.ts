import { chromium } from "playwright";

async function main() {
  const response = await fetch(
    "https://boards-api.greenhouse.io/v1/boards/canonical/jobs",
  );

  if (!response.ok) {
    throw new Error(`Greenhouse API request failed: ${response.status}`);
  }

  const data = await response.json();

  console.log("Total jobs reported by API:", data.meta.total);
  console.log("Jobs returned:", data.jobs.length);

  console.log("First job:", data.jobs[0]);

  const browser = await chromium.launch({
    headless: true,
  });

  const page = await browser.newPage();

  await page.goto("https://job-boards.greenhouse.io/canonical", {
    waitUntil: "domcontentloaded",
  });

  console.log("Page title:", await page.title());

  await browser.close();
}

main();
