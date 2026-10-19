import {
  CreateQuizBody,
  Id,
  QuizSubmitBody,
  type Quiz,
  type QuizPublic,
  type QuizResult,
  type QuizzesResponse,
} from "@sdh/contracts";
import { ok, type Route } from "../../lib/http";
import { requireUser } from "../../lib/identity";
import { parse } from "../../lib/validate";
import { allQuizzes, createQuiz, publicQuiz, submit } from "./service";

export const quizRoutes: Route[] = [
  {
    method: "GET",
    path: "/api/quizzes",
    handler: async (req) => {
      await requireUser(req, "coordinator");
      return ok({ quizzes: await allQuizzes() } satisfies QuizzesResponse);
    },
  },
  {
    method: "POST",
    path: "/api/quizzes",
    handler: async (req) => {
      await requireUser(req, "coordinator");
      const body = parse(CreateQuizBody, req.body);
      return ok((await createQuiz(body)) satisfies Quiz, 201);
    },
  },
  {
    method: "GET",
    path: "/api/quizzes/{id}",
    handler: async (req) => {
      await requireUser(req);
      const id = parse(Id, req.params.id);
      return ok((await publicQuiz(id)) satisfies QuizPublic);
    },
  },
  {
    method: "POST",
    path: "/api/quizzes/{id}/submit",
    handler: async (req) => {
      const user = await requireUser(req, "elder", "volunteer");
      const id = parse(Id, req.params.id);
      const body = parse(QuizSubmitBody, req.body);
      return ok((await submit(user, id, body)) satisfies QuizResult);
    },
  },
];
