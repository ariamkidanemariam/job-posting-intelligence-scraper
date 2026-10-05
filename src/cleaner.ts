import { readFile, writeFile } from "fs/promises";

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

function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter((line, index, lines) => {
      return line !== "" || lines[index - 1] !== "";
    })
    .join("\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

async function main() {
  const rawData = await readFile("data/raw/jobs.json", "utf-8");
  const jobs: ScrapedJob[] = JSON.parse(rawData);

  console.log(`Jobs loaded: ${jobs.length}`);

  const cleanedJobs: ScrapedJob[] = jobs.map((job) => ({
    ...job,
    title: job.title.trim(),
    company: job.company.trim(),
    location: job.location.trim(),
    description: cleanText(job.description),
  }));

  await writeFile(
    "data/processed/jobs.json",
    JSON.stringify(cleanedJobs, null, 2),
    "utf-8"
  );

  console.log("Cleaned jobs saved: data/processed/jobs.json");
}

main();