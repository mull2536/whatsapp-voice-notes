import { Hono } from "hono";
import { cors } from 'hono/cors';
import { ElevenLabsClient } from "elevenlabs";
// @ts-ignore
import { Buffer } from "node:buffer";
import twilio from "twilio";

import { generateText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";

// Define a more complete type for your environment variables
type CloudflareBindings = {
  MY_BUCKET: R2Bucket;
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_PHONE_NUMBER: string;  // Keep as TWILIO_PHONE_NUMBER to match your env vars
  MY_WHATSAPP_NUMBER: string;
  ELEVENLABS_API_KEY: string;
  OPENAI_API_KEY: string;
  WHATSAPP_WEBHOOK_URL: string;  // Keep as WHATSAPP_WEBHOOK_URL to match your env vars
  ASSETS: {
    fetch: (req: Request) => Promise<Response>;
  };
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
  env: CloudflareBindings;
}) => {
  const client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  console.log('Creating Twilio message with:', {
    from: `whatsapp:${env.TWILIO_PHONE_NUMBER}`,
    to: to,
    mediaUrl: mediaUrl,
    body: text || ""
  });
  
  const res = await client.messages.create({
    from: `whatsapp:${env.TWILIO_PHONE_NUMBER}`,
    body: text || "",
    mediaUrl: mediaUrl ? [mediaUrl] : [],
    to,
  });

  return res.sid;
};

const app = new Hono<{ Bindings: CloudflareBindings }>();

// Add CORS middleware
app.use('*', cors());

// Serve the HTML interface at the root
app.get("/", async (c) => {
  return c.env.ASSETS.fetch(c.req.raw);
});

// Your original agent logic
app.post("/inbound", async (c) => {
    return c.text("This is the original agent endpoint.");
});

// Endpoint to handle requests from your HTML interface
app.post("/generate-voice-note", async (c) => {
    try {
        const { text } = await c.req.json();
        const env = c.env;

        if (!text) {
            return c.json({ error: 'Text is required' }, 400);
        }
        
        console.log('Generating voice note for text:', text);
        
        // Voice ID and settings
        const voiceId = "RRH9oZEaBFwuWBWtFxC4";

        const voiceSettings = {
            text: text,
            model_id: "eleven_multilingual_v2",
            output_format: "opus_48000_64" as const,
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                speed: 0.95,
                use_speaker_boost: true,
            }
        };

        // 1. Generate speech response with ElevenLabs
        const elevenlabs = new ElevenLabsClient({ apiKey: env.ELEVENLABS_API_KEY });
        const audio = await elevenlabs.textToSpeech.convert(voiceId, voiceSettings);

        // 2. Convert stream to buffer and save to R2
        const chunks: Uint8Array[] = [];
        for await (const chunk of audio) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        const path = `${crypto.randomUUID()}.ogg`;
        await c.env.MY_BUCKET.put(path, buffer);
        
        console.log('Audio saved to R2 with path:', path);

        // 3. Create the public URL for the audio file
        const mediaUrl = `${env.WHATSAPP_WEBHOOK_URL}/audio/${path}`;
        console.log('Media URL:', mediaUrl);

        // 4. Send the voice note to YOUR personal WhatsApp number
        console.log('Sending to WhatsApp number:', `whatsapp:${env.MY_WHATSAPP_NUMBER}`);
        console.log('Using Twilio number:', `whatsapp:${env.TWILIO_PHONE_NUMBER}`);
        
        const messageSid = await sendWhatsappMessage({
            to: `whatsapp:${env.MY_WHATSAPP_NUMBER}`,
            mediaUrl,
            env: env,
        });
        
        console.log('WhatsApp message sent with SID:', messageSid);

        return c.json({ success: true, message: 'Voice note sent.', messageSid });

    } catch (error) {
        console.error('Error generating voice note:', error);
        return c.json({ error: 'Failed to generate voice note: ' + (error as Error).message }, 500);
    }
});

// Also support the /a/ prefix that's in your HTML
app.post("/a/generate-voice-note", async (c) => {
    try {
        const { text } = await c.req.json();
        const env = c.env;

        if (!text) {
            return c.json({ error: 'Text is required' }, 400);
        }
        
        console.log('Generating voice note for text:', text);
        
        // Voice ID and settings
        const voiceId = "RRH9oZEaBFwuWBWtFxC4";

        const voiceSettings = {
            text: text,
            model_id: "eleven_multilingual_v2",
            output_format: "opus_48000_64" as const,
            voice_settings: {
                stability: 0.5,
                similarity_boost: 0.75,
                speed: 0.95,
                use_speaker_boost: true,
            }
        };

        // 1. Generate speech response with ElevenLabs
        const elevenlabs = new ElevenLabsClient({ apiKey: env.ELEVENLABS_API_KEY });
        const audio = await elevenlabs.textToSpeech.convert(voiceId, voiceSettings);

        // 2. Convert stream to buffer and save to R2
        const chunks: Uint8Array[] = [];
        for await (const chunk of audio) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        const path = `${crypto.randomUUID()}.ogg`;
        await c.env.MY_BUCKET.put(path, buffer);
        
        console.log('Audio saved to R2 with path:', path);

        // 3. Create the public URL for the audio file
        const mediaUrl = `${env.WHATSAPP_WEBHOOK_URL}/audio/${path}`;
        console.log('Media URL:', mediaUrl);

        // 4. Send the voice note to YOUR personal WhatsApp number
        console.log('Sending to WhatsApp number:', `whatsapp:${env.MY_WHATSAPP_NUMBER}`);
        console.log('Using Twilio number:', `whatsapp:${env.TWILIO_PHONE_NUMBER}`);
        
        const messageSid = await sendWhatsappMessage({
            to: `whatsapp:${env.MY_WHATSAPP_NUMBER}`,
            mediaUrl,
            env: env,
        });
        
        console.log('WhatsApp message sent with SID:', messageSid);

        return c.json({ success: true, message: 'Voice note sent.', messageSid });

    } catch (error) {
        console.error('Error generating voice note:', error);
        return c.json({ error: 'Failed to generate voice note: ' + (error as Error).message }, 500);
    }
});

// Endpoint to serve audio files from R2
app.get("/audio/:path", async (c) => {
  const key = c.req.param("path");
  console.log('Serving audio file:', key);
  
  const object = await c.env.MY_BUCKET.get(key);
  if (object === null) {
    return c.text("Object Not Found", { status: 404 });
  }
  
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("Content-Type", "audio/ogg");
  
  // Delete after returning (like in the original)
  c.executionCtx.waitUntil(c.env.MY_BUCKET.delete(key));
  
  return c.body(object.body, { headers });
});

export default app;