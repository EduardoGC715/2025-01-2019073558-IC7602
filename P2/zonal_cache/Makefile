CC = g++
CFLAGS = -std=c++20 -g -Wall -I.
UNIT_TEST = -DUNIT_TEST
all: zonal_cache

zonal_cache: zonal_cache.cpp http_client.cpp
	$(CC) $(CFLAGS) -o zonal_cache zonal_cache.cpp http_client.cpp -pthread -lcurl -lssl -lcrypto

test: test_interceptor.c
	$(CC) $(CFLAGS) $(UNIT_TEST) -o test_interceptor \
	test_interceptor.c interceptor.c b64/cencode.c b64/cdecode.c \
	-pthread -lcurl -lcheck -lsubunit -lm -lrt -lssl -lcrypto
	./test_interceptor

run: zonal_cache
	./zonal_cache

clean:
	rm -f zonal_cache

push:
	@echo "Pushing to DockerHub"
ifdef version
	docker push dandiego235/zonal_cache:$(version)
endif
	docker push dandiego235/zonal_cache:latest
