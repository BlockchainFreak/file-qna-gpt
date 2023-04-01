import React, { memo, useCallback, useRef, useState } from "react";
import { Transition } from "@headlessui/react";
import axios from "axios";
import ReactMarkdown from "react-markdown";

import FileViewerList from "./FileViewerList";
import LoadingText from "./LoadingText";
import { isFileNameInString } from "../services/utils";
import clientCompletion from "@/services/clientCompletion";
import { FileChunk, FileLite } from "../types/file";
import MUI, { Accordion, AccordionActions, AccordionSummary, AccordionDetails, Typography, Icon } from "@mui/material";

type FileQandAAreaProps = {
  files: FileLite[];
};

function FileQandAArea(props: FileQandAAreaProps) {
  const questionRef = useRef(null);
  const promptFormatRef = useRef(null);
  const [hasAskedQuestion, setHasAskedQuestion] = useState(false);
  const [answerError, setAnswerError] = useState("");
  const [answerLoading, setAnswerLoading] = useState<boolean>(false);
  const [answer, setAnswer] = useState("");
  const [answerDone, setAnswerDone] = useState(false);

  const handleSearch = useCallback(async () => {
    if (answerLoading) {
      return;
    }

    const question = (questionRef?.current as any)?.value ?? "";
    setAnswer("");
    setAnswerDone(false);

    if (!question) {
      setAnswerError("Please ask a question.");
      return;
    }
    if (props.files.length === 0) {
      setAnswerError("Please upload files before asking a question.");
      return;
    }

    setAnswerLoading(true);
    setAnswerError("");

    let results: FileChunk[] = [];

    try {
      const searchResultsResponse = await axios.post(
        "/api/search-file-chunks",
        {
          searchQuery: question,
          files: props.files,
          maxResults: 10,
        }
      );

      if (searchResultsResponse.status === 200) {
        results = searchResultsResponse.data.searchResults;
      } else {
        setAnswerError("Sorry, something went wrong!\n" + JSON.stringify(searchResultsResponse));
      }
    } catch (err: any) {
      console.error("error in search file chunks")
      console.error(err)
      setAnswerError("Sorry, something went wrong!\n" + JSON.stringify(err));
      setAnswerLoading(false);
      return;
    }

    setHasAskedQuestion(true);

    try {
      // const res = await fetch("/api/get-answer-from-files", {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //   },
      //   body: JSON.stringify({
      //     question,
      //     fileChunks: results,
      //   }),
      // });

      const res = await axios.post(
        "/api/get-answer-from-files",
        {
          question,
          fileChunks: results,
          promptFormat: (promptFormatRef?.current as any)?.value ?? "",
        }
      );

      setAnswer(res.data.answer)
      setAnswerDone(true)
      // const reader = res.body!.getReader();

      // const reader = clientCompletion({
      //   question,
      //   fileChunks: results,
      // })

      // if(!reader) throw new Error("reader is null")

      // for await (const chunk of reader) {
      //   setAnswer((prev) => prev + (chunk ?? ""));
      // }
      // setAnswerDone(true);

      // while (true) {
      //   const { done, value } = await reader.read();
      //   if (done) {
      //     setAnswerDone(true);
      //     break;
      //   }
      //   setAnswer((prev) => prev + new TextDecoder().decode(value));
      // }
    }
    catch (err: any) {
      setAnswerDone(true);
      console.error("get-answer-from-files")
      setAnswerError("Sorry, something went wrong!\n" + JSON.stringify(err));
    }

    setAnswerLoading(false);
  }, [props.files, answerLoading]);

  const handleEnterInSearchBar = useCallback(
    async (event: React.SyntheticEvent) => {
      if ((event as any).key === "Enter") {
        await handleSearch();
      }
    },
    [handleSearch]
  );

  return (
    <div className="space-y-4 text-gray-800">
      <div className="mt-2">
        Ask a question based on the content of your files:
      </div>
      <div className="space-y-2">
        <Accordion>
          <AccordionSummary
            expandIcon={<Icon>^</Icon>}
            aria-controls="panel1a-content"
            id="panel1a-header"
          >
            <Typography>Advanced options</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <label htmlFor="promptFormat" className="text-sm font-medium">
              Prompt format:
            </label>
            <textarea
              className="border rounded border-gray-200 w-full py-1 px-2"
              placeholder=""
              rows={10}
              defaultValue={
                `Given a question, try to answer it using the content of the file extracts below, and if you cannot answer, or find a relevant file, just output \"I couldn't find the answer to that question in your files.\".\n\n` +
                `If the answer is not contained in the files or if there are no file extracts, respond with \"I couldn't find the answer to that question in your files.\" If the question is not actually a question, respond with \"That's not a valid question.\"\n\n` +
                `In the cases where you can find the answer, first give the answer. Then explain how you found the answer from the source or sources, and use the exact filenames of the source files you mention. Do not make up the names of any other files other than those mentioned in the files context. Give the answer in markdown format.` +
                `Use the following format:\n\nQuestion: <question>\n\nFiles:\n<###\n\"filename 1\"\nfile text>\n<###\n\"filename 2\"\nfile text>...\n\nAnswer: <answer or "I couldn't find the answer to that question in your files" or "That's not a valid question.">\n\n`
              }
              name="promptFormat"
              ref={promptFormatRef}
            />
          </AccordionDetails>
        </Accordion>
        <input
          className="border rounded border-gray-200 w-full py-1 px-2"
          placeholder="e.g. What were the key takeaways from the Q1 planning meeting?"
          name="search"
          ref={questionRef}
          onKeyDown={handleEnterInSearchBar}
        />
        <div
          className="rounded-md bg-green-500 py-1 px-4 w-max text-white hover:bg-green-700 border border-green-100 shadow cursor-pointer"
          onClick={handleSearch}
        >
          {answerLoading ? (
            <LoadingText text="Answering question..." />
          ) : (
            "Ask question"
          )}
        </div>
      </div>
      <div className="">
        {answerError && <div className="text-red-500">{answerError}</div>}
        <Transition
          show={hasAskedQuestion}
          enter="transition duration-600 ease-out"
          enterFrom="transform opacity-0"
          enterTo="transform opacity-100"
          leave="transition duration-125 ease-out"
          leaveFrom="transform opacity-100"
          leaveTo="transform opacity-0"
          className="mb-8"
        >
          {answer && (
            <div className="">
              <ReactMarkdown className="prose" linkTarget="_blank">
                {`${answer}${answerDone ? "" : "  |"}`}
              </ReactMarkdown>
            </div>
          )}

          <Transition
            show={
              props.files.filter((file) =>
                isFileNameInString(file.name, answer)
              ).length > 0
            }
            enter="transition duration-600 ease-out"
            enterFrom="transform opacity-0"
            enterTo="transform opacity-100"
            leave="transition duration-125 ease-out"
            leaveFrom="transform opacity-100"
            leaveTo="transform opacity-0"
            className="mb-8"
          >
            <FileViewerList
              files={props.files.filter((file) =>
                isFileNameInString(file.name, answer)
              )}
              title="Sources"
              listExpanded={true}
            />
          </Transition>
        </Transition>
      </div>
    </div>
  );
}

export default memo(FileQandAArea);
