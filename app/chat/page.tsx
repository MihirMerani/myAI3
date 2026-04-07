"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useChat } from "@ai-sdk/react";
import { ArrowUp, Trash2, Square, Paperclip, FileText, ArrowLeft } from "lucide-react";
import { UIMessage } from "ai";
import { useEffect, useState, useRef, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { Streamdown } from "streamdown";
import { useSearchParams } from "next/navigation";
import { DocumentUpload } from "@/components/document-upload";

// --- CONFIGURATION ---
const AI_NAME = "ML Check";

const MODE_LABELS: Record<string, string> = {
    "document-review": "📄 Document Review",
    "chat-document": "💬 Chat with Your Document",
    "legal-research": "📰 Legal Research",
    "general-qa": "⚖️ General Legal Q&A",
};

const MODE_PLACEHOLDERS: Record<string, string> = {
    "document-review": "Describe what you'd like reviewed, or upload a document...",
    "chat-document": "Ask a question about your uploaded document...",
    "legal-research": "Search for Indian legal news, regulatory updates...",
    "general-qa": "Ask any legal question...",
};

const formSchema = z.object({
    message: z.string().max(2000, "Message must be at most 2000 characters."),
});

const STORAGE_KEY = "chat-messages";

// --- LOGIC: SAVE & LOAD ---
const loadMessagesFromStorage = (): {
    messages: UIMessage[];
    durations: Record<string, number>;
} => {
    if (typeof window === "undefined") return { messages: [], durations: {} };
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return { messages: [], durations: {} };
        const parsed = JSON.parse(stored);
        return { messages: parsed.messages || [], durations: parsed.durations || {} };
    } catch (error) {
        return { messages: [], durations: {} };
    }
};

const saveMessagesToStorage = (
    messages: UIMessage[],
    durations: Record<string, number>
) => {
    if (typeof window === "undefined") return;
    try {
        const data = { messages, durations };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        console.error("Failed to save:", error);
    }
};

function ChatContent() {
    const searchParams = useSearchParams();
    const mode = searchParams.get("mode") || "general-qa";

    const [isClient, setIsClient] = useState(false);
    const [durations, setDurations] = useState<Record<string, number>>({});
    const [showDocUpload, setShowDocUpload] = useState(mode === "document-review");

    // --- ATTACHMENT STATE ---
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [files, setFiles] = useState<FileList | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const stored =
        typeof window !== "undefined"
            ? loadMessagesFromStorage()
            : { messages: [], durations: {} };
    const [initialMessages] = useState<UIMessage[]>(stored.messages);

    const { messages, sendMessage, status, stop, setMessages } = useChat({
        messages: initialMessages,
        onFinish: () => saveMessagesToStorage(messages, durations),
    });

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        setIsClient(true);
        setDurations(stored.durations);
        setMessages(stored.messages);
    }, []);

    useEffect(() => {
        if (isClient) saveMessagesToStorage(messages, durations);
    }, [durations, messages, isClient]);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: { message: "" },
    });

    function onSubmit(data: z.infer<typeof formSchema>) {
        if (!data.message.trim() && !files) return;

        sendMessage(
            { text: data.message },
            { experimental_attachments: files } as any
        );

        form.reset();
        setFiles(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }

    function clearChat() {
        setMessages([]);
        setDurations({});
        saveMessagesToStorage([], {});
        toast.success("Chat cleared");
    }

    function handleDocumentReviewComplete(reviewText: string) {
        setShowDocUpload(false);
        // Pre-load results into chat
        sendMessage({
            text: `I just completed a document review. Here are the results to discuss:\n\n${reviewText}`,
        });
    }

    const hasMessages = messages.length > 0;

    return (
        <div className="flex h-screen items-center justify-center font-sans bg-zinc-950 text-zinc-100 selection:bg-zinc-800">
            <main className="w-full h-screen relative flex flex-col z-10 transition-all duration-500">
                {/* --- HEADER --- */}
                <div className="fixed top-1 left-0 right-0 z-50 border-b border-zinc-800 bg-[#2E2E38]/95 backdrop-blur-xl">
                    <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
                        {/* Left: Back + Logo */}
                        <div className="flex items-center gap-3">
                            <Link
                                href="/"
                                className="p-2 -ml-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
                            >
                                <ArrowLeft className="size-4" />
                            </Link>
                            <div className="size-8 bg-[#FFE600] rounded-lg flex items-center justify-center overflow-hidden shadow-md shadow-yellow-500/20">
                                <Image
                                    src="/logo.png"
                                    alt="Logo"
                                    width={20}
                                    height={20}
                                />
                            </div>
                            <div>
                                <span className="font-bold text-sm text-white tracking-tight">
                                    {AI_NAME}
                                </span>
                                {MODE_LABELS[mode] && (
                                    <span className="block text-[10px] text-[#FFE600] tracking-wider">
                                        {MODE_LABELS[mode]}
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            {mode === "document-review" && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowDocUpload(!showDocUpload)}
                                    className="text-[#FFE600] hover:text-yellow-300 hover:bg-yellow-900/20 text-xs"
                                >
                                    <FileText className="size-4 mr-1" />
                                    {showDocUpload ? "Show Chat" : "Upload Doc"}
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearChat}
                                className="text-zinc-500 hover:text-red-400 hover:bg-red-900/20"
                            >
                                <Trash2 className="size-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* --- MAIN CONTENT AREA --- */}
                <div className="flex-1 overflow-y-auto w-full pt-0 pb-40 scroll-smooth relative">
                    {/* Document Upload Panel */}
                    {showDocUpload && mode === "document-review" && (
                        <div className="max-w-3xl mx-auto px-4 pt-24">
                            <DocumentUpload onComplete={handleDocumentReviewComplete} />
                        </div>
                    )}

                    {/* Start Screen */}
                    {!hasMessages && isClient && !showDocUpload && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center -mt-10 px-4 text-center animate-in fade-in duration-700">
                            <div className="size-16 bg-[#FFE600] rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-yellow-500/20">
                                <Image
                                    src="/logo.png"
                                    alt="ML Check"
                                    width={36}
                                    height={36}
                                />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-3 tracking-tight">
                                {MODE_LABELS[mode] || "How can I help you?"}
                            </h2>
                            <p className="text-zinc-500 text-sm max-w-md">
                                {mode === "legal-research"
                                    ? "I'll search for the latest Indian legal news, regulatory changes, and court developments."
                                    : mode === "chat-document"
                                        ? "Upload a contract or agreement, then ask questions about specific clauses."
                                        : mode === "document-review"
                                            ? "Click 'Upload Doc' in the header to get started with a document review."
                                            : "Ask any legal question — I'll explain in plain English, Hindi, Marathi, or Gujarati."}
                            </p>
                        </div>
                    )}

                    {/* Messages List */}
                    {hasMessages && (
                        <div className="max-w-3xl mx-auto px-4 pt-24 space-y-6">
                            {messages.map((m) => (
                                <div
                                    key={m.id}
                                    className={`flex gap-4 ${m.role === "user" ? "justify-end" : "justify-start"
                                        }`}
                                >
                                    {/* AI Avatar */}
                                    {m.role !== "user" && (
                                        <div className="size-8 mt-1 border border-zinc-700 bg-[#2E2E38] rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                                            <Image
                                                src="/logo.png"
                                                alt="AI"
                                                width={20}
                                                height={20}
                                                className="invert"
                                            />
                                        </div>
                                    )}

                                    {/* MESSAGE BUBBLE */}
                                    <div
                                        className={`relative px-5 py-3.5 max-w-[85%] text-[15px] leading-7 ${m.role === "user"
                                                ? "bg-[#FFE600]/10 text-zinc-100 rounded-[24px] border border-[#FFE600]/20"
                                                : "bg-transparent text-zinc-300 pl-0"
                                            }`}
                                    >
                                        {/* Text Content */}
                                        <div className="whitespace-pre-wrap font-normal flex flex-col gap-2">
                                            {m.parts?.map((part, i) => {
                                                if (part.type === "text") {
                                                    return (
                                                        <Streamdown key={`${m.id}-${i}`}>
                                                            {part.text}
                                                        </Streamdown>
                                                    );
                                                }
                                                return null;
                                            })}
                                        </div>

                                        {/* Attachments Display */}
                                        {(m as any).experimental_attachments?.map(
                                            (attachment: any, index: number) => (
                                                <div
                                                    key={index}
                                                    className="mt-3 p-3 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center gap-3 shadow-sm hover:bg-zinc-800/50 transition-colors"
                                                >
                                                    <FileText className="size-5 text-[#FFE600]" />
                                                    <div className="flex flex-col overflow-hidden">
                                                        <span className="text-xs text-zinc-300 font-medium truncate max-w-[200px]">
                                                            {attachment.name}
                                                        </span>
                                                        <span className="text-[10px] text-zinc-500 uppercase">
                                                            Document
                                                        </span>
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Loading Dots */}
                            {status === "submitted" && (
                                <div className="flex gap-4">
                                    <div className="size-8 mt-1 border border-zinc-700 bg-[#2E2E38] rounded-lg flex items-center justify-center shrink-0">
                                        <Image
                                            src="/logo.png"
                                            alt="AI"
                                            width={20}
                                            height={20}
                                            className="invert"
                                        />
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-3 ml-1">
                                        <span
                                            className="size-1.5 bg-[#FFE600] rounded-full animate-bounce"
                                            style={{ animationDelay: "0ms" }}
                                        />
                                        <span
                                            className="size-1.5 bg-[#FFE600] rounded-full animate-bounce"
                                            style={{ animationDelay: "150ms" }}
                                        />
                                        <span
                                            className="size-1.5 bg-[#FFE600] rounded-full animate-bounce"
                                            style={{ animationDelay: "300ms" }}
                                        />
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* --- INPUT AREA (Fixed Bottom) --- */}
                <div className="fixed bottom-0 left-0 right-0 z-50 pb-6 pt-2 px-4 bg-zinc-950/90 backdrop-blur-md">
                    <div className="max-w-3xl mx-auto">
                        {/* File Preview Indicator */}
                        {files && files.length > 0 && (
                            <div className="mb-3 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-between w-fit animate-in slide-in-from-bottom-2 shadow-sm">
                                <div className="flex items-center gap-2 text-xs text-zinc-300">
                                    <FileText className="size-3 text-[#FFE600]" />
                                    <span>{files[0].name}</span>
                                </div>
                                <button
                                    onClick={() => {
                                        setFiles(null);
                                        if (fileInputRef.current) fileInputRef.current.value = "";
                                    }}
                                    className="ml-3 text-zinc-500 hover:text-red-400 font-bold"
                                >
                                    ×
                                </button>
                            </div>
                        )}

                        <form onSubmit={form.handleSubmit(onSubmit)} className="relative">
                            {/* Input Container */}
                            <div className="relative flex items-center bg-zinc-900 border border-zinc-800 rounded-[26px] p-2 pl-4 focus-within:ring-2 focus-within:ring-[#FFE600]/30 transition-all shadow-lg">
                                {/* ATTACH BUTTON */}
                                <Paperclip
                                    className="size-5 text-zinc-500 hover:text-[#FFE600] cursor-pointer mr-3 transition-colors"
                                    onClick={() => fileInputRef.current?.click()}
                                />

                                {/* HIDDEN FILE INPUT */}
                                <input
                                    type="file"
                                    accept="application/pdf,.docx,.doc,image/*,.txt"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={(e) => setFiles(e.target.files)}
                                />

                                <Input
                                    {...form.register("message")}
                                    className="flex-1 bg-transparent border-none text-zinc-100 placeholder:text-zinc-500 focus-visible:ring-0 h-10 p-0 text-[15px]"
                                    placeholder={
                                        files && files.length > 0
                                            ? "Add instructions..."
                                            : MODE_PLACEHOLDERS[mode] || "Message ML Check..."
                                    }
                                    disabled={status === "streaming"}
                                    autoComplete="off"
                                />

                                <div className="flex gap-2 ml-2">
                                    {status === "streaming" || status === "submitted" ? (
                                        <Button
                                            type="button"
                                            size="icon"
                                            onClick={() => stop()}
                                            className="rounded-full bg-zinc-100 text-zinc-900 hover:bg-zinc-300 size-8 transition-all"
                                        >
                                            <Square className="size-3 fill-current" />
                                        </Button>
                                    ) : (
                                        <Button
                                            type="submit"
                                            size="icon"
                                            disabled={!form.watch("message")?.trim() && !files}
                                            className={`rounded-full size-8 transition-all ${!form.watch("message")?.trim() && !files
                                                    ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                                                    : "bg-[#FFE600] text-[#2E2E38] hover:bg-yellow-300 shadow-md shadow-yellow-500/20"
                                                }`}
                                        >
                                            <ArrowUp className="size-4" />
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </form>

                        <div className="mt-2 text-center">
                            <p className="text-[10px] text-zinc-600">
                                ML Check can make mistakes. This is not legal advice.
                            </p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default function ChatPage() {
    return (
        <Suspense
            fallback={
                <div className="flex h-screen items-center justify-center bg-zinc-950">
                    <div className="flex items-center gap-2 text-zinc-400">
                        <div className="size-2 bg-[#FFE600] rounded-full animate-pulse" />
                        Loading...
                    </div>
                </div>
            }
        >
            <ChatContent />
        </Suspense>
    );
}
