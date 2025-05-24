#ifndef HTTP_CLIENT_H
#define HTTP_CLIENT_H

#include <unordered_map>
#include <string>
#include "httpparser/request.h"

using namespace std;
using namespace httpparser;

typedef struct {
    char *memory;
    size_t size;
    long status_code;
} memory_struct;


struct HttpRequest {
    unordered_map<string, string> headers;
    Request request;
};

memory_struct *send_https_request(const char *url, const char *data, int length, unordered_map<string, string> headers_map);
HttpRequest parse_http_request(const char *request_buffer, size_t request_size);
void send_http_error_response (int client_socket, const std::string &error_message, int status_code);
#endif // HTTP_CLIENT_H