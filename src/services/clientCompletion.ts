import { completionStream } from "./openai";
import { FileChunk } from "../types/file";

const MAX_FILES_LENGTH = 2000 * 3;

// writing the above function as a client side function


export default function clientCompletion({ fileChunks, question }: { fileChunks: FileChunk[], question: string }) {

    if (!Array.isArray(fileChunks)) {
        console.error("fileChunks must be an array");
        return;
    }

    if (!question) {
        console.error("question must be a string");
        return;
    }

    try {
        const filesString = fileChunks
            .map((fileChunk) => `###\n\"${fileChunk.filename}\"\n${fileChunk.text}`)
            .join("\n")
            .slice(0, MAX_FILES_LENGTH);

        console.log(filesString);

        const prompt =
            `Given a question, try to answer it using the content of the file extracts below, and if you cannot answer, or find a relevant file, just output \"I couldn't find the answer to that question in your files.\".\n\n` +
            `If the answer is not contained in the files or if there are no file extracts, respond with \"I couldn't find the answer to that question in your files.\" If the question is not actually a question, respond with \"That's not a valid question.\"\n\n` +
            `In the cases where you can find the answer, first give the answer. Then explain how you found the answer from the source or sources, and use the exact filenames of the source files you mention. Do not make up the names of any other files other than those mentioned in the files context. Give the answer in markdown format.` +
            `Use the following format:\n\nQuestion: <question>\n\nFiles:\n<###\n\"filename 1\"\nfile text>\n<###\n\"filename 2\"\nfile text>...\n\nAnswer: <answer or "I couldn't find the answer to that question in your files" or "That's not a valid question.">\n\n` +
            `Question: ${question}\n\n` +
            `Files:\n${filesString}\n\n` +
            `Answer:`;

        const stream = completionStream({
            prompt,
            model: "text-davinci-003",
        });

        return stream;
    } catch (error) {
        console.error(error);
    }    

}
