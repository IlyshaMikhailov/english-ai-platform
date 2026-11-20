"""Integration tests for Admin endpoints and role-based access control."""

import pytest


@pytest.mark.asyncio
async def test_admin_demo_login_and_role_protection(async_client):
    # 1. Unauthenticated request rejected
    ov_unauth = await async_client.get("/api/v1/admin/overview")
    assert ov_unauth.status_code == 401

    # 2. Student user cannot access admin routes
    student_res = await async_client.post(
        "/api/v1/auth/register",
        json={
            "username": "student_bob",
            "email": "student_bob@example.com",
            "password": "password123",
            "level": "A2",
        },
    )
    assert student_res.status_code == 201
    student_headers = {"Authorization": f"Bearer {student_res.json()['access_token']}"}

    student_forbidden = await async_client.get("/api/v1/admin/overview", headers=student_headers)
    assert student_forbidden.status_code == 403

    # 3. Admin demo login
    admin_res = await async_client.post("/api/v1/auth/admin-demo")
    assert admin_res.status_code == 200
    admin_data = admin_res.json()
    assert admin_data["user"]["is_admin"] is True
    admin_headers = {"Authorization": f"Bearer {admin_data['access_token']}"}

    # 4. Admin overview
    overview_res = await async_client.get("/api/v1/admin/overview", headers=admin_headers)
    assert overview_res.status_code == 200
    overview = overview_res.json()
    assert "total_students" in overview
    assert "total_topics" in overview
    assert "total_tasks" in overview

    # 5. Admin lists students
    students_res = await async_client.get("/api/v1/admin/students", headers=admin_headers)
    assert students_res.status_code == 200
    students_list = students_res.json()
    assert any(s["username"] == "student_bob" for s in students_list)

    # 6. Admin creates a new topic
    new_topic_res = await async_client.post(
        "/api/v1/topics",
        headers=admin_headers,
        json={
            "title": "Future Simple & Predictions",
            "description": "Learn to talk about future expectations using will and won't.",
            "video_url": "https://example.org/future/video",
            "presentation_url": "https://example.org/future/slides",
            "level": "A2",
        },
    )
    assert new_topic_res.status_code == 201
    topic_id = new_topic_res.json()["id"]

    # 7. Admin adds a test task into the new topic
    new_task_res = await async_client.post(
        f"/api/v1/topics/{topic_id}/tasks",
        headers=admin_headers,
        json={
            "type": "test",
            "content": {
                "order": 1,
                "title": "Future predictions with will",
                "question": "In 2050, people ___ flying cars in cities.",
                "options": ["will have", "has", "had", "are having"],
                "correct_answer": "will have",
                "explanation": "Use will + base form for future predictions.",
            },
        },
    )
    assert new_task_res.status_code == 201
    task_id = new_task_res.json()["id"]

    # 8. Student submits an answer to this task
    submit_res = await async_client.post(
        f"/api/v1/tasks/{task_id}/submit",
        headers=student_headers,
        json={"answer": "will have"},
    )
    assert submit_res.status_code == 200
    assert submit_res.json()["is_correct"] is True

    # 9. Admin views learner submissions
    submissions_res = await async_client.get(
        "/api/v1/admin/submissions", headers=admin_headers
    )
    assert submissions_res.status_code == 200
    submissions = submissions_res.json()
    assert len(submissions) >= 1
    assert any(sub["student_name"] == "student_bob" and sub["score"] == 10.0 for sub in submissions)
