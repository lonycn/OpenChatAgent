#!/bin/bash

curl -X POST http://localhost:8005/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@chatadmin.com","password":"admin123456"}' \
  -w "\n"