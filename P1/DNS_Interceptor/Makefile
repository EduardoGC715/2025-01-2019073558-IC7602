CC = gcc
CFLAGS = -g -Wall -I.
UNIT_TEST = -DUNIT_TEST
all: interceptor

interceptor: interceptor.c b64/cencode.c b64/cdecode.c
	$(CC) $(CFLAGS) -o interceptor interceptor.c b64/cencode.c b64/cdecode.c -pthread -lcurl

test: test_interceptor.c
	$(CC) $(CFLAGS) $(UNIT_TEST) -o test_interceptor \
	test_interceptor.c interceptor.c b64/cencode.c b64/cdecode.c \
	-pthread -lcurl -lcheck -lsubunit -lm -lrt
	./test_interceptor

run: interceptor
	./interceptor

clean:
	rm -f interceptor

push:
	@echo "Pushing to DockerHub"
ifdef version
	docker push dandiego235/dns-interceptor:$(version)
endif
	docker push dandiego235/dns-interceptor:latest
