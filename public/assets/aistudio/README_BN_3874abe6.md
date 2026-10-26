# Nasir AI — Backend API Starter

এটি Nasir AI অ্যাপের জন্য Node.js + TypeScript backend API। এতে Gemini AI chat, ঐচ্ছিক Google Search grounding, Firebase ID-token authentication, Firestore chat history, projects এবং ১২টি AI productivity tool-এর API তৈরি করা আছে। এটি **ইমেজ জেনারেটর বা ভিডিও জেনারেটর অন্তর্ভুক্ত করে না**।

> গুরুত্বপূর্ণ: এই প্রজেক্টের কোড তৈরি করা হয়েছে, কিন্তু আপনার Gemini API key ও Firebase project যুক্ত না করা পর্যন্ত ব্যক্তিগত ডেটাবেস-ভিত্তিক endpoint-গুলো বাস্তবভাবে ব্যবহার করা যাবে না। API চালু হওয়া মানেই বাহ্যিক সেবা সংযোগ যাচাই হয়ে গেছে—এমন নয়।

## কী কী API আছে

| Method | Endpoint | কাজ |
|---|---|---|
| GET | `/api/health` | API চলছে কি না ও configuration status |
| GET | `/api/tools` | বর্তমানে বাস্তবায়িত AI tools-এর তালিকা |
| POST | `/api/chat` | Gemini AI-কে প্রশ্ন, উত্তর ও Firestore-এ history সংরক্ষণ |
| POST | `/api/chat/stream` | Server-Sent Events দিয়ে live response streaming |
| GET | `/api/conversations` | নিজের সাম্প্রতিক conversations |
| POST | `/api/conversations` | নতুন conversation তৈরি |
| GET | `/api/conversations/:conversationId` | conversation ও messages পড়া |
| PATCH | `/api/conversations/:conversationId` | conversation-এর নাম বদলানো |
| DELETE | `/api/conversations/:conversationId` | conversation ও message মুছে ফেলা |
| GET | `/api/projects` | নিজের projects-এর তালিকা |
| POST | `/api/projects` | project তৈরি |
| GET | `/api/projects/:projectId` | project দেখা |
| PATCH | `/api/projects/:projectId` | project-এর তথ্য/নির্দেশনা পরিবর্তন |
| DELETE | `/api/projects/:projectId` | project মুছে ফেলা; সংশ্লিষ্ট chat আলাদা করে রাখা |
| POST | `/api/tools/run` | নিচের AI productivity tool চালানো |

### বর্তমানে অন্তর্ভুক্ত tools

Live Web Research, Job Search Assistant, Student AI Tutor, Study Plan Builder, Writing Studio, Translation Studio, CV/Cover Letter Builder, Interview Coach, Coding Assistant, Prompt Improver, YouTube SEO Assistant এবং Career Planner। Live Research ও Job Search-এর ক্ষেত্রে API Gemini-র Google Search grounding ব্যবহারের অনুরোধ করে; প্রকৃত search access, model support এবং billing/API quota Google account-এর configuration-এর ওপর নির্ভর করে।

এই starter-এ PDF/DOCX/XLSX upload processing বা file-storage endpoint এখনো তৈরি করা হয়নি। সেগুলোকে সম্পূর্ণ চালু feature হিসেবে ধরা যাবে না; যোগ করার জন্য আলাদা secure upload/storage module দরকার।

## চালানোর আগে যা দরকার

- Node.js 22 বা পরবর্তী সংস্করণ
- Google AI Studio থেকে Gemini API key
- Firebase project
- Firebase Authentication-এ Google sign-in বা আপনার পছন্দের sign-in provider চালু
- Firebase/Google Cloud-এ Cloud Firestore চালু
- Firebase Admin SDK-এর credentials

## ধাপ ১ — ফাইল খুলুন

ZIP extract করে `nasir-ai-api` ফোল্ডারে Terminal বা PowerShell খুলুন।

```bash
npm install
```

## ধাপ ২ — পরিবেশের সেটিংস তৈরি করুন

`.env.example` ফাইলের একটি কপি `.env` নামে তৈরি করুন। তারপর মান বসান:

```env
NODE_ENV=development
HOST=0.0.0.0
PORT=8080
FRONTEND_ORIGIN=http://localhost:5173
GEMINI_API_KEY=আপনার_GEMINI_API_KEY
GEMINI_MODEL=gemini-3.8-flash
FIREBASE_PROJECT_ID=আপনার_FIREBASE_PROJECT_ID
GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
API_RATE_LIMIT_MAX=60
API_RATE_LIMIT_WINDOW=1 minute
```

`service-account.json` হলো Firebase Admin SDK-এর ব্যক্তিগত credential ফাইল। এটি Firebase Console/Google Cloud-এর Service Accounts থেকে নিরাপদভাবে সংগ্রহ করুন। **ফাইলটি কাউকে পাঠাবেন না, GitHub-এ আপলোড করবেন না এবং public folder-এ রাখবেন না।** এই ZIP-এ কোনো বাস্তব API key বা credential রাখা নেই। Google-hosted deployment-এ উপযুক্ত Application Default Credentials / service identity ব্যবহার করা উত্তম।

অথবা deployment platform-এর secret manager-এ `FIREBASE_SERVICE_ACCOUNT_JSON` হিসেবে service-account JSON secret দিন; সেক্ষেত্রে local `GOOGLE_APPLICATION_CREDENTIALS` দরকার নাও হতে পারে।

## ধাপ ৩ — API চালু করুন

Development mode:

```bash
npm run dev
```

Health endpoint browser-এ খুলুন:

```text
http://localhost:8080/api/health
```

Production build:

```bash
npm run build
npm start
```

## ধাপ ৪ — Firebase Authentication থেকে ID token নেওয়া

Frontend-এ ব্যবহারকারী Firebase Authentication দিয়ে sign in করার পর client SDK-এর signed-in user থেকে ID token নিন। এই ID token পাঠাতে হবে:

```http
Authorization: Bearer FIREBASE_ID_TOKEN
```

API bearer token Firebase Admin SDK দিয়ে verify করে। নিজের frontend থেকে token তৈরি বা অনুমান করবেন না। Token অন্যের সঙ্গে শেয়ার করবেন না।

## ধাপ ৫ — Chat API ব্যবহার

```bash
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer FIREBASE_ID_TOKEN" \
  -d '{"message":"বাংলায় সৌরজগত সহজভাবে বুঝিয়ে বলুন","useSearch":false}'
```

নতুন chat চাইলে `conversationId` বাদ দিন; API conversation তৈরি করে ID ফেরত দেবে। পরের বার একই chat চালিয়ে যেতে সেই `conversationId` পাঠান:

```json
{
  "message": "আরও একটি উদাহরণ দিন",
  "conversationId": "আগের_API_থেকে_পাওয়া_ID",
  "useSearch": false
}
```

সাম্প্রতিক তথ্য ও প্রকৃত source citation দরকার হলে `useSearch: true` দিন। Google Search grounding-এর ব্যবহার Google-এর API/model support ও বর্তমান billing policy অনুযায়ী হতে পারে।

## Tool API উদাহরণ

```bash
curl -X POST http://localhost:8080/api/tools/run \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer FIREBASE_ID_TOKEN" \
  -d '{"toolId":"study-tutor","prompt":"ষষ্ঠ শ্রেণির ভগ্নাংশ সহজ করে শেখান","language":"Bengali"}'
```

`toolId` হিসেবে `/api/tools` endpoint-এ ফেরত পাওয়া তালিকার ID ব্যবহার করুন।

## Streaming API

`POST /api/chat/stream` Server-Sent Events ফেরত দেয়। Client-কে request body-তে `message` ও ঐচ্ছিক `conversationId`, `projectId`, `useSearch` দিতে হবে। Event-গুলো হলো `start`, `token`, `done`, `error`, `close`। SSE POST request পড়তে `fetch()` ও `ReadableStream` ব্যবহার করুন; browser-এর `EventSource` সাধারণত custom POST body পাঠাতে পারে না।

## Firestore data layout

```text
users/{uid}/
  conversations/{conversationId}/
    messages/{messageId}
  projects/{projectId}
```

ব্যবহারকারী-সম্পর্কিত ডেটা UID-ভিত্তিক path-এ রাখা হয়েছে। Admin SDK Firestore Security Rules bypass করে, তাই API-তে authenticated UID থেকেই path তৈরি করা হয়। Frontend থেকে পাঠানো UID-এর ওপর কখনো ভরসা করবেন না। আপনার Firebase Security Rules-ও least-privilege অনুযায়ী সেট করুন।

## গুরুত্বপূর্ণ নিরাপত্তা ও খরচ

- Gemini API key শুধু backend/environment secret-এ রাখবেন।
- Production-এ অবশ্যই HTTPS ব্যবহার করুন এবং `FRONTEND_ORIGIN`-এ সঠিক frontend origin দিন।
- AI model ও Google Search usage-এর খরচ, quota এবং rate limit আপনার Google account/project-এর শর্তের ওপর নির্ভর করে।
- Current job search কোনো চাকরি নিশ্চিত করে না। ব্যবহারকারীদের original job listing যাচাই করতে হবে।
- `GET /api/health` শুধু API process ও configuration flag দেখায়; Gemini/Firebase-এ real request দিয়ে স্বাস্থ্য পরীক্ষা করে না।
- নতুন feature যোগ করার পর `npm run typecheck` এবং `npm run build` চালান; credentials যোগ করার পরে authenticated endpoint-ও বাস্তবে পরীক্ষা করুন।

## Type check এবং build

```bash
npm run typecheck
npm run build
```

## Documentation

`openapi.yaml` ফাইলে API-এর OpenAPI 3.1 specification রয়েছে। এটি Swagger Editor বা অন্য OpenAPI-compatible viewer-এ খুলে endpoint-গুলো পড়তে পারবেন।
