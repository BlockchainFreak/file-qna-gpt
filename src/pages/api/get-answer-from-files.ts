import type { NextApiRequest, NextApiResponse } from "next";

import { completionStream, completion } from "../../services/openai";
import { FileChunk } from "../../types/file";

type Data = {
  answer?: string;
  usage?: number;
  error?: string;
};

const MAX_FILES_LENGTH = 2000 * 3;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Data>
) {
  // Only accept POST requests
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const fileChunks = req.body.fileChunks as FileChunk[];

  const question = req.body.question as string;

  const promptFormat = req.body.promptFormat as string;

  if (!Array.isArray(fileChunks)) {
    res.status(400).json({ error: "fileChunks must be an array" });
    return;
  }

  if (!question) {
    res.status(400).json({ error: "question must be a string" });
    return;
  }

  let debstr = ""
  try {
    const filesString = fileChunks
      .map((fileChunk) => `###\n\"${fileChunk.filename}\"\n${fileChunk.text}`)
      .join("\n")
      .slice(0, MAX_FILES_LENGTH);

    console.log(filesString);

    const prompt =
      promptFormat +
      `Question: ${question}\n\n` +
      `Files:\n${filesString}\n\n` +
      `Answer:`;

      const result = await completion({
        prompt,
      })

      res.status(200).json({ answer: result.text, usage: result.usage });

    // const stream = completionStream({
    //   prompt,
    // });

    // // Set the response headers for streaming
    // res.writeHead(200, {
    //   "Content-Type": "text/event-stream",
    //   "Cache-Control": "no-cache, no-transform",
    //   Connection: "keep-alive",
    // });
    // debstr = "writeHead"

    // // Write the data from the stream to the response
    // for await (const data of stream) {
    //   debstr = "for await"
    //   res.write(data);
    // }

    // // End the response when the stream is done
    // res.end();
  } catch (error) {
    console.error(error);
    console.error(debstr);
    res.status(500).json({ error: "Something went wrong" });
    res.end()
  }
}
