let page = 0;
window.onload = getTodos();

let todos = [];

document.getElementById("prev").addEventListener("click", () => {
  page -= 6;
  if (page < 0) page = 0;
  getTodos();
  showTodos();
});
document.getElementById("next").addEventListener("click", () => {
  page += 6;
  getTodos();
  showTodos();
});

function getTodos() {
  axios
    .get("/get-todo?skip=" + page)
    .then((res) => {
      if (res.data.status !== 200) {
        alert(res.data.message);
        return;
      }
      console.log(res);
      todos = [...res.data.data];
      showTodos();
    })
    .catch((err) => console.log(err));
}

function showTodos() {
  //   const taskInput = document.getElementById("taskInput");
  const taskList = document.getElementById("taskList");
  taskList.innerHTML = "";
  for (let i of todos) {
    const taskDiv = document.createElement("div");
    taskDiv.classList.add("task", "task-wrap");
    taskDiv.id = i._id;
    taskDiv.innerHTML = `<span>${i.todo}</span><span class="btn-wrap"><button data-id="${i._id}" class="edt-btn" >Edit</button><button data-id="${i._id}" class="dlt-btn" >Delete</button></span>`;
    taskList.appendChild(taskDiv);

    // taskInput.value = ""; // Clear the input field
  }
}

document.addEventListener("click", (e) => {
  let id = e.target.dataset.id;

  if (e.target.classList.contains("edt-btn")) {
    console.log("task editable now : ", id);
    const newTodo = prompt("Enter new todo :");
    if (!newTodo) return;
    axios
      .post("/update-todo", { todoId: id, text: newTodo })
      .then((res) => {
        if (res.data.status !== 200) {
          alert(res.data.message);
          return;
        }
        console.log(res);
        getTodos();
        showTodos();
      })
      .catch((err) => console.log(err));
  }

  if (e.target.classList.contains("dlt-btn")) {
    console.log("task deleted : ", id);
    axios
      .post("/delete-todo", { todoId: id })
      .then((res) => {
        if (res.data.status !== 200) {
          alert(res.data.message);
          return;
        }
        console.log(res);
        getTodos();
        showTodos();
      })
      .catch((err) => console.log(err));
  }
});

const submit = document.getElementById("add-todo");
submit.addEventListener("click", (e) => {
  e.preventDefault();
  const taskInput = document.getElementById("taskInput");
  if (!taskInput) return;
  axios
    .post("/add-todo", { taskInput: taskInput.value })
    .then((res) => {
      if (res.status !== 200) alert(res);
      console.log(res);
      getTodos();
      showTodos();
      taskInput.value = "";
    })
    .catch((err) => console.log(err));
});
