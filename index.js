// imports
require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const session = require("express-session");
const mongodbSession = require("connect-mongodb-session")(session);
//file imports
const { userDataValidation, emailValidator } = require("./utils/authUtils");
const userModel = require("./models/userModel");
const isAuth = require("./middlewares/isAuth");
const todoModel = require("./models/todoModel");
const { todoValidation } = require("./utils/todoUtils");

// Mongo DB Connections
mongoose
  .connect(process.env.MONGO_URI)
  .then((response) => {
    console.log("MongoDB Connection Succeeded.");
  })
  .catch((error) => {
    console.log("Error in DB connection: " + error);
  });

// Middleware Connections
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.use(express.static("public"));
// adding session storage in db:
app.use(
  session({
    secret: process.env.SECRET_KEY,
    store: new mongodbSession({
      uri: process.env.MONGO_URI,
      collection: "sessions",
    }),
    resave: false,
    saveUninitialized: false,
  })
);

// Routes
app.get("/", (req, res) => {
  res.render("form");
});

app.get("/login-page", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  const { loginid, password } = req.body;
  if (!loginid || !password)
    return res.status(400).json("missing user Credentials!");

  // check login id is email or username and verify account -
  let userDb;
  try {
    if (emailValidator(loginid)) {
      userDb = await userModel.findOne({ email: loginid });
      console.log(userDb);
    } else {
      userDb = await userModel.findOne({ username: loginid });
      console.log(userDb);
    }
  } catch (error) {
    return res
      .status(500)
      .json({ message: "internal server error", error: error });
  }

  if (userDb == null) return res.status(400).json("user does not exist!");

  // check password is correct
  const isPassCorrect = await bcrypt.compare(password, userDb.password);

  if (!isPassCorrect)
    return res.status(400).json("invalid username or password!");

  req.session.isAuth = true;
  req.session.user = {
    username: userDb.username,
    email: userDb.email,
    id: userDb._id,
  };

  //return res.status(200).json("login successfull");
  return res.redirect("/dashboard");
});

app.post("/register", async (req, res) => {
  // console.log(req.body);
  const { username, password, email } = req.body;

  try {
    await userDataValidation({ username, password, email });
  } catch (error) {
    return res.send({ status: 400, message: error });
  }
  // password hashing
  const hashedPass = await bcrypt.hash(password, Number(process.env.SALT));

  //check email and username are taken
  const isEmailTaken = await userModel.findOne({ email });
  const isUserNameTaken = await userModel.findOne({ username });

  if (isEmailTaken) return res.status(400).json("Email is already exit");
  if (isUserNameTaken) return res.status(400).json("UserName is already exit");

  const userObj = new userModel({ username, password: hashedPass, email });
  try {
    const userDb = await userObj.save();
    // res.status(201).json({ message: "user is added", data: userDb });
    return res.redirect("/login-page");
  } catch (error) {
    return res
      .status(500)
      .json({ message: "internal server error", error: error });
  }
});

app.get("/dashboard", isAuth, (req, res) => {
  console.log("user Authenticated");
  res.render("dashboard");
});

app.post("/logout", isAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json("logout failed!");
    // return res.status(200).json("user logged out successfully ");
  });
  return res.redirect("/login-page");
});

app.post("/logout-all", isAuth, async (req, res) => {
  let username = req.session.user.username;

  const sessionSchema = new mongoose.Schema({ _id: String }, { strict: false });
  const sessionModel = mongoose.model("session", sessionSchema);

  try {
    const sessionDb = await sessionModel.deleteMany({
      "session.user.username": username,
    });
    if (sessionDb)
      // return res
      //   .status(200)
      //   .json("user logged out from all devices successfully ");
      return res.redirect("/login-page");
  } catch (err) {
    return res
      .status(500)
      .json({ message: "internal server error", error: err });
  }
});

app.post("/add-todo", isAuth, async (req, res) => {
  let text = req.body.taskInput;
  console.log(text);
  try {
    await todoValidation(text);
  } catch (err) {
    return res.status(400).json("todo is invalied: " + err);
  }

  const todoobj = new todoModel({
    todo: text,
    username: req.session.user.username,
  });
  try {
    const todoDb = await todoobj.save();
    return res.status(200).json("todo added");
  } catch (err) {
    return res.status(500).json("internal server error! : " + err);
  }
});

app.get("/get-todo", isAuth, async (req, res) => {
  let username = req.session.user.username;
  try {
    // const todos = await todoModel.find({ username: username });
    // for pagination=== use aggrigate(match,skip,limit) piplines
    let skip = Number(req.query.skip) || 0;
    const todos = await todoModel.aggregate([
      { $match: { username: username } },
      { $skip: skip },
      { $limit: 6 },
    ]);

    if (todos.length === 0) return res.status(204).json("no todo found!");
    return res.send({
      status: 200,
      message: "get todos successfull",
      data: todos,
    });
  } catch (err) {
    return res.send({
      status: 500,
      message: "internal server error!",
      error: err,
    });
  }
});

app.post("/update-todo", isAuth, async (req, res) => {
  const { todoId, text } = req.body;
  if (!todoId) return res.status(400).json("todo id not found!");
  // todo validation:-
  try {
    await todoValidation(text);
  } catch (err) {
    return res.status(400).json("todo is invalied: " + err);
  }

  //ownership check:-
  try {
    const todo = await todoModel.findOne({ _id: todoId });
    if (todo.username !== req.session.user.username)
      return res.status(403).json("permission forbidden!");
  } catch (err) {
    return res.send({
      status: 500,
      message: "internal server error!",
      error: err,
    });
  }

  //update todo
  try {
    const todo = await todoModel.findOneAndUpdate(
      { _id: todoId },
      { todo: text },
      { new: true }
    );
    return res.send({
      status: 200,
      message: "update todo successfull",
      data: todo,
    });
  } catch (err) {
    return res.send({
      status: 500,
      message: "internal server error!",
      error: err,
    });
  }
});

app.post("/delete-todo", isAuth, async (req, res) => {
  const { todoId } = req.body;
  if (!todoId) return res.status(400).json("todo id not found!");

  //ownership check:-
  try {
    const todo = await todoModel.findOne({ _id: todoId });
    if (!todo) return res.status(400).json("todo not found!");
    if (todo.username !== req.session.user.username)
      return res.status(403).json("permission forbidden!");
  } catch (err) {
    return res.send({
      status: 500,
      message: "internal server error!",
      error: err,
    });
  }

  // delete todo
  try {
    const todo = await todoModel.findOneAndDelete({ _id: todoId });
    return res.send({
      status: 200,
      message: "delete todo successfull",
      data: todo,
    });
  } catch (err) {
    return res.send({
      status: 500,
      message: "internal server error!",
      error: err,
    });
  }
});

// Connection
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("App running in port: " + PORT);
});
