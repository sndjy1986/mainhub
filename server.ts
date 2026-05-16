import express from 'express';
import path from 'path';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import Parser from 'rss-parser';

const parser = new Parser();

const NEWS_FEEDS: Record<string, string> = {
  cnn: 'http://rss.cnn.com/rss/cnn_topstories.rss',
  fox: 'http://feeds.foxnews.com/foxnews/latest',
  tech: 'https://feeds.feedburner.com/TechCrunch/',
  google: 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en',
  reuters: 'https://www.reutersagency.com/feed/',
  associated_press: 'https://news.google.com/rss/search?q=associated+press&hl=en-US&gl=US&ceid=US:en'
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  app.get('/api/news', async (req, res) => {
    try {
      const source = (req.query.source as string) || 'google';
      const feedUrl = NEWS_FEEDS[source] || NEWS_FEEDS.google;
      
      const feed = await parser.parseURL(feedUrl);
      
      const items = feed.items.map(item => ({
        title: item.title,
        link: item.link,
        pubDate: item.pubDate,
        contentSnippet: item.contentSnippet,
        source: feed.title
      }));

      res.json({
        title: feed.title,
        items: items.slice(0, 20)
      });
    } catch (error) {
      console.error('News proxy error:', error);
      res.status(500).json({ error: 'Failed to fetch news' });
    }
  });

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
