from fastapi import Depends, FastAPI, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from backend.auth import (
    create_access_token,
    get_user_id_from_token,
    hash_password,
    verify_password,
)
from backend.database import get_connection


app = FastAPI(title="TaskFlow API")

security = HTTPBearer()


class UserCreate(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None


class ProjectUpdate(BaseModel):
    name: str | None = None
    description: str | None = None


class TaskCreate(BaseModel):
    project_id: int
    title: str
    description: str | None = None
    status: str = "todo"
    priority: str = "medium"
    due_date: str | None = None


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    due_date: str | None = None


def get_current_user_id(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> int:
    try:
        return get_user_id_from_token(credentials.credentials)
    except ValueError:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
        )


@app.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "taskflow-api",
    }


@app.get("/me")
def get_me(user_id: int = Depends(get_current_user_id)):
    conn = get_connection()

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, name, email, created_at
                FROM users
                WHERE id = %s;
                """,
                (user_id,),
            )

            row = cur.fetchone()

            if not row:
                raise HTTPException(
                    status_code=404,
                    detail="User not found",
                )

            return {
                "id": row[0],
                "name": row[1],
                "email": row[2],
                "created_at": row[3],
            }

    finally:
        conn.close()


@app.post("/users")
def create_user(user: UserCreate):
    password_hash = hash_password(user.password)

    conn = get_connection()

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (name, email, password_hash)
                VALUES (%s, %s, %s)
                RETURNING id, name, email, created_at;
                """,
                (user.name, user.email, password_hash),
            )

            row = cur.fetchone()
            conn.commit()

            return {
                "id": row[0],
                "name": row[1],
                "email": row[2],
                "created_at": row[3],
            }

    except Exception as exc:
        conn.rollback()
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    finally:
        conn.close()


@app.get("/users")
def get_users():
    conn = get_connection()

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, name, email, created_at
                FROM users
                ORDER BY id;
                """
            )

            rows = cur.fetchall()

            return [
                {
                    "id": row[0],
                    "name": row[1],
                    "email": row[2],
                    "created_at": row[3],
                }
                for row in rows
            ]

    finally:
        conn.close()


@app.post("/login")
def login(data: LoginRequest):
    conn = get_connection()

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, name, email, password_hash
                FROM users
                WHERE email = %s;
                """,
                (data.email,),
            )

            row = cur.fetchone()

            if not row:
                raise HTTPException(
                    status_code=401,
                    detail="Invalid email or password",
                )

            if not verify_password(data.password, row[3]):
                raise HTTPException(
                    status_code=401,
                    detail="Invalid email or password",
                )

            access_token = create_access_token(row[0])

            return {
                "message": "Login successful",
                "access_token": access_token,
                "token_type": "bearer",
                "user": {
                    "id": row[0],
                    "name": row[1],
                    "email": row[2],
                },
            }

    finally:
        conn.close()


@app.post("/projects")
def create_project(
    project: ProjectCreate,
    user_id: int = Depends(get_current_user_id),
):
    conn = get_connection()

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO projects (user_id, name, description)
                VALUES (%s, %s, %s)
                RETURNING id, user_id, name, description, created_at;
                """,
                (
                    user_id,
                    project.name,
                    project.description,
                ),
            )

            row = cur.fetchone()
            conn.commit()

            return {
                "id": row[0],
                "user_id": row[1],
                "name": row[2],
                "description": row[3],
                "created_at": row[4],
            }

    except Exception as exc:
        conn.rollback()
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    finally:
        conn.close()


@app.get("/projects")
def get_projects(
    user_id: int = Depends(get_current_user_id),
):
    conn = get_connection()

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, user_id, name, description, created_at
                FROM projects
                WHERE user_id = %s
                ORDER BY id;
                """,
                (user_id,),
            )

            rows = cur.fetchall()

            return [
                {
                    "id": row[0],
                    "user_id": row[1],
                    "name": row[2],
                    "description": row[3],
                    "created_at": row[4],
                }
                for row in rows
            ]

    finally:
        conn.close()


@app.put("/projects/{project_id}")
def update_project(project_id: int, project: ProjectUpdate):
    conn = get_connection()

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE projects
                SET
                    name = COALESCE(%s, name),
                    description = COALESCE(%s, description)
                WHERE id = %s
                RETURNING id, user_id, name, description, created_at;
                """,
                (
                    project.name,
                    project.description,
                    project_id,
                ),
            )

            row = cur.fetchone()

            if not row:
                raise HTTPException(
                    status_code=404,
                    detail="Project not found",
                )

            conn.commit()

            return {
                "id": row[0],
                "user_id": row[1],
                "name": row[2],
                "description": row[3],
                "created_at": row[4],
            }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as exc:
        conn.rollback()
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    finally:
        conn.close()


@app.delete("/projects/{project_id}")
def delete_project(project_id: int):
    conn = get_connection()

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM projects
                WHERE id = %s
                RETURNING id;
                """,
                (project_id,),
            )

            row = cur.fetchone()

            if not row:
                raise HTTPException(
                    status_code=404,
                    detail="Project not found",
                )

            conn.commit()

            return {
                "message": "Project deleted",
                "id": row[0],
            }

    except HTTPException:
        conn.rollback()
        raise

    finally:
        conn.close()


@app.post("/tasks")
def create_task(task: TaskCreate):
    conn = get_connection()

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO tasks (
                    project_id,
                    title,
                    description,
                    status,
                    priority,
                    due_date
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING
                    id,
                    project_id,
                    title,
                    description,
                    status,
                    priority,
                    due_date,
                    created_at,
                    updated_at;
                """,
                (
                    task.project_id,
                    task.title,
                    task.description,
                    task.status,
                    task.priority,
                    task.due_date,
                ),
            )

            row = cur.fetchone()
            conn.commit()

            return {
                "id": row[0],
                "project_id": row[1],
                "title": row[2],
                "description": row[3],
                "status": row[4],
                "priority": row[5],
                "due_date": row[6],
                "created_at": row[7],
                "updated_at": row[8],
            }

    except Exception as exc:
        conn.rollback()
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    finally:
        conn.close()


@app.get("/tasks")
def get_tasks():
    conn = get_connection()

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    id,
                    project_id,
                    title,
                    description,
                    status,
                    priority,
                    due_date,
                    created_at,
                    updated_at
                FROM tasks
                ORDER BY id;
                """
            )

            rows = cur.fetchall()

            return [
                {
                    "id": row[0],
                    "project_id": row[1],
                    "title": row[2],
                    "description": row[3],
                    "status": row[4],
                    "priority": row[5],
                    "due_date": row[6],
                    "created_at": row[7],
                    "updated_at": row[8],
                }
                for row in rows
            ]

    finally:
        conn.close()


@app.put("/tasks/{task_id}")
def update_task(task_id: int, task: TaskUpdate):
    conn = get_connection()

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE tasks
                SET
                    title = COALESCE(%s, title),
                    description = COALESCE(%s, description),
                    status = COALESCE(%s, status),
                    priority = COALESCE(%s, priority),
                    due_date = COALESCE(%s, due_date),
                    updated_at = NOW()
                WHERE id = %s
                RETURNING
                    id,
                    project_id,
                    title,
                    description,
                    status,
                    priority,
                    due_date,
                    created_at,
                    updated_at;
                """,
                (
                    task.title,
                    task.description,
                    task.status,
                    task.priority,
                    task.due_date,
                    task_id,
                ),
            )

            row = cur.fetchone()

            if not row:
                raise HTTPException(
                    status_code=404,
                    detail="Task not found",
                )

            conn.commit()

            return {
                "id": row[0],
                "project_id": row[1],
                "title": row[2],
                "description": row[3],
                "status": row[4],
                "priority": row[5],
                "due_date": row[6],
                "created_at": row[7],
                "updated_at": row[8],
            }

    except HTTPException:
        conn.rollback()
        raise

    except Exception as exc:
        conn.rollback()
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        )

    finally:
        conn.close()


@app.delete("/tasks/{task_id}")
def delete_task(task_id: int):
    conn = get_connection()

    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                DELETE FROM tasks
                WHERE id = %s
                RETURNING id;
                """,
                (task_id,),
            )

            row = cur.fetchone()

            if not row:
                raise HTTPException(
                    status_code=404,
                    detail="Task not found",
                )

            conn.commit()

            return {
                "message": "Task deleted",
                "id": row[0],
            }

    except HTTPException:
        conn.rollback()
        raise

    finally:
        conn.close()
