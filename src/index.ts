import { Hono } from "hono";
import { ElevenLabsClient } from "elevenlabs";
// @ts-ignore TODO: how to fix types in Cloudflare Workers for this?
import { Buffer } from "node:buffer";
import twilio, { twiml } from "twilio";

import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

type Bindings = {
  MY_BUCKET: R2Bucket;
};

const sendWhatsappMessage = async ({
  to,
  mediaUrl,
  text,
  env,
}: {
  to: string;
  mediaUrl?: string;
  text?: string;
  env: Cloudflare.Env;
}) => {
  const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  const res = await client.messages.create({
    from: `whatsapp:${env.TWILIO_FROM_NUMBER}`,
    body: text || "",
    mediaUrl: mediaUrl ? [mediaUrl] : [],
    to,
  });

  return res.sid;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get("/", async (c) => {
  c.text("Server up and running!");
});

app.get("/audio/:path", async (c) => {
  const key = c.req.param("path");
  console.log(key);
  const object = await c.env.MY_BUCKET.get(key);
  if (object === null) {
    return c.text("Object Not Found", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("Content-Type", "audio/ogg");

  // Delete after returning
  c.executionCtx.waitUntil(c.env.MY_BUCKET.delete(key));

  return c.body(object.body, {
    headers,
  });
});

app.post("/webhook", async (c) => {
  c.executionCtx.waitUntil(
    (async () => {
      const body = await c.req.parseBody();
      console.log(body);
      const { MessageType, MediaUrl0, MessageSid, From } = body;
      try {
        const env = c.env as Cloudflare.Env;
        const elevenlabs = new ElevenLabsClient({
          apiKey: env.ELEVENLABS_API_KEY,
        });
        let transcriptionResult:
          | {
              text: string;
              languageCode: string;
            }
          | undefined;
        let userText: string | undefined;

        if (MessageType === "audio") {
          const mediaResponse = await fetch(MediaUrl0 as string, {
            headers: {
              Authorization:
                "Basic " +
                btoa(env.TWILIO_ACCOUNT_SID + ":" + env.TWILIO_AUTH_TOKEN),
            },
          });
          const mediaBlob = await mediaResponse.arrayBuffer();

          const result = await elevenlabs.speechToText.convert({
            file: mediaBlob,
            model_id: "scribe_v1", // 'scribe_v1_experimental' is also available for new, experimental features
            tag_audio_events: true,
          });
          console.log(result);

          const text = result.text || "Could not transcribe the message.";
          const languageCode = result.language_code;
          transcriptionResult = {
            text,
            languageCode,
          };
          userText = text;
        } else if (MessageType === "text") {
          userText = body.Body as string;
        } else {
          return await sendWhatsappMessage({
            to: From as string,
            text: "Invalid message type. Send either text or a voice message!",
            env: c.env as Cloudflare.Env,
          });
        }

        // Generate response via Vercel AI SDK
        // TODO: add tool calling to extend functionality
        // TODO: investigate why generation so slow!
        // TDOD: add loading spinner?
        const openai = createOpenAI({ apiKey: env.OPENAI_API_KEY });
        const { text: responseText } = await generateText({
          model: openai("gpt-4o-mini"),
          prompt: `
    You are a helpful assistant.
    You are given a message from a user.
    You need to respond to the user's message in a brief manner.
    User message: ${userText}
    `,
        });
        console.log({ responseText });

        // Generate speech response
        const audio = await elevenlabs.textToSpeech.convert(
          "JBFqnCBsd6RMkjVDRZzb",
          {
            text: responseText,
            model_id: "eleven_multilingual_v2",
            output_format: "opus_48000_64",
          }
        );
        // Convert stream to buffer
        const chunks: Uint8Array[] = [];
        for await (const chunk of audio) {
          chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        const path = `${MessageSid as string}.ogg`;
        const res = await c.env.MY_BUCKET.put(path, buffer);
        console.log({ res });
        if (!res) {
          console.log("Failed to save audio file");
          return await sendWhatsappMessage({
            to: From as string,
            text: responseText,
            env: c.env as Cloudflare.Env,
          });
        }

        const mediaUrl = `${env.PUBLIC_DOMAIN}/audio/${path}`;
        return await sendWhatsappMessage({
          to: From as string,
          mediaUrl,
          env: c.env as Cloudflare.Env,
        });
      } catch (error) {
        console.error(error);
        return await sendWhatsappMessage({
          to: From as string,
          text: "Sorry, something went wrong. Please try again later.",
          env: c.env as Cloudflare.Env,
        });
      }
    })()
  );
  return c.text("Received. Thinking...");
});

export default app;
