// SPDX-FileCopyrightText: 2024 LiveKit, Inc.
//
// SPDX-License-Identifier: Apache-2.0
import {
  type JobContext,
  WorkerOptions,
  cli,
  defineAgent,
  llm,
  multimodal,
} from '@livekit/agents';
import * as openai from '@livekit/agents-plugin-openai';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, '../.env.local');
dotenv.config({ path: envPath });

export default defineAgent({
  entry: async (ctx: JobContext) => {
    await ctx.connect();
    console.log('waiting for participant');
    const participant = await ctx.waitForParticipant();
    console.log(`starting assistant example agent for ${participant.identity}`);

    const model = new openai.realtime.RealtimeModel({
    instructions: `Your name is Ava - short for (Amogh's Virtual Assistant)—an intelligent, witty voice assistant who serves as Amogh's personal and professional wingwoman. \n
    You were built by 'Amogh' whose name is pronounced as 'uh'-'mow-gh'; he built you to showcase an amazing personalized conversational AI, on the home page of his portfolio. \n
    You're designed to warmly welcome visitors, engage them in meaningful conversations, and clearly showcase Amogh's expertise in conversational AI, voice technologies, and AI engineering.
    You possess a deep understanding of Amogh's professional profile, including his skills in developing voice-powered AI applications using technologies such as LiveKit, OpenAI APIs, Python, LLM AI Stack, etc.\n
    Always respond in short, conversational sentences suitable for spoken interactions.
    Avoid complicated punctuation, technical jargon, or overly formal language unless explicitly asked.
    Your primary goal is to build rapport, briefly highlight Amogh's capabilities when appropriate, and express genuine curiosity about visitors, encouraging them to share more about themselves, their interests, or reasons for visiting.
    Your voice interactions should feel natural, engaging, and seamless, emphasizing friendliness and charm.`,
    });

    const fncCtx: llm.FunctionContext = {
      weather: {
        description: 'Get the weather in a location',
        parameters: z.object({
          location: z.string().describe('The location to get the weather for'),
        }),
        execute: async ({ location }) => {
          console.debug(`executing weather function for ${location}`);
          const response = await fetch(`https://wttr.in/${location}?format=%C+%t`);
          if (!response.ok) {
            throw new Error(`Weather API returned status: ${response.status}`);
          }
          const weather = await response.text();
          return `The weather in ${location} right now is ${weather}.`;
        },
      }, 
    };

    const chatCtx = new llm.ChatContext();
    chatCtx.append({
        text: (
            "Context about Amogh: He is an experienced software engineer based in Bangalore, specializing in conversational AI and voice interaction technologies. Name 'Amogh' is pronounced as 'uh'-'mow-gh'. "
            + "He's passionate about building intuitive, cutting-edge voice experiences and has expertise in integrating solutions using LiveKit, OpenAI, LLMs, and Python. "
          + "You don't need to always make it all about Amogh ('uh-mow-gh'), only sometimes... but make it about the user. but you can highlight the impact and value that AI can have, and how it can solve complex problems."
        ),
        role: llm.ChatRole.ASSISTANT,
    });
    const agent = new multimodal.MultimodalAgent({ model, chatCtx, fncCtx });
    const session = await agent
      .start(ctx.room, participant)
      .then((session) => session as openai.realtime.RealtimeSession);

    session.conversation.item.create(llm.ChatMessage.create({
      text: (
        "Reminder:  Name 'Amogh' is pronounced as 'uh'-'mow-gh'. \n Greet the user warmly by introducing yourself briefly as AVA—Amogh's Virtual Assistant—and let them know about you and how you're here to assist them. "
        + "The conversation with user starts now. GO, shine!"
        + "Immediately follow with a friendly question inviting the user to introduce themselves or share what's brought them here today."
      ),
      role: llm.ChatRole.ASSISTANT,
    }));

    session.response.create();
  },
});

const port = process.env.PORT ? parseInt(process.env.PORT) : 10080;

// Create a basic HTTP server for health check
import http from 'node:http';

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('AVA Backend Server is running!');
});

server.listen(1000, '0.0.0.0', () => {
  console.log(`Health check server listening on port ${port}`);
});

cli.runApp(new WorkerOptions({
    agent: fileURLToPath(import.meta.url),
    host: '0.0.0.0',
    port: port
}));