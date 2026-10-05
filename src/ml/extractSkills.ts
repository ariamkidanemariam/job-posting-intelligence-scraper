import ollama from "ollama";
import { readFile } from "fs/promises";

type Job = {
  job_id: string;
  title: string;
  company: string;
  description: string;
};

async function main() {
  const rawData = await readFile("data/processed/jobs.json", "utf-8");
  const jobs: Job[] = JSON.parse(rawData);

  const job = jobs[0];

  console.log(`Testing Ollama on: ${job.title}`);

  const prompt = `
You are extracting structured information from a job posting.
Identify only the technical and professional skills that are explicitly
required, preferred, or clearly stated as responsibilities in the job posting.

Do not infer skills from general business language.

Do not include:
- broad concepts such as "finance" or "business"
- personality traits
- Use the terminology from the job posting when possible.
- generic management concepts unless the job explicitly requires them
- responsibilities that are not skills
- skills that belong to other roles or departments

Only extract skills that are explicitly mentioned in the job posting.
Do not infer skills from context.

{
  "skills": ["skill 1", "skill 2", "skill 3"]
}

Job title:
${job.title}

Job description:
${job.description}
`;

  const response = await ollama.chat({
    model: "llama3.2:3b",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    format: {
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

  console.log("\nOllama response:");
  console.log(response.message.content);
}

main();