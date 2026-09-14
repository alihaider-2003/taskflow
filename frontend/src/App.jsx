import { useEffect, useState } from "react";
import axios from "axios";
import "./index.css";

const API_URL = "/api";

function App() {
  const [user, setUser] = useState(null);
  const [guest, setGuest] = useState(false);

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

  const loadDashboard = async (accessToken = token) => {
    if (!accessToken) return;

    const authHeaders = {
      Authorization: "Bearer " + accessToken,
    };

    try {
      const [me, projectData, taskData] = await Promise.all([
        axios.get(`${API_URL}/me`, {
          headers: authHeaders,
        }),
        axios.get(`${API_URL}/projects`, {
          headers: authHeaders,
        }),
        axios.get(`${API_URL}/tasks`, {
          headers: authHeaders,
        }),
      ]);

      setUser(me.data);
      setProjects(Array.isArray(projectData.data) ? projectData.data : []);
      setTasks(Array.isArray(taskData.data) ? taskData.data : []);
    } catch {
      localStorage.removeItem("access_token");
      setUser(null);
      setProjects([]);
      setTasks([]);
    }
  };

  useEffect(() => {
    if (token) {
      loadDashboard(token);
    }
  }, []);

  const handleLogin = async (event) => {
    event.preventDefault();

    try {
      const response = await axios.post(`${API_URL}/login`, {
        email,
        password,
      });

      const accessToken = response.data.access_token;

      localStorage.setItem("access_token", accessToken);

      setGuest(false);
      setMessage("");

      await loadDashboard(accessToken);
    } catch (error) {
      setMessage(error.response?.data?.detail || "Login failed");
    }
  };

  const enterGuestMode = () => {
    setGuest(true);
    setUser({
      name: "Guest",
      email: "demo@taskflow.app",
    });

    setProjects([
      {
        id: 1,
        name: "Website Redesign",
        description: "Redesign the company website.",
      },
      {
        id: 2,
        name: "Mobile App",
        description: "Prepare the first mobile app release.",
      },
    ]);

    setTasks([
      {
        id: 1,
        project_id: 1,
        title: "Design homepage",
        description: "Create the new homepage layout.",
        status: "done",
        priority: "high",
      },
      {
        id: 2,
        project_id: 1,
        title: "Implement dashboard",
        description: "Build the main dashboard UI.",
        status: "in_progress",
        priority: "medium",
      },
      {
        id: 3,
        project_id: 2,
        title: "Prepare API integration",
        description: "Connect the mobile app with the API.",
        status: "todo",
        priority: "medium",
      },
    ]);

    setMessage("");
  };

  const createProject = async (event) => {
    event.preventDefault();

    if (guest) return;

    const authHeaders = {
      Authorization: "Bearer " + localStorage.getItem("access_token"),
    };

    try {
      await axios.post(
        `${API_URL}/projects`,
        {
          name: projectName,
          description: projectDescription,
        },
        {
          headers: authHeaders,
        }
      );

      setProjectName("");
      setProjectDescription("");
      setShowProjectForm(false);

      await loadDashboard(localStorage.getItem("access_token"));
    } catch (error) {
      setMessage(
        error.response?.data?.detail || "Failed to create project"
      );
    }
  };

  const deleteProject = async (id) => {
    if (guest) return;

    if (!confirm("Delete this project?")) return;

    const authHeaders = {
      Authorization: "Bearer " + localStorage.getItem("access_token"),
    };

    try {
      await axios.delete(`${API_URL}/projects/${id}`, {
        headers: authHeaders,
      });

      await loadDashboard(localStorage.getItem("access_token"));
    } catch (error) {
      setMessage(
        error.response?.data?.detail || "Failed to delete project"
      );
    }
  };

  const createTask = async (event) => {
    event.preventDefault();

    if (guest) return;

    const authHeaders = {
      Authorization: "Bearer " + localStorage.getItem("access_token"),
    };

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
        {
          headers: authHeaders,
        }
      );

      setTaskTitle("");
      setTaskDescription("");
      setTaskProjectId("");
      setShowTaskForm(false);

      await loadDashboard(localStorage.getItem("access_token"));
    } catch (error) {
      setMessage(
        error.response?.data?.detail || "Failed to create task"
      );
    }
  };

  const updateTask = async (id, field, value) => {
    if (guest) return;

    const authHeaders = {
      Authorization: "Bearer " + localStorage.getItem("access_token"),
    };

    try {
      await axios.put(
        `${API_URL}/tasks/${id}`,
        {
          [field]: value,
        },
        {
          headers: authHeaders,
        }
      );

      await loadDashboard(localStorage.getItem("access_token"));
    } catch (error) {
      setMessage(
        error.response?.data?.detail || "Failed to update task"
      );
    }
  };

  const deleteTask = async (id) => {
    if (guest) return;

    if (!confirm("Delete this task?")) return;

    const authHeaders = {
      Authorization: "Bearer " + localStorage.getItem("access_token"),
    };

    try {
      await axios.delete(`${API_URL}/tasks/${id}`, {
        headers: authHeaders,
      });

      await loadDashboard(localStorage.getItem("access_token"));
    } catch (error) {
      setMessage(
        error.response?.data?.detail || "Failed to delete task"
      );
    }
  };

  const logout = () => {
    localStorage.removeItem("access_token");

    setUser(null);
    setGuest(false);
    setProjects([]);
    setTasks([]);
    setMessage("");
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

          <button
            type="button"
            className="guest-button"
            onClick={enterGuestMode}
          >
            Continue as Guest
          </button>

          {message && <div className="error">{message}</div>}
        </div>
      </div>
    );
  }

  const completed = Array.isArray(tasks)
    ? tasks.filter((task) => task.status === "done").length
    : 0;

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
          {guest ? "Exit Demo" : "Logout"}
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

        {guest && (
          <div className="demo-banner">
            Demo Mode — You are viewing sample TaskFlow data.
          </div>
        )}

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
                onClick={() => setShowProjectForm(!showProjectForm)}
                disabled={guest}
              >
                + New Project
              </button>
            </div>

            {showProjectForm && !guest && (
              <form onSubmit={createProject} className="inline-form">
                <input
                  placeholder="Project name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
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
              <div className="project-item" key={project.id}>
                <div>
                  <h3>{project.name}</h3>
                  <p>{project.description}</p>
                </div>

                <button
                  className="danger"
                  onClick={() => deleteProject(project.id)}
                  disabled={guest}
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
                onClick={() => setShowTaskForm(!showTaskForm)}
                disabled={guest || !projects.length}
              >
                + New Task
              </button>
            </div>

            {showTaskForm && !guest && (
              <form onSubmit={createTask} className="inline-form">
                <select
                  value={taskProjectId}
                  onChange={(e) => setTaskProjectId(e.target.value)}
                  required
                >
                  <option value="">Select project</option>

                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>

                <input
                  placeholder="Task title"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
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
              <div className="task-item" key={task.id}>
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
                    disabled={guest}
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
                    disabled={guest}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>

                  <button
                    className="danger"
                    onClick={() => deleteTask(task.id)}
                    disabled={guest}
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