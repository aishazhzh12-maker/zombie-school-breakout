import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { getServerConfig } from "../config.server";

export type AiQuestion = {
  question: string;
  options: [string, string, string, string];
  answer: number;
};

const aiQuestionSchema = z.object({
  question: z.string().min(8).max(180),
  options: z.array(z.string().min(1).max(80)).length(4),
  answer: z.number().int().min(0).max(3),
});

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text;
}

function cleanQuestion(value: unknown): AiQuestion | null {
  const parsed = aiQuestionSchema.safeParse(value);
  if (!parsed.success) return null;
  const unique = new Set(parsed.data.options.map((o) => o.trim().toLowerCase()));
  if (unique.size !== 4) return null;
  return {
    question: parsed.data.question.trim(),
    options: parsed.data.options.map((o) => o.trim()) as [string, string, string, string],
    answer: parsed.data.answer,
  };
}

export const generateAiQuestion = createServerFn({ method: "POST" })
  .validator(z.object({
    kind: z.enum(["quiz", "riddle"]),
    levelName: z.string().max(80),
    dollName: z.string().max(80).optional(),
  }))
  .handler(async ({ data }) => {
    const config = getServerConfig();
    if (!config.geminiApiKey) return { question: null as AiQuestion | null };

    const style = data.kind === "riddle"
      ? "простую страшную загадку для финальной куклы"
      : "вопрос средней сложности про выживание в хоррор-школе";
    const prompt = [
      `Создай ${style} для пиксельного хоррор-квеста в школе.`,
      `Этаж: ${data.levelName}.`,
      data.dollName ? `Кукла: ${data.dollName}.` : "",
      "Пиши только на русском языке. Не спрашивай школьную программу: никакой математики, химии, литературы, географии, дат или учебных фактов.",
      "Вопрос должен быть про шум, свет, укрытие, двери, куклу, осторожность или сюжет. Сложность средняя, понятная подростку.",
      "Return only valid JSON with this exact shape:",
      '{"question":"...","options":["...","...","...","..."],"answer":0}',
      "answer must be the zero-based index of the correct option.",
    ].filter(Boolean).join("\n");

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent?key=${config.geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: data.kind === "riddle" ? 0.85 : 0.65,
            maxOutputTokens: 220,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!response.ok) return { question: null as AiQuestion | null };
    const json = await response.json();
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (typeof text !== "string") return { question: null as AiQuestion | null };

    try {
      return { question: cleanQuestion(JSON.parse(extractJson(text))) };
    } catch {
      return { question: null as AiQuestion | null };
    }
  });
