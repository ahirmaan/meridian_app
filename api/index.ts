import { createApp } from '../src/server/app';

let cachedApp: any = null;

export default async function handler(req: any, res: any) {
    try {
        if (!cachedApp) {
            cachedApp = await createApp();
        }
        return cachedApp(req, res);
    } catch (error: any) {
        console.error("VERCEL HANDLER CRASH:", error);
        res.status(500).json({
            error: "Server initialization failed",
            details: error.message,
            stack: error.stack
        });
    }
}
