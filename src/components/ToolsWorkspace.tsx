import React, { useState } from 'react';
import {
  Globe,
  GraduationCap,
  Calculator,
  Briefcase,
  FileText,
  Users,
  Code2,
  Languages,
  Sparkles,
  Video,
  BookOpen,
  BarChart3,
  Link,
  Compass,
  Calendar,
  Send,
  Loader2,
  Copy,
  Check,
  BookmarkPlus,
  ArrowRight,
  ExternalLink,
  Printer,
  Download,
  Filter,
  Menu,
} from 'lucide-react';
import { AIToolDef, Language, Citation } from '../lib/types';
import { translations } from '../lib/translations';
import { runAITool } from '../lib/api';
import { MarkdownView } from './MarkdownView';

interface ToolsWorkspaceProps {
  onStartChatWithPrompt: (prompt: string, useSearch?: boolean) => void;
  onSaveToNotes: (title: string, content: string) => void;
  language: Language;
  onToggleSidebar?: () => void;
}

export const ToolsWorkspace: React.FC<ToolsWorkspaceProps> = ({
  onStartChatWithPrompt,
  onSaveToNotes,
  language,
  onToggleSidebar,
}) => {
  const t = translations[language];

  // Tool Definitions
  const toolsList: AIToolDef[] = [
    {
      id: 'research',
      title: 'Live Web Research & Fact Checker',
      titleBn: 'লাইভ ওয়েব রিসার্চ ও তথ্য যাচাইকারী',
      description: 'Real-time web research and fact verification with authoritative sources and citations.',
      descriptionBn: 'গুগল সার্চ ও নির্ভরযোগ্য সূত্রসহ সাম্প্রতিক তথ্যের সঠিক গবেষণা ও যাচাই।',
      category: 'research',
      icon: 'Globe',
      useSearch: true,
    },
    {
      id: 'study-tutor',
      title: 'Student AI Tutor',
      titleBn: 'শিক্ষার্থী এআই টিউটর',
      description: 'Step-by-step lesson explanations, conceptual clarity, practice questions, and exam prep.',
      descriptionBn: 'সকল শ্রেণির পাঠ্যবিষয় ধাপে ধাপে সহজ ব্যাখ্যা, অনুশীলন প্রশ্ন ও পরীক্ষার প্রস্তুতি।',
      category: 'education',
      icon: 'GraduationCap',
    },
    {
      id: 'math-assistant',
      title: 'Mathematics & Calculation Assistant',
      titleBn: 'গণিত ও হিসাব সমাধানকারী',
      description: 'Exact step-by-step problem solver for algebra, calculus, arithmetic, geometry, and statistics.',
      descriptionBn: 'বীজগণিত, পাটিগণিত, জ্যামিতি ও পরিসংখ্যানের ধাপে ধাপে নির্ভুল সমাধান।',
      category: 'education',
      icon: 'Calculator',
    },
    {
      id: 'job-search',
      title: 'Job Search & Career Assistant',
      titleBn: 'চাকরি সন্ধান ও ক্যারিয়ার সহকারী',
      description: 'Search current job vacancies in Bangladesh & globally with live search grounding.',
      descriptionBn: 'বাংলাদেশ ও আন্তর্জাতিক চাকরির বাস্তব সুযোগ সন্ধান, যোগ্যতা যাচাই ও আবেদন প্রস্তুতি।',
      category: 'career',
      icon: 'Briefcase',
      useSearch: true,
    },
    {
      id: 'cv-builder',
      title: 'CV & Resume Builder',
      titleBn: 'সিভি ও রিজিউম বিল্ডার',
      description: 'Generate ATS-friendly executive CVs, professional cover letters, and application emails.',
      descriptionBn: 'আন্তর্জাতিক মানের পেশাদার সিভি, কভার লেটার ও প্রাতিষ্ঠানিক চাকরির আবেদন।',
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
      description: 'Code writing, bug diagnosis, line-by-line breakdown, optimization, and database schemas.',
      descriptionBn: 'কোড তৈরি, বাগ ফিক্স, লাইন-বাই-লাইন ব্যাখ্যা ও ডেটাবেস স্কিমা ডিজাইন।',
      category: 'development',
      icon: 'Code2',
    },
    {
      id: 'writing',
      title: 'AI Writing & Translation Studio',
      titleBn: 'রাইটিং ও অনুবাদ স্টুডিও',
      description: 'Bengali-English-Arabic translation, grammar refinement, essays, formal notices, and reports.',
      descriptionBn: 'বাংলা-ইংরেজি-আরবি নির্ভুল অনুবাদ, ব্যাকরণ শুদ্ধিকরণ ও প্রাতিষ্ঠানিক দরখাস্ত।',
      category: 'writing',
      icon: 'Languages',
    },
    {
      id: 'prompt-improver',
      title: 'Prompt Improver',
      titleBn: 'প্রম্পট নিখুঁতকারী',
      description: 'Transform rough or short requests into structured, high-performing AI prompts.',
      descriptionBn: 'সাধারণ ধারণাকে বিস্তারিত, সুনির্দিষ্ট ও শক্তিশালী এআই প্রম্পটে রূপান্তর।',
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
      description: 'Summarize lengthy text, extract core insights, verify claims, and answer questions.',
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
      descriptionBn: 'ওয়েবসাইটের বিষয়বস্তু মূল্যায়ন, দৃশ্যমান তথ্য বিশ্লেষণ ও এসইও পর্যালোচনা।',
      category: 'research',
      icon: 'Link',
      useSearch: true,
    },
    {
      id: 'career-plan',
      title: 'Career & Skills Roadmap',
      titleBn: 'ক্যারিয়ার ও স্কিল রোডম্যাপ',
      description: 'Personalized step-by-step career transition and technical skill acquisition roadmap.',
      descriptionBn: 'নির্দিষ্ট পেশার জন্য প্রয়োজনীয় দক্ষতার ধারাবাহিক রোডম্যাপ ও গাইড।',
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

  const [selectedToolId, setSelectedToolId] = useState<string>('research');
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [inputPrompt, setInputPrompt] = useState('');
  const [customGrade, setCustomGrade] = useState('Secondary / Class 9-10');
  const [customTone, setCustomTone] = useState('Professional & Articulate');
  const [customRole, setCustomRole] = useState('Software Engineer');
  const [isRunning, setIsRunning] = useState(false);
  const [resultOutput, setResultOutput] = useState<string | null>(null);
  const [resultCitations, setResultCitations] = useState<Citation[]>([]);
  const [copied, setCopied] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  const selectedTool = toolsList.find((t) => t.id === selectedToolId) || toolsList[0];

  const getToolIcon = (iconName: string) => {
    switch (iconName) {
      case 'Globe':
        return <Globe className="w-5 h-5 text-teal-400" />;
      case 'GraduationCap':
        return <GraduationCap className="w-5 h-5 text-indigo-400" />;
      case 'Calculator':
        return <Calculator className="w-5 h-5 text-emerald-400" />;
      case 'Briefcase':
        return <Briefcase className="w-5 h-5 text-amber-400" />;
      case 'FileText':
        return <FileText className="w-5 h-5 text-sky-400" />;
      case 'Users':
        return <Users className="w-5 h-5 text-violet-400" />;
      case 'Code2':
        return <Code2 className="w-5 h-5 text-teal-400" />;
      case 'Languages':
        return <Languages className="w-5 h-5 text-rose-400" />;
      case 'Sparkles':
        return <Sparkles className="w-5 h-5 text-amber-300" />;
      case 'Video':
        return <Video className="w-5 h-5 text-red-400" />;
      case 'BookOpen':
        return <BookOpen className="w-5 h-5 text-blue-400" />;
      case 'BarChart3':
        return <BarChart3 className="w-5 h-5 text-cyan-400" />;
      case 'Link':
        return <Link className="w-5 h-5 text-teal-400" />;
      case 'Compass':
        return <Compass className="w-5 h-5 text-orange-400" />;
      case 'Calendar':
        return <Calendar className="w-5 h-5 text-emerald-400" />;
      default:
        return <Sparkles className="w-5 h-5 text-teal-400" />;
    }
  };

  const handleRunTool = async () => {
    if (!inputPrompt.trim() || isRunning) return;

    setIsRunning(true);
    setResultOutput(null);
    setResultCitations([]);

    try {
      const data = await runAITool(selectedTool.id, inputPrompt.trim(), {
        useSearch: selectedTool.useSearch,
        gradeLevel: customGrade,
        tone: customTone,
        targetRole: customRole,
      });

      setResultOutput(data.result);
      setResultCitations(data.citations || []);
    } catch (err: any) {
      setResultOutput(`Error executing tool: ${err.message}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCopy = () => {
    if (!resultOutput) return;
    navigator.clipboard.writeText(resultOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveNote = () => {
    if (!resultOutput) return;
    const title = `${selectedTool.title} Result - ${new Date().toLocaleDateString()}`;
    onSaveToNotes(title, resultOutput);
    setNoteSaved(true);
    setTimeout(() => setNoteSaved(false), 2000);
  };

  const handleLaunchChatWithResult = () => {
    if (!resultOutput) return;
    const promptText = `Based on this ${selectedTool.title} output:\n\n${resultOutput.slice(
      0,
      1500
    )}\n\nCan you explain further and help me with next steps?`;
    onStartChatWithPrompt(promptText, selectedTool.useSearch);
  };

  const filteredTools = toolsList.filter((tool) => {
    if (activeCategory === 'all') return true;
    return tool.category === activeCategory;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-900/40 overflow-hidden">
      {/* Top Header */}
      <header className="h-14 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md px-6 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Toggle Sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-base font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-400" />
            <span>{t.toolsTitle}</span>
          </h1>
        </div>

        {/* Categories Bar */}
        <div className="hidden md:flex items-center gap-1 text-xs">
          {['all', 'research', 'education', 'career', 'development', 'writing', 'creator'].map(
            (cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 rounded-lg capitalize transition-colors ${
                  activeCategory === cat
                    ? 'bg-zinc-800 text-teal-400 font-semibold'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                {cat}
              </button>
            )
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left: Tools Selector Menu */}
        <div className="lg:col-span-4 border-r border-zinc-800/80 overflow-y-auto p-4 space-y-2 bg-zinc-950/60 scrollbar-thin scrollbar-thumb-zinc-800">
          <p className="text-xs font-semibold text-zinc-400 px-2 uppercase tracking-wider mb-2">
            Catalog ({filteredTools.length} Tools)
          </p>

          <div className="space-y-1.5">
            {filteredTools.map((tool) => {
              const isSelected = tool.id === selectedTool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => {
                    setSelectedToolId(tool.id);
                    setResultOutput(null);
                    setResultCitations([]);
                  }}
                  className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all ${
                    isSelected
                      ? 'bg-zinc-800/90 border border-teal-500/50 shadow-md shadow-teal-500/5'
                      : 'bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800/60 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-zinc-950 border border-zinc-800 shrink-0 mt-0.5">
                    {getToolIcon(tool.icon)}
                  </div>
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-xs md:text-sm text-zinc-100 truncate">
                        {language === 'bn' ? tool.titleBn : tool.title}
                      </span>
                      {tool.useSearch && (
                        <span className="text-[10px] px-1 rounded bg-teal-500/20 text-teal-300">
                          Search
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400 line-clamp-2 mt-0.5 leading-relaxed">
                      {language === 'bn' ? tool.descriptionBn : tool.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Interactive Execution Workspace */}
        <div className="lg:col-span-8 flex flex-col h-full overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800 bg-zinc-900/30">
          {/* Active Tool Header Card */}
          <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800/80 shadow-md flex items-start justify-between">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
                {getToolIcon(selectedTool.icon)}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  {language === 'bn' ? selectedTool.titleBn : selectedTool.title}
                </h2>
                <p className="text-xs md:text-sm text-zinc-400 mt-1 leading-relaxed">
                  {language === 'bn' ? selectedTool.descriptionBn : selectedTool.description}
                </p>
              </div>
            </div>

            {selectedTool.useSearch && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-medium">
                <Globe className="w-3.5 h-3.5" />
                Live Search
              </span>
            )}
          </div>

          {/* Tool Parameters & Options */}
          <div className="p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-3">
            {selectedTool.id === 'study-tutor' && (
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">
                  Grade / Academic Level:
                </label>
                <select
                  value={customGrade}
                  onChange={(e) => setCustomGrade(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-teal-500/60"
                >
                  <option value="Primary (Class 1-5)">Primary (Class 1-5)</option>
                  <option value="Junior Secondary (Class 6-8)">Junior Secondary (Class 6-8)</option>
                  <option value="Secondary (Class 9-10 / SSC)">Secondary (Class 9-10 / SSC)</option>
                  <option value="Higher Secondary (HSC / College)">
                    Higher Secondary (HSC / College)
                  </option>
                  <option value="University / Professional">University / Professional</option>
                </select>
              </div>
            )}

            {selectedTool.id === 'writing' && (
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">
                  Writing Tone & Style:
                </label>
                <select
                  value={customTone}
                  onChange={(e) => setCustomTone(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-teal-500/60"
                >
                  <option value="Professional & Formal">Professional & Formal</option>
                  <option value="Friendly & Engaging">Friendly & Engaging</option>
                  <option value="Academic & Detailed">Academic & Detailed</option>
                  <option value="Concise & Direct">Concise & Direct</option>
                  <option value="Bengali Official Notice / Application">
                    Bengali Official Notice / Application (দাপ্তরিক আবেদন)
                  </option>
                </select>
              </div>
            )}

            {selectedTool.id === 'interview-coach' && (
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-1">
                  Target Job Position:
                </label>
                <input
                  type="text"
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  placeholder="e.g. Frontend Developer, Bank Officer, Marketing Executive..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-teal-500/60"
                />
              </div>
            )}

            {/* Input Prompt Box with Quick Examples */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-zinc-300">
                  Input Requirements:
                </label>
                <span className="text-[11px] text-zinc-500">
                  {inputPrompt.length} chars
                </span>
              </div>

              {/* Quick suggestion pills */}
              <div className="flex flex-wrap gap-1.5 mb-2">
                {[
                  selectedTool.id === 'research' && 'Recent breakthroughs in solid-state battery technology',
                  selectedTool.id === 'research' && 'Current developments in AI-assisted scientific discovery in 2026',
                  selectedTool.id === 'study-tutor' && 'Explain the concept of photosynthesis and cellular respiration with analogies',
                  selectedTool.id === 'study-tutor' && 'বাংলা ব্যাকরণে সমাস ও কারক সহজ উদাহরণসহ বিশদভাবে ব্যাখ্যা করুন',
                  selectedTool.id === 'math-assistant' && 'Solve step by step: 2x² - 8x + 6 = 0',
                  selectedTool.id === 'math-assistant' && 'Calculate monthly payment on $25,000 at 5.5% for 5 years',
                  selectedTool.id === 'job-search' && 'Full-stack developer jobs in Bangladesh, salaries and top skills',
                  selectedTool.id === 'job-search' && 'Remote frontend engineer vacancies in global companies',
                  selectedTool.id === 'cv-builder' && 'Create an ATS resume for a Full-Stack Engineer with 2 years React and Node experience',
                  selectedTool.id === 'interview-coach' && 'Behavioral: Tell me about a time you resolved a major team conflict (STAR method)',
                  selectedTool.id === 'code-assistant' && 'Write a TypeScript debounce function with cancel and flush methods',
                  selectedTool.id === 'writing' && 'Translate this paragraph into natural, professional Bengali',
                  selectedTool.id === 'prompt-improver' && 'Build a modern e-commerce dashboard with analytics',
                  selectedTool.id === 'youtube-seo' && 'Learn Next.js 15 Full Course in 40 Minutes',
                  selectedTool.id === 'document-analysis' && 'Summarize this business contract agreement and highlight key liabilities',
                  selectedTool.id === 'csv-analysis' && 'Month,Sales,Expenses,NetProfit\nJan,12000,8000,4000\nFeb,15000,8500,6500\nMar,18000,9000,9000',
                  selectedTool.id === 'career-plan' && '6-month transition plan from manual QA to automated SDET engineer',
                  selectedTool.id === 'study-plan' && '4-week intensive revision routine for university final exams',
                ]
                  .filter(Boolean)
                  .map((exampleText, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setInputPrompt(exampleText as string)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-teal-300 hover:text-white border border-zinc-800 hover:border-teal-500/40 transition-colors truncate max-w-[280px]"
                      title={exampleText as string}
                    >
                      💡 {exampleText}
                    </button>
                  ))}
              </div>

              <textarea
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                placeholder={t.toolInputPlaceholder}
                rows={4}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-xs md:text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-teal-500/60 resize-none leading-relaxed"
              />
            </div>

            {/* Execute Button */}
            <div className="flex items-center justify-end">
              <button
                onClick={handleRunTool}
                disabled={!inputPrompt.trim() || isRunning}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all shadow-md ${
                  inputPrompt.trim() && !isRunning
                    ? 'bg-teal-500 hover:bg-teal-400 text-zinc-950 shadow-teal-500/20 hover:scale-[1.02]'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                }`}
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>{t.runTool}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Result Output View */}
          {resultOutput && (
            <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800/80 shadow-md space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-900">
                <span className="font-bold text-sm text-white flex items-center gap-1.5">
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{t.toolResult}</span>
                </span>

                <div className="flex items-center gap-1 text-xs">
                  <button
                    onClick={handleCopy}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleSaveNote}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors"
                  >
                    {noteSaved ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Saved</span>
                      </>
                    ) : (
                      <>
                        <BookmarkPlus className="w-3.5 h-3.5" />
                        <span>Save Note</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleLaunchChatWithResult}
                    className="flex items-center gap-1 px-3 py-1 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 font-medium transition-colors"
                    title="Send this output to chat workspace"
                  >
                    <span>Discuss in Chat</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Rendered Markdown */}
              <div className="text-zinc-100 text-sm leading-relaxed overflow-x-auto">
                <MarkdownView content={resultOutput} />
              </div>

              {/* Tool Citations if present */}
              {resultCitations && resultCitations.length > 0 && (
                <div className="mt-4 pt-3 border-t border-zinc-900">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-teal-400 mb-2">
                    <Globe className="w-3.5 h-3.5" />
                    <span>{t.sources}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {resultCitations.map((citation, idx) => (
                      <a
                        key={idx}
                        href={citation.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] text-zinc-300 hover:text-teal-300 transition-colors"
                      >
                        <span className="truncate max-w-[220px]">{citation.title}</span>
                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
