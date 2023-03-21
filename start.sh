#!/bin/sh

docker build -t ebrains-api .
docker run ebrains-api
