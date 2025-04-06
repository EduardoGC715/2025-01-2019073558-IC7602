

all: interceptor

interceptor: interceptor.c
	gcc -g -o interceptor interceptor.c b64/cencode.o b64/cdecode.o -pthread -lcurl

run: interceptor
	./interceptor

clean:
	rm -f interceptor