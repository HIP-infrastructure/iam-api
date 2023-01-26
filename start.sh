#!/bin/sh

docker build -t iam-api .
docker run iam-api 
