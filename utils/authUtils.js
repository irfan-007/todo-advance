const userDataValidation = ({ username, password, email }) => {
  return new Promise((resolved, rejected) => {
    // console.log(username, password, email);

    if (!username) return rejected("username is missing!");
    if (!password) return rejected("password is missing!");
    if (!email) return rejected("email is missing!");

    if (typeof username !== "string") return rejected("username is not a text");
    if (typeof email !== "string") return rejected("email is not a text");
    if (typeof password !== "string") return rejected("password is not a text");

    if (username.length < 3 || username.length > 50)
      return rejected("username length should be 3-50 characters");
    if (password.length < 6 || password.length > 20)
      return rejected("password length should be 6-20 characters");

    if (!emailValidator(email)) return rejected("email is invalid");
    resolved();
  });
};

function emailValidator(eml) {
  const regix =
    /^(([^<>()[\]\.,;:\s@\"]+(\.[^<>()[\]\.,;:\s@\"]+)*)|(\".+\"))@(([^<>()[\]\.,;:\s@\"]+\.)+[^<>()[\]\.,;:\s@\"]{2,})$/i;
  return eml.match(regix);
}

module.exports = { userDataValidation, emailValidator };
