import express from "express";
import bodyParser from "body-parser";

const app = express();
const port = 3000;
const posts=[];



app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

//home page ,All posts
app.get("/", (req, res) => {
  res.render("index.ejs",{posts});
});


// show create post page 
app.get("/new",(req,res)=>{
  res.render("new");
});

//create post 
app.post("/create",(req,res)=>{
const{text,content}=req.body;

posts.push({
  text:text,
  content:content
  });
});

//redirect home
app.get("/home",(req,res)=>{
  res.redirect('/');
});


app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
