#ifndef HTTP_CLIENT_H
#define HTTP_CLIENT_H

#include <unordered_map>
#include <string>
#include "httpparser/request.h"
#include "httpparser/response.h"
using namespace std;
using namespace httpparser;

struct memory_struct {
    char* memory;
    size_t size;
    long status_code;
    unordered_map<string, string> headers;
    string status_line;

    // Constructor
    memory_struct()
        : memory(nullptr), size(0), status_code(0), headers(), status_line("") {}

    // Destructor
    ~memory_struct() {
        if (memory) {
            free(memory);
            memory = nullptr;
        }
    }
};

struct header_info {
    string status_line;
    bool captured = false;
};

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
string build_http_response(const memory_struct *response_mem);
#endif // HTTP_CLIENT_H