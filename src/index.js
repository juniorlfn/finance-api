const express = require("express");
const app = express();
const { v4: uuidv4 } = require("uuid");

const port = 3000;

const customers = [];

/**
 * Função que consulta o saldo da conta do cliente
 * @param {*} statement Histórico da conta do cliente
 * @returns Saldo
 */
function getBalance(statement) {
  const balance = statement.reduce(
    (acc, operation) =>
      operation.type === "credit"
        ? acc + operation.amount
        : acc - operation.amount,
    0
  );

  return balance;
}

app.use(express.json());

/**
 * Midleware que verifica se já existe um Customer com o CPF informado
 * @param {*} req HttpRequest
 * @param {*} res HttpResponse
 * @param {*} next Next
 * @returns HttpError | Next
 */
function verifyIfExistsAccountCPF(req, res, next) {
  const { cpf } = req.headers;

  const customer = customers.find((costumer) => costumer.cpf === cpf);

  if (!customer) {
    return res.status(400).json({ error: "Cliente não encontrado." });
  }

  req.customer = customer;

  return next();
}

app.post("/account", (req, res) => {
  const { name, cpf } = req.body;

  const customerAlreadyExist = customers.some(
    (customer) => customer.cpf === cpf
  );

  if (customerAlreadyExist) {
    return res.status(400).json({ error: "Cliente já cadastrado!" });
  }

  const newCustomer = {
    id: uuidv4(),
    name,
    cpf,
    statement: [],
  };

  customers.push(newCustomer);

  return res.status(201).json(newCustomer);
});

app.get("/statement", verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req;

  return res.status(200).json(customer.statement);
});

app.post("/deposit", verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req;
  const { description, amount } = req.body;
  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: "credit",
  };

  customer.statement.push(statementOperation);

  res.status(201).json(statementOperation);
});

app.post("/withdraw", verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req;
  const { amount } = req.body;

  const balance = getBalance(customer.statement);

  if (balance < amount) {
    return res.status(400).json({ error: "Saldo insuficiente." });
  }

  const statementOperation = {
    amount,
    created_at: new Date(),
    type: "debit",
  };

  customer.statement.push(statementOperation);
  return res.status(201).send();
});

app.get("/statement/date", verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req;

  const { date } = req.query;

  const dateFormat = new Date(date + " 00:00");

  const statement = customer.statement.filter(
    (statement) =>
      statement.created_at.toDateString() ===
      new Date(dateFormat).toDateString()
  );

  return res.status(200).json(statement);
});

app.put("/account", verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req;
  const { name } = req.body;

  customer.name = name;

  return res.status(201).json(customer);
});

app.get("/account", verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req;
  return res.status(200).json(customer);
});

app.delete("/account", verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req;

  const indexCustomer = customers.findIndex(
    (customersIndex) => customersIndex.cpf === customer.cpf
  );

  customers.splice(indexCustomer, 1);

  return res.status(204).json({ message: "Cliente removido." });
});

app.get("/account/all", (req, res) => {
  return res.status(200).json(customers);
});

app.get("/balance", verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req;
  const balance = getBalance(customer.statement);
  return res.status(200).json(balance);
});

app.listen(port, () => {
  console.log(`O servidor está escutando a porta ${port}`);
});
