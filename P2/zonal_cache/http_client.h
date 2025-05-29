#ifndef HTTP_CLIENT_H
#define HTTP_CLIENT_H

#include <unordered_map>
#include <string>
#include "httpparser/request.h"
#include "httpparser/response.h"
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

struct HttpResponse {
    unordered_map<string, string> headers;
    Response response;
};   

memory_struct *send_https_request( const string &url, const char *data, int length, unordered_map<string, string> headers_map, bool use_https, const string& method, bool write_headers = false);
HttpRequest parse_http_request(const char *request_buffer, size_t request_size);
HttpResponse parse_http_response(const char *response_buffer, size_t response_size);
void send_http_error_response (int client_socket, const string &error_message, int status_code);
#endif // HTTP_CLIENT_H