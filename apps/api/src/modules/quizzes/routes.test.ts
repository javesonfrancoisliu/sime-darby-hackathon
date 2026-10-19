import type { ChallengesResponse, Quiz, QuizPublic, QuizResult, User } from "@sdh/contracts";
import { beforeAll, describe, expect, it } from "vitest";
import { call } from "../../test/api";
import { createCoordinator, createElder } from "../../test/people";
import { useTestTable } from "../../test/table";
import { createChallengeVia } from "../play/testSupport";
import { getUser } from "../users/repository";

useTestTable();

const quizBody = {
  title: "Stay safe online",
  questions: [
    { question: "Q1?", options: ["a", "b", "c", "d"], correctIndex: 1 },
    { question: "Q2?", options: ["a", "b", "c", "d"], correctIndex: 2 },
    { question: "Q3?", options: ["a", "b", "c", "d"], correctIndex: 0 },
  ],
  passMark: 2,
};

describe("quizzes", () => {
  let coordinator: User;
  let quiz: Quiz;
  beforeAll(async () => {
    coordinator = await createCoordinator();
    const res = await call("POST", "/api/quizzes", { as: coordinator.id, body: quizBody });
    quiz = res.body as Quiz;
  });

  const answers = (picks: number[]) => ({
    answers: picks.map((optionIndex, i) => ({ questionId: `q${i + 1}`, optionIndex })),
  });

  it("restricts create and list to the coordinator", async () => {
    const elder = await createElder();
    expect((await call("POST", "/api/quizzes", { as: elder.id, body: quizBody })).status).toBe(403);
    expect((await call("GET", "/api/quizzes", { as: elder.id })).status).toBe(403);
    const listed = await call("GET", "/api/quizzes", { as: coordinator.id });
    expect((listed.body as { quizzes: Quiz[] }).quizzes.map((q) => q.id)).toContain(quiz.id);
    const bad = await call("POST", "/api/quizzes", {
      as: coordinator.id,
      body: { ...quizBody, passMark: 9 },
    });
    expect(bad.status).toBe(400);
  });

  it("never returns correctIndex to a reader", async () => {
    const elder = await createElder();
    const res = await call("GET", `/api/quizzes/${quiz.id}`, { as: elder.id });
    expect(res.status).toBe(200);
    expect(JSON.stringify(res.body)).not.toContain("correctIndex");
    expect((res.body as QuizPublic).questions).toHaveLength(3);
    expect((await call("GET", `/api/quizzes/${quiz.id}`)).status).toBe(401);
  });

  it("grades on the server and returns only the result", async () => {
    const elder = await createElder();
    const fail = await call("POST", `/api/quizzes/${quiz.id}/submit`, {
      as: elder.id,
      body: answers([0, 0, 1]),
    });
    expect(fail.body).toEqual({ score: 0, total: 3, passed: false } satisfies QuizResult);
    const pass = await call("POST", `/api/quizzes/${quiz.id}/submit`, {
      as: elder.id,
      body: answers([1, 2, 3]),
    });
    expect(pass.body).toEqual({ score: 2, total: 3, passed: true });
    const unknown = await call("POST", `/api/quizzes/${quiz.id}/submit`, {
      as: elder.id,
      body: { answers: [{ questionId: "nope", optionIndex: 0 }] },
    });
    expect(unknown.status).toBe(400);
  });

  it("completes a linked challenge once and awards its points once", async () => {
    const elder = await createElder();
    const challenge = await createChallengeVia(coordinator.id, {
      goal: { target: 1, unit: "quiz", type: "quiz" },
      quizId: quiz.id,
      points: 25,
    });
    await call("POST", `/api/quizzes/${quiz.id}/submit`, {
      as: elder.id,
      body: answers([0, 0, 1]),
    });
    expect((await getUser(elder.id))?.points).toBe(0);

    await call("POST", `/api/quizzes/${quiz.id}/submit`, {
      as: elder.id,
      body: answers([1, 2, 0]),
    });
    await call("POST", `/api/quizzes/${quiz.id}/submit`, {
      as: elder.id,
      body: answers([1, 2, 0]),
    });
    expect((await getUser(elder.id))?.points).toBe(25);
    const mine = (
      (await call("GET", "/api/challenges", { as: elder.id })).body as ChallengesResponse
    ).challenges.find((c) => c.id === challenge.id);
    expect(mine?.progress).toMatchObject({ status: "completed", current: 1 });

    const manual = await call("PUT", `/api/challenges/${challenge.id}/progress`, {
      as: elder.id,
      body: { current: 1 },
    });
    expect(manual.status).toBe(400);
  });

  it("rejects a quiz id on a challenge that does not have a quiz goal", async () => {
    const res = await call("POST", "/api/challenges", {
      as: coordinator.id,
      body: {
        title: "Walk 5000 steps",
        description: "Walk together",
        icon: "walk",
        category: "fitness",
        mode: "individual",
        audience: "all",
        goal: { target: 5000, unit: "steps", type: "steps" },
        points: 10,
        requiresVerification: false,
        quizId: quiz.id,
        endsOn: new Date(Date.now() + 86_400_000).toISOString(),
      },
    });
    expect(res.status).toBe(400);
  });

  it("rejects a quiz challenge with no quiz", async () => {
    const res = await call("POST", "/api/challenges", {
      as: coordinator.id,
      body: {
        title: "Quiz",
        icon: "book",
        category: "community",
        mode: "individual",
        goal: { target: 1, unit: "quiz", type: "quiz" },
        endsOn: new Date(Date.now() + 86_400_000).toISOString(),
      },
    });
    expect(res.status).toBe(400);
  });
});
