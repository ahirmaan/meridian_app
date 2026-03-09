export default async function handler(req: any, res: any) {
    console.log("DEBUG: Vercel handler started.");
    try {
        console.log("DEBUG: Importing ./app.js ...");
        // In ESM mode on Vercel, sometimes the extension is needed or it behaves strictly.
        // We'll try to import and log.
        const module = await import('./app.js').catch(e => {
            console.log("DEBUG: ./app.js failed, trying ./app ...");
            return import('./app');
        });

        const { createApp } = module;
        console.log("DEBUG: createApp found. Calling it...");
        const app = await createApp();

        console.log("DEBUG: Executing Express app...");
        return app(req, res);
    } catch (error: any) {
        console.error("DEBUG: CRITICAL ERROR IN HANDLER:", error);
        return res.status(500).json({
            error: "Vercel Execution Crash",
            message: error.message,
            stack: error.stack,
            at: "handler"
        });
    }
}
