"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";

const FEATURES = [
  {
    emoji: "📄",
    title: "Document Review",
    description:
      "Upload contracts, agreements, NDAs. Get risk flags and plain-English explanations.",
    mode: "document-review",
    gradient: "from-amber-500/20 to-yellow-500/10",
    borderHover: "hover:border-amber-500/50",
  },
  {
    emoji: "💬",
    title: "Chat with Your Document",
    description:
      "Ask questions about your uploaded document using AI-powered search.",
    mode: "chat-document",
    gradient: "from-blue-500/20 to-cyan-500/10",
    borderHover: "hover:border-blue-500/50",
  },
  {
    emoji: "📰",
    title: "Legal Research",
    description:
      "Search recent Indian legal news, regulatory updates, and court developments.",
    mode: "legal-research",
    gradient: "from-emerald-500/20 to-green-500/10",
    borderHover: "hover:border-emerald-500/50",
  },
  {
    emoji: "⚖️",
    title: "General Legal Q&A",
    description:
      "Ask any legal question and get clear, easy-to-understand answers.",
    mode: "general-qa",
    gradient: "from-purple-500/20 to-violet-500/10",
    borderHover: "hover:border-purple-500/50",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#2E2E38] flex flex-col">
      {/* Navigation */}
      <nav className="pt-1">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="size-10 bg-[#FFE600] rounded-xl flex items-center justify-center shadow-lg shadow-yellow-500/20">
                <Image
                  src="/logo.png"
                  alt="ML Check Logo"
                  width={24}
                  height={24}
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  ML Check
                </h1>
                <p className="text-[10px] text-zinc-400 -mt-0.5 tracking-wider uppercase">
                  by Mihir &amp; Lakshay
                </p>
              </div>
            </div>
            <Link
              href="/chat"
              className="px-5 py-2.5 bg-[#FFE600] text-[#2E2E38] font-bold text-sm rounded-full hover:bg-yellow-300 transition-all duration-200 shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/40"
            >
              Open Chat →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8 pb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#FFE600]/10 border border-[#FFE600]/30 rounded-full mb-6">
            <span className="size-2 bg-[#FFE600] rounded-full animate-pulse" />
            <span className="text-sm text-[#FFE600] font-medium">
              AI-Powered Legal Assistant
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 leading-tight tracking-tight">
            Legal document review
            <br />
            <span className="text-[#FFE600]">for every Indian</span>
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Upload contracts, search legal news, and get plain-language
            explanations — in English, Hindi, Marathi, or Gujarati.
          </p>
        </motion.div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-4xl w-full">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={feature.mode}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 * index }}
            >
              <Link href={`/chat?mode=${feature.mode}`} className="block group">
                <div
                  className={`relative overflow-hidden rounded-2xl border border-white/10 ${feature.borderHover} bg-gradient-to-br ${feature.gradient} backdrop-blur-sm p-6 transition-all duration-300 group-hover:scale-[1.02] group-hover:shadow-xl group-hover:shadow-black/20`}
                >
                  {/* Background glow effect */}
                  <div className="absolute -top-12 -right-12 size-32 bg-[#FFE600]/5 rounded-full blur-3xl group-hover:bg-[#FFE600]/10 transition-all duration-500" />

                  <div className="relative">
                    <span className="text-4xl mb-4 block">{feature.emoji}</span>
                    <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#FFE600] transition-colors duration-200">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-zinc-400 leading-relaxed group-hover:text-zinc-300 transition-colors duration-200">
                      {feature.description}
                    </p>

                    {/* Arrow indicator */}
                    <div className="mt-4 flex items-center gap-1 text-xs font-medium text-[#FFE600] opacity-0 group-hover:opacity-100 transition-opacity duration-300 translate-x-0 group-hover:translate-x-1">
                      Get started
                      <svg
                        className="size-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Language badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          <span className="text-xs text-zinc-500">Available in:</span>
          {["English", "हिंदी", "मराठी", "ગુજરાતી"].map((lang) => (
            <span
              key={lang}
              className="px-3 py-1 text-xs font-medium text-zinc-300 bg-white/5 border border-white/10 rounded-full"
            >
              {lang}
            </span>
          ))}
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-zinc-500">
              ⚠️ ML Check is not a substitute for professional legal advice.
            </p>
            <p className="text-xs text-zinc-600">
              © {new Date().getFullYear()} ML Check by Mihir &amp; Lakshay
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
