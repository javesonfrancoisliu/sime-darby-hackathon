import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import type { Quiz } from "@sdh/contracts";
import { db, isConditionFailure, table } from "../../lib/db";

const ENTITY = "QUIZ";

const key = (id: string) => ({ PK: `QUIZ#${id}`, SK: "META" });

export function toQuiz(item: Record<string, unknown>): Quiz {
  const q = item as unknown as Quiz;
  return {
    id: q.id,
    title: q.title,
    questions: q.questions.map((question) => ({
      id: question.id,
      question: question.question,
      options: [...question.options],
      correctIndex: question.correctIndex,
    })),
    passMark: q.passMark,
    createdAt: q.createdAt,
    updatedAt: q.updatedAt,
  };
}

export async function putQuiz(quiz: Quiz): Promise<void> {
  await db().send(
    new PutCommand({
      TableName: table(),
      Item: { ...key(quiz.id), GSI1PK: "QUIZ", GSI1SK: quiz.createdAt, entity: ENTITY, ...quiz },
      ConditionExpression: "attribute_not_exists(PK)",
    }),
  );
}

export async function getQuiz(id: string): Promise<Quiz | undefined> {
  const result = await db().send(new GetCommand({ TableName: table(), Key: key(id) }));
  return result.Item ? toQuiz(result.Item) : undefined;
}

export async function listQuizzes(): Promise<Quiz[]> {
  const quizzes: Quiz[] = [];
  let startKey: Record<string, unknown> | undefined;
  do {
    const result = await db().send(
      new QueryCommand({
        TableName: table(),
        IndexName: "GSI1",
        KeyConditionExpression: "GSI1PK = :pk",
        ExpressionAttributeValues: { ":pk": "QUIZ" },
        ExclusiveStartKey: startKey,
      }),
    );
    quizzes.push(...(result.Items ?? []).map(toQuiz));
    startKey = result.LastEvaluatedKey;
  } while (startKey);
  return quizzes;
}

// One counter per user, quiz and UTC day; false once the day's attempts are used up.
export async function takeAttempt(
  quizId: string,
  userId: string,
  day: string,
  maxAttempts: number,
): Promise<boolean> {
  try {
    await db().send(
      new UpdateCommand({
        TableName: table(),
        Key: { PK: `QUIZATTEMPT#${quizId}#${userId}`, SK: day },
        UpdateExpression: "ADD attempts :one SET entity = :entity",
        ConditionExpression: "attribute_not_exists(attempts) OR attempts < :max",
        ExpressionAttributeValues: { ":one": 1, ":max": maxAttempts, ":entity": "QUIZ_ATTEMPT" },
      }),
    );
    return true;
  } catch (error) {
    if (isConditionFailure(error)) return false;
    throw error;
  }
}
