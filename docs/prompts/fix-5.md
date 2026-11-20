# Fix 5: Measure live cost and duration

READS: PDR section 10, section 8
TASK: Run 10 live scans, record p50 duration and cost per scan in STATE.md, and tune the context budget if needed.
GATE: p50 <= 90s for 50k LOC; median cost <= $0.30.
