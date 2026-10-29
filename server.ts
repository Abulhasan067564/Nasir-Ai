import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

function resolvePort(): number {
  const portArgIdx = process.argv.indexOf('--port');
  if (portArgIdx !== -1 && process.argv[portArgIdx + 1]) {
    return Number(process.argv[portArgIdx + 1]);
  }
  // AI Studio environment constraint: dev server must run on port 3000
  if (process.env.NODE_ENV !== 'production') {
    return 3000;
  }
  return Number(process.env.PORT) || 3000;
}

const PORT = resolvePort();
const HOST = '0.0.0.0';

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Initialize Google GenAI on the server
const geminiApiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: geminiApiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-3.8-flash';

// Robust execution with automatic retry and model fallback for high reliability
async function withRetry<T>(fn: () => Promise<T>, retries = 2, delayMs = 1000): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const isTemporary =
      err?.status === 503 ||
      err?.status === 429 ||
      err?.message?.includes('high demand') ||
      err?.message?.includes('UNAVAILABLE') ||
      err?.message?.includes('RESOURCE_EXHAUSTED');

    if (retries > 0 && isTemporary) {
      console.warn(`Upstream model temporarily unavailable, retrying in ${delayMs}ms... (${retries} attempts left)`);
      await new Promise((res) => setTimeout(res, delayMs));
      return withRetry(fn, retries - 1, delayMs * 2);
    }
    throw err;
  }
}

async function generateWithFallback(params: { contents: any; config: any }) {
  try {
    return await ai.models.generateContent({
      model: DEFAULT_MODEL,
      contents: params.contents,
      config: params.config,
    });
  } catch (err: any) {
    const isOverloaded =
      err?.status === 503 ||
      err?.status === 429 ||
      err?.message?.includes('503') ||
      err?.message?.includes('high demand') ||
      err?.message?.includes('UNAVAILABLE') ||
      err?.message?.includes('RESOURCE_EXHAUSTED');

    if (isOverloaded) {
      console.warn('Fast-failing over to gemini-3.1-flash-lite due to upstream 503 high demand');
      return await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: params.contents,
        config: params.config,
      });
    }
    throw err;
  }
}

async function generateStreamWithFallback(params: { contents: any; config: any }) {
  try {
    return await ai.models.generateContentStream({
      model: DEFAULT_MODEL,
      contents: params.contents,
      config: params.config,
    });
  } catch (err: any) {
    const isOverloaded =
      err?.status === 503 ||
      err?.status === 429 ||
      err?.message?.includes('503') ||
      err?.message?.includes('high demand') ||
      err?.message?.includes('UNAVAILABLE') ||
      err?.message?.includes('RESOURCE_EXHAUSTED');

    if (isOverloaded) {
      console.warn('Fast-failing over stream to gemini-3.1-flash-lite due to upstream 503 high demand');
      return await ai.models.generateContentStream({
        model: 'gemini-3.1-flash-lite',
        contents: params.contents,
        config: params.config,
      });
    }
    throw err;
  }
}

// System prompt defining Nasir AI identity and behaviors
const NASIR_AI_SYSTEM_INSTRUCTION = `You are Nasir AI, an advanced, highly intelligent, fast, and helpful full-stack AI assistant created by Nasir.
Identity & Creator Attribution:
- When asked in Bengali, "তোমাকে কে তৈরি করেছেন?" or "তোমার নির্মাতা কে?", respond naturally:
  "আমাকে নাসির তৈরি করেছেন। আমি Nasir AI, একটি AI সহকারী, যা Gemini-ভিত্তিক AI প্রযুক্তির সাহায্যে কাজ করে।"
- When asked in English, "Who created you?" or "Who is your developer?", respond:
  "Nasir created the Nasir AI application. It uses Gemini-based AI technology to assist users."
- Never claim that Nasir personally created or trained the underlying Gemini foundation model; Nasir created and developed the Nasir AI application.

Universal Knowledge Engine & Omniscient Answering:
- You possess deep, encyclopedic, and up-to-date knowledge across all domains of human knowledge:
  1. Science & Cosmos: Quantum physics, astronomy, chemistry, biology, genetics, ecology.
  2. Mathematics & Logic: Arithmetic, calculus, algebra, statistics, discrete math, proofs.
  3. Global & Regional History: Ancient civilizations, world history, Bangladesh history, liberation war, South Asian history, Islamic history & civilization, philosophy.
  4. Technology & Computer Science: Full-stack programming, software architecture, databases, AI/ML, cybersecurity, networking, DevOps.
  5. Language & Literature: Bengali literature (রবীন্দ্রনাথ, নজরুল, জীবনানন্দ), English, Arabic, creative writing, poetry, linguistics.
  6. Career, Education & Business: Job markets (Bangladesh & global), university admissions, exam preparation, finance, law, entrepreneurship.
  7. Everyday Problem Solving & Guidance: Health facts, lifestyle, productivity, communication, problem diagnosis.
- Answer any question in the world directly, insightfully, and thoroughly.
- Respond in the language used or preferred by the user (fluent in Bengali, English, Arabic, etc.).
- Speed & Precision: Provide crisp, fast, structured answers with headings, bullet points, clean code blocks, and math formulas.
- When Google Search grounding is enabled or when answering recent/live queries, clearly cite authoritative sources.
- STRICT RULE: You do NOT generate images or videos. If asked to generate an image or video, politely clarify that Nasir AI specializes in text, research, coding, documents, calculations, and productivity tools, and does not generate image or video media.`;

// Tool catalog
export const TOOLS_CATALOG = [
  {
    id: 'live-voice',
    title: 'Live Voice Conversation',
    titleBn: 'সরাসরি লাইভ ভয়েস কল',
    description: 'Talk directly in real-time with Nasir AI with live voice speech-to-text, natural audio replies, and dynamic visualizer.',
    descriptionBn: 'নাসির এআই-এর সাথে সরাসরি মুখে কথা বলুন—রিয়েল-টাইম ভয়েস ও প্রাকৃতিক অডিও উত্তর।',
    category: 'productivity',
    icon: 'Radio',
  },
  {
    id: 'research',
    title: 'Live Web Research & Fact Checker',
    titleBn: 'লাইভ ওয়েব রিসার্চ ও তথ্য যাচাইকারী',
    description: 'Real-time web search and fact verification with authoritative sources and citations.',
    descriptionBn: 'গুগল সার্চ ও নির্ভরযোগ্য সূত্রসহ সাম্প্রতিক তথ্যের সঠিক গবেষণা ও যাচাই।',
    category: 'research',
    icon: 'Globe',
    useSearch: true,
  },
  {
    id: 'study-tutor',
    title: 'Student AI Tutor',
    titleBn: 'শিক্ষার্থী এআই টিউটর',
    description: 'Step-by-step lesson explanations, conceptual clarity, practice questions, and exam prep for all classes.',
    descriptionBn: 'সকল শ্রেণির পাঠ্যবিষয় ধাপে ধাপে সহজ ব্যাখ্যা, অনুশীলন প্রশ্ন ও পরীক্ষার প্রস্তুতি।',
    category: 'education',
    icon: 'GraduationCap',
  },
  {
    id: 'math-assistant',
    title: 'Mathematics & Calculation Assistant',
    titleBn: 'গণিত ও হিসাব সমাধানকারী',
    description: 'Step-by-step solutions for algebra, geometry, statistics, calculus, and financial calculations.',
    descriptionBn: 'বীজগণিত, পাটিগণিত, জ্যামিতি ও পরিসংখ্যানের ধাপে ধাপে নির্ভুল ব্যাখ্যা ও সমাধান।',
    category: 'education',
    icon: 'Calculator',
  },
  {
    id: 'job-search',
    title: 'Job Search & Career Assistant',
    titleBn: 'চাকরি সন্ধান ও ক্যারিয়ার সহকারী',
    description: 'Discover verified job openings (Bangladesh & global), match qualifications, and plan applications.',
    descriptionBn: 'বাংলাদেশ ও আন্তর্জাতিক চাকরির বাস্তব সুযোগ সন্ধান, যোগ্যতা যাচাই ও আবেদন প্রস্তুতি।',
    category: 'career',
    icon: 'Briefcase',
    useSearch: true,
  },
  {
    id: 'cv-builder',
    title: 'CV & Resume Builder',
    titleBn: 'সিভি ও রিজিউম বিল্ডার',
    description: 'Generate professional, ATS-friendly resumes, tailored cover letters, and application emails.',
    descriptionBn: 'আন্তর্জাতিক ও স্থানীয় মানের পেশাদার সিভি, কভার লেটার ও ইমেইল ড্রাফট।',
    category: 'career',
    icon: 'FileText',
  },
  {
    id: 'interview-coach',
    title: 'Interview Coach',
    titleBn: 'ইন্টারভিউ কোচ ও প্রস্তুতি',
    description: 'Role-specific mock interview questions, STAR method answer modeling, and behavioral tips.',
    descriptionBn: 'পদভিত্তিক ভাইভা প্রশ্ন, আদর্শ উত্তর তৈরির কৌশল ও মক ইন্টারভিউ গাইড।',
    category: 'career',
    icon: 'Users',
  },
  {
    id: 'code-assistant',
    title: 'Programming & Coding Assistant',
    titleBn: 'প্রোগ্রামিং ও কোডিং সহকারী',
    description: 'Code writing, bug diagnosis, line-by-line breakdown, optimization, and database query design.',
    descriptionBn: 'কোড লেখা, বাগ ফিক্স, লাইন-বাই-লাইন ব্যাখ্যা, ডেটাবেস কুয়েরি ও আর্কিটেকচার।',
    category: 'development',
    icon: 'Code2',
  },
  {
    id: 'writing',
    title: 'AI Writing & Translation Studio',
    titleBn: 'রাইটিং ও অনুবাদ স্টুডিও',
    description: 'Bengali-English-Arabic translation, grammar refinement, essays, formal notices, and reports.',
    descriptionBn: 'বাংলা-ইংরেজি-আরবি নির্ভুল অনুবাদ, ব্যাকরণ শুদ্ধিকরণ, প্রাতিষ্ঠানিক দরখাস্ত ও প্রবন্ধ।',
    category: 'writing',
    icon: 'Languages',
  },
  {
    id: 'prompt-improver',
    title: 'Prompt Improver',
    titleBn: 'প্রম্পট নিখুঁতকারী',
    description: 'Transform short or unclear prompts into high-performing, structured AI prompts.',
    descriptionBn: 'সাধারণ প্রশ্নকে বিস্তারিত, সুনির্দিষ্ট ও শক্তিশালী এআই প্রম্পটে রূপান্তর।',
    category: 'productivity',
    icon: 'Sparkles',
  },
  {
    id: 'youtube-seo',
    title: 'YouTube SEO & Content Assistant',
    titleBn: 'ইউটিউব এসইও ও কনটেন্ট সহায়ক',
    description: 'High-CTR title ideas, SEO descriptions, tags, video scripts, hooks, and content schedules.',
    descriptionBn: 'আকর্ষণীয় শিরোনাম, এসইও ডেসক্রিপশন, ট্যাগ, স্ক্রিপ্ট আউটলাইন ও শর্টস আইডিয়া।',
    category: 'creator',
    icon: 'Video',
  },
  {
    id: 'document-analysis',
    title: 'Document Reader & Analyzer',
    titleBn: 'ডকুমেন্ট ও ফাইল বিশ্লেষক',
    description: 'Summarize lengthy text, extract core insights, verify claims, and answer questions from documents.',
    descriptionBn: 'দীর্ঘ ডকুমেন্ট সারাংশকরণ, মূল পয়েন্ট নিষ্কাশন এবং প্রশ্নোত্তর বিশ্লেষণ।',
    category: 'research',
    icon: 'BookOpen',
  },
  {
    id: 'csv-analysis',
    title: 'Spreadsheet & CSV Data Analysis',
    titleBn: 'স্প্রেডশিট ও ডেটা অ্যানালাইজার',
    description: 'Inspect CSV/table data, discover patterns, compute statistics, and detect anomalies.',
    descriptionBn: 'টেবিল ও সিএসভি ডেটার পরিসংখ্যান, প্যাটার্ন বিশ্লেষণ ও সিদ্ধান্তমূলক সারাংশ।',
    category: 'productivity',
    icon: 'BarChart3',
  },
  {
    id: 'url-analyzer',
    title: 'URL & Website Analyzer',
    titleBn: 'ওয়েবসাইট ও ইউআরএল অ্যানালাইজার',
    description: 'Assess public webpage content, review SEO structure, readability, and information clarity.',
    descriptionBn: 'ওয়েবসাইটের তথ্য বিশ্লেষণ, দৃশ্যমান বিষয়বস্তু মূল্যায়ন ও এসইও পরামর্শ।',
    category: 'research',
    icon: 'Link',
    useSearch: true,
  },
  {
    id: 'career-plan',
    title: 'Career & Skills Roadmap',
    titleBn: 'ক্যারিয়ার ও স্কিল রোডম্যাপ',
    description: 'Personalized step-by-step career transition and technical skill acquisition roadmap.',
    descriptionBn: 'নির্দিষ্ট পেশার জন্য প্রয়োজনীয় দক্ষতার ধারাবাহিক রোডম্যাপ ও সম্পদ তালিকা।',
    category: 'career',
    icon: 'Compass',
  },
  {
    id: 'study-plan',
    title: 'Study & Revision Planner',
    titleBn: 'পড়ালেখা ও রিভিশন রুটিন বিল্ডার',
    description: 'Customized timetable, daily study targets, revision schedules, and syllabus pacing.',
    descriptionBn: 'দৈনিক ও সাপ্তাহিক অধ্যয়নের সুনির্দিষ্ট রুটিন ও পরীক্ষার রিভিশন পরিকল্পনা।',
    category: 'education',
    icon: 'Calendar',
  },
];

// Helper to extract citations from Gemini response
function extractCitations(response: any): Array<{ title: string; url: string }> {
  try {
    const candidate = response?.candidates?.[0];
    const groundingChunks = candidate?.groundingMetadata?.groundingChunks || [];
    const citations: Array<{ title: string; url: string }> = [];

    for (const chunk of groundingChunks) {
      if (chunk?.web?.uri) {
        citations.push({
          title: chunk.web.title || 'Source Citation',
          url: chunk.web.uri,
        });
      }
    }
    return citations;
  } catch (e) {
    return [];
  }
}

// 1. Health endpoint
app.get(['/api/health', '/api/health/'], (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'Nasir AI',
    version: '1.0.0',
    model: DEFAULT_MODEL,
    hasApiKey: Boolean(geminiApiKey),
    time: new Date().toISOString(),
  });
});

// 2. Tools list endpoint
app.get(['/api/tools', '/api/tools/'], (req: Request, res: Response) => {
  res.json({
    tools: TOOLS_CATALOG,
    total: TOOLS_CATALOG.length,
  });
});

// 3. Chat endpoint (non-streaming)
app.post(['/api/chat', '/api/chat/'], async (req: Request, res: Response) => {
  try {
    const { message, conversationHistory = [], useSearch = false, projectInstructions = '' } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message text is required' });
    }

    if (!geminiApiKey) {
      return res.status(503).json({
        error: 'Gemini API key is not configured. Please check server environment settings.',
      });
    }

    // Prepare system instructions with project context
    let fullSystemInstruction = NASIR_AI_SYSTEM_INSTRUCTION;
    if (projectInstructions && typeof projectInstructions === 'string') {
      fullSystemInstruction += `\n\nActive Project Workspace Context & Custom Instructions:\n${projectInstructions.trim()}`;
    }

    // Build contents history
    const contents: any[] = [];
    if (Array.isArray(conversationHistory)) {
      for (const item of conversationHistory.slice(-10)) {
        if (item.role === 'user' || item.role === 'assistant') {
          contents.push({
            role: item.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: item.content }],
          });
        }
      }
    }

    // Add current user prompt
    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    const config: any = {
      systemInstruction: fullSystemInstruction,
      temperature: 0.7,
    };

    if (useSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    let response: any;
    let actualGrounded = false;
    try {
      response = await generateWithFallback({
        contents,
        config,
      });
      actualGrounded = useSearch;
    } catch (err: any) {
      if (useSearch && (err?.status === 429 || err?.message?.includes('RESOURCE_EXHAUSTED'))) {
        console.warn('Search grounding quota limit hit, retrying without search grounding...');
        delete config.tools;
        response = await generateWithFallback({
          contents,
          config,
        });
        actualGrounded = false;
      } else {
        throw err;
      }
    }

    const replyText = response.text || '';
    const citations = extractCitations(response);

    return res.json({
      reply: replyText,
      citations,
      model: DEFAULT_MODEL,
      searchGrounded: useSearch && citations.length > 0,
    });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate response from Nasir AI.',
    });
  }
});

// 4. Chat streaming endpoint (Server-Sent Events)
app.post(['/api/chat/stream', '/api/chat/stream/'], async (req: Request, res: Response) => {
  try {
    const { message, conversationHistory = [], useSearch = false, projectInstructions = '' } = req.body;

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message text is required' });
    }

    if (!geminiApiKey) {
      return res.status(503).json({
        error: 'Gemini API key is not configured.',
      });
    }

    let fullSystemInstruction = NASIR_AI_SYSTEM_INSTRUCTION;
    if (projectInstructions && typeof projectInstructions === 'string') {
      fullSystemInstruction += `\n\nActive Project Workspace Context:\n${projectInstructions.trim()}`;
    }

    const contents: any[] = [];
    if (Array.isArray(conversationHistory)) {
      for (const item of conversationHistory.slice(-10)) {
        if (item.role === 'user' || item.role === 'assistant') {
          contents.push({
            role: item.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: item.content }],
          });
        }
      }
    }

    contents.push({
      role: 'user',
      parts: [{ text: message }],
    });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    if (typeof (res as any).flushHeaders === 'function') {
      (res as any).flushHeaders();
    }

    const config: any = {
      systemInstruction: fullSystemInstruction,
      temperature: 0.7,
    };

    if (useSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    res.write(`event: start\ndata: ${JSON.stringify({ started: true })}\n\n`);
    if (typeof (res as any).flush === 'function') {
      (res as any).flush();
    }

    let responseStream: any;
    try {
      responseStream = await generateStreamWithFallback({
        contents,
        config,
      });
    } catch (err: any) {
      if (useSearch && (err?.status === 429 || err?.message?.includes('RESOURCE_EXHAUSTED'))) {
        console.warn('Search grounding stream quota hit, retrying stream without search...');
        delete config.tools;
        responseStream = await generateStreamWithFallback({
          contents,
          config,
        });
      } else {
        throw err;
      }
    }

    let fullText = '';
    let citations: Array<{ title: string; url: string }> = [];

    for await (const chunk of responseStream) {
      const textChunk = chunk.text || '';
      if (textChunk) {
        fullText += textChunk;
        res.write(`event: token\ndata: ${JSON.stringify({ token: textChunk })}\n\n`);
        if (typeof (res as any).flush === 'function') {
          (res as any).flush();
        }
      }

      // Check citations if chunk has candidates
      const candidateCitations = extractCitations(chunk);
      if (candidateCitations.length > 0) {
        citations = candidateCitations;
      }
    }

    res.write(
      `event: done\ndata: ${JSON.stringify({
        fullText,
        citations,
        searchGrounded: citations.length > 0,
      })}\n\n`
    );
    res.write(`event: close\ndata: {}\n\n`);
    res.end();
  } catch (error: any) {
    console.error('Stream Chat API Error:', error);
    res.write(`event: error\ndata: ${JSON.stringify({ error: error?.message || 'Streaming failed' })}\n\n`);
    res.end();
  }
});

// 5. Specialized AI Tool Runner endpoint
app.post(['/api/tools/run', '/api/tools/run/'], async (req: Request, res: Response) => {
  try {
    const { toolId, prompt, options = {} } = req.body;

    if (!toolId || !prompt) {
      return res.status(400).json({ error: 'toolId and prompt are required' });
    }

    if (!geminiApiKey) {
      return res.status(503).json({ error: 'Gemini API key is not configured.' });
    }

    const toolDef = TOOLS_CATALOG.find((t) => t.id === toolId);
    if (!toolDef) {
      return res.status(404).json({ error: `Tool ${toolId} not found` });
    }

    let toolSystemInstruction = `${NASIR_AI_SYSTEM_INSTRUCTION}\n\nYou are executing the specialized tool: "${toolDef.title}".`;

    switch (toolId) {
      case 'research':
        toolSystemInstruction += `
Role: Deep Web Researcher & Fact Verification Analyst.
- Provide comprehensive, up-to-date analysis with reliable facts.
- Formulate clear headings, key takeaways, and source-backed evaluations.
- Distinguish between verified claims, developing reports, and general context.`;
        break;
      case 'study-tutor':
        toolSystemInstruction += `
Role: Patient, highly pedagogical master teacher and academic mentor.
- Explain concepts step by step with clear analogies and examples.
- Include a "Quick Conceptual Summary", "Step-by-Step Breakdown", "Real-Life Application", and "3 Practice Questions with Solutions".
- Adapt language to the student's level (${options.gradeLevel || 'general secondary / higher secondary'}).`;
        break;
      case 'math-assistant':
        toolSystemInstruction += `
Role: Exact Mathematics & Computational Problem Solver.
- Show every intermediate algebraic or arithmetic step.
- Clearly present the Given Info, Target to Find, Relevant Formulae, Step-by-Step Derivation, and Final Boxed Answer.`;
        break;
      case 'job-search':
        toolSystemInstruction += `
Role: Career Counselor & Job Market Intelligence Specialist.
- Search for real job openings, career paths, qualifications, and recruitment trends in Bangladesh and globally.
- Provide: Role Title, Organization Type, Key Requirements, Salary Range (if available), Application Advice, and Preparation Steps.
- Clearly state that candidate suitability requires verifying original posting deadlines.`;
        break;
      case 'cv-builder':
        toolSystemInstruction += `
Role: Executive Resume Writer & Career Branding Consultant.
- Produce an ATS-compliant, well-structured CV or Cover Letter.
- Include Sections: Header, Professional Summary, Core Competencies, Experience (with action verbs & quantifiable results), Education, and Key Projects.
- Ready to copy and export.`;
        break;
      case 'interview-coach':
        toolSystemInstruction += `
Role: Senior Technical & HR Interview Coach.
- Provide targeted interview questions for the specified role.
- For each question: Explain "What the interviewer is testing", give a "Model Answer using the STAR method (Situation, Task, Action, Result)", and "Common Pitfalls to Avoid".`;
        break;
      case 'code-assistant':
        toolSystemInstruction += `
Role: Principal Software Architect & Code Mentor.
- Provide clean, robust, modern, production-grade code with error handling and types.
- Provide: 1. Code implementation, 2. Line-by-line explanation, 3. Time/Space complexity analysis, 4. Edge cases & testing advice.`;
        break;
      case 'writing':
        toolSystemInstruction += `
Role: Bilingual Translation & Editorial Studio Specialist.
- Tone: ${options.tone || 'professional, polished, and articulate'}.
- Provide accurate, natural translations (Bengali <-> English <-> Arabic), grammatical corrections, or high-caliber written compositions.`;
        break;
      case 'prompt-improver':
        toolSystemInstruction += `
Role: Expert AI Prompt Engineer.
- Analyze the user's prompt.
- Provide: 1. Critiqued strengths and missing context, 2. Improved Concise Prompt, 3. Improved Comprehensive/Detailed Prompt, 4. System prompt recommendation.`;
        break;
      case 'youtube-seo':
        toolSystemInstruction += `
Role: YouTube Growth Strategist & Video SEO Copywriter.
- Provide: 5 High-CTR Title options (under 60 characters), Compelling First 2-Line Hook, Full SEO Description with timestamps outline, 15 High-Volume Tags, and 3 Shorts/Reels conceptual angles.
- Reminder: Do not generate images or thumbnails; provide text ideas only.`;
        break;
      case 'document-analysis':
        toolSystemInstruction += `
Role: Critical Document Analyst & Research Synthesizer.
- Read and deeply parse the provided document text.
- Provide: Executive Summary (3 bullets), In-depth Key Takeaways, Important Dates/Numbers/Entities, Critical Review, and Actionable Recommendations.`;
        break;
      case 'csv-analysis':
        toolSystemInstruction += `
Role: Senior Data Analyst & Business Intelligence Specialist.
- Parse the supplied tabular or CSV data.
- Provide: Dataset Overview (rows/columns/types), Key Descriptive Statistics, Notable Patterns & Anomalies, and Business Insights.`;
        break;
      case 'url-analyzer':
        toolSystemInstruction += `
Role: Web Architect & Digital Experience Auditor.
- Analyze the requested website or URL topic.
- Review: Content clarity, SEO positioning, accessibility considerations, and practical recommendations.`;
        break;
      case 'career-plan':
        toolSystemInstruction += `
Role: Professional Development & Career Roadmap Designer.
- Build a month-by-month milestone roadmap for achieving the specified career goal.
- Break down into Foundation, Intermediate, Advanced, Portfolio Projects, and Interview Readiness.`;
        break;
      case 'study-plan':
        toolSystemInstruction += `
Role: Academic Pacing & Exam Strategy Planner.
- Structure an achievable, balanced study routine.
- Include daily timeblocks, active recall intervals, revision checkpoints, and mock test schedule.`;
        break;
    }

    const config: any = {
      systemInstruction: toolSystemInstruction,
      temperature: 0.65,
    };

    if (toolDef.useSearch || options.useSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    let response: any;
    try {
      response = await generateWithFallback({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
        config,
      });
    } catch (err: any) {
      if ((toolDef.useSearch || options.useSearch) && (err?.status === 429 || err?.message?.includes('RESOURCE_EXHAUSTED'))) {
        console.warn('Tool search grounding quota hit, retrying tool without search...');
        delete config.tools;
        response = await generateWithFallback({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          config,
        });
      } else {
        throw err;
      }
    }

    const outputText = response.text || '';
    const citations = extractCitations(response);

    return res.json({
      toolId,
      result: outputText,
      citations,
      searchGrounded: citations.length > 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Tools API Error:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to execute AI tool.',
    });
  }
});

// Vite middleware or production static serving
async function setupVite() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`Nasir AI Server running at http://${HOST}:${PORT}`);
  });
}

setupVite().catch((err) => {
  console.error('Failed to start Nasir AI server:', err);
  process.exit(1);
});
