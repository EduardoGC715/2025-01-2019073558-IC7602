#ifndef HTTP_CLIENT_H
#define HTTP_CLIENT_H

#include <unordered_map>
#include <string>

using namespace std;

typedef struct {
    char *memory;
    size_t size;
    long status_code;
} memory_struct;

memory_struct *send_https_request(const char *url, const char *data, int length, unordered_map<string, string> headers_map);

#endif // HTTP_CLIENT_H