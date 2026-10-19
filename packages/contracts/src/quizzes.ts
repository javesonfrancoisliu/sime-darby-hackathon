import { z } from "zod";
import { Id, IsoDateTime } from "./common";

export const QUIZ_OPTION_COUNT = 4;

const QuestionText = z.string().trim().min(1).max(300);
const Option = z.string().trim().min(1).max(200);

export const QuizQuestion = z.object({
  id: z.string().trim().min(1).max(40),
  question: QuestionText,
  options: z.array(Option).length(QUIZ_OPTION_COUNT),
  correctIndex: z
    .number()
    .int()
    .min(0)
    .max(QUIZ_OPTION_COUNT - 1),
});
export type QuizQuestion = z.infer<typeof QuizQuestion>;

// Stored shape; never returned to a client as is.
export const Quiz = z.object({
  id: Id,
  title: z.string().trim().min(1).max(120),
  questions: z.array(QuizQuestion).min(1).max(20),
  // Correct answers needed to pass.
  passMark: z.number().int().min(1),
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type Quiz = z.infer<typeof Quiz>;

export const QuizPublicQuestion = QuizQuestion.omit({ correctIndex: true });
export type QuizPublicQuestion = z.infer<typeof QuizPublicQuestion>;

export const QuizPublic = Quiz.omit({ questions: true }).extend({
  questions: z.array(QuizPublicQuestion),
});
export type QuizPublic = z.infer<typeof QuizPublic>;

export const CreateQuizBody = z
  .object({
    title: Quiz.shape.title,
    questions: z
      .array(QuizQuestion.omit({ id: true }))
      .min(1)
      .max(20),
    passMark: Quiz.shape.passMark,
  })
  .strict()
  .refine((body) => body.passMark <= body.questions.length, {
    message: "passMark cannot exceed the number of questions",
  });
export type CreateQuizBody = z.infer<typeof CreateQuizBody>;

export const QuizSubmitBody = z
  .object({
    answers: z
      .array(
        z.object({
          questionId: QuizQuestion.shape.id,
          optionIndex: z
            .number()
            .int()
            .min(0)
            .max(QUIZ_OPTION_COUNT - 1),
        }),
      )
      .max(20),
  })
  .strict();
export type QuizSubmitBody = z.infer<typeof QuizSubmitBody>;

// Score and verdict only; right answers are never revealed.
export const QuizResult = z.object({
  score: z.number().int().nonnegative(),
  total: z.number().int().positive(),
  passed: z.boolean(),
});
export type QuizResult = z.infer<typeof QuizResult>;

export const QuizzesResponse = z.object({ quizzes: z.array(Quiz) });
export type QuizzesResponse = z.infer<typeof QuizzesResponse>;
