#!/bin/bash

# Check if ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "ffmpeg is not installed. Please install it first."
    exit 1
fi

# Generate a test pattern and stream it to the RTMP server
echo "Starting test stream to rtmp://localhost:1935/live/stream"
echo "Press Ctrl+C to stop the stream"

ffmpeg -re -f lavfi -i "testsrc=size=1280x720:rate=30,format=yuv420p" \
       -c:v libx264 -preset ultrafast -tune zerolatency -g 30 -keyint_min 30 \
       -b:v 2500k -maxrate 2500k -bufsize 5000k \
       -f flv rtmp://localhost:1935/live/stream
