

all: interceptor

interceptor: interceptor.c
	gcc -g -o interceptor interceptor.c -pthread

run: interceptor
	./interceptor

clean:
	rm -f interceptor