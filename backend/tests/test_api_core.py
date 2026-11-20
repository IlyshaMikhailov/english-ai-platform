"""Integration tests for Auth, Onboarding, Topics CRUD, and Task submission."""

import pytest


@pytest.mark.asyncio
async def test_register_login_and_onboarding_flow(async_client):
    register_res = await async_client.post(
        "/api/v1/auth/register",
        json={
            "username": "alice",
            "email": "alice@example.com",
            "password": "password123",
            "level": "B1",
        },
    )
    assert register_res.status_code == 201
    reg_data = register_res.json()
    token = reg_data["access_token"]
    assert reg_data["user"]["is_first_login"] is True
    assert reg_data["user"]["level"] == "B1"

    headers = {"Authorization": f"Bearer {token}"}
    me_res = await async_client.get("/api/v1/users/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["is_first_login"] is True

    complete_res = await async_client.post(
        "/api/v1/users/onboarding-complete", headers=headers
    )
    assert complete_res.status_code == 200
    assert complete_res.json()["is_first_login"] is False

    login_res = await async_client.post(
        "/api/v1/auth/login",
        json={"identifier": "alice", "password": "password123"},
    )
    assert login_res.status_code == 200
    assert login_res.json()["user"]["is_first_login"] is False


@pytest.mark.asyncio
async def test_demo_login_and_level_filtered_topics(async_client):
    demo_res = await async_client.post("/api/v1/auth/demo")
    assert demo_res.status_code == 200
    demo_data = demo_res.json()
    headers = {"Authorization": f"Bearer {demo_data['access_token']}"}

    a2_topics = await async_client.get("/api/v1/topics", headers=headers)
    assert a2_topics.status_code == 200
    assert len(a2_topics.json()) >= 2
    assert all(topic["level"] == "A2" for topic in a2_topics.json())

    patch_res = await async_client.patch(
        "/api/v1/users/me", json={"level": "B2"}, headers=headers
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["level"] == "B2"

    b2_topics = await async_client.get("/api/v1/topics", headers=headers)
    assert b2_topics.status_code == 200
    assert len(b2_topics.json()) >= 2
    assert all(topic["level"] == "B2" for topic in b2_topics.json())


@pytest.mark.asyncio
async def test_topic_task_crud_sanitization_and_submission(async_client):
    reg_res = await async_client.post(
        "/api/v1/auth/register",
        json={
            "username": "bob",
            "email": "bob@example.com",
            "password": "password123",
            "level": "A2",
        },
    )
    headers = {"Authorization": f"Bearer {reg_res.json()['access_token']}"}

    topic_res = await async_client.post(
        "/api/v1/topics",
        headers=headers,
        json={
            "title": "Articles A / An / The",
            "description": "Learn definite and indefinite articles.",
            "video_url": "https://example.org/video",
            "presentation_url": "https://example.org/slides",
            "level": "A2",
        },
    )
    assert topic_res.status_code == 201
    topic_id = topic_res.json()["id"]

    test_task_res = await async_client.post(
        f"/api/v1/topics/{topic_id}/tasks",
        headers=headers,
        json={
            "type": "test",
            "content": {
                "question": "I saw ___ elephant at the zoo.",
                "options": ["a", "an", "the"],
                "correct_answer": "an",
                "explanation": "Use 'an' before vowel sounds.",
            },
        },
    )
    assert test_task_res.status_code == 201
    test_task_id = test_task_res.json()["id"]

    gamified_task_res = await async_client.post(
        f"/api/v1/topics/{topic_id}/tasks",
        headers=headers,
        json={
            "type": "gamified",
            "content": {
                "instruction": "Order the words.",
                "correct_sentence": "The cat is sleeping.",
                "words": ["sleeping.", "is", "The", "cat"],
            },
        },
    )
    assert gamified_task_res.status_code == 201
    gamified_task_id = gamified_task_res.json()["id"]

    # Practice task listing must strip answer keys.
    tasks_res = await async_client.get(
        f"/api/v1/topics/{topic_id}/tasks", headers=headers
    )
    assert tasks_res.status_code == 200
    for item in tasks_res.json():
        assert "correct_answer" not in item["content"]
        assert "correct_sentence" not in item["content"]

    wrong_submit = await async_client.post(
        f"/api/v1/tasks/{test_task_id}/submit",
        headers=headers,
        json={"answer": "a"},
    )
    assert wrong_submit.status_code == 200
    assert wrong_submit.json()["is_correct"] is False
    assert wrong_submit.json()["should_open_tutor"] is True
    assert wrong_submit.json()["score"] == 0.0

    right_submit = await async_client.post(
        f"/api/v1/tasks/{test_task_id}/submit",
        headers=headers,
        json={"answer": "an"},
    )
    assert right_submit.status_code == 200
    assert right_submit.json()["is_correct"] is True
    assert right_submit.json()["should_open_tutor"] is False
    assert right_submit.json()["score"] == 10.0

    gamified_submit = await async_client.post(
        f"/api/v1/tasks/{gamified_task_id}/submit",
        headers=headers,
        json={"words": ["The", "cat", "is", "sleeping."]},
    )
    assert gamified_submit.status_code == 200
    assert gamified_submit.json()["is_correct"] is True
    assert gamified_submit.json()["score"] == 10.0

    progress_res = await async_client.get(
        "/api/v1/users/me/progress", headers=headers
    )
    assert progress_res.status_code == 200
    progress_data = progress_res.json()
    assert progress_data["completed_tasks"] == 3
    assert progress_data["average_score"] == pytest.approx(6.67, abs=0.05)


@pytest.mark.asyncio
async def test_appearance_character_wh_tasks_matching_choice_and_underline(
    async_client,
):
    demo_res = await async_client.post("/api/v1/auth/demo")
    assert demo_res.status_code == 200
    headers = {"Authorization": f"Bearer {demo_res.json()['access_token']}"}

    topics_res = await async_client.get("/api/v1/topics", headers=headers)
    assert topics_res.status_code == 200
    target_topic = next(
        t
        for t in topics_res.json()
        if t["title"] == "Внешность и характер"
    )

    tasks_res = await async_client.get(
        f"/api/v1/topics/{target_topic['id']}/tasks", headers=headers
    )
    assert tasks_res.status_code == 200
    tasks = tasks_res.json()
    assert len(tasks) == 4

    matching_task, choice_task, underline_task, essay_task = tasks
    assert matching_task["content"]["mode"] == "matching"
    assert "pairs" not in matching_task["content"]
    assert len(matching_task["content"]["cards"]) == 12
    assert len(matching_task["content"]["words"]) == 12

    assert choice_task["content"]["display_mode"] == "choice"
    assert len(choice_task["content"]["questions"]) == 10
    for q in choice_task["content"]["questions"]:
        assert "correct_answer" not in q

    assert underline_task["content"]["display_mode"] == "underline"
    assert len(underline_task["content"]["questions"]) == 10
    assert essay_task["type"] == "essay"

    # Submit partial matching (6/12 correct) -> score 5.0, should_open_tutor=True
    partial_match = await async_client.post(
        f"/api/v1/tasks/{matching_task['id']}/submit",
        headers=headers,
        json={
            "matches": {
                "pair-1": "Clever",
                "pair-2": "Shy",
                "pair-3": "Polite",
                "pair-4": "Stubborn",
                "pair-5": "Curious",
                "pair-6": "Patient",
                "pair-7": "Curly",
            }
        },
    )
    assert partial_match.status_code == 200
    assert partial_match.json()["is_correct"] is False
    assert partial_match.json()["correct_count"] == 6
    assert partial_match.json()["total_count"] == 12
    assert partial_match.json()["score"] == 5.0
    assert partial_match.json()["should_open_tutor"] is True

    # Submit all 10 situation choices correctly -> score 10.0
    choice_submit = await async_client.post(
        f"/api/v1/tasks/{choice_task['id']}/submit",
        headers=headers,
        json={
            "answers": {
                "q1": "Patient",
                "q2": "Shy",
                "q3": "Curious",
                "q4": "Polite",
                "q5": "Clever",
                "q6": "Stubborn",
                "q7": "Patient",
                "q8": "Shy",
                "q9": "Curious",
                "q10": "Polite",
            }
        },
    )
    assert choice_submit.status_code == 200
    assert choice_submit.json()["is_correct"] is True
    assert choice_submit.json()["score"] == 10.0
    assert choice_submit.json()["correct_count"] == 10

    # Submit all 10 Wh-questions correctly -> score 10.0
    underline_submit = await async_client.post(
        f"/api/v1/tasks/{underline_task['id']}/submit",
        headers=headers,
        json={
            "answers": {
                "w1": "Who",
                "w2": "Why",
                "w3": "Where",
                "w4": "Whose",
                "w5": "When",
                "w6": "Why",
                "w7": "Where",
                "w8": "Whose",
                "w9": "Why",
                "w10": "When",
            }
        },
    )
    assert underline_submit.status_code == 200
    assert underline_submit.json()["is_correct"] is True
    assert underline_submit.json()["score"] == 10.0
    assert underline_submit.json()["correct_count"] == 10
