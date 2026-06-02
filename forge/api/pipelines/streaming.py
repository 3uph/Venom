import asyncio
from typing import AsyncIterator

_run_queues: dict[str, asyncio.Queue] = {}


def _queue_for(run_id: str) -> asyncio.Queue:
    q = _run_queues.get(run_id)
    if q is None:
        q = asyncio.Queue()
        _run_queues[run_id] = q
    return q


async def publish(run_id: str, event: dict) -> None:
    await _queue_for(run_id).put(event)


async def subscribe(run_id: str) -> AsyncIterator[dict]:
    """Drain queued events for a run; exits on run_finished.

    Events accumulate in queue from publish() so late subscribers still receive
    the full event sequence including run_finished. The queue is left in place
    after subscription ends; cleanup is best-effort and not done here.
    """
    q = _queue_for(run_id)
    while True:
        event = await q.get()
        yield event
        if event.get("event") == "run_finished":
            break
