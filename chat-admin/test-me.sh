#!/bin/bash

# 从登录响应中提取的token
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoxLCJlbWFpbCI6ImFkbWluQGNoYXRhZG1pbi5jb20iLCJyb2xlIjoiYWRtaW4iLCJ0eXBlIjoiYWNjZXNzIiwiaWF0IjoxNzQ5ODMxNjA4LCJleHAiOjE3NTA0MzY0MDh9.1JRDOS4xHTzhl5HSkWM0qtGdGNUsnut3xllSII4_-RE"

curl -X GET http://localhost:8005/api/v1/auth/me \
  -H "Authorization: Bearer $TOKEN" \
  -w "\n"