const todoValidation = (todo) => {
  return new Promise((resolve, reject) => {
    if (!todo) return reject("todo is empty!");
    if (typeof todo !== "string") return reject("todo is not a text!");
    if (todo.length < 3 || todo.length > 100)
      return reject("todo length must be 3-100");

    resolve("todo validated :)");
  });
};

module.exports = { todoValidation };
