import { z } from "zod";

import { evidenceSchema } from "../types.js";

export const repoMapSchema = z
  .object({
    purpose: z.string().min(1),
    modules: z.array(
      z.object({
        name: z.string().min(1),
        path: z.string().min(1),
        purpose: z.string().min(1),
        evidence: z.array(evidenceSchema).default([]),
      }).strict(),
    ),
    entryPoints: z.array(z.string()),
    dataStores: z.array(z.string()),
    externalServices: z.array(z.string()),
  })
  .strict();

export const intentSchema = z
  .object({
    purpose: z.string().min(1),
    keyFlows: z.array(z.string().min(1)),
  })
  .strict();

export const riskReviewSchema = z
  .object({
    risks: z.array(
      z.object({
        title: z.string().min(1),
        severity: z.enum(["critical", "high", "medium", "low"]),
        message: z.string().min(1),
        evidence: z.array(evidenceSchema).min(1),
        recommendation: z.string().min(1),
      }).strict(),
    ),
  })
  .strict();

export const authorQuestionsSchema = z
  .object({
    questions: z.array(
      z.object({
        question: z.string().min(1),
        why: z.string().min(1),
        evidence: z.array(evidenceSchema).min(1),
      }).strict(),
    ),
  })
  .strict();

export type RepoMap = z.infer<typeof repoMapSchema>;
export type Intent = z.infer<typeof intentSchema>;
export type RiskReview = z.infer<typeof riskReviewSchema>;
export type AuthorQuestions = z.infer<typeof authorQuestionsSchema>;
