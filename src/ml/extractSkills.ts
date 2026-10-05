import ollama from "ollama";
import { readFile, writeFile } from "fs/promises";

type Job = {
  job_id: string;
  title: string;
  company: string;
  description: string;
};

type EvaluationResult = {
  job_id: string;
  title: string;
  predicted_skills: string[];
};

async function main() {
  const rawData = await readFile(
    "data/processed/jobs.json",
    "utf-8"
  );

  const jobs: Job[] = JSON.parse(rawData);

  const targetIds = [
    "5569916",
    "7971310",
    "5243483",
    "8002334",
    "3433732",
    "6448444",
    "7267406",
    "6713184",
    "5798264",
    "4124053",
    "7982278",
    "6861186",
    "8001736",
    "4934551",
    "4676649",
    "6132532",
    "7410479",
    "6283017",
    "5915936",
    "2456563",
    "8023546",
    "3275433",
    "5172247",
    "6943565",
    "8046372",
    "7980589",
    "4439935",
    "7548330",
    "7569126",
    "6366166",
  ];

  const targetJobs = jobs.filter((job) =>
    targetIds.includes(job.job_id)
  );

  console.log(`Jobs selected for evaluation: ${targetJobs.length}`);

  const results: EvaluationResult[] = [];

  for (const job of targetJobs) {
    console.log(`\nExtracting skills: ${job.title}`);

    const prompt = `
You are extracting structured information from a job posting.

Identify only technical skills, tools, technologies, methodologies,
and explicit professional/domain competencies that are explicitly
required, preferred, or clearly stated as skills in the job posting.

Rules:
- Only include skills explicitly mentioned in the job posting.
- Do not infer skills from context.
- Do not invent skills.
- Do not include education or degrees.
- Do not include years of experience.
- Do not include travel or location requirements.
- Do not include benefits.
- Do not include personality traits.
- Do not include generic soft traits such as "passion", "curiosity",
  "flexibility", or "self-motivation".
- Do not include broad concepts unless they are explicitly presented
  as a professional or technical competency.
- Do not include responsibilities that do not represent a transferable skill.
- Use terminology from the job posting when possible.
- Return only valid JSON.

Return exactly this structure:

{
  "skills": ["skill 1", "skill 2", "skill 3"]
}

Job title:
${job.title}

Job description:
${job.description}
`;

    try {
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

      const parsed = JSON.parse(
        response.message.content
      );

      const skills = Array.isArray(parsed.skills)
        ? parsed.skills
            .filter(
              (skill: unknown): skill is string =>
                typeof skill === "string"
            )
            .map((skill: string) => skill.trim())
            .filter(Boolean)
        : [];

      const uniqueSkills = [...new Set(skills)];

      results.push({
        job_id: job.job_id,
        title: job.title,
        predicted_skills: uniqueSkills,
      });

      console.log(`Skills extracted: ${uniqueSkills.length}`);
    } catch (error) {
      console.error(
        `Failed to extract skills for ${job.title}`,
        error
      );

      results.push({
        job_id: job.job_id,
        title: job.title,
        predicted_skills: [],
      });
    }
  }

  await writeFile(
    "data/processed/evaluation_results.json",
    JSON.stringify(results, null, 2),
    "utf-8"
  );

  console.log(
    `\nSaved ${results.length} predictions to data/processed/evaluation_results.json`
  );
}

main();