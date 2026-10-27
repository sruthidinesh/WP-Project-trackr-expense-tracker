const { useState, useEffect, useRef } = React;
const { HashRouter, Switch, Route, NavLink, Link, useHistory, useParams } = ReactRouterDOM;

const CATEGORIES = ["Food", "Travel", "Shopping", "Bills", "Allowance", "Other"];
const BUDGET_CATEGORIES = ["Food", "Travel", "Shopping", "Bills", "Other"];
const EXPENSES_KEY = "expense-tracker-data";
const BUDGETS_KEY = "expense-tracker-budgets";

const KEYWORDS = {
  Food: ["zomato", "swiggy", "lunch", "dinner", "breakfast", "snack", "coffee", "tea", "restaurant", "biryani", "pizza", "burger", "grocery", "groceries", "canteen"],
  Travel: ["bus", "metro", "uber", "ola", "auto", "cab", "train", "petrol", "fuel", "flight", "ticket", "rapido"],
  Shopping: ["amazon", "flipkart", "myntra", "shirt", "shoes", "clothes", "mall", "shopping"],
  Bills: ["rent", "electricity", "recharge", "wifi", "internet", "netflix", "spotify", "subscription", "bill", "phone", "fees"],
  Allowance: ["pocket money", "allowance", "salary", "stipend", "scholarship"],
};

function guessCategory(title) {
  const text = title.toLowerCase();
  for (const cat in KEYWORDS) {
    if (KEYWORDS[cat].some(word => text.includes(word))) return cat;
  }
  return null;
}

/* ---------- Helpers ---------- */
const money = n => "₹" + Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const thisMonth = () => new Date().toISOString().slice(0, 7);

function getBudgetRows(expenses, budgets) {
  const month = thisMonth();
  return Object.keys(budgets).map(cat => {
    const spent = expenses
      .filter(e => e.type === "expense" && e.category === cat && e.date.startsWith(month))
      .reduce((s, e) => s + Number(e.amount), 0);
    return { cat, limit: budgets[cat], spent, pct: Math.round((spent / budgets[cat]) * 100) };
  });
}

function Navbar() {
  return (
    <header className="top-nav">
      <div className="container app-container top-nav-inner">
        <span className="brand"><span className="brand-mark">₹</span>Trackr</span>
        <nav className="nav-tabs-lite">
          <NavLink exact to="/">Dashboard</NavLink>
          <NavLink to="/entries">All entries</NavLink>
          <NavLink to="/add">Add entry</NavLink>
          <NavLink to="/budgets">Budgets</NavLink>
        </nav>
      </div>
    </header>
  );
}

function SummaryCard({ label, value, kind }) {
  return (
    <div className="col-md-4 mb-3">
      <div className={"card summary-card " + kind}>
        <div className="card-body">
          <p className="label">{label}</p>
          <p className="value">{money(value)}</p>
        </div>
      </div>
    </div>
  );
}
SummaryCard.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number.isRequired,
  kind: PropTypes.string,
};

function ChartCanvas({ type, data, options }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const chart = new Chart(canvasRef.current, {
      type,
      data,
      options: { maintainAspectRatio: false, ...options },
    });
    return () => chart.destroy();
  }, [JSON.stringify(data)]);
  return <div className="chart-box"><canvas ref={canvasRef}></canvas></div>;
}
ChartCanvas.propTypes = {
  type: PropTypes.string.isRequired,
  data: PropTypes.object.isRequired,
  options: PropTypes.object,
};

function Charts({ expenses }) {
  const month = thisMonth();

  const byCat = {};
  expenses
    .filter(e => e.type === "expense" && e.date.startsWith(month))
    .forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount); });

  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push(d.toISOString().slice(0, 7));
  }
  const total = (m, type) =>
    expenses.filter(e => e.type === type && e.date.startsWith(m)).reduce((s, e) => s + Number(e.amount), 0);
  const labels = months.map(m => new Date(m + "-01").toLocaleString("en-IN", { month: "short" }));

  return (
    <div className="row">
      <div className="col-lg-5 mb-3">
        <div className="panel h-100">
          <h5>Spending by category (this month)</h5>
          {Object.keys(byCat).length === 0 ? (
            <div className="empty-state">No expenses this month yet.</div>
          ) : (
            <ChartCanvas
              type="doughnut"
              data={{
                labels: Object.keys(byCat),
                datasets: [{
                  data: Object.values(byCat),
                  backgroundColor: ["#0f766e", "#f59e0b", "#6366f1", "#ef4444", "#14b8a6", "#94a3b8"],
                }],
              }}
              options={{ plugins: { legend: { position: "bottom" } } }}
            />
          )}
        </div>
      </div>
      <div className="col-lg-7 mb-3">
        <div className="panel h-100">
          <h5>Income vs expenses (last 6 months)</h5>
          <ChartCanvas
            type="bar"
            data={{
              labels,
              datasets: [
                { label: "Income", data: months.map(m => total(m, "income")), backgroundColor: "#15803d" },
                { label: "Expenses", data: months.map(m => total(m, "expense")), backgroundColor: "#c2410c" },
              ],
            }}
            options={{ plugins: { legend: { position: "bottom" } } }}
          />
        </div>
      </div>
    </div>
  );
}
Charts.propTypes = { expenses: PropTypes.array.isRequired };

function BudgetPanel({ rows }) {
  return (
    <div className="panel mb-3">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5 className="mb-0">Monthly budgets</h5>
        <Link to="/budgets" className="btn btn-outline-secondary btn-sm">Set budgets</Link>
      </div>
      {rows.length === 0 ? (
        <div className="empty-state">No budgets set. Set a monthly limit to get warnings before you overspend.</div>
      ) : (
        rows.map(r => {
          const color = r.pct >= 100 ? "danger" : r.pct >= 80 ? "warning" : "success";
          return (
            <div key={r.cat} className="mb-3">
              <div className="d-flex justify-content-between">
                <strong>{r.cat}</strong>
                <span className="text-muted">{money(r.spent)} of {money(r.limit)} ({r.pct}%)</span>
              </div>
              <div className="progress" style={{ height: 12 }}>
                <div className={"progress-bar bg-" + color} style={{ width: Math.min(r.pct, 100) + "%" }}></div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
BudgetPanel.propTypes = { rows: PropTypes.array.isRequired };

function smartSummary(expenses) {
  const now = new Date();
  const last = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
  const sumFor = (m, cat) =>
    expenses.filter(e => e.type === "expense" && e.category === cat && e.date.startsWith(m))
      .reduce((s, e) => s + Number(e.amount), 0);
  let best = null;
  BUDGET_CATEGORIES.forEach(cat => {
    const cur = sumFor(thisMonth(), cat);
    const prev = sumFor(last, cat);
    if (prev > 0 && cur > 0) {
      const change = Math.round(((cur - prev) / prev) * 100);
      if (!best || Math.abs(change) > Math.abs(best.change)) best = { cat, change };
    }
  });
  if (!best || best.change === 0) return null;
  return `You spent ${Math.abs(best.change)}% ${best.change > 0 ? "more" : "less"} on ${best.cat} than last month.`;
}

function Dashboard({ expenses, budgets }) {
  const income = expenses.filter(e => e.type === "income").reduce((s, e) => s + Number(e.amount), 0);
  const spent = expenses.filter(e => e.type === "expense").reduce((s, e) => s + Number(e.amount), 0);
  const rows = getBudgetRows(expenses, budgets);
  const warnings = rows.filter(r => r.pct >= 80);
  const summary = smartSummary(expenses);

  return (
    <div className="container app-container">
      <h1 className="page-title">Dashboard</h1>
      <p className="page-sub">Your money at a glance.</p>

      {warnings.map(r => (
        <div key={r.cat} className={"alert " + (r.pct >= 100 ? "alert-danger" : "alert-warning")}>
          {r.pct >= 100
            ? `Over budget: you have spent ${money(r.spent)} on ${r.cat} this month, above your ${money(r.limit)} limit.`
            : `Close to the limit: you have used ${r.pct}% of your ${r.cat} budget this month.`}
        </div>
      ))}
      {summary && <div className="alert alert-info">{summary}</div>}

      <div className="row">
        <SummaryCard label="Total income" value={income} kind="income" />
        <SummaryCard label="Total expenses" value={spent} kind="expense" />
        <SummaryCard label="Balance" value={income - spent} kind="balance" />
      </div>

      <Charts expenses={expenses} />
      <BudgetPanel rows={rows} />

      <div className="panel">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h5 className="mb-0">Recent entries</h5>
          <Link to="/add" className="btn btn-brand btn-sm">Add entry</Link>
        </div>
        <ExpenseList expenses={expenses.slice(0, 5)} />
      </div>
    </div>
  );
}
Dashboard.propTypes = {
  expenses: PropTypes.array.isRequired,
  budgets: PropTypes.object.isRequired,
};

function ExpenseItem({ item, onDelete }) {
  const isIncome = item.type === "income";
  return (
    <tr>
      <td>{item.date}</td>
      <td>{item.title}</td>
      <td><span className="cat-badge">{item.category}</span></td>
      <td className={isIncome ? "amount-income" : "amount-expense"}>
        {isIncome ? "+" : "-"}{money(item.amount)}
      </td>
      <td className="text-nowrap">
        <Link to={"/edit/" + item.id} className="btn btn-sm btn-outline-secondary me-2">Edit</Link>
        {onDelete && (
          <button className="btn btn-sm btn-outline-danger" onClick={() => onDelete(item.id)}>Delete</button>
        )}
      </td>
    </tr>
  );
}
ExpenseItem.propTypes = {
  item: PropTypes.object.isRequired,
  onDelete: PropTypes.func,
};

function ExpenseList({ expenses, onDelete }) {
  if (expenses.length === 0) {
    return <div className="empty-state">No entries to show. Add an entry to get started.</div>;
  }
  return (
    <div className="table-responsive">
      <table className="table table-hover mb-0">
        <thead>
          <tr><th>Date</th><th>Title</th><th>Category</th><th>Amount</th><th>Actions</th></tr>
        </thead>
        <tbody>
          {expenses.map(e => <ExpenseItem key={e.id} item={e} onDelete={onDelete} />)}
        </tbody>
      </table>
    </div>
  );
}
ExpenseList.propTypes = {
  expenses: PropTypes.array.isRequired,
  onDelete: PropTypes.func,
};

function Entries({ expenses, onDelete }) {
  const [category, setCategory] = useState("");
  const [month, setMonth] = useState("");

  const filtered = expenses.filter(e =>
    (category === "" || e.category === category) &&
    (month === "" || e.date.startsWith(month))
  );

  const exportCSV = () => {
    const lines = ["Date,Title,Category,Type,Amount"].concat(
      filtered.map(e => [e.date, '"' + e.title.replace(/"/g, '""') + '"', e.category, e.type, e.amount].join(","))
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "expenses.csv";
    link.click();
  };

  return (
    <div className="container app-container">
      <h1 className="page-title">All entries</h1>
      <p className="page-sub">Filter by category or month, or download a CSV.</p>
      <div className="panel">
        <div className="row mb-3">
          <div className="col-md-4 mb-2">
            <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="col-md-4 mb-2">
            <input type="month" className="form-control" value={month} onChange={e => setMonth(e.target.value)} />
          </div>
          <div className="col-md-4 mb-2 text-md-end">
            <button className="btn btn-outline-secondary" onClick={exportCSV}>Download CSV</button>
          </div>
        </div>
        <ExpenseList expenses={filtered} onDelete={onDelete} />
      </div>
    </div>
  );
}

function ExpenseForm({ expenses, onSave }) {
  const { id } = useParams();
  const history = useHistory();
  const existing = id ? expenses.find(e => String(e.id) === id) : null;

  const emptyForm = {
    title: "", amount: "", type: "expense", category: "Food",
    date: new Date().toISOString().slice(0, 10),
  };
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [categoryTouched, setCategoryTouched] = useState(false);
  const [autoNote, setAutoNote] = useState("");

  useEffect(() => {
    if (existing) {
      setForm({ ...existing, amount: String(existing.amount) });
      setCategoryTouched(true);
    }
  }, [existing && existing.id]);

  const handleChange = e => {
    const { name, value } = e.target;
    let updated = { ...form, [name]: value };

    if (name === "category") setCategoryTouched(true);
    if (name === "title" && !categoryTouched) {
      const guess = guessCategory(value);
      if (guess) {
        updated.category = guess;
        if (guess === "Allowance") updated.type = "income";
        setAutoNote(`Category set to ${guess} automatically. You can change it.`);
      } else {
        setAutoNote("");
      }
    }
    setForm(updated);
  };

  const handleSubmit = () => {
    if (form.title.trim() === "") return setError("Please enter a title.");
    if (form.amount === "" || Number(form.amount) <= 0) return setError("Amount must be greater than 0.");
    setError("");
    onSave({ ...form, amount: Number(form.amount) }, id);
    history.push("/entries");
  };

  return (
    <div className="container app-container" style={{ maxWidth: 680 }}>
      <h1 className="page-title">{id ? "Edit entry" : "Add entry"}</h1>
      <p className="page-sub">Fill in the details below.</p>
      <div className="panel">
        {error && <div className="alert alert-danger">{error}</div>}

        <div className="mb-3">
          <label className="form-label">Title</label>
          <input className="form-control" name="title" value={form.title} onChange={handleChange}
                 placeholder="For example: Swiggy dinner" />
          {autoNote && <div className="form-text text-success">{autoNote}</div>}
        </div>
        <div className="mb-3">
          <label className="form-label">Amount (₹)</label>
          <input type="number" className="form-control" name="amount" value={form.amount} onChange={handleChange} />
        </div>
        <div className="mb-3">
          <label className="form-label">Type</label>
          <select className="form-select" name="type" value={form.type} onChange={handleChange}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">Category</label>
          <select className="form-select" name="category" value={form.category} onChange={handleChange}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="mb-3">
          <label className="form-label">Date</label>
          <input type="date" className="form-control" name="date" value={form.date} onChange={handleChange} />
        </div>
        <button className="btn btn-brand" onClick={handleSubmit}>Save entry</button>
      </div>
    </div>
  );
}

function Budgets({ budgets, onSave }) {
  const [values, setValues] = useState(() => {
    const v = {};
    BUDGET_CATEGORIES.forEach(c => { v[c] = budgets[c] ? String(budgets[c]) : ""; });
    return v;
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    const result = {};
    BUDGET_CATEGORIES.forEach(c => {
      if (Number(values[c]) > 0) result[c] = Number(values[c]);
    });
    onSave(result);
    setSaved(true);
  };

  return (
    <div className="container app-container" style={{ maxWidth: 680 }}>
      <h1 className="page-title">Monthly budgets</h1>
      <p className="page-sub">Set a limit per category. Leave it empty to skip a category.</p>
      <div className="panel">
        {saved && <div className="alert alert-success">Budgets saved. Check the dashboard for warnings.</div>}
        {BUDGET_CATEGORIES.map(c => (
          <div className="mb-3" key={c}>
            <label className="form-label">{c} (₹ per month)</label>
            <input type="number" className="form-control" value={values[c]}
                   onChange={e => { setValues({ ...values, [c]: e.target.value }); setSaved(false); }} />
          </div>
        ))}
        <button className="btn btn-brand" onClick={handleSave}>Save budgets</button>
      </div>
    </div>
  );
}
Budgets.propTypes = {
  budgets: PropTypes.object.isRequired,
  onSave: PropTypes.func.isRequired,
};

const today = new Date().toISOString().slice(0, 10);
const sampleData = [
  { id: 1, title: "Pocket money", amount: 5000, type: "income", category: "Allowance", date: today },
  { id: 2, title: "Lunch", amount: 120, type: "expense", category: "Food", date: today },
  { id: 3, title: "Bus pass", amount: 600, type: "expense", category: "Travel", date: today },
];

function App() {
  const [expenses, setExpenses] = useState(() => {
    const saved = localStorage.getItem(EXPENSES_KEY);
    return saved ? JSON.parse(saved) : sampleData;
  });
  const [budgets, setBudgets] = useState(() => {
    const saved = localStorage.getItem(BUDGETS_KEY);
    return saved ? JSON.parse(saved) : {};
  });

  useEffect(() => { localStorage.setItem(EXPENSES_KEY, JSON.stringify(expenses)); }, [expenses]);
  useEffect(() => { localStorage.setItem(BUDGETS_KEY, JSON.stringify(budgets)); }, [budgets]);

  const saveExpense = (data, id) => {
    if (id) {
      setExpenses(expenses.map(e => (String(e.id) === String(id) ? { ...data, id: e.id } : e)));
    } else {
      setExpenses([{ ...data, id: Date.now() }, ...expenses]);
    }
  };

  const deleteExpense = id => {
    if (!window.confirm("Delete this entry?")) return;
    setExpenses(expenses.filter(e => e.id !== id));
  };

  const sorted = [...expenses].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <HashRouter>
      <Navbar />
      <Switch>
        <Route exact path="/"><Dashboard expenses={sorted} budgets={budgets} /></Route>
        <Route path="/entries"><Entries expenses={sorted} onDelete={deleteExpense} /></Route>
        <Route path="/add"><ExpenseForm expenses={sorted} onSave={saveExpense} /></Route>
        <Route path="/edit/:id"><ExpenseForm expenses={sorted} onSave={saveExpense} /></Route>
        <Route path="/budgets"><Budgets budgets={budgets} onSave={setBudgets} /></Route>
      </Switch>
    </HashRouter>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);