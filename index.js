import { readFileSync } from "node:fs";
import { Document } from "@langchain/core/documents";
import { PDFParse } from "pdf-parse";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { ChromaClient } from "chromadb";
import { DefaultEmbeddingFunction } from "@chroma-core/default-embed";
import ollama from "ollama";

// Load a PDF
async function loadPDFPages(filePath) {
    const parser = new PDFParse({
        data: new Uint8Array(readFileSync(filePath)),
    });

    try {
        const { pages } = await parser.getText();
        return pages.map((page) => new Document({
            pageContent: page.text,
            metadata: { source: filePath, page: page.num - 1 }
        }));
    } catch (error) {
        console.error(`Error in parsing PDF: ${error.message}`)
    } finally {
        await parser.destroy();
    }
}

const filePath = "./Leave_Policy.pdf";
const docs = await loadPDFPages(filePath);

// Split a PDF using Recursive Character Chunking
const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 1000,
    chunkOverlap: 200,
});

const allSplits = await textSplitter.splitDocuments(docs);

// Add to the Chroma DB with the collection name: "PDF_Chatbot"
const client = new ChromaClient();
const embeddingFunction = new DefaultEmbeddingFunction();

const collection  = await client.getOrCreateCollection({
    name: "PDF_Chatbot",
    embeddingFunction
});

await collection.add({
    ids: allSplits.map((_, i) => `chunk-${i}`),
    documents: allSplits.map((doc) => doc.pageContent),
    metadatas: allSplits.map((doc) => {
        const { loc, ...rest } = doc.metadata;
        return rest;
    }),
});

// Get all the records in collection to be given to ollama for full context
const results = await collection.get({
    include: ["documents", "metadatas"]
})

// this will still give us the answer in object form which is not understandable by user, so we need to pass the stored values to Ollama for chatbot type experience (which we will do in next step).
// console.log(results);

// Pass the stored values in chromadb as the context to Ollama for chatbot type experience.
const context = results.documents.join("\n\n");

const response = await ollama.chat({
    model: "llama3.2:3b",
    messages: [
        {
            role: "system",
            content: "You are a helpful assistant. Answer the user's question using only the provided context."
        },
        {
            role: "user",
            content: `Context:\n${context}\n\nQuestion: What is someone misuses the policy?`
        }
    ]
})

console.log(response.message.content);

// Query from the db
// const results = await collection.query({
//     queryTexts: ["What is the purpose of this policy?"]
// })

// console.log(results);

// list entries
// async function listEntries() {
//     const collection = await client.getCollection({ name: "PDF_Chatbot"});

//     const allEntries = await collection.get();
//     console.log(allEntries);
// }

// listEntries();

// Rough Work
// async function addChunksIntoCollection() {
//     allSplits.map((chunk, index) => (
//         await collection.add({
//             ids: index,
//             documents: chunk
//         })
//     ))
// }