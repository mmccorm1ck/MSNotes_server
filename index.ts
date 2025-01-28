require('dotenv').config()
import simpleGit from 'simple-git';

const STORAGE_PATH = process.env.STORAGE_PATH || "./.temp";
const GIT_PATH     = process.env.GIT_PATH     || "./.gitTemp";
const GIT_REMOTE   = process.env.GIT_REMOTE; // In SSH format e.g. git@github.com:mmccorm1ck/MSNotes_server.git
const GIT_USER     = process.env.GIT_USER;
const GIT_EMAIL    = process.env.GIT_EMAIL;

Bun.serve({
    port: process.env.PORT,
    async fetch(req) {
        console.log("new request");
        const reqPath = new URL(req.url).pathname;
        if (reqPath !== "/upload") {
            console.log("Bad path")
            return new Response(null, {status: 404});
        }
        if (req.method !== "POST") {
            console.log("wrong method")
            return new Response(null, {status: 405});
        }
        if (!req.body) {
            console.log("no request body")
            return new Response(null, { status: 400 });
        }
        const cd = req.headers.get("content-disposition");
        if (!cd) {
            console.log("no content")
            return new Response(null, { status: 400 });
        }
        const cdFileName = cd.split(";")[1];
        if (!cdFileName) {
            console.log("no file in request 1")
            return new Response(null, { status: 400 });
        }
        const fileName = cdFileName.split("=")[1];
        if (!fileName) {
            console.log("no file in request 2")
            return new Response(null, { status: 400 });
        }
        if (fileName.split(".")[1] !== "txt") {
            console.log("file not .txt")
            return new Response(null, { status: 400 });
        }
        const filePath = `${STORAGE_PATH}/${fileName}`;
        await Bun.write(filePath, await Bun.readableStreamToBlob(req.body));
        console.log("file uploaded");
        return new Response(null, {status: 201});
    },
    error() {
        return new Response(null, {status: 500});
    }
});