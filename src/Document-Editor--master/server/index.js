import express from 'express';
import cors from 'cors';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

// Get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
fs.mkdir(DATA_DIR, { recursive: true }).catch(() => {});

// POST /documents
app.post('/documents', async (req, res) => {
  try {
    const doc = {
      id: uuidv4(),
      title: req.body.title || 'Untitled',
      content: req.body.content,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await fs.writeFile(
      path.join(DATA_DIR, `${doc.id}.json`),
      JSON.stringify(doc, null, 2)
    );
    
    res.json({ id: doc.id });
  } catch (err) {
    console.error('Save error:', err);
    res.status(500).json({ error: 'Save failed', message: err.message });
  }
});

// GET /documents/:id
app.get('/documents/:id', async (req, res) => {
  try {
    const data = await fs.readFile(
      path.join(DATA_DIR, `${req.params.id}.json`),
      'utf-8'
    );
    res.json(JSON.parse(data));
  } catch (err) {
    console.error('Load error:', err);
    res.status(404).json({ error: 'Document not found' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`✓ Server running on http://localhost:${PORT}`);
});