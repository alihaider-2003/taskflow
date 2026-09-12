from fastapi.testclient import TestClient

from backend.main import app


client = TestClient(app)


def login():
    response = client.post(
        "/login",
        json={
            "email": "test@taskflow.local",
            "password": "Test123!",
        },
    )

    assert response.status_code == 200

    return response.json()["access_token"]


def auth_headers():
    return {
        "Authorization": f"Bearer {login()}",
    }


def test_health():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_projects_require_authentication():
    response = client.get("/projects")

    assert response.status_code == 401


def test_user_can_only_see_own_projects():
    response = client.get(
        "/projects",
        headers=auth_headers(),
    )

    assert response.status_code == 200

    projects = response.json()

    assert all(project["user_id"] == 2 for project in projects)
    assert any(project["id"] == 3 for project in projects)


def test_user_cannot_update_other_users_project():
    response = client.put(
        "/projects/1",
        headers=auth_headers(),
        json={
            "name": "Should Not Update",
        },
    )

    assert response.status_code == 404


def test_user_cannot_delete_other_users_project():
    response = client.delete(
        "/projects/1",
        headers=auth_headers(),
    )

    assert response.status_code == 404


def test_user_can_create_task_in_own_project():
    response = client.post(
        "/tasks",
        headers=auth_headers(),
        json={
            "project_id": 3,
            "title": "Automated Test Task",
            "description": "Created by pytest",
            "status": "todo",
            "priority": "high",
        },
    )

    assert response.status_code == 200
    assert response.json()["project_id"] == 3


def test_user_cannot_create_task_in_other_users_project():
    response = client.post(
        "/tasks",
        headers=auth_headers(),
        json={
            "project_id": 1,
            "title": "Should Not Exist",
        },
    )

    assert response.status_code == 404
