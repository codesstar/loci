# Journal — Daily Summary System

## Mechanism

### Real-time: Buffer Append
During conversations, append a line to `buffer.md` (with timestamp) when:
- A decision is made
- Something new is learned or a new insight emerges
- An important topic is discussed
- Format: `- [HH:MM] Brief description`

### Trigger Summary
When the user says "summarize", "what did I do today", or similar:

1. Read `buffer.md`
2. Review the day's conversation content
3. Scan department `to-hq.md` files
4. Generate `YYYY-MM-DD.md` with sections:
   - **Accomplished**: Brief summary of actions and outputs
   - **Learned**: New insights, new knowledge
   - **Discussed**: Important topics and conclusions
   - **Decisions**: What was decided
5. User confirms, then write and clear buffer
6. Run `cd 10-dashboard && python3 build.py` to refresh Dashboard

### Recovery
At the start of each new conversation, check if yesterday has a journal entry. If not, remind to backfill.

### Proactive Trigger
When sensing the user is wrapping up ("that's it", "done for today", etc.), proactively offer to summarize.
