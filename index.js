import express      from "express";
import bodyParser   from "body-parser";
import cloudinary from "./cloudinary.js";
import path         from "path";
import { fileURLToPath } from "url";
import dotenv       from "dotenv";
import session      from "express-session";
import pg           from "pg";
import multer from "multer";



dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app   = express();
const port  = process.env.PORT || 3000;

const storage = multer.memoryStorage();
const upload = multer({ storage });

// pg connection
const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});

db.connect();
// middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views",path.join(__dirname,"views"));
app.use (session({
 secret:process.env.SESSION_SECRET,
  resave:            false,
  saveUninitialized: false,          
  cookie: {
    maxAge:   1000 * 60 * 60 * 24,  
    httpOnly: true,                 
    secure:   false,  
  }
}
));
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

// routes
//home page, All posts
app.get("/",async (req, res) => {
  try {
  const result = await db.query("SELECT * FROM posts ORDER BY created_at DESC");
  const posts = result.rows;
  res.render("index",{posts});
  } catch (err) {
    console.error(err);
    res.status(500).send("Database error");
  }
 
});

//redirect home
app.get("/home",(req,res)=>{
  res.redirect('/');
});

// Show single post
app.get("/posts/:id", async (req, res) => {
  try {
    const { rows } = await db.query(
      "SELECT * FROM posts WHERE id = $1",
      [req.params.id]
    );
    if (!rows[0]) return res.redirect("/");

    // Related posts — latest 6 excluding current
    const { rows: related } = await db.query(
      "SELECT * FROM posts WHERE id != $1 ORDER BY created_at DESC LIMIT 6",
      [req.params.id]
    );

    res.render("show", { post: rows[0], related });
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
});

// show create post page 
app.get("/new",(req,res)=>{
  res.render("new");
});

//Edit and Update posts
app.get("/edit/:id", async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM posts WHERE id = $1", [req.params.id]);
    if (!rows[0]) return res.redirect("/");
    res.render("edit", { post: rows[0] });
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
});

// Search
app.get("/search", async (req, res) => {
  try {
    const q = req.query.q?.trim() || "";
    if (!q) return res.redirect("/");

    const { rows: posts } = await db.query(
      `SELECT * FROM posts
       WHERE title ILIKE $1 OR content ILIKE $1
       ORDER BY created_at DESC`,
      [`%${q}%`]
    );
    res.render("index", { posts, searchQuery: q });
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
});

//create post 
app.post("/create", upload.fields([
  { name: "image", maxCount: 1 },
  { name: "processImages", maxCount: 10 }
]), async (req, res) => {
  try {
    const { title, content } = req.body;
    const createdAt = new Date();

    // MAIN IMAGE
    let mainImageUrl = null;

    if (req.files["image"]) {
      const file = req.files["image"][0];

      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "artfolio/main" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(file.buffer);
      });

      mainImageUrl = result.secure_url;
    }

    // PROCESS IMAGES
    let processImageUrls = [];

    if (req.files["processImages"]) {
      for (let file of req.files["processImages"]) {
        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "artfolio/process" },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          stream.end(file.buffer);
        });

        processImageUrls.push(result.secure_url);
      }
    }

    // SAVE TO DB
    await db.query(
      "INSERT INTO posts (title, content, image, process_images, created_at) VALUES ($1,$2,$3,$4,$5)",
      [title, content, mainImageUrl, JSON.stringify(processImageUrls), createdAt]
    );

    res.redirect("/");
  } catch (error) {
    console.log(error);
  }
});
  
// Update post
app.post("/update/:id", upload.fields([
  { name: "image", maxCount: 1 },
  { name: "processImages", maxCount: 10 }
]), async (req, res) => {
  try {
    const { title, content } = req.body;
    const id = req.params.id;

    // Get existing post
    const { rows } = await db.query("SELECT * FROM posts WHERE id = $1", [id]);
    if (!rows[0]) return res.redirect("/");
    const existing = rows[0];

    // Main image
    let imageUrl = existing.image;
    let imageId  = existing.image_id;

    if (req.files["image"]) {
      // Delete old from Cloudinary
      if (imageId) await cloudinary.uploader.destroy(imageId).catch(() => {});

      const file = req.files["image"][0];
      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "artfolio/main" },
          (error, result) => error ? reject(error) : resolve(result)
        );
        stream.end(file.buffer);
      });
      imageUrl = result.secure_url;
      imageId  = result.public_id;
    }

    // Process images
    let processImageUrls = existing.process_images || [];

    if (req.files["processImages"]) {
      for (let file of req.files["processImages"]) {
        const result = await new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream(
            { folder: "artfolio/process" },
            (error, result) => error ? reject(error) : resolve(result)
          );
          stream.end(file.buffer);
        });
        processImageUrls.push(result.secure_url);
      }
    }

    await db.query(
      "UPDATE posts SET title=$1, content=$2, image=$3, image_id=$4, process_images=$5, updated_at=NOW() WHERE id=$6",
      [title, content, imageUrl, imageId, JSON.stringify(processImageUrls), id]
    );

    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
});

// Delete post
app.post("/delete/:id", async (req, res) => {
  try {
    const { rows } = await db.query(
      "DELETE FROM posts WHERE id = $1 RETURNING image_id, process_images",
      [req.params.id]
    );
    // Delete main image from Cloudinary
    const imageId = rows[0]?.image_id;
    if (imageId) await cloudinary.uploader.destroy(imageId).catch(() => {});

    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
});

// 404
app.use((req, res) => {
  res.status(404).send("404 - Page Not Found");
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
