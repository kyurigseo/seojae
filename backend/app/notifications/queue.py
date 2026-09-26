"""Asynchronous notification queue and SSE broadcasting manager for pharmacy dashboard alerts."""
from __future__ import annotations

import asyncio
import json
from typing import Any, AsyncGenerator, List


class NotificationManager:
    """Manages connected SSE client queues and broadcasts high-risk prescription alerts asynchronously."""

    def __init__(self) -> None:
        self._listeners: List[asyncio.Queue[dict[str, Any]]] = []

    async def connect(self) -> asyncio.Queue[dict[str, Any]]:
        """Registers a new SSE client listener queue."""
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue()
        self._listeners.append(queue)
        return queue

    def disconnect(self, queue: asyncio.Queue[dict[str, Any]]) -> None:
        """Unregisters an SSE client listener queue upon disconnection."""
        if queue in self._listeners:
            self._listeners.remove(queue)

    async def broadcast(self, event_data: dict[str, Any]) -> None:
        """Publishes an event to all connected SSE clients non-blockingly."""
        for queue in self._listeners:
            await queue.put(event_data)

    def get_listener_count(self) -> int:
        return len(self._listeners)


# Global singleton notification manager instance
notification_manager = NotificationManager()
