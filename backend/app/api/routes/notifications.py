"""SSE (Server-Sent Events) streaming endpoint for real-time pharmacy dashboard notifications."""
from __future__ import annotations

import asyncio
import json
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from app.notifications.queue import notification_manager

router = APIRouter(prefix="/api/notifications", tags=["Real-time Notifications & SSE"])


@router.get("/stream", summary="약국 대시보드 실시간 고위험 처방 알림 SSE 스트림")
async def notification_stream(request: Request):
    """Establishes a Server-Sent Events (SSE) connection with the pharmacy dashboard.
    Pushes real-time alerts when high-risk prescriptions (score >= 80) are received through the gateway.
    Includes heartbeat pings every 15 seconds to keep the connection alive.
    """
    client_queue = await notification_manager.connect()

    async def event_generator() -> AsyncGenerator[str, None]:
        try:
            # Send initial connection confirmation event
            yield f"event: connected\ndata: {json.dumps({'message': 'SSE connection established successfully.'}, ensure_ascii=False)}\n\n"

            while True:
                # Check if client disconnected
                if await request.is_disconnected():
                    break

                try:
                    # Wait for next event with a 15-second timeout to send heartbeat ping
                    event_data = await asyncio.wait_for(client_queue.get(), timeout=15.0)
                    yield f"event: high_risk_alert\ndata: {json.dumps(event_data, ensure_ascii=False)}\n\n"
                except asyncio.TimeoutError:
                    # Heartbeat comment to prevent proxy/browser timeout
                    yield ": ping\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            notification_manager.disconnect(client_queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
