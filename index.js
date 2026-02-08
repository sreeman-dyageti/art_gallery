import express from "express";
import bodyParser from "body-parser";

const app = express();
const port = 3000;


app.get("/", (req, res) => {
  res.render("/public/index.html");
});


app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
