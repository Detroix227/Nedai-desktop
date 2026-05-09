const lancedb = require('@lancedb/lancedb');
const path = require('path');
const fs = require('fs-extra');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const { pipeline } = require('@xenova/transformers');

let db;
let table;
let embedder;

// Configuration based on your "Henry" logic
const CHUNK_SIZE = 500;
const CHUNK_OVERLAP = 50;

async function initEngine(userDataPath) {
  const dbPath = path.join(userDataPath, 'henry_vdb');
  await fs.ensureDir(dbPath);

  db = await lancedb.connect(dbPath);
  
  // Initialize the embedding model (MiniLM-L6-v2)
  console.log('[Henry] Loading embedding model...');
  embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');

  try {
    table = await db.openTable('documents');
  } catch (e) {
    // Table doesn't exist, will be created on first ingestion
    console.log('[Henry] Vector table not found, will create on first ingest.');
  }
}

async function getEmbedding(text) {
  const output = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

async function ingestFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  console.log(`[Henry] Learning from: ${path.basename(filePath)} (${ext})`);
  
  let text = '';
  
  if (ext === '.pdf') {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);
    text = data.text;
  } else if (ext === '.docx' || ext === '.doc') {
    const result = await mammoth.extractRawText({ path: filePath });
    text = result.value;
  } else {
    throw new Error(`Unsupported file type: ${ext}`);
  }

  // Simple chunking (matching your Python logic)
  const chunks = [];
  for (let i = 0; i < text.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
    chunks.push(text.slice(i, i + CHUNK_SIZE));
  }

  const records = [];
  for (const chunk of chunks) {
    if (chunk.trim().length < 10) continue;
    const vector = await getEmbedding(chunk);
    records.push({
      vector,
      text: chunk,
      source: path.basename(filePath)
    });
  }

  if (table) {
    await table.add(records);
  } else {
    table = await db.createTable('documents', records);
  }
  
  console.log(`[Henry] Successfully remembered ${records.length} chunks from ${ext} file.`);
  return records.length;
}

async function queryHenry(queryText, limit = 3) {
  if (!table) return "";

  const queryVector = await getEmbedding(queryText);
  const results = await table.search(queryVector).limit(limit).execute();
  
  if (results.length === 0) return "";

  // Formatting for your "According to the..." requirement
  const context = results.map(r => `[Source: ${r.source}] ${r.text}`).join('\n---\n');
  return `CONTEXT FROM LOCAL DOCUMENTS:\n${context}`;
}

module.exports = { initEngine, ingestFile, queryHenry };
