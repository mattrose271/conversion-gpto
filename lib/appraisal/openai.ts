import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import type { z } from "zod";
import { sanitizeClaimsDeep } from "@/lib/appraisal/safety";

let openaiClient: OpenAI | null = null;

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required to generate a full appraisal.");
  }
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiClient;
}

export function getAppraisalModel() {
  return process.env.OPENAI_APPRAISAL_MODEL || process.env.OPENAI_MODEL || "gpt-5-mini";
}

export async function generateStructuredAppraisalOutput<TSchema extends z.ZodTypeAny>(input: {
  schema: TSchema;
  schemaName: string;
  instructions: string;
  content: string;
}): Promise<z.infer<TSchema>> {
  const response = await getOpenAIClient().responses.parse({
    model: getAppraisalModel(),
    instructions: input.instructions,
    input: input.content,
    text: {
      format: zodTextFormat(input.schema, input.schemaName),
    },
  });

  if (!response.output_parsed) {
    throw new Error("The appraisal model returned no structured output.");
  }

  return input.schema.parse(sanitizeClaimsDeep(response.output_parsed));
}
