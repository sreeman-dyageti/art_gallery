import express      from "express";
import bodyParser   from "body-parser";
import { upload, cloudinary } from "./cloudinary.js";
import path         from "path";
import { fileURLToPath } from "url";
import dotenv       from "dotenv";
import session      from "express-session";
import pg           from "pg";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app   = express();
const port  = process.env.PORT || 3000;

// for storage middleware
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "public/uploads"),
  filename:    (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views",path.join(__dirname,"views"));
app.use (session({
 secret:process.env.SESSION_SECRET,
 saveUninitialized:true,
 resave: false
}
));

// pg connection
const db = new pg.Client({
  user: process.env.PG_USER,
  host: process.env.PG_HOST,
  database: process.env.PG_DATABASE,
  password: process.env.PG_PASSWORD,
  port: process.env.PG_PORT,
});
db.connect();

// routes
//home page, All posts
app.get("/",async (req, res) => {
  const result = await db.query("SELECT * FROM posts");
  const posts = result.rows;
  res.render("index",{posts});
});

//redirect home
app.get("/home",(req,res)=>{
  res.redirect('/');
});

// Show single post
app.get("/posts/:index", (req, res) => {
  const index = parseInt(req.params.index);
  const post = posts[index];

  if (!post) {
    return res.redirect("/");
  }

  res.render("show", { post, index });
});

// show create post page 
app.get("/new",(req,res)=>{
  res.render("new");
});

//create post 
app.post("/create",upload.single("image"), async (req,res)=>{
  try {
    const {title,content}=req.body;
    const createdAt = new Date();
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
    const result =await db.query("INSERT INTO posts (title, content, image, created_at) VALUES ($1,$2,$3,$4)  RETURNING *",
  [title, content, imagePath, createdAt ]
);

res.redirect("/");
  } catch (error) {
    console.log(error);
  }
});


//Edit and Update posts
app.get("/edit/:index",(req,res)=>{
  const index = req.params.index;
  const post = posts[index];

  if(!post){
    return res.redirect("/");
  }
  res.render("edit",{post,index});
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
