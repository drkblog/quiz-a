import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Env, QuestionNotFoundError } from "../src/quiza";
import { QuizaQuestion, retrieveQuestion } from "../src/question";

describe("retrieveQuestion", () => {
  let mockEnv: Env;

  beforeEach(() => {
    mockEnv = {
      KV_QUIZA_QUESTION: {
        get: vi.fn(),
      },
    } as unknown as Env;
  });

  it("should retrieve and parse a question successfully", async () => {
    const mockQuestion: QuizaQuestion = {
      question: "What is the capital of France?",
      options: ["London", "Berlin", "Paris", "Madrid"],
      answer: 2,
    };

    vi.mocked(mockEnv.KV_QUIZA_QUESTION.get).mockResolvedValue(JSON.stringify(mockQuestion));

    const result = await retrieveQuestion(mockEnv, 1);

    expect(result).toEqual(mockQuestion);
    expect(mockEnv.KV_QUIZA_QUESTION.get).toHaveBeenCalledWith("1");
  });

  it("should throw QuestionNotFoundError when question is not found", async () => {
    vi.mocked(mockEnv.KV_QUIZA_QUESTION.get).mockResolvedValue(null);

    await expect(retrieveQuestion(mockEnv, 2)).rejects.toThrow(QuestionNotFoundError);
    expect(mockEnv.KV_QUIZA_QUESTION.get).toHaveBeenCalledWith("2");
  });

  it("should throw an error when JSON parsing fails", async () => {
    vi.mocked(mockEnv.KV_QUIZA_QUESTION.get).mockResolvedValue("invalid JSON");

    await expect(retrieveQuestion(mockEnv, 3)).rejects.toThrow(SyntaxError);
    expect(mockEnv.KV_QUIZA_QUESTION.get).toHaveBeenCalledWith("3");
  });
});
