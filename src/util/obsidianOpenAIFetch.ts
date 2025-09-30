import {
  type RequestUrlParam,
  type RequestUrlResponse,
  requestUrl,
} from 'obsidian';
import type { Fetch } from 'openai/core';

/**
 * A custom 'fetch' implementation for OpenAI SDK that wraps Obsidian's
 * 'requestUrl()' to avoid CORS issue when new ChatOpenAI used with
 * Gemini OpenAI-compatible API.
 * @example
 * const openAiClient = new OpenAI({fetch: obsidianOpenAIFetch})
 * const model = new ChatOpenAI({ configuration: { fetch: obsidianFetch }})
 */
export const obsidianOpenAIFetch: Fetch = async (requestInfo, init) => {
  const obsidianParams: RequestUrlParam = {
    url: '',
    method: undefined,
    headers: undefined,
    body: undefined,
  };

  if (requestInfo instanceof Request) {
    obsidianParams.url = requestInfo.url;
    if (requestInfo.body) {
      obsidianParams.body = await requestInfo.arrayBuffer();
    }

    const headersObj: Record<string, string> = {};
    requestInfo.headers.forEach((value, key) => {
      headersObj[key] = value;
    });
    obsidianParams.headers = headersObj;
    obsidianParams.method = requestInfo.method;
  }

  if (typeof requestInfo === 'string' && init !== undefined) {
    const headersObj: Record<string, string> = {};
    if (init.headers) {
      const tempHeaders = new Headers(init.headers as HeadersInit);
      tempHeaders.forEach((value, key) => {
        headersObj[key] = value;
      });
    }
    obsidianParams.url = requestInfo;
    obsidianParams.body = JSON.stringify(
      JSON.parse(init.body?.toString() as string),
    );
    obsidianParams.headers = headersObj;
    obsidianParams.method = init.method;
  }

  if (obsidianParams.headers) {
    //biome-ignore lint/performance/noDelete: SimpleURLLoaderWrapper will throw ERR_INVALID_ARGUMENT if you try to pass this header
    delete obsidianParams.headers['content-length'];
  }

  console.debug();
  try {
    const obsidianResponse = await requestUrl(obsidianParams);
    return obsidianResponseToResponse(obsidianResponse);
  } catch (error) {
    console.error('Obsidian Fetch Error:', error.message);
    throw new Error(`Network request failed: ${error.message || error}`);
  }
};

function obsidianResponseToResponse(
  obsidianResponse: RequestUrlResponse,
): Response {
  const body = obsidianResponse.text;
  const headers = new Headers(obsidianResponse.headers);

  return new Response(body, {
    status: obsidianResponse.status,
    statusText: '',
    headers,
  });
}
