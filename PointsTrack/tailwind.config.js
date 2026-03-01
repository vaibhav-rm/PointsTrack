/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
    presets: [require("nativewind/preset")],
    theme: {
        extend: {
            colors: {
                primary: "#4F46E5", // Deep Indigo
                secondary: "#06B6D4", // Electric Teal
                success: "#10B981", // Emerald
                warning: "#F59E0B", // Amber
                danger: "#F43F5E", // Rose
                background: "#F8FAFC", // Light background
                card: "#FFFFFF", // Card surface
                darkBackground: "#0F172A",
                darkCard: "#1E293B",
                textPrimary: "#1E293B",
                textSecondary: "#64748B",
                darkTextPrimary: "#F1F5F9",
                darkTextSecondary: "#94A3B8",
            },
            fontFamily: {
                plight: ["Inter-Light", "sans-serif"],
                pregular: ["Inter-Regular", "sans-serif"],
                pmedium: ["Inter-Medium", "sans-serif"],
                psemibold: ["Inter-SemiBold", "sans-serif"],
                pbold: ["Inter-Bold", "sans-serif"],
            },
        },
    },
    plugins: [],
};
