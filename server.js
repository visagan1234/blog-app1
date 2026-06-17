const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = 'your-strong-secret-change-this';

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ---------- JSON Database ----------
const DB_PATH = path.join(__dirname, 'db.json');

function readDB() {
  if (!fs.existsSync(DB_PATH)) {
    const seed = {
      users: [
        {
          id: '1',
          username: 'admin',
          password: bcrypt.hashSync('admin123', 10)
        },
        {
          id: '2',
          username: 'alex',
          password: bcrypt.hashSync('demo123', 10)
        },
        {
          id: '3',
          username: 'jessica',
          password: bcrypt.hashSync('demo123', 10)
        }
      ],
      posts: [
        {
          id: 'p1',
          title: 'Why I Switched to TypeScript (and Never Looked Back)',
          content: `After years of writing JavaScript, I finally gave TypeScript a serious try. The type safety alone saved me hours of debugging. In this post, I share my top 5 reasons for the switch, how I migrated a large codebase, and the tools that made the transition smooth. Whether you're a beginner or a seasoned dev, TypeScript is worth the investment.`,
          authorId: '1',
          authorName: 'admin',
          createdAt: Date.now() - 86400000 * 2, // 2 days ago
          comments: [
            {
              id: 'c1',
              authorName: 'alex',
              content: "I've been on the fence, but your post convinced me to try it. Any recommendation for a starter project?",
              createdAt: Date.now() - 86400000 * 1.5
            },
            {
              id: 'c2',
              authorName: 'jessica',
              content: "Great read! I love how you explained the 'any' escape hatch – that's where I always get stuck.",
              createdAt: Date.now() - 86400000 * 1.2
            }
          ]
        },
        {
          id: 'p2',
          title: 'The Art of Mindful Remote Work',
          content: `Working from home is a blessing, but it can also be a trap for burnout. I've learned to set boundaries, create a dedicated workspace, and incorporate short meditation breaks. In this article, I share practical tips that have boosted my productivity and mental health – from digital detox to the Pomodoro technique. Working remotely doesn't mean working all the time.`,
          authorId: '2',
          authorName: 'alex',
          createdAt: Date.now() - 86400000 * 1.5,
          comments: [
            {
              id: 'c3',
              authorName: 'admin',
              content: "Excellent advice! I started using the Forest app to stay focused, and it helped a lot.",
              createdAt: Date.now() - 86400000 * 1.3
            },
            {
              id: 'c4',
              authorName: 'jessica',
              content: "I needed this. Any tips for dealing with noisy roommates? 😅",
              createdAt: Date.now() - 86400000 * 1.1
            }
          ]
        },
        {
          id: 'p3',
          title: 'How to Build a Personal Brand on Social Media (Without Feeling Fake)',
          content: `Building a personal brand doesn't have to be cringe. I've grown my online presence authentically by sharing my real journey – the wins and the failures. In this post, I break down a simple framework: find your niche, tell stories, engage genuinely, and be consistent. You don't need millions of followers; you just need the right ones.`,
          authorId: '3',
          authorName: 'jessica',
          createdAt: Date.now() - 86400000 * 1,
          comments: [
            {
              id: 'c5',
              authorName: 'alex',
              content: "Love this! I've been struggling with imposter syndrome. How do you handle negative comments?",
              createdAt: Date.now() - 86400000 * 0.8
            }
          ]
        },
        {
          id: 'p4',
          title: 'The Rise of AI in Everyday Life – A Beginner\'s Guide',
          content: `AI is everywhere, but it doesn't have to be intimidating. From smart assistants to personalized recommendations, I explain how AI works under the hood, the ethical questions we face, and how you can leverage AI tools to boost your daily productivity. No math degree required – just curiosity.`,
          authorId: '1',
          authorName: 'admin',
          createdAt: Date.now() - 86400000 * 0.5,
          comments: []
        },
        {
          id: 'p5',
          title: 'Top 5 Books That Changed My Perspective on Life',
          content: `Reading is my superpower. These five books – spanning philosophy, psychology, and fiction – reshaped how I view success, relationships, and happiness. I share my key takeaways and why each one is a must-read. If you're looking for a transformative read, start with this list.`,
          authorId: '2',
          authorName: 'alex',
          createdAt: Date.now() - 86400000 * 0.2,
          comments: [
            {
              id: 'c6',
              authorName: 'jessica',
              content: "I've read three of these – adding the others to my list! Thanks for sharing.",
              createdAt: Date.now() - 86400000 * 0.1
            }
          ]
        }
      ]
    };
    fs.writeFileSync(DB_PATH, JSON.stringify(seed, null, 2));
    return seed;
  }
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

// ---------- Auth Middleware ----------
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
}

// ---------- Routes ----------

// Auth
app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password required' });
  }
  const db = readDB();
  if (db.users.find(u => u.username === username)) {
    return res.status(400).json({ message: 'Username already exists' });
  }
  const newUser = {
    id: 'u' + Date.now(),
    username,
    password: bcrypt.hashSync(password, 10)
  };
  db.users.push(newUser);
  writeDB(db);
  const token = jwt.sign({ id: newUser.id, username: newUser.username }, JWT_SECRET, { expiresIn: '24h' });
  res.status(201).json({ token, user: { id: newUser.id, username: newUser.username } });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.username === username);
  if (!user) return res.status(400).json({ message: 'Invalid credentials' });
  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(400).json({ message: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
  res.json({ token, user: { id: user.id, username: user.username } });
});

// Posts
app.get('/api/posts', (req, res) => {
  const db = readDB();
  const posts = db.posts.sort((a, b) => b.createdAt - a.createdAt);
  res.json(posts);
});

app.post('/api/posts', authenticate, (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ message: 'Title and content required' });
  }
  const db = readDB();
  const newPost = {
    id: 'p' + Date.now(),
    title,
    content,
    authorId: req.user.id,
    authorName: req.user.username,
    createdAt: Date.now(),
    comments: []
  };
  db.posts.push(newPost);
  writeDB(db);
  res.status(201).json(newPost);
});

app.put('/api/posts/:id', authenticate, (req, res) => {
  const db = readDB();
  const post = db.posts.find(p => p.id === req.params.id);
  if (!post) return res.status(404).json({ message: 'Post not found' });
  if (post.authorId !== req.user.id) {
    return res.status(403).json({ message: 'You can only edit your own posts' });
  }
  const { title, content } = req.body;
  if (title) post.title = title;
  if (content) post.content = content;
  writeDB(db);
  res.json(post);
});

app.delete('/api/posts/:id', authenticate, (req, res) => {
  const db = readDB();
  const index = db.posts.findIndex(p => p.id === req.params.id);
  if (index === -1) return res.status(404).json({ message: 'Post not found' });
  if (db.posts[index].authorId !== req.user.id) {
    return res.status(403).json({ message: 'You can only delete your own posts' });
  }
  db.posts.splice(index, 1);
  writeDB(db);
  res.json({ message: 'Post deleted' });
});

// Comments
app.post('/api/posts/:postId/comments', authenticate, (req, res) => {
  const db = readDB();
  const post = db.posts.find(p => p.id === req.params.postId);
  if (!post) return res.status(404).json({ message: 'Post not found' });
  const { content } = req.body;
  if (!content) return res.status(400).json({ message: 'Comment content required' });
  const newComment = {
    id: 'c' + Date.now(),
    authorName: req.user.username,
    content,
    createdAt: Date.now()
  };
  post.comments.push(newComment);
  writeDB(db);
  res.status(201).json(newComment);
});

app.delete('/api/posts/:postId/comments/:commentId', authenticate, (req, res) => {
  const db = readDB();
  const post = db.posts.find(p => p.id === req.params.postId);
  if (!post) return res.status(404).json({ message: 'Post not found' });
  const commentIndex = post.comments.findIndex(c => c.id === req.params.commentId);
  if (commentIndex === -1) return res.status(404).json({ message: 'Comment not found' });
  if (post.comments[commentIndex].authorName !== req.user.username) {
    return res.status(403).json({ message: 'You can only delete your own comments' });
  }
  post.comments.splice(commentIndex, 1);
  writeDB(db);
  res.json({ message: 'Comment deleted' });
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Blog server running on http://localhost:${PORT}`);
});