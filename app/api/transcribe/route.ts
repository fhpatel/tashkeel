import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getToken } from 'next-auth/jwt'; // You'll need to install next-auth
import { kv } from '@vercel/kv'; // Or any other database of your choice

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const RATE_LIMIT = 25; // requests per user
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export async function POST(request: Request) {
  try {
    // Get user token/session
    const token = await getToken({ req: { headers: request.headers } as any });
    const userId =
      token?.sub || request.headers.get('x-forwarded-for') || 'anonymous';

    // Check usage limits
    const userKey = `usage:${userId}`;
    const currentUsage = Number(await kv.get(userKey)) || 0;

    if (currentUsage >= RATE_LIMIT) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await image.arrayBuffer());
    const base64Image = buffer.toString('base64');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Please transcribe the Arabic text in this image, preserving all diacritical marks (tashkeel). Return only the transcribed text without any explanations or translations.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${image.type};base64,${base64Image}`
              }
            }
          ]
        }
      ],
      max_tokens: 500
    });

    // Increment usage counter
    await kv.set(userKey, currentUsage + 1, { ex: RATE_LIMIT_WINDOW });

    const transcribedText = response.choices[0].message.content;

    return NextResponse.json({
      text: transcribedText,
      remainingRequests: RATE_LIMIT - (currentUsage + 1)
    });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe image' },
      { status: 500 }
    );
  }
}
