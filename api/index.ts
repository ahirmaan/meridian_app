export default async function handler(req: any, res: any) {
    console.log("DEBUG: Vercel handler execution started.");
    try {
        console.log("DEBUG: Dynamically importing createApp...");
        const { createApp } = await import('../src/server/app');

        console.log("DEBUG: Calling createApp()...");
        const app = await createApp();

        console.log("DEBUG: App created, executing request...");
        return app(req, res);
    } catch (error: any) {
        console.error("CRITICAL VERCEL CRASH:", error);
        return res.status(500).json({
            error: "Vercel Boot Crash",
            message: error.message,
            stack: error.stack,
            phase: "initialization"
        });
    }
}
