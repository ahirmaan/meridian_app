"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check } from "lucide-react";

interface Option {
    value: string;
    label: string;
    icon?: React.ReactNode;
    description?: string;
}

interface CustomSelectProps {
    value: string;
    options: Option[];
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export function CustomSelect({ value, options, onChange, placeholder = "Select...", className = "" }: CustomSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className={`relative ${className}`} ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-white hover:border-neutral-700 transition-all cursor-pointer"
            >
                <div className="flex items-center gap-3">
                    {selectedOption?.icon}
                    <div className="flex flex-col text-left">
                        <span className={selectedOption ? "text-white text-sm font-medium" : "text-neutral-500 text-sm"}>
                            {selectedOption ? selectedOption.label : placeholder}
                        </span>
                        {selectedOption?.description && (
                            <span className="text-[10px] text-neutral-500 font-medium">{selectedOption.description}</span>
                        )}
                    </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-neutral-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute left-0 right-0 top-full mt-2 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-[200] overflow-hidden min-w-[200px]"
                    >
                        <div className="py-1">
                            {options.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => {
                                        onChange(option.value);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-4 py-3 text-sm text-left transition-colors ${value === option.value ? "bg-neutral-800 text-white" : "text-neutral-400 hover:bg-neutral-800/50 hover:text-white"
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        {option.icon}
                                        <div className="flex flex-col">
                                            <span className="font-medium">{option.label}</span>
                                            {option.description && <span className="text-[10px] text-neutral-500">{option.description}</span>}
                                        </div>
                                    </div>
                                    {value === option.value && <Check className="w-4 h-4 text-white" />}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
