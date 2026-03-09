import { createApp } from './app';

export default async function handler(req: any, res: any) {
    try {
        const app = await createApp();
        return app(req, res);
    } catch (error: any) {
        console.error("VERCEL HANDLER CRASH:", error);
        return res.status(500).json({
            error: "Vercel Boot Crash",
            message: error.message,
            stack: error.stack
        });
    }
}
