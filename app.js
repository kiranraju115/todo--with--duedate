const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const format = require("date-fns/format");
var isValid = require("date-fns/isValid");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "todoApplication.db");
let db = null;
const initializeAndDbAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log(`server is running on http://localhost:3000`);
    });
  } catch (e) {
    console.log(`Database error is ${e.message}`);
    process.exit(1);
  }
};
initializeAndDbAndServer();

const hasStatusProperties = (requestQuery) => {
  return requestQuery.status !== undefined;
};
const hasPriorityProperties = (requestQuery) => {
  return requestQuery.priority !== undefined;
};
const hasPriorityAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};
const hasSearchQProperties = (requestQuery) => {
  return requestQuery.search_q !== undefined;
};

const hasCategoryAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  );
};
const hasCategoryProperties = (requestQuery) => {
  return requestQuery.category !== undefined;
};

const hasCategoryAndPriorityProperties = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.priority !== undefined
  );
};

const covertDBObjectAPI3 = (db3) => {
  return {
    id: db3.id,
    todo: db3.todo,
    priority: db3.priority,
    status: db3.status,
    category: db3.category,
    dueDate: db3.due_date,
  };
};

//api-1
app.get("/todos/", async (request, response) => {
  let data = null;
  const { search_q = "", priority, status, category } = request.query;
  let getListOfTODOQuery = "";

  switch (true) {
    case hasStatusProperties(request.query):
      getListOfTODOQuery = `
            select * from todo where status = '${status}';
            `;
      break;
    case hasPriorityProperties(request.query):
      getListOfTODOQuery = `
        select * from todo where priority = '${priority}';
        `;
      break;
    case hasPriorityAndStatusProperties(request.query):
      getListOfTODOQuery = `
        select * from todo where priority = '${priority}'and status = '${status}';
        `;
      break;
    case hasSearchQProperties(request.query):
      getListOfTODOQuery = `
        select * from todo where todo like  '%${search_q}%';
        `;
      break;
    case hasCategoryAndStatusProperties(request.query):
      getListOfTODOQuery = `
        select * from todo where category = '${category}' and  status = '${status}';
        `;
      break;
    case hasCategoryProperties(request.query):
      getListOfTODOQuery = `
        select * from todo where  category = '${category}';
        `;
      break;
    case hasCategoryAndPriorityProperties(request.query):
      getListOfTODOQuery = `
        select * from todo where category = '${category}' and priority = '${priority}';
        `;
      break;
  }

  data = await db.all(getListOfTODOQuery);
  response.send(data.map((each) => covertDBObjectAPI3(each)));
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `
    select * from todo where id = ${todoId};
    `;
  const dbResponse = await db.get(getTodoQuery);
  response.send(covertDBObjectAPI3(dbResponse));
});
//api -3 -agenda

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  if (isValid(new Date(date)) === true) {
    const newDate = format(new Date(date), "yyyy-MM-dd");
    console.log(newDate);
    const getDateQuery = `
    select * from todo where due_date = '${newDate}';
    `;
    const agendaResponse = await db.all(getDateQuery);
    response.send(
      agendaResponse.map((eachResponse) => covertDBObjectAPI3(eachResponse))
    );
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;
  const addTodoQuery = `
    insert into todo (id, todo, priority, status, category, due_date)
    values(${id}, '${todo}', '${priority}', '${status}', '${category}', '${dueDate}');
    `;
  await db.run(addTodoQuery);
  response.send("Todo Successfully Added");
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const requestBody = request.body;
  let updateColumn = "";
  switch (true) {
    case requestBody.status !== undefined:
      if (
        requestBody.status === "TO DO" ||
        requestBody.status === "IN PROGRESS" ||
        requestBody.status === "DONE"
      ) {
        updateColumn = "Status";
        break;
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }

    case requestBody.priority !== undefined:
      updateColumn = "Priority";
      break;
    case requestBody.todo !== undefined:
      updateColumn = "Todo";
      break;
    case requestBody.category !== undefined:
      updateColumn = "Category";
      break;
    case requestBody.dueDate !== undefined:
      updateColumn = "Due Date";
      break;
  }
  const previousTodoQuery = `
    select * from todo where id = ${todoId};
    `;
  const previousTodo = await db.get(previousTodoQuery);
  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.dueDate,
  } = request.body;

  const updateTodoQuery = `
    update todo 
    set 
    todo = '${todo}',priority = '${priority}',status = '${status}',
    category = '${category}', due_date  = '${dueDate}';
    `;
  await db.run(updateTodoQuery);
  response.send(`${updateColumn} Updated`);
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
  DELETE FROM
    todo
  WHERE
    id = ${todoId};`;

  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
