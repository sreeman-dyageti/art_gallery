# ◆ Artfolio

> An artist-focused web platform to showcase creative processes step by step, build portfolios, and explore artwork by creators.

Artists often struggle to present their work in a structured and meaningful way. Most platforms focus only on final outputs, ignoring the creative journey behind them. **Artfolio** solves this by providing a dedicated space where artists can showcase their artwork, document their creative process, and build a personal portfolio that reflects both their skills and their story. It also creates an environment where viewers can explore different artworks, discover creators, and get inspired by how each piece comes to life.

![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.x-000000?style=flat-square&logo=express&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Local-336791?style=flat-square&logo=postgresql&logoColor=white)
![Cloudinary](https://img.shields.io/badge/Cloudinary-Image%20CDN-3448C5?style=flat-square&logo=cloudinary&logoColor=white)
![EJS](https://img.shields.io/badge/EJS-Templating-B4CA65?style=flat-square)

---

## ✨ Features

- **Pinterest-style borderless masonry gallery** — responsive column layout
- **Creative process showcase** — upload multiple step-by-step images per post
- **Process slideshow** — viewers see how each artwork came to life with a step navigator and thumbnail strip
- **Persistent image storage** via Cloudinary CDN — images survive server restarts
- **Persistent post data** via PostgreSQL — all posts stored in a real database
- **Search** — search artworks by title or artist note
- **Related posts** — discover more artwork below every post
- **Create / Edit / Delete** posts with title, artist note, main image, and process images
- **Drag & drop image upload** with live preview for both main and process images
- **Dark mode** with preference saved to localStorage
- **Hamburger menu** for mobile with smooth animations
- **Auto-optimized images** — Cloudinary auto-converts to best format and quality
- **Session support** — ready for auth (Step 3)
- **Character counter** on artist note field (500 char limit)
- **Responsive design** — works on mobile, tablet, and desktop

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express 5 |
| Templating | EJS |
| Database | PostgreSQL (local) |
| Image Storage | Cloudinary |
| File Upload | Multer (memory storage) + Cloudinary stream upload |
| Auth (planned) | bcrypt + Passport.js + Google OAuth |
| Styling | Vanilla CSS — masonry grid, dark mode, CSS variables |
| Session | express-session |

---

## 📁 Project Structure

```
art_gallery/
├── index.js                  # Express server & all routes
├── cloudinary.js             # Cloudinary config
├── package.json
├── .env                      # Your secrets (never commit this)
├── .env.example              # Template — safe to commit
├── .gitignore
├── public/
│   ├── css/
│   │   └── styles.css        # All styles
│   ├── js/
│   │   └── main.js           # Dark mode, hamburger, drag-drop, slideshow
│   └── img/
│       └── default.jpg       # Fallback image
└── views/
    ├── index.ejs             # Gallery home — Pinterest grid
    ├── show.ejs              # Single post — image + process slideshow + related
    ├── new.ejs               # Create post form
    ├── edit.ejs              # Edit post form
    └── partials/
        ├── header.ejs        # Nav + search bar + HTML head
        └── footer.ejs        # Footer + scripts
```

---

## 🚀 Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/sreeman-d/art_gallery.git
cd art_gallery
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up PostgreSQL locally

Make sure PostgreSQL is running, then create the database and table:

```sql
CREATE DATABASE artfolio;

\c artfolio

CREATE TABLE IF NOT EXISTS posts (
  id             SERIAL PRIMARY KEY,
  title          VARCHAR(255) NOT NULL,
  content        TEXT NOT NULL,
  image_url      TEXT,
  image_id       TEXT,
  process_images TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. Set up Cloudinary (free)

1. Sign up at [cloudinary.com](https://cloudinary.com)
2. Go to your **Dashboard**
3. Copy your **Cloud Name**, **API Key**, and **API Secret**

### 5. Configure environment variables

Create a `.env` file in the root:

```env
# PostgreSQL
PG_USER=postgres
PG_HOST=localhost
PG_DATABASE=artfolio
PG_PASSWORD=yourpassword
PG_PORT=5432

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Session
SESSION_SECRET=some_long_random_secret_string

# App
PORT=3000
```

> ⚠️ **Never commit `.env`** — it's already in `.gitignore`

### 6. Run the app

```bash
# Development (auto-restarts on file changes)
nodemon index.js

# Production
node index.js
```

Visit **http://localhost:3000**

---

## 🗄 Database Schema

```sql
posts
├── id             SERIAL PRIMARY KEY
├── title          VARCHAR(255) NOT NULL
├── content        TEXT NOT NULL
├── image_url      TEXT                    -- Cloudinary CDN URL
├── image_id       TEXT                    -- Cloudinary public_id (for deletion)
├── process_images TEXT                    -- JSON array of Cloudinary URLs
├── created_at     TIMESTAMPTZ DEFAULT NOW()
└── updated_at     TIMESTAMPTZ DEFAULT NOW()
```

`process_images` stores a JSON array of Cloudinary URLs:
```json
["https://res.cloudinary.com/.../step1.jpg", "https://res.cloudinary.com/.../step2.jpg"]
```

---

## ☁️ How Image Storage Works

```
User uploads image(s)
        ↓
Multer stores file in memory (no disk write)
        ↓
Stream directly to Cloudinary via upload_stream()
        ↓
Cloudinary returns secure_url + public_id
        ↓
URL saved to PostgreSQL
        ↓
Images served from Cloudinary's global CDN
```

**Main image** → stored as `image_url` + `image_id` in posts table

**Process images** → each streamed to Cloudinary, URLs collected into array, stored as JSON in `process_images` column

When a post is **deleted**, the main image is removed from Cloudinary using the stored `public_id`.

---

## 🔮 Planned Features (Roadmap)

- [ ] **User accounts** — signup / login with bcrypt + Passport.js
- [ ] **Google OAuth** — sign in with Google
- [ ] **Likes / saves** on posts
- [ ] **Comments** on posts
- [ ] **Tags / categories** for artwork
- [ ] **Artist profiles** with bio and avatar
- [ ] **Deploy to Render / Railway**

---

## 🔧 Environment Variables Reference

| Variable | Description |
|---|---|
| `PG_USER` | PostgreSQL username |
| `PG_HOST` | PostgreSQL host (localhost for local) |
| `PG_DATABASE` | Database name |
| `PG_PASSWORD` | PostgreSQL password |
| `PG_PORT` | PostgreSQL port (default 5432) |
| `CLOUDINARY_CLOUD_NAME` | Your Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `SESSION_SECRET` | Random string for session encryption |
| `PORT` | Port to run the server (default 3000) |

---

## 📝 License

MIT — feel free to use, modify, and share.

🚧 Work in progress — actively building and improving features on this project.
---

<p align="center">Built with Node.js · Express · PostgreSQL · Cloudinary · EJS</p>
<p align="center">by <a href="https://github.com/sreeman-d">Sreeman</a></p>
