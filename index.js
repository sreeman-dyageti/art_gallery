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
  } catch (error) {
    console.error(err);
    res.status(500).send("Database error");
  }
 
});

//redirect home
app.get("/home",(req,res)=>{
  res.redirect('/');
});

// Show single post
app.get("/posts/:index", async (req, res) => {
  try {
    const { rows } = await db.query("SELECT * FROM posts WHERE id = $1", [req.params.id]);
    if (!rows[0]) return res.redirect("/");
    res.render("show", { post: rows[0] });
  } catch (err) {
    console.error(err);
    res.redirect("/");
  }
});

// show create post page 
app.get("/new",(req,res)=>{
  res.render("new");
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
  

//update post
app.post("/update/:index",upload.single("image"),(req,res)=>{
  const index= parseInt(req.params.index);

  if(!posts[index]){
    return res.redirect("/");
  };
  posts[index]={
    title:req.body.title,
    content:req.body.content,
    image: req.file 
      ? `/uploads/${req.file.filename}`   
      : (req.body.existingImage || null ),
    createdAt: posts[index].createdAt,
    uploadAt:new Date(),
  };
  res.redirect("/");
});

//Delete post
app.post("/delete/:index",(req,res)=>{
  const index= parseInt(req.params.index);

  if(posts[index]){
    posts.splice(index,1);
  }
  res.redirect("/");
});

// 404
app.use((req, res) => {
  res.status(404).send("404 - Page Not Found");
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
