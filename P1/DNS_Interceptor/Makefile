CC = gcc
CFLAGS = -g -Wall -I.

all: interceptor

interceptor: interceptor.c b64/cencode.c b64/cdecode.c
	$(CC) $(CFLAGS) -o interceptor interceptor.c b64/cencode.c b64/cdecode.c -pthread -lcurl

run: interceptor
	./interceptor

clean:
	rm -f interceptor