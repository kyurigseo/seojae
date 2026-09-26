"""Unit tests for Issue 5: Asynchronous notification queue and SSE broadcasting."""
from __future__ import annotations

import asyncio
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.notifications.queue import NotificationManager, notification_manager

client = TestClient(app)


@pytest.mark.asyncio
async def test_notification_manager_pub_sub():
    manager = NotificationManager()
    assert manager.get_listener_count() == 0

    queue = await manager.connect()
    assert manager.get_listener_count() == 1

    test_event = {"prescription_id": "RX_ALERT_1", "total_score": 85, "grade": "high_risk"}
    await manager.broadcast(test_event)

    received = await queue.get()
    assert received == test_event

    manager.disconnect(queue)
    assert manager.get_listener_count() == 0


def test_sse_endpoint_connection():
    # Test that GET /api/notifications/stream returns a streaming response with text/event-stream
    with client.stream("GET", "/api/notifications/stream") as response:
        assert response.status_code == 200
        assert "text/event-stream" in response.headers.get("content-type", "")
        
        # Read the first chunk (connected event)
        chunk = next(response.iter_lines())
        assert b"event: connected" in chunk or b"data:" in chunk
