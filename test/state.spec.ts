import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Env } from "../src/quiza";
import { QuizaQuestion, retrieveQuestion } from "../src/question";
import { QuizaState, retrieveState, createQuizaCookie, AnswerResult } from "../src/state";

vi.mock("../src/question");

describe("QuizaState", () => {
  let mockEnv: Env;
  let quizaState: QuizaState;

  beforeEach(() => {
    mockEnv = {} as Env;
    quizaState = new QuizaState(1, 0, 0);
  });

  it("should initialize correctly", () => {
    expect(quizaState.key).toBe(1);
    expect(quizaState.correct).toBe(0);
    expect(quizaState.total).toBe(0);
  });

  it("should check answer correctly", async () => {
    const mockQuestion: QuizaQuestion = {
      question: "Test question",
      options: ["A", "B", "C", "D"],
      answer: 2
    };

    vi.mocked(retrieveQuestion).mockResolvedValue(mockQuestion);

    const result: AnswerResult = await quizaState.check(mockEnv, 2);

    expect(result.isCorrect).toBe(true);
    expect(result.correctIndex).toBe(2);
    expect(quizaState.key).toBe(2);
    expect(quizaState.correct).toBe(1);
    expect(quizaState.total).toBe(1);
  });

  it("should handle incorrect answer", async () => {
    const mockQuestion: QuizaQuestion = {
      question: "Test question",
      options: ["A", "B", "C", "D"],
      answer: 2
    };

    vi.mocked(retrieveQuestion).mockResolvedValue(mockQuestion);

    const result: AnswerResult = await quizaState.check(mockEnv, 1);

    expect(result.isCorrect).toBe(false);
    expect(result.correctIndex).toBe(2);
    expect(quizaState.key).toBe(2);
    expect(quizaState.correct).toBe(0);
    expect(quizaState.total).toBe(1);
  });
});

describe("retrieveState", () => {
  it("should return new QuizaState when cookie doesn't exist", () => {
    const mockEnv = {} as Env;
    const cookieHeader = "someOtherCookie=value";

    const state = retrieveState(mockEnv, cookieHeader);

    expect(state).toEqual(new QuizaState(1, 0, 0));
  });

  it("should return QuizaState from cookie when it exists", () => {
    const mockEnv = {} as Env;
    const cookieValue = encodeURIComponent(JSON.stringify({ key: 5, correct: 3, total: 10 }));
    const cookieHeader = `quizA-1=${cookieValue}; someOtherCookie=value`;

    const state = retrieveState(mockEnv, cookieHeader);

    expect(state).toEqual(new QuizaState(5, 3, 10));
  });
});

describe("createQuizaCookie", () => {
  it("should create a correctly formatted cookie string", () => {
    const state = new QuizaState(5, 3, 10);
    const domain = "example.com";

    const cookieString = createQuizaCookie(state, domain);

    expect(cookieString).toContain("quizA-1=");
    expect(cookieString).toContain("Max-Age=86400");
    expect(cookieString).toContain("Path=/");
    expect(cookieString).toContain("Domain=example.com");
    expect(cookieString).toContain("Secure;");
    expect(cookieString).toContain("HttpOnly;");
    expect(cookieString).toContain("SameSite=None");

    const decodedState = JSON.parse(decodeURIComponent(cookieString.split(";")[0].split("=")[1]));
    expect(decodedState).toEqual({ key: 5, correct: 3, total: 10 });
  });
});
