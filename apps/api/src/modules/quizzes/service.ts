import { randomUUID } from "node:crypto";
import type {
  CreateQuizBody,
  Quiz,
  QuizPublic,
  QuizResult,
  QuizSubmitBody,
  User,
} from "@sdh/contracts";
import { HttpError } from "../../lib/http";
import { nowIso } from "../../lib/time";
import { completeForQuiz } from "../challenges/service";
import { getQuiz, listQuizzes, putQuiz } from "./repository";

export async function createQuiz(body: CreateQuizBody): Promise<Quiz> {
  const now = nowIso();
  const quiz: Quiz = {
    id: randomUUID(),
    title: body.title,
    questions: body.questions.map((q, index) => ({
      id: `q${index + 1}`,
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
    })),
    passMark: body.passMark,
    createdAt: now,
    updatedAt: now,
  };
  await putQuiz(quiz);
  return quiz;
}

export const allQuizzes = listQuizzes;

async function requireQuiz(id: string): Promise<Quiz> {
  const quiz = await getQuiz(id);
  if (!quiz) throw new HttpError("NOT_FOUND", "Quiz not found");
  return quiz;
}

// Mapped field by field: the right answers never leave the server.
export async function publicQuiz(id: string): Promise<QuizPublic> {
  const quiz = await requireQuiz(id);
  return {
    id: quiz.id,
    title: quiz.title,
    passMark: quiz.passMark,
    createdAt: quiz.createdAt,
    updatedAt: quiz.updatedAt,
    questions: quiz.questions.map((q) => ({
      id: q.id,
      question: q.question,
      options: [...q.options],
    })),
  };
}

export async function submit(user: User, id: string, body: QuizSubmitBody): Promise<QuizResult> {
  const quiz = await requireQuiz(id);
  const known = new Set(quiz.questions.map((q) => q.id));
  const chosen = new Map<string, number>();
  for (const answer of body.answers) {
    if (!known.has(answer.questionId) || chosen.has(answer.questionId)) {
      throw new HttpError("VALIDATION_FAILED", "answers: unknown or repeated question");
    }
    chosen.set(answer.questionId, answer.optionIndex);
  }
  const score = quiz.questions.filter((q) => chosen.get(q.id) === q.correctIndex).length;
  const passed = score >= quiz.passMark;
  if (passed) await completeForQuiz(user, quiz.id);
  return { score, total: quiz.questions.length, passed };
}
