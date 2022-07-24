require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const userRoutes = require("./routes/users");
const authorizeRoutes = require("./routes/authorize");

const mongoString = process.env.MONGODB_URI;

mongoose.connect(mongoString);
const database = mongoose.connection;

database.on("error", (error) => {
  console.log(error);
});

database.once("connected", () => {
  console.log("Database connected");
});

const app = express();

app.use(express.json());
app.use("/api/v1/users/", userRoutes);
app.use("/api/v1/authorize/", authorizeRoutes);

const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server started at port: ` + port);
});
