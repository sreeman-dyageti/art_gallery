import express from "express";
import bodyParser from "body-parser";
import multer from "multer";
import path from "path";

const app = express();
const port = 3000;
const posts=[];

// for storage middleware
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });


app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

//home page ,All posts
app.get("/", (req, res) => {
  res.render("index",{posts});
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
  image: req.file ? `/uploads/${req.file.filename}` : null
  });

  res.redirect('/');
});

//redirect home
app.get("/home",(req,res)=>{
  res.redirect('/');
});

//Edit and Update posts
//edit page 
app.get("/edit/:index",(req,res)=>{
  const index = req.params.index;
  const post = posts[index];

  if(!post){
    return res.send("no post was found");
  }
  res.render("edit",{post,index});
});

//update post
app.post("/update/:index",upload.single("image"),(req,res)=>{
  const index= req.params.index;

  if(!posts[index]){
    return res.redirect('/');
  };
  posts[index]={
    title:req.body.title,
    content:req.body.content,
    image: req.file
      ? `/uploads/${req.file.filename}`   
      : req.body.existingImage 
  };
  res.redirect('/');
});

//Delete post
app.post("/delete/:index",(req,res)=>{
  const index=req.params.index;

  if(posts[index]){
    posts.splice(index,1);
  }
  res.redirect('/');
});

app.use((req, res) => {
  res.status(404).send("404 - Page Not Found");
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
