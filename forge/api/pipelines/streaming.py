import asyncio
from typing import AsyncIterator

_run_queues: dict[str, asyncio.Queue] = {}
_run_closed: set[str] = set()


def _queue_for(run_id: str) -> asyncio.Queue:
    q = _run_queues.get(run_id)
    if q is None:
        q = asyncio.Queue()
        _run_queues[run_id] = q
    return q


async def publish(run_id: str, event: dict) -> None:
    await _queue_for(run_id).put(event)


async def subscribe(run_id: str) -> AsyncIterator[dict]:
    q = _queue_for(run_id)
    while True:
        event = await q.get()
        yield event
        if event.get("event") == "run_finished":
            break


def close_run(run_id: str) -> None:
    _run_closed.add(run_id)
    _run_queues.pop(run_id, None)
