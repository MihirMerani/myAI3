"use client";

import { useState, useCallback, useRef } from "react";
import {
    Upload,
    FileText,
    Image as ImageIcon,
    File,
    Loader2,
    AlertTriangle,
    CheckCircle2,
    MessageSquare,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type ReviewType = "full" | "risk-only" | "summary";
type Language = "en" | "hi" | "mr" | "gu";

interface ReviewClause {
    clause: string;
    risk: "high" | "medium" | "low";
    explanation: string;
}

interface ReviewResult {
    documentType: string;
    summary: string;
    riskScore: number;
    clauses: ReviewClause[];
    translatedSummary?: string;
}

const LANGUAGES: { value: Language; label: string }[] = [
    { value: "en", label: "English" },
    { value: "hi", label: "हिंदी (Hindi)" },
    { value: "mr", label: "मराठी (Marathi)" },
    { value: "gu", label: "ગુજરાતી (Gujarati)" },
];

const REVIEW_TYPES: { value: ReviewType; label: string; desc: string }[] = [
    { value: "full", label: "Full Review", desc: "Complete clause-by-clause analysis" },
    { value: "risk-only", label: "Risk Flags Only", desc: "Only highlight risky clauses" },
    { value: "summary", label: "Summary Only", desc: "Quick document overview" },
];

const ACCEPTED_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
    "image/jpeg",
    "image/png",
    "image/webp",
    "text/plain",
];

function getRiskEmoji(risk: string) {
    switch (risk) {
        case "high":
            return "🔴";
        case "medium":
            return "🟡";
        case "low":
            return "🟢";
        default:
            return "⚪";
    }
}

function getRiskColor(risk: string) {
    switch (risk) {
        case "high":
            return "text-red-400 bg-red-500/10 border-red-500/20";
        case "medium":
            return "text-yellow-400 bg-yellow-500/10 border-yellow-500/20";
        case "low":
            return "text-green-400 bg-green-500/10 border-green-500/20";
        default:
            return "text-zinc-400 bg-zinc-500/10 border-zinc-500/20";
    }
}

function getScoreColor(score: number) {
    if (score >= 70) return "bg-red-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-green-500";
}

export function DocumentUpload({
    onComplete,
}: {
    onComplete?: (text: string) => void;
}) {
    const [file, setFile] = useState<File | null>(null);
    const [pasteText, setPasteText] = useState("");
    const [tab, setTab] = useState<"upload" | "paste">("upload");
    const [language, setLanguage] = useState<Language>("en");
    const [reviewType, setReviewType] = useState<ReviewType>("full");
    const [isLoading, setIsLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState("");
    const [result, setResult] = useState<ReviewResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && ACCEPTED_TYPES.includes(droppedFile.type)) {
            setFile(droppedFile);
            setError(null);
        } else {
            setError("Unsupported file type. Please use PDF, DOCX, JPG, PNG, or TXT.");
        }
    }, []);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            setError(null);
        }
    };

    const getFileIcon = (file: File) => {
        if (file.type === "application/pdf") return <FileText className="size-5 text-red-400" />;
        if (file.type.startsWith("image/")) return <ImageIcon className="size-5 text-blue-400" />;
        return <File className="size-5 text-zinc-400" />;
    };

    async function handleSubmit() {
        if (!file && !pasteText.trim()) {
            setError("Please upload a file or paste text.");
            return;
        }

        setIsLoading(true);
        setError(null);
        setResult(null);

        try {
            setLoadingStep("Preparing document...");

            const formData = new FormData();
            if (tab === "upload" && file) {
                formData.append("file", file);
            } else if (tab === "paste" && pasteText.trim()) {
                formData.append("text", pasteText);
            }
            formData.append("language", language);
            formData.append("reviewType", reviewType);

            setLoadingStep("Extracting text...");
            await new Promise((r) => setTimeout(r, 500));

            setLoadingStep("Analysing clauses with AI...");
            const response = await fetch("/api/document-review", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || "Document review failed. Please try again.");
            }

            setLoadingStep("Finalising results...");
            const data: ReviewResult = await response.json();
            setResult(data);
        } catch (err: any) {
            setError(err.message || "Something went wrong.");
        } finally {
            setIsLoading(false);
            setLoadingStep("");
        }
    }

    function formatResultAsText(r: ReviewResult): string {
        let text = `📄 Document Type: ${r.documentType}\n`;
        text += `📊 Risk Score: ${r.riskScore}/100\n\n`;
        text += `📝 Summary:\n${r.translatedSummary || r.summary}\n\n`;
        text += `📋 Clauses:\n`;
        for (const clause of r.clauses) {
            text += `${getRiskEmoji(clause.risk)} ${clause.clause}: ${clause.explanation}\n`;
        }
        return text;
    }

    // --- Results View ---
    if (result) {
        return (
            <div className="space-y-6 animate-in fade-in duration-500">
                {/* Document Type + Score */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-5 bg-zinc-900 border border-zinc-800 rounded-xl">
                    <div className="flex-1">
                        <span className="inline-block px-3 py-1 text-xs font-bold bg-[#FFE600]/10 text-[#FFE600] border border-[#FFE600]/20 rounded-full mb-2">
                            {result.documentType}
                        </span>
                        <h3 className="text-lg font-bold text-white">Document Review Complete</h3>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <span className="text-xs text-zinc-500 block">Risk Score</span>
                            <span className="text-2xl font-bold text-white">{result.riskScore}</span>
                            <span className="text-sm text-zinc-400">/100</span>
                        </div>
                        <div className="w-16 h-16 relative">
                            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                                <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke="#27272a"
                                    strokeWidth="3"
                                />
                                <path
                                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                    fill="none"
                                    stroke={result.riskScore >= 70 ? "#ef4444" : result.riskScore >= 40 ? "#eab308" : "#22c55e"}
                                    strokeWidth="3"
                                    strokeDasharray={`${result.riskScore}, 100`}
                                    strokeLinecap="round"
                                />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Summary */}
                <div className="p-5 bg-zinc-900 border border-zinc-800 rounded-xl">
                    <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3">Summary</h4>
                    <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
                        {result.translatedSummary || result.summary}
                    </p>
                </div>

                {/* Clauses */}
                <div className="space-y-3">
                    <h4 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">
                        Clause Analysis ({result.clauses.length} clauses)
                    </h4>
                    {result.clauses.map((clause, i) => (
                        <div
                            key={i}
                            className={`p-4 rounded-xl border ${getRiskColor(clause.risk)} transition-all`}
                        >
                            <div className="flex items-start gap-3">
                                <span className="text-lg mt-0.5">{getRiskEmoji(clause.risk)}</span>
                                <div>
                                    <h5 className="font-semibold text-sm text-white">{clause.clause}</h5>
                                    <p className="text-xs mt-1 opacity-80">{clause.explanation}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Chat about this document button */}
                {onComplete && (
                    <Button
                        onClick={() => onComplete(formatResultAsText(result))}
                        className="w-full bg-[#FFE600] text-[#2E2E38] font-bold hover:bg-yellow-300 rounded-xl py-6 text-sm shadow-lg shadow-yellow-500/20"
                    >
                        <MessageSquare className="size-4 mr-2" />
                        Chat about this document
                    </Button>
                )}

                {/* Disclaimer */}
                <p className="text-xs text-zinc-600 text-center">
                    ⚠️ This is not legal advice. Please consult a qualified lawyer for important decisions.
                </p>

                {/* Reset */}
                <button
                    onClick={() => {
                        setResult(null);
                        setFile(null);
                        setPasteText("");
                    }}
                    className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 transition-colors py-2"
                >
                    Review another document
                </button>
            </div>
        );
    }

    // --- Upload Form ---
    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Tab Switcher */}
            <div className="flex gap-1 p-1 bg-zinc-900 rounded-xl border border-zinc-800">
                <button
                    onClick={() => setTab("upload")}
                    className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${tab === "upload"
                            ? "bg-[#FFE600] text-[#2E2E38]"
                            : "text-zinc-400 hover:text-white"
                        }`}
                >
                    📎 Upload File
                </button>
                <button
                    onClick={() => setTab("paste")}
                    className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${tab === "paste"
                            ? "bg-[#FFE600] text-[#2E2E38]"
                            : "text-zinc-400 hover:text-white"
                        }`}
                >
                    📋 Paste Text
                </button>
            </div>

            {/* Upload Area */}
            {tab === "upload" && (
                <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${isDragOver
                            ? "border-[#FFE600] bg-[#FFE600]/5"
                            : file
                                ? "border-green-500/30 bg-green-500/5"
                                : "border-zinc-700 hover:border-zinc-500 bg-zinc-900/50"
                        }`}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        accept=".pdf,.docx,.doc,.jpg,.jpeg,.png,.webp,.txt"
                        className="hidden"
                    />

                    {file ? (
                        <div className="flex items-center justify-center gap-3">
                            {getFileIcon(file)}
                            <div className="text-left">
                                <p className="text-sm font-medium text-white truncate max-w-[200px]">
                                    {file.name}
                                </p>
                                <p className="text-xs text-zinc-500">
                                    {(file.size / 1024).toFixed(1)} KB
                                </p>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setFile(null);
                                }}
                                className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
                            >
                                <X className="size-4" />
                            </button>
                        </div>
                    ) : (
                        <>
                            <Upload className="size-10 text-zinc-500 mx-auto mb-3" />
                            <p className="text-sm text-zinc-400">
                                Drop your file here, or{" "}
                                <span className="text-[#FFE600] font-medium">browse</span>
                            </p>
                            <p className="text-xs text-zinc-600 mt-1">
                                PDF, DOCX, JPG, PNG, or TXT
                            </p>
                        </>
                    )}
                </div>
            )}

            {/* Paste Area */}
            {tab === "paste" && (
                <textarea
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder="Paste your legal document text here..."
                    className="w-full h-40 p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-300 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-[#FFE600]/30 resize-none"
                />
            )}

            {/* Options Row */}
            <div className="grid grid-cols-2 gap-4">
                {/* Language Selector */}
                <div>
                    <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider block mb-2">
                        Language
                    </label>
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value as Language)}
                        className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#FFE600]/30 appearance-none cursor-pointer"
                    >
                        {LANGUAGES.map((l) => (
                            <option key={l.value} value={l.value}>
                                {l.label}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Review Type Selector */}
                <div>
                    <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider block mb-2">
                        Review Type
                    </label>
                    <select
                        value={reviewType}
                        onChange={(e) => setReviewType(e.target.value as ReviewType)}
                        className="w-full p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-sm text-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#FFE600]/30 appearance-none cursor-pointer"
                    >
                        {REVIEW_TYPES.map((rt) => (
                            <option key={rt.value} value={rt.value}>
                                {rt.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Error Display */}
            {error && (
                <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400">
                    <AlertTriangle className="size-4 shrink-0" />
                    {error}
                </div>
            )}

            {/* Submit Button */}
            <Button
                onClick={handleSubmit}
                disabled={isLoading || (!file && !pasteText.trim())}
                className="w-full bg-[#FFE600] text-[#2E2E38] font-bold hover:bg-yellow-300 disabled:bg-zinc-800 disabled:text-zinc-600 rounded-xl py-6 text-sm shadow-lg shadow-yellow-500/20 disabled:shadow-none transition-all"
            >
                {isLoading ? (
                    <div className="flex items-center gap-2">
                        <Loader2 className="size-4 animate-spin" />
                        {loadingStep}
                    </div>
                ) : (
                    <>
                        <CheckCircle2 className="size-4 mr-2" />
                        Review Document
                    </>
                )}
            </Button>
        </div>
    );
}
