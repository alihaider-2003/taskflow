import { useEffect, useState } from "react";
import axios from "axios";
import "./index.css";

const API_URL = "/api"

function App() {
  const [user, setUser] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskProjectId, setTaskProjectId] = useState("");

  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);

  const token = localStorage.getItem("access_token");

  const headers = {
    Authorization: "Bearer " + token,
  };

  const loadDashboard = async () => {
    try {
      const [me, projectData, taskData] = await Promise.all([
        axios.get(`${API_URL}/me`, { headers }),
        axios.get(`${API_URL}/projects`, { headers }),
        axios.get(`${API_URL}/tasks`, { headers }),
      ]);

      setUser(me.data);
      setProjects(projectData.data);
      setTasks(taskData.data);
    } catch {
      localStorage.removeItem("access_token");
      setUser(null);
    }
  };

  useEffect(() => {
    if (token) {
      loadDashboard();
    }
  }, []);

  const handleLogin = async (event) => {
    event.preventDefault();

    try {
      const response = await axios.post(`${API_URL}/login`, {
        email,
        password,
      });

      localStorage.setItem("access_token", response.data.access_token);
      setMessage("");
      await loadDashboard();
    } catch (error) {
      setMessage(error.response?.data?.detail || "Login failed");
    }
  };

  const createProject = async (event) => {
    event.preventDefault();

    try {
      await axios.post(
        `${API_URL}/projects`,
        {
          name: projectName,
          description: projectDescription,
        },
        { headers }
      );

      setProjectName("");
      setProjectDescription("");
      setShowProjectForm(false);

      await loadDashboard();
    } catch (error) {
      setMessage(
        error.response?.data?.detail || "Failed to create project"
      );
    }
  };

  const deleteProject = async (id) => {
    if (!confirm("Delete this project?")) return;

    await axios.delete(`${API_URL}/projects/${id}`, { headers });
    await loadDashboard();
  };

  const createTask = async (event) => {
    event.preventDefault();

    try {
      await axios.post(
        `${API_URL}/tasks`,
        {
          project_id: Number(taskProjectId),
          title: taskTitle,
          description: taskDescription,
          status: "todo",
          priority: "medium",
        },
        { headers }
      );

      setTaskTitle("");
      setTaskDescription("");
      setTaskProjectId("");
      setShowTaskForm(false);

      await loadDashboard();
    } catch (error) {
      setMessage(
        error.response?.data?.detail || "Failed to create task"
      );
    }
  };

  const updateTask = async (id, field, value) => {
    try {
      await axios.put(
        `${API_URL}/tasks/${id}`,
        { [field]: value },
        { headers }
      );

      await loadDashboard();
    } catch (error) {
      setMessage(
        error.response?.data?.detail || "Failed to update task"
      );
    }
  };

  const deleteTask = async (id) => {
    if (!confirm("Delete this task?")) return;

    await axios.delete(`${API_URL}/tasks/${id}`, { headers });
    await loadDashboard();
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    setUser(null);
    setProjects([]);
    setTasks([]);
  };

  if (!user) {
    return (
      <div className="login-page">
        <div className="login-card">
          <div className="brand">TF</div>

          <h1>TaskFlow</h1>
          <p>Production Task Management</p>

          <form onSubmit={handleLogin}>
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <button type="submit">Sign in</button>
          </form>

          {message && <div className="error">{message}</div>}
        </div>
      </div>
    );
  }

  const completed = tasks.filter(
    (task) => task.status === "done"
  ).length;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand small">TF</div>
          <span>TaskFlow</span>
        </div>

        <nav>
          <div className="nav-item active">Dashboard</div>
          <div className="nav-item">Projects</div>
          <div className="nav-item">Tasks</div>
        </nav>

        <button className="logout" onClick={logout}>
          Logout
        </button>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <h1>Dashboard</h1>
            <p>Manage your projects and tasks.</p>
          </div>

          <div className="user-box">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>
        </header>

        <section className="welcome">
          <h2>Welcome, {user.name} 👋</h2>
          <p>Here’s what’s happening with your work today.</p>
        </section>

        <section className="stats">
          <div className="stat-card">
            <span>Projects</span>
            <strong>{projects.length}</strong>
          </div>

          <div className="stat-card">
            <span>Tasks</span>
            <strong>{tasks.length}</strong>
          </div>

          <div className="stat-card">
            <span>Completed</span>
            <strong>{completed}</strong>
          </div>
        </section>

        <section className="content-grid">
          <div className="panel">
            <div className="panel-header">
              <h2>Your Projects</h2>

              <button
                onClick={() =>
                  setShowProjectForm(!showProjectForm)
                }
              >
                + New Project
              </button>
            </div>

            {showProjectForm && (
              <form
                onSubmit={createProject}
                className="inline-form"
              >
                <input
                  placeholder="Project name"
                  value={projectName}
                  onChange={(e) =>
                    setProjectName(e.target.value)
                  }
                  required
                />

                <input
                  placeholder="Description"
                  value={projectDescription}
                  onChange={(e) =>
                    setProjectDescription(e.target.value)
                  }
                />

                <button type="submit">Create</button>
              </form>
            )}

            {projects.map((project) => (
              <div
                className="project-item"
                key={project.id}
              >
                <div>
                  <h3>{project.name}</h3>
                  <p>{project.description}</p>
                </div>

                <button
                  className="danger"
                  onClick={() =>
                    deleteProject(project.id)
                  }
                >
                  Delete
                </button>
              </div>
            ))}
          </div>

          <div className="panel">
            <div className="panel-header">
              <h2>Your Tasks</h2>

              <button
                onClick={() =>
                  setShowTaskForm(!showTaskForm)
                }
                disabled={!projects.length}
              >
                + New Task
              </button>
            </div>

            {showTaskForm && (
              <form
                onSubmit={createTask}
                className="inline-form"
              >
                <select
                  value={taskProjectId}
                  onChange={(e) =>
                    setTaskProjectId(e.target.value)
                  }
                  required
                >
                  <option value="">
                    Select project
                  </option>

                  {projects.map((project) => (
                    <option
                      key={project.id}
                      value={project.id}
                    >
                      {project.name}
                    </option>
                  ))}
                </select>

                <input
                  placeholder="Task title"
                  value={taskTitle}
                  onChange={(e) =>
                    setTaskTitle(e.target.value)
                  }
                  required
                />

                <input
                  placeholder="Description"
                  value={taskDescription}
                  onChange={(e) =>
                    setTaskDescription(e.target.value)
                  }
                />

                <button type="submit">Create</button>
              </form>
            )}

            {tasks.map((task) => (
              <div
                className="task-item"
                key={task.id}
              >
                <div>
                  <h3>{task.title}</h3>
                  <p>{task.description}</p>
                </div>

                <div className="task-meta">
                  <select
                    value={task.status}
                    onChange={(e) =>
                      updateTask(
                        task.id,
                        "status",
                        e.target.value
                      )
                    }
                  >
                    <option value="todo">Todo</option>
                    <option value="in_progress">
                      In Progress
                    </option>
                    <option value="done">Done</option>
                  </select>

                  <select
                    value={task.priority}
                    onChange={(e) =>
                      updateTask(
                        task.id,
                        "priority",
                        e.target.value
                      )
                    }
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>

                  <button
                    className="danger"
                    onClick={() =>
                      deleteTask(task.id)
                    }
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
