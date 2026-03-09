import { createApp } from '../src/server/app';

console.log("HANDLER LOADED: api/index.ts");

export default async function handler(req: any, res: any) {
    console.log(`HANDLER CALLED: ${req.method} ${req.url}`);
    try {
        const app = await createApp();
        return app(req, res);
    } catch (error) {
        console.error("HANDLER CRASH:", error);
        return res.status(500).json({
            error: "Function Crash",
            details: error instanceof Error ? error.message : String(error)
        });
    }
}
