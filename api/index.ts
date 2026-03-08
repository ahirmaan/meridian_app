import startServer from '../server';

export default async function handler(req: any, res: any) {
    const app = await startServer();
    return app(req, res);
}
