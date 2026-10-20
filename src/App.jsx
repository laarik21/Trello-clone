import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "trrello-tasks";

const statusOptions = [
  { value: "todo", label: "To do tasks" },
  { value: "progress", label: "In progress" },
  { value: "done", label: "Completed" },
];

const priorityOptions = ["high", "medium", "low"];

const emptyForm = {
  title: "",
  description: "",
  priority: "medium",
  status: "todo",
  dueDate: "",
};

function loadTasks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) return [];

    const parsed = JSON.parse(saved);

    if (!Array.isArray(parsed)) return [];

    // Remove old sample tasks.
    const sampleIds = new Set(["task-1", "task-2", "task-3", "task-4"]);

    return parsed.filter((task) => !sampleIds.has(task.id));
  } catch {
    return [];
  }
}

function formatDate(dateString) {
  if (!dateString) return "No deadline";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function priorityClasses(priority) {
  switch (priority) {
    case "high":
      return "bg-red-50 text-red-700 ring-red-200";
    case "medium":
      return "bg-amber-50 text-amber-700 ring-amber-200";
    case "low":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200";
    default:
      return "bg-slate-100 text-slate-600 ring-slate-200";
  }
}

function statusLabel(status) {
  return (
    statusOptions.find((option) => option.value === status)?.label ??
    "To do tasks"
  );
}

function getNext24HourTasks(tasks) {
  const now = Date.now();
  const next24Hours = now + 24 * 60 * 60 * 1000;

  return tasks.filter((task) => {
    if (!task.dueDate || task.status === "done") {
      return false;
    }

    const due = new Date(task.dueDate).getTime();

    return Number.isFinite(due) && due >= now && due <= next24Hours;
  });
}

function TaskCard({ task, onEdit, onDelete, onStatusChange }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            className={`font-semibold text-slate-800 ${
              task.status === "done" ? "line-through opacity-60" : ""
            }`}
          >
            {task.title}
          </h3>

          {task.description && (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-500">
              {task.description}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => onEdit(task)}
          className="rounded-lg px-2 py-1 text-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          aria-label={`Edit ${task.title}`}
        >
          Edit
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ring-1 ${priorityClasses(
            task.priority,
          )}`}
        >
          {task.priority} priority
        </span>

        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">
          {statusLabel(task.status)}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <span className="text-xs text-slate-500">
          ◷ {formatDate(task.dueDate)}
        </span>

        <div className="flex items-center gap-2">
          <select
            aria-label={`Change status for ${task.title}`}
            value={task.status}
            onChange={(event) => onStatusChange(task.id, event.target.value)}
            className="max-w-36 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none focus:border-indigo-500"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => onDelete(task.id)}
            className="rounded-lg px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
            aria-label={`Delete ${task.title}`}
          >
            Delete
          </button>
        </div>
      </div>
    </article>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
      <div className="text-3xl">☑</div>

      <h3 className="mt-3 font-semibold text-slate-800">{title}</h3>

      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </div>
  );
}

function StatCard({ label, value, icon, detail }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-500">{label}</span>

        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-lg">
          {icon}
        </span>
      </div>

      <div className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
        {value}
      </div>

      <p className="mt-1 text-xs text-slate-500">{detail}</p>
    </div>
  );
}

export default function App() {
  const [tasks, setTasks] = useState(loadTasks);
  const [page, setPage] = useState("board");
  const [search, setSearch] = useState("");
  const [boardPriority, setBoardPriority] = useState("all");
  const [boardStatus, setBoardStatus] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error("Could not save tasks in this browser:", error);
    }
  }, [tasks]);

  // Calculate totals from real tasks only.
  const counts = useMemo(() => {
    const completed = tasks.filter((task) => task.status === "done").length;

    const inProgress = tasks.filter(
      (task) => task.status === "progress",
    ).length;

    const todo = tasks.filter((task) => task.status === "todo").length;

    return {
      total: tasks.length,
      completed,
      inProgress,
      todo,
    };
  }, [tasks]);

  const next24HourTasks = useMemo(() => getNext24HourTasks(tasks), [tasks]);

  const pageTasks = useMemo(() => {
    let result = tasks;

    if (page === "todo") {
      result = result.filter((task) => task.status === "todo");
    } else if (page === "progress") {
      result = result.filter((task) => task.status === "progress");
    } else if (page === "completed") {
      result = result.filter((task) => task.status === "done");
    }

    const query = search.trim().toLowerCase();

    if (query) {
      result = result.filter((task) =>
        `${task.title} ${task.description}`.toLowerCase().includes(query),
      );
    }

    if (page === "board" && boardPriority !== "all") {
      result = result.filter((task) => task.priority === boardPriority);
    }

    if (page === "board" && boardStatus !== "all") {
      result = result.filter((task) => task.status === boardStatus);
    }

    return result;
  }, [tasks, page, search, boardPriority, boardStatus]);

  function openCreateModal() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setError("");
    setModalOpen(true);
  }

  function openEditModal(task) {
    setEditingId(task.id);

    setForm({
      title: task.title ?? "",
      description: task.description ?? "",
      priority: task.priority ?? "medium",
      status: task.status ?? "todo",
      dueDate: task.dueDate ?? "",
    });

    setError("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm({ ...emptyForm });
    setError("");
  }

  function saveTask(event) {
    event.preventDefault();

    const title = form.title.trim();

    if (!title) {
      setError("Please enter a task title.");
      return;
    }

    const updatedTask = {
      id: editingId ?? crypto.randomUUID(),
      title,
      description: form.description.trim(),
      priority: form.priority,
      status: form.status,
      dueDate: form.dueDate,
    };

    if (editingId) {
      setTasks((current) =>
        current.map((task) => (task.id === editingId ? updatedTask : task)),
      );
    } else {
      setTasks((current) => [updatedTask, ...current]);
    }

    closeModal();
  }

  function deleteTask(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this task?",
    );

    if (!confirmed) return;

    setTasks((current) => current.filter((task) => task.id !== id));
  }

  function changeStatus(id, status) {
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, status } : task)),
    );
  }

  const navItems = [
    {
      id: "board",
      label: "Overview",
      icon: "▦",
    },
    {
      id: "todo",
      label: "To do tasks",
      icon: "☐",
      count: counts.todo,
    },
    {
      id: "progress",
      label: "In progress",
      icon: "◷",
      count: counts.inProgress,
    },
    {
      id: "completed",
      label: "Completed",
      icon: "✓",
      count: counts.completed,
    },
  ];

  const pageTitles = {
    board: "Overview",
    todo: "To do tasks",
    progress: "In progress",
    completed: "Completed tasks",
  };

  function renderTaskList(list) {
    if (list.length === 0) {
      return (
        <EmptyState
          title="No tasks found"
          description="Try another search or add a new task."
        />
      );
    }

    return (
      <div className="grid gap-3">
        {list.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            onEdit={openEditModal}
            onDelete={deleteTask}
            onStatusChange={changeStatus}
          />
        ))}
      </div>
    );
  }

  function renderBoard() {
    return (
      <>
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total tasks"
            value={counts.total}
            icon="▦"
            detail="All tasks in your workspace"
          />

          <StatCard
            label="To do"
            value={counts.todo}
            icon="☐"
            detail="Waiting to be started"
          />

          <StatCard
            label="In progress"
            value={counts.inProgress}
            icon="◷"
            detail="Currently being worked on"
          />

          <StatCard
            label="Completed"
            value={counts.completed}
            icon="✓"
            detail="Successfully finished"
          />
        </section>

        <section className="mt-7">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                All Tasks · Next 24 Hours
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                All unfinished tasks due within the next 24 hours, regardless of
                priority.
              </p>
            </div>

            <span className="rounded-full bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700">
              {next24HourTasks.length} tasks
            </span>
          </div>

          {renderTaskList(next24HourTasks)}
        </section>
      </>
    );
  }

  function renderWorkspacePage() {
    const descriptions = {
      todo: "Manage tasks that are waiting to be started.",
      progress: "Keep track of tasks currently being worked on.",
      completed: "Review the tasks you have finished.",
    };

    return (
      <section>
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">{descriptions[page]}</p>

          <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm text-slate-500">
                Total {pageTitles[page].toLowerCase()}
              </p>

              <p className="mt-1 text-3xl font-bold text-slate-900">
                {pageTasks.length}
              </p>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              + Add task
            </button>
          </div>
        </div>

        {renderTaskList(pageTasks)}
      </section>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="flex h-20 items-center gap-3 border-b border-slate-100 px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-xl font-bold text-white">
              T
            </div>

            <div>
              <h1 className="text-lg font-bold tracking-tight">TRELLO CLONE</h1>

              <p className="text-xs text-slate-500">Your workspace</p>
            </div>
          </div>

          <div className="px-4 pt-6">
            <p className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Workspace
            </p>

            <nav className="mt-3 grid gap-1">
              {navItems.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => {
                    setPage(item.id);
                    setSearch("");
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
                    page === item.id
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className="text-lg">{item.icon}</span>
                    {item.label}
                  </span>

                  {item.count !== undefined && (
                    <span
                      className={`rounded-lg px-2 py-0.5 text-xs ${
                        page === item.id
                          ? "bg-white text-indigo-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="mt-auto border-t border-slate-100 p-5">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-800">
                Keep it moving
              </p>

              <p className="mt-1 text-xs leading-5 text-slate-500">
                Small steps every day lead to big results.
              </p>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6 xl:px-8">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 font-bold text-white lg:hidden">
                  T
                </div>

                <div>
                  <h1 className="text-xl font-bold tracking-tight text-slate-900">
                    {pageTitles[page]}
                  </h1>

                  <p className="mt-0.5 text-xs text-slate-500">
                    Plan your work.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={openCreateModal}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
              >
                + Add task
              </button>
            </div>

            <div className="border-t border-slate-100 px-4 py-3 sm:px-6 xl:px-8">
              <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
                <label className="relative block min-w-0 flex-1">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                    ⌕
                  </span>

                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={`Search ${pageTitles[page].toLowerCase()}...`}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-2 focus:ring-indigo-100"
                  />
                </label>

                {page === "board" && (
                  <div className="flex flex-wrap gap-2">
                    <select
                      value={boardPriority}
                      onChange={(event) => setBoardPriority(event.target.value)}
                      aria-label="Filter by priority"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-500"
                    >
                      <option value="all">All priorities</option>

                      {priorityOptions.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority[0].toUpperCase() +
                            priority.slice(1) +
                            " priority"}
                        </option>
                      ))}
                    </select>

                    <select
                      value={boardStatus}
                      onChange={(event) => setBoardStatus(event.target.value)}
                      aria-label="Filter by status"
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none focus:border-indigo-500"
                    >
                      <option value="all">All statuses</option>

                      {statusOptions.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => {
                        setSearch("");
                        setBoardPriority("all");
                        setBoardStatus("all");
                      }}
                      className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
                    >
                      Clear filters
                    </button>
                  </div>
                )}
              </div>

              <nav className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
                {navItems.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    onClick={() => {
                      setPage(item.id);
                      setSearch("");
                    }}
                    className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium ${
                      page === item.id
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {item.label}
                    {item.count !== undefined ? ` (${item.count})` : ""}
                  </button>
                ))}
              </nav>
            </div>
          </header>

          <div className="px-4 py-6 sm:px-6 xl:px-8">
            {page === "board" && renderBoard()}

            {(page === "todo" || page === "progress" || page === "completed") &&
              renderWorkspacePage()}
          </div>
        </main>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeModal();
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="task-modal-title"
            className="my-auto w-full max-w-xl rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
              <div>
                <h2
                  id="task-modal-title"
                  className="text-xl font-bold text-slate-900"
                >
                  {editingId ? "Edit task" : "Create a task"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Add details and keep your work organized.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="rounded-lg px-3 py-1 text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close modal"
              >
                ×
              </button>
            </div>

            <form onSubmit={saveTask} className="grid gap-5 p-6">
              <div>
                <label
                  htmlFor="task-title"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  Task title *
                </label>

                <input
                  id="task-title"
                  autoFocus
                  required
                  maxLength={150}
                  value={form.title}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      title: event.target.value,
                    }))
                  }
                  placeholder="What needs to be done?"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div>
                <label
                  htmlFor="task-description"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  Description
                </label>

                <textarea
                  id="task-description"
                  rows={3}
                  maxLength={2000}
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Add more details about this task..."
                  className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="task-priority"
                    className="mb-1.5 block text-sm font-semibold text-slate-700"
                  >
                    Priority
                  </label>

                  <select
                    id="task-priority"
                    value={form.priority}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        priority: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-500"
                  >
                    {priorityOptions.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority[0].toUpperCase() + priority.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="task-status"
                    className="mb-1.5 block text-sm font-semibold text-slate-700"
                  >
                    Status
                  </label>

                  <select
                    id="task-status"
                    value={form.status}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        status: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-indigo-500"
                  >
                    {statusOptions.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  htmlFor="task-deadline"
                  className="mb-1.5 block text-sm font-semibold text-slate-700"
                >
                  Deadline
                </label>

                <input
                  id="task-deadline"
                  type="datetime-local"
                  value={form.dueDate}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      dueDate: event.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-3 text-sm outline-none focus:border-indigo-500"
                />

                <p className="mt-1.5 text-xs text-slate-500">
                  Optional. Unfinished tasks due within the next 24 hours appear
                  on the overview.
                </p>
              </div>

              {error && (
                <p
                  role="alert"
                  className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  {error}
                </p>
              )}

              <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
                >
                  {editingId ? "Save changes" : "Create task"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
