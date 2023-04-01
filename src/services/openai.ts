import { IncomingMessage } from "http";
import {
  Configuration,
  CreateCompletionRequest,
  CreateCompletionResponse,
  OpenAIApi,
} from "openai";

// This file contains utility functions for interacting with the OpenAI API

if (!process.env.OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY environment variable");
}

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
export const openai = new OpenAIApi(configuration);

type CompletionOptions = Partial<CreateCompletionRequest> & {
  prompt: string;
  fallback?: string;
};

type EmbeddingOptions = {
  input: string | string[];
  model?: string;
};

export async function completion({
  prompt,
  fallback,
  max_tokens = 800,
  temperature = 0,
  model = "gpt-3.5-turbo",
  ...otherOptions
}: CompletionOptions) {
  try {
    const result = await openai.createChatCompletion({
      messages: [
        { role: "system", content: "You are a helpful AI Assistant" },
        { role: "user", content: prompt}
      ],
      // max_tokens: max_tokens ?? 2000,
      model,
      temperature,
      max_tokens: max_tokens ?? 2000,
    });

    if (!result.data.choices[0]) {
      throw new Error("No text returned from the completions endpoint.");
    }
    return {
      text: result.data.choices[0].message?.content,
      usage: result.data.usage?.total_tokens,
    };
  } catch (error) {
    // if (fallback) return fallback;
    throw error;
  }
}

export async function* completionStream({
  prompt,
  fallback,
  max_tokens = 800,
  temperature = 0,
  model = "text-davinci-003",
}: CompletionOptions) {
  try {
    const result = await openai.createChatCompletion({
      messages: [
        { role: "system", content: "You are a helpful AI Assistant" },
        { role: "user", content: prompt}
      ],
      // max_tokens: max_tokens ?? 2000,
      model,
      temperature,
      max_tokens: max_tokens ?? 2000,
      stream: true,
    },
    { responseType: "stream"}
    );

    const stream = result.data as any as IncomingMessage;

    for await (const chunk of stream) {
      const line = chunk.toString().trim();
      const message = line.split("data: ")[1];

      if (message === "[DONE]") {
        yield `
          prompt tokens: ${result.data.usage?.prompt_tokens}
          completion tokens: ${result.data.usage?.completion_tokens}
          total tokens: ${result.data.usage?.total_tokens}
          estimated_cost: $${(result.data.usage?.total_tokens ?? 0) * 0.002}
        `
        break;
      }

      const data = JSON.parse(message) as CreateCompletionResponse;

      yield data.choices[0].text;
    }
  } catch (error) {
    if (fallback) yield fallback;
    else throw error;
  }
}

export async function embedding({
  input,
  model = "text-embedding-ada-002",
}: EmbeddingOptions) {
  const result = await openai.createEmbedding({
    model,
    input,
  });

  if (!result.data.data[0].embedding) {
    throw new Error("No embedding returned from the completions endpoint");
  }

  // Otherwise, return the embeddings
  return result.data.data.map((d) => d.embedding)
}
