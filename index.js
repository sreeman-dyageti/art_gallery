import express           from "express";
import bodyParser        from "body-parser";
import cloudinary        from "./cloudinary.js";
import path              from "path";
import { fileURLToPath } from "url";
import dotenv            from "dotenv";
import session           from "express-session";
import pg                from "pg";
import multer            from "multer";
import bcrypt            from "bcrypt";
import passport          from "passport";
import { Strategy as LocalStrategy } from "passport-local";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app  = express();
const port = process.env.PORT || 3000;
const SALT_ROUNDS = 12;

// ── Multer memory storage 
const storage = multer.memoryStorage();
const upload  = multer({ storage });

// ── PostgreSQL 
const db = new pg.Client({
  user:     process.env.PG_USER,
  host:     process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port:     process.env.PG_PORT,
});

db.connect()
  .then(() => console.log("✅ PostgreSQL connected"))
  .catch(err => { console.error("❌ DB error:", err.message); process.exit(1); });

// ── Middleware ────────────────────────────────
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(session({
  secret:            process.env.SESSION_SECRET,
  resave:            false,
  saveUninitialized: false,
  cookie: {
    maxAge:   1000 * 60 * 60 * 24,
    httpOnly: true,
    secure:   false,
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// currentUser available in ALL views
app.use((req, res, next) => {
  res.locals.currentUser = req.user || null;
  next();
});

// ── Passport local strategy 
passport.use(new LocalStrategy(
  { usernameField: "email" },
  async (email, password, done) => {
    try {
      const { rows } = await db.query(
        "SELECT * FROM users WHERE email = $1", [email]
      );
      if (!rows[0]) return done(null, false, { message: "No account with that email." });

      const match = await bcrypt.compare(password, rows[0].password_hash);
      if (!match) return done(null, false, { message: "Incorrect password." });

      return done(null, rows[0]);
    } catch (err) {
      return done(err);
    }
  }
));

passport.serializeUser((user, done) => done(null, user.id));

passport.deserializeUser(async (id, done) => {
  try {
    const { rows } = await db.query("SELECT * FROM users WHERE id = $1", [id]);
    done(null, rows[0]);
  } catch (err) {
    done(err);
  }
});

// ── Auth middleware 
function requireLogin(req, res, next) {
  if (req.isAuthenticated()) return next();
  res.redirect("/login");
}

function isOwner(post, user) {
  return user && post.user_id === user.id;
}

// ── Upload helper 
async function uploadToCloudinary(buffer, folder) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder },
      (err, result) => err ? reject(err) : resolve(result)
    );
    stream.end(buffer);
  });
}


// ROUTES

// Home
app.get("/", async (req, res) => {
  try {
    const { rows: posts } = await db.query(`
      SELECT posts.*, users.username
      FROM posts
      LEFT JOIN users ON posts.user_id = users.id
      ORDER BY posts.created_at DESC
    `);
    res.render("index", { posts });
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
});

app.get("/home", (req, res) => res.redirect("/"));

// Search
app.get("/search", async (req, res) => {
  try {
    const q = req.query.q?.trim() || "";
    if (!q) return res.redirect("/");

    const { rows: posts } = await db.query(`
      SELECT posts.*, users.username
      FROM posts
      LEFT JOIN users ON posts.user_id = users.id
      WHERE posts.title ILIKE $1 OR posts.content ILIKE $1
      ORDER BY posts.created_at DESC
    `, [`%${q}%`]);

    res.render("index", { posts, searchQuery: q });
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
});

// Show single post
app.get("/posts/:id", async (req, res) => {
  try {
    const { rows } = await db.query(`
      SELECT posts.*, users.username
      FROM posts
      LEFT JOIN users ON posts.user_id = users.id
      WHERE posts.id = $1
    `, [req.params.id]);

    if (!rows[0]) return res.redirect("/");

    const { rows: related } = await db.query(`
      SELECT posts.*, users.username
      FROM posts
      LEFT JOIN users ON posts.user_id = users.id
      WHERE posts.id != $1
      ORDER BY posts.created_at DESC
      LIMIT 6
    `, [req.params.id]);

    const post = rows[0];
    res.render("show", {
      post,
      related,
      canEdit: isOwner(post, req.user)
    });
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
});

// ── New post 
app.get("/new", requireLogin, (req, res) => res.render("new"));

app.post("/create", requireLogin, upload.fields([
  { name: "image",         maxCount: 1  },
  { name: "processImages", maxCount: 10 }
]), async (req, res) => {
  try {
    const { title, content } = req.body;

    // Main image
    let image_url = null, image_id = null;
    if (req.files["image"]) {
      const result = await uploadToCloudinary(req.files["image"][0].buffer, "artfolio/main");
      image_url = result.secure_url;
      image_id  = result.public_id;
    }

    // Process images
    let processUrls = [];
    if (req.files["processImages"]) {
      for (const file of req.files["processImages"]) {
        const result = await uploadToCloudinary(file.buffer, "artfolio/process");
        processUrls.push(result.secure_url);
      }
    }

    await db.query(
      `INSERT INTO posts (title, content, image_url, image_id, process_images, user_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [title, content, image_url, image_id, JSON.stringify(processUrls), req.user.id]
    );

    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
});

// ── Edit / Update
app.get("/edit/:id", requireLogin, async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM posts WHERE id = $1", [req.params.id]);
    if (!rows[0]) return res.redirect("/");
    if (!isOwner(rows[0], req.user)) return res.redirect("/");
    res.render("edit", { post: rows[0] });
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
});

app.post("/update/:id", requireLogin, upload.fields([
  { name: "image",         maxCount: 1  },
  { name: "processImages", maxCount: 10 }
]), async (req, res) => {
  try {
    const { title, content } = req.body;
    const id = req.params.id;

    const { rows } = await db.query("SELECT * FROM posts WHERE id = $1", [id]);
    if (!rows[0] || !isOwner(rows[0], req.user)) return res.redirect("/");

    const existing = rows[0];
    let image_url = existing.image_url;
    let image_id  = existing.image_id;

    // New main image
    if (req.files["image"]) {
      if (image_id) await cloudinary.uploader.destroy(image_id).catch(() => {});
      const result = await uploadToCloudinary(req.files["image"][0].buffer, "artfolio/main");
      image_url = result.secure_url;
      image_id  = result.public_id;
    }

    // New process images — 
    let processUrls = [];
    try {
      processUrls = Array.isArray(existing.process_images)
        ? existing.process_images
        : JSON.parse(existing.process_images || "[]");
    } catch { processUrls = []; }

    if (req.files["processImages"]) {
      for (const file of req.files["processImages"]) {
        const result = await uploadToCloudinary(file.buffer, "artfolio/process");
        processUrls.push(result.secure_url);
      }
    }

    await db.query(
      `UPDATE posts SET title=$1, content=$2, image_url=$3, image_id=$4,
       process_images=$5, updated_at=NOW() WHERE id=$6`,
      [title, content, image_url, image_id, JSON.stringify(processUrls), id]
    );

    res.redirect(`/posts/${id}`);
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
});

// ── Delete 
app.post("/delete/:id", requireLogin, async (req, res) => {
  try {
    const { rows } = await db.query(
      "DELETE FROM posts WHERE id = $1 AND user_id = $2 RETURNING image_id",
      [req.params.id, req.user.id]
    );
    if (rows[0]?.image_id) {
      await cloudinary.uploader.destroy(rows[0].image_id).catch(() => {});
    }
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
});

// ── Profile 
app.get("/profile", requireLogin, (req, res) => {
  res.redirect(`/profile/${req.user.username}`);
});

app.get("/profile/:username", async (req, res) => {
  try {
    const { rows: users } = await db.query(
      "SELECT id, username, email, created_at FROM users WHERE username = $1",
      [req.params.username]
    );
    if (!users[0]) return res.status(404).send("User not found");

    const { rows: posts } = await db.query(
      `SELECT * FROM posts WHERE user_id = $1 ORDER BY created_at DESC`,
      [users[0].id]
    );

    const isOwnProfile = req.user && req.user.username === req.params.username;

    res.render("profile", {
      profileUser: users[0],
      posts,
      isOwnProfile
    });
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
});

// ── Register 
app.get("/register", (req, res) => {
  if (req.isAuthenticated()) return res.redirect("/");
  res.render("register", { error: null });
});

app.post("/register", async (req, res) => {
  try {
    const { username, email, password, confirmPassword } = req.body;

    if (password !== confirmPassword) {
      return res.render("register", { error: "Passwords do not match." });
    }
    if (password.length < 6) {
      return res.render("register", { error: "Password must be at least 6 characters." });
    }

    // Check if email or username already taken
    const { rows: existing } = await db.query(
      "SELECT id FROM users WHERE email = $1 OR username = $2",
      [email, username]
    );
    if (existing.length > 0) {
      return res.render("register", { error: "Email or username already taken." });
    }

    const hash = await bcrypt.hash(password, SALT_ROUNDS);

    const { rows } = await db.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3) RETURNING *`,
      [username, email, hash]
    );

    // Auto login after register
    req.login(rows[0], (err) => {
      if (err) return res.redirect("/login");
      res.redirect("/");
    });
  } catch (err) {
    console.error(err);
    res.render("register", { error: "Something went wrong. Try again." });
  }
});

// ── Login 
app.get("/login", (req, res) => {
  if (req.isAuthenticated()) return res.redirect("/");
  res.render("login", { error: null });
});

app.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.render("login", { error: info.message });
    req.login(user, (err) => {
      if (err) return next(err);
      res.redirect("/");
    });
  })(req, res, next);
});

// ── Logout 
app.post("/logout", (req, res) => {
  req.logout((err) => {
    if (err) return res.redirect("/");
    res.redirect("/login");
  });
});

// 404
app.use((req, res) => res.status(404).send("404 - Page Not Found"));

app.listen(port, () => {
  console.log(`\n🎨  Artfolio running → http://localhost:${port}\n`);
});