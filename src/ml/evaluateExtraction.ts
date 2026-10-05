import { readFile, writeFile } from "fs/promises";

type EvaluationResult = {
  job_id: string;
  predicted_skills: string[];
};

type GroundTruth = {
  job_id: string;
  skills: string[];
};

type JobEvaluation = {
  job_id: string;
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  precision: number;
  recall: number;
  f1: number;
  matched_skills: string[];
  false_positive_skills: string[];
  false_negative_skills: string[];
};

type EvaluationSummary = {
  evaluated_jobs: number;
  true_positives: number;
  false_positives: number;
  false_negatives: number;
  precision: number;
  recall: number;
  f1: number;
  per_job: JobEvaluation[];
};

/**
 * Normalize skill names so obvious terminology variations
 * are evaluated as the same skill.
 *
 * We intentionally keep this conservative.
 * We do NOT merge broader concepts such as:
 * Linux -> Linux administration
 * Cloud -> Cloud architecture
 * Python -> Software engineering
 */
function normalizeSkill(skill: string): string {
  const normalized = skill
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");

  const aliases: Record<string, string> = {
    // Programming-language variations
    golang: "go",
    "go programming": "go",
    "c programming": "c",
    "c++ programming": "c++",
    "python programming": "python",

    // Cloud terminology
    gcp: "google cloud",

    // Open-source terminology
    "open-source software": "open source software",

    // Accounting terminology
    "enterprise-level accounting systems":
      "enterprise accounting systems",
  };

  return aliases[normalized] ?? normalized;
}

function calculateMetrics(
  predicted: string[],
  actual: string[]
) {
  const predictedSet = new Set(
    predicted
      .map(normalizeSkill)
      .filter(Boolean)
  );

  const actualSet = new Set(
    actual
      .map(normalizeSkill)
      .filter(Boolean)
  );

  const matchedSkills = [...predictedSet].filter(
    (skill) => actualSet.has(skill)
  );

  const falsePositiveSkills = [...predictedSet].filter(
    (skill) => !actualSet.has(skill)
  );

  const falseNegativeSkills = [...actualSet].filter(
    (skill) => !predictedSet.has(skill)
  );

  const truePositives = matchedSkills.length;
  const falsePositives = falsePositiveSkills.length;
  const falseNegatives = falseNegativeSkills.length;

  const precision =
    truePositives + falsePositives === 0
      ? 0
      : truePositives /
        (truePositives + falsePositives);

  const recall =
    truePositives + falseNegatives === 0
      ? 0
      : truePositives /
        (truePositives + falseNegatives);

  const f1 =
    precision + recall === 0
      ? 0
      : (2 * precision * recall) /
        (precision + recall);

  return {
    truePositives,
    falsePositives,
    falseNegatives,
    precision,
    recall,
    f1,
    matchedSkills,
    falsePositiveSkills,
    falseNegativeSkills,
  };
}

async function main() {
  const predictionsData = await readFile(
    "data/processed/evaluation_results.json",
    "utf-8"
  );

  const groundTruthData = await readFile(
    "data/evaluation/ground_truth.json",
    "utf-8"
  );

  const predictions: EvaluationResult[] =
    JSON.parse(predictionsData);

  const groundTruth: GroundTruth[] =
    JSON.parse(groundTruthData);

  console.log(`Predictions loaded: ${predictions.length}`);
  console.log(`Ground truth loaded: ${groundTruth.length}`);

  const groundTruthMap = new Map(
    groundTruth.map((item) => [item.job_id, item])
  );

  let totalTruePositives = 0;
  let totalFalsePositives = 0;
  let totalFalseNegatives = 0;

  const jobEvaluations: JobEvaluation[] = [];

  for (const prediction of predictions) {
    const truth = groundTruthMap.get(prediction.job_id);

    if (!truth) {
      console.warn(
        `No ground truth found for job ${prediction.job_id}`
      );
      continue;
    }

    const metrics = calculateMetrics(
      prediction.predicted_skills,
      truth.skills
    );

    totalTruePositives += metrics.truePositives;
    totalFalsePositives += metrics.falsePositives;
    totalFalseNegatives += metrics.falseNegatives;

    jobEvaluations.push({
      job_id: prediction.job_id,
      truePositives: metrics.truePositives,
      falsePositives: metrics.falsePositives,
      falseNegatives: metrics.falseNegatives,
      precision: metrics.precision,
      recall: metrics.recall,
      f1: metrics.f1,
      matched_skills: metrics.matchedSkills,
      false_positive_skills:
        metrics.falsePositiveSkills,
      false_negative_skills:
        metrics.falseNegativeSkills,
    });
  }

  const precision =
    totalTruePositives + totalFalsePositives === 0
      ? 0
      : totalTruePositives /
        (totalTruePositives + totalFalsePositives);

  const recall =
    totalTruePositives + totalFalseNegatives === 0
      ? 0
      : totalTruePositives /
        (totalTruePositives + totalFalseNegatives);

  const f1 =
    precision + recall === 0
      ? 0
      : (2 * precision * recall) /
        (precision + recall);

  const evaluationSummary: EvaluationSummary = {
    evaluated_jobs: jobEvaluations.length,
    true_positives: totalTruePositives,
    false_positives: totalFalsePositives,
    false_negatives: totalFalseNegatives,
    precision,
    recall,
    f1,
    per_job: jobEvaluations,
  };

  await writeFile(
    "data/evaluation/evaluation_summary.json",
    JSON.stringify(evaluationSummary, null, 2),
    "utf-8"
  );

  console.log("\nEvaluation results:");
  console.log(`True Positives: ${totalTruePositives}`);
  console.log(`False Positives: ${totalFalsePositives}`);
  console.log(`False Negatives: ${totalFalseNegatives}`);
  console.log(
    `Precision: ${(precision * 100).toFixed(2)}%`
  );
  console.log(
    `Recall: ${(recall * 100).toFixed(2)}%`
  );
  console.log(
    `F1 Score: ${(f1 * 100).toFixed(2)}%`
  );

  console.log(
    "\nSaved evaluation to data/evaluation/evaluation_summary.json"
  );

  console.log(
    "\nDetailed per-job results are available in:"
  );
  console.log(
    "data/evaluation/evaluation_summary.json"
  );
}

main();