const session = require("express-session");

const isAuth = (req, res, next) => {
  console.log("authention processing....");
  if (req.session.isAuth) next();
  else return res.status(401).json("session has been expired!");
};

module.exports = isAuth;
