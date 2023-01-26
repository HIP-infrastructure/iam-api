#!/bin/sh

docker build -t iam-api .
docker run -v $(pwd):/fs  iam-api 
