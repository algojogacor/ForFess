#!/usr/bin/env bash
# Memastikan dev server Next.js hidup di port 3000.
# Dipanggil di awal setiap sesi pengujian; idempotent — start hanya jika belum jalan.
if curl -s -o /dev/null --max-time 2 http://localhost:3000; then
  echo "server-already-running"
  exit 0
fi

cd /home/z/my-project || exit 1
setsid nohup bun run dev > /dev/null 2>&1 < /dev/null &

for _ in $(seq 1 60); do
  if curl -s -o /dev/null --max-time 2 http://localhost:3000; then
    echo "server-started"
    exit 0
  fi
  sleep 1
done

echo "server-failed-to-start"
exit 1
