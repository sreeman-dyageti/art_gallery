import express from "express";
import bodyParser from "body-parser";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import env from "dotenv";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";
import GoogleStrategy from "passport-google-oauth2";
import pg from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const app   = express();
const port  = 3000;
const posts = [];
env.config();

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
app.get("/", (req, res) => {
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
app.post("/create",upload.single("image"),(req,res)=>{
const {title,content}=req.body;

posts.push({
  title,
  content,
  image: req.file ? `/uploads/${req.file.filename}` : null,
  createdAt: new Date(),
  });

  res.redirect("/");
});


//Edit and Update posts
//edit page 
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
