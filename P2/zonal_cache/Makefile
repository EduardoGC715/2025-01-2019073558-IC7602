CC = g++
CFLAGS = -std=c++20 -g -Wall -I.
UNIT_TEST = -DUNIT_TEST
all: zonal_cache test


zonal_cache: zonal_cache.cpp http_client.cpp
	$(CC) $(CFLAGS) -o zonal_cache zonal_cache.cpp http_client.cpp -pthread -lcurl -lssl -lcrypto

test: zonal_cache_test.cpp http_client.cpp catch2/catch_amalgamated.cpp
	$(CC) $(CFLAGS) $(UNIT_TEST) -o test zonal_cache_test.cpp http_client.cpp \
	      catch2/catch_amalgamated.cpp -pthread -lcurl -lssl -lcrypto

run: zonal_cache
	./zonal_cache

clean:
	rm -f zonal_cache test            # ← also remove the test binary

push:
	@echo "Pushing to DockerHub"
ifdef version
	docker push dandiego235/zonal_cache:$(version)
endif
	docker push dandiego235/zonal_cache:latest
