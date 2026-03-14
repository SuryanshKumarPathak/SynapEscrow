const express = require("express");
const dotenv = require("dotenv");
const path = require("path");
const cors = require("cors");

dotenv.config();

const aiRoutes = require("./routes/aiRoutes");

const app = express();

/* middleware */
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002"
  ],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* static files */
app.use(express.static(path.join(__dirname, "public")));

/* view engine */
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

/* frontend page */
app.get("/", (req, res) => {
  res.render("index");
});

/* api routes */
app.use("/api", aiRoutes);

app.listen(4000, () => {
  console.log("AI Server running at http://localhost:4000");
});