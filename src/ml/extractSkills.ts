import { GoogleGenAI } from "@google/genai";
import { config } from "dotenv";
import { readFile, writeFile } from "fs/promises";

config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error("GEMINI_API_KEY is not set");
}

const ai = new GoogleGenAI({ apiKey });

type Job = {
  job_id: string;
  title: string;
  company: string;
  location: string;
  description: string;
  url: string;
  first_published: string | null;
  scraped_at: string;
};

type JobWithSkills = Job & {
  skills: string[];
};

const DELAY_MS = 1500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function extractSkills(job: Job): Promise<string[]> {
  const prompt = `
You are extracting structured information from a job posting.

Identify the technical and professional skills explicitly required
or strongly indicated by the job posting.

Rules:
- Only include skills supported by the job description.
- Do not invent skills.
- Keep each skill concise.
- Return only the requested structured object.

Job title:
${job.title}

Job description:
${job.description}
`;

  const response = await ai.interactions.create({
    model: "gemini-3.7-flash",
    input: prompt,
    response_format: {
      type: "object",
      properties: {
        skills: {
          type: "array",
          items: {
            type: "string",
          },
        },
      },
      required: ["skills"],
    },
  });

  const result = JSON.parse(response.output_text);

  return result.skills;
}

async function main() {
  const rawData = await readFile("data/processed/jobs.json", "utf-8");
  const jobs: Job[] = JSON.parse(rawData);

  console.log(`Jobs to process: ${jobs.length}`);

  const jobsWithSkills: JobWithSkills[] = [];

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];

    console.log(`[${i + 1}/${jobs.length}] ${job.title}`);

    try {
      const skills = await extractSkills(job);

      jobsWithSkills.push({
        ...job,
        skills,
      });

      console.log(`  Extracted ${skills.length} skills`);
    } catch (error) {
      console.error(`  Failed: ${job.job_id}`, error);
    }

    await sleep(DELAY_MS);
  }

  await writeFile(
    "data/processed/jobs_with_skills.json",
    JSON.stringify(jobsWithSkills, null, 2),
    "utf-8"
  );

  console.log(
    `\nSaved ${jobsWithSkills.length} jobs to data/processed/jobs_with_skills.json`
  );
}

main();