"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

interface WelcomeScreenProps {
    userName: string;
}

export default function WelcomeScreen({ userName }: WelcomeScreenProps) {
    const [show, setShow] = useState(true);
    const [greeting, setGreeting] = useState("Bem-vindo");

    useEffect(() => {
        // Determine greeting based on time of day
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) setGreeting("Bom dia");
        else if (hour >= 12 && hour < 18) setGreeting("Boa tarde");
        else setGreeting("Boa noite");

        // Hide after 3 seconds
        const timer = setTimeout(() => {
            setShow(false);
        }, 3500);

        return () => clearTimeout(timer);
    }, []);

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.8 }}
                    className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 text-white"
                >
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                        className="text-center"
                    >
                        <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-500 mb-4">
                            {greeting}, {userName.split(" ")[0]}!
                        </h1>
                        <p className="text-slate-400 text-lg md:text-xl font-light">
                            Que bom ter você de volta no Kanbanize.
                        </p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
