
all: checker

checker: health_checker.c
	gcc -o health_checker health_checker.c
push:
	@echo "Pushing to DockerHub"
ifdef version
	docker push dandiego235/dns-health-checker:$(version)
endif
	docker push dandiego235/dns-health-checker:latest
