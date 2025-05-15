.DEFAULT_GOAL: run
.PHONY: run build

MY_DIR := $(shell cd)

# Mandar version
# make build version=1 (o 2 o x.)

push:
	@echo "Pushing to DockerHub"
ifdef version
	docker push dandiego235/dns-api:$(version)
endif
	docker push dandiego235/dns-api:latest
