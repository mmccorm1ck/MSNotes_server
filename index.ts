require('dotenv').config()
const STORAGE_PATH = "/var/tmp/";

Bun.serve({
    port: process.env.PORT,
    async fetch(req) {
        const reqPath = new URL(req.url).pathname;
        if (reqPath !== "/upload") {
            return new Response(null, {status: 404});
        }
        if (req.method !== "POST") {
            return new Response(null, {status: 405});
        }
        if (!req.body) {
            return new Response(null, { status: 400 });
        }
        const cd = req.headers.get("content-disposition");
        if (!cd) {
            return new Response(null, { status: 400 });
        }
        const cdFileName = cd.split(";")[1];
        if (!cdFileName) {
            return new Response(null, { status: 400 });
        }
        const fileName = cdFileName.split("=")[1];
        if (!fileName) {
            return new Response(null, { status: 400 });
        }
        return new Response(null, {status: 201});
    },
    error() {
        return new Response(null, {status: 500});
    }
});