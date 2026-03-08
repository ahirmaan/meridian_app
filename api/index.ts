import startServer from '../server.js'; // Note the .js extension for Vercel

export default async function handler(req: any, res: any) {
    const app = await startServer();
    return app(req, res);
}
