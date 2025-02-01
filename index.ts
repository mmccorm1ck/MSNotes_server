require('dotenv').config()
import simpleGit from 'simple-git';
import {mkdir, readdir} from 'fs/promises';

const STORAGE_PATH = process.env.STORAGE_PATH || "./.temp";
const GIT_PATH     = process.env.GIT_PATH     || "./.gitTemp";
const GIT_REMOTE   = process.env.GIT_REMOTE; // In SSH format e.g. git@github.com:mmccorm1ck/MSNotes_server.git
const GIT_USER     = process.env.GIT_USER;
const GIT_EMAIL    = process.env.GIT_EMAIL;
const GIT_KEY      = process.env.GIT_KEY; // Personal access token with repo privileges
const NOTES_FOLDER = process.env.NOTES_FOLDER || "Notes"; // The folder in the repo where notes are saved

const git = simpleGit({
    baseDir: GIT_PATH,
    binary: 'git',
    config: [
        `http.extraHeader=Authorization: Bearer ${GIT_KEY}`
    ]
});

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
        const result = await handleGit(fileName.split('.')[0]);
        if (result) return new Response(null, {status: 201});
        return new Response(null, {status: 400});
    },
    error() {
        return new Response(null, {status: 500});
    }
});

async function handleGit(file: string): Promise<boolean> {
    const uploadedFileName = `${STORAGE_PATH}/${file}.txt`
    const targetFileName   = `${NOTES_FOLDER}/${file}.md`
    if (!await Bun.file(`${GIT_PATH}/.git`).exists()) {
        try {
            await git.clone(GIT_REMOTE || "");
        } catch (e) {
            console.log("Repo not found: " + String(e))
            return false;
        }
    } else {
        try {
            await git.pull();
        } catch (e) {
            console.log("Repo could not be pulled: " + String(e))
            return false;
        }
    }
    if (!await Bun.file(`${GIT_PATH}/${NOTES_FOLDER}`).exists()) {
        await mkdir(`${GIT_PATH}/${NOTES_FOLDER}`);
    }
    let uploadedFile = await Bun.file(uploadedFileName).text();
    uploadedFile.replaceAll('  ',' ');
    let targetFile = Bun.file(GIT_PATH+'/'+targetFileName);
    if (await targetFile.exists()) {
        const temp = await targetFile.text()+'.';
        const splitTemp = temp.split('-------------------------------------');
        const findTemp = splitTemp[splitTemp.length-2];
        const splitUpload = uploadedFile.split(findTemp);
        if (splitUpload.length === 2) {
            uploadedFile = splitUpload[1];
        }
        uploadedFile = temp + uploadedFile;
    }
    await Bun.write(targetFile, uploadedFile);
    await git.add(targetFileName);
    await git.commit(new Date().toISOString());
    await git.push();
    return true;
}