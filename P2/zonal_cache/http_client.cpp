#ifndef HTTP_CLIENT_CPP
#define HTTP_CLIENT_CPP
#include <iostream>
#include <string>
#include <cstring>
#include <stdlib.h>
#include <unistd.h>
#include <sys/socket.h>
#include <arpa/inet.h>
#include <netinet/in.h>
#include <curl/curl.h>
#include "http_client.h"
#include "httpparser/request.h"
#include "httpparser/httprequestparser.h"
#include "httpparser/response.h"
#include "httpparser/httpresponseparser.h"
#include <unordered_map>
#include <cctype>
#include <stdexcept>

using namespace httpparser;
// Almacenar la respuesta de la request HTTPS en memoria.
// Basado en:
// https://curl.se/libcurl/c/getinmemory.html

// Callback para escribir la respuesta en memoria
static size_t write_callback(void * contents, size_t size, size_t nmemb, void * userp) {
    size_t realsize = size * nmemb;
    memory_struct *mem = (memory_struct *)userp;
    // Asegurarse de que hay suficiente memoria para almacenar la respuesta
    char *ptr = (char *) realloc(mem->memory, mem->size + realsize + 1);
    if(ptr == NULL) {
        printf("Not enough memory\n");
        return 0; // Sin memoria
    }

    // Asignar la memoria nueva y copiar los datos
    mem->memory = ptr;
    memcpy(&(mem->memory[mem->size]), contents, realsize);
    mem->size += realsize;
    mem->memory[mem->size] = '\0'; // Null terminate el string

    return realsize;
}

// Enviar la solicitud HTTPS al DNS API
// Basado en:
// https://curl.se/libcurl/c/http-post.html
// https://curl.se/libcurl/c/https.html
memory_struct *send_https_request(const string &url, const char *data, int length,
                                  unordered_map<string, string> headers_map, bool use_https, const string& method, bool write_headers) {
    CURL *curl;
    CURLcode res;

    curl = curl_easy_init();
    if (curl) {
        memory_struct *resp_mem = (memory_struct *) malloc(sizeof(memory_struct));
        if (!resp_mem) {
            perror("malloc failed");
            return NULL;
        }

        resp_mem->memory = (char *) malloc(1);
        resp_mem->size = 0;

        struct curl_slist *headers = NULL;
        for (const auto &header : headers_map) {
            string header_str = header.first + ": " + header.second;
            headers = curl_slist_append(headers, header_str.c_str());
        }

        string protocol = use_https ? "https://" : "http://";
        string url_req = protocol + url;
        cout << url_req << endl;
        curl_easy_setopt(curl, CURLOPT_URL, url_req.c_str());

        // Set the HTTP method
        if (method == "POST") {
            curl_easy_setopt(curl, CURLOPT_POST, 1L);
            if (data != NULL && length > 0) {
                curl_easy_setopt(curl, CURLOPT_POSTFIELDS, data);
                curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, length);
            }
        } else if (method == "PUT") {
            curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "PUT");
            if (data != NULL && length > 0) {
                curl_easy_setopt(curl, CURLOPT_POSTFIELDS, data);
                curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, length);
            }
        } else if (method == "DELETE") {
            curl_easy_setopt(curl, CURLOPT_CUSTOMREQUEST, "DELETE");
        } else if (method == "GET") {
            curl_easy_setopt(curl, CURLOPT_HTTPGET, 1L);
        } else {
            cerr << "Unsupported HTTP method: " << method << endl;
            free(resp_mem->memory);
            free(resp_mem);
            return NULL;
        }

        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_callback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, (void *)resp_mem);
        curl_easy_setopt(curl, CURLOPT_USERAGENT, "libcurl-agent/1.0");
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
        if (write_headers) {
            curl_easy_setopt(curl, CURLOPT_HEADER, 1L); // Incluir headers en la respuesta
        } else {
            curl_easy_setopt(curl, CURLOPT_HEADER, 0L); // No incluir headers en la respuesta
        }
        
        if (use_https) {
            curl_easy_setopt(curl, CURLOPT_SSL_VERIFYPEER, 0L);  // use 0L to skip verification (not recommended)
            curl_easy_setopt(curl, CURLOPT_SSL_VERIFYHOST, 0L);
        }

        res = curl_easy_perform(curl);
        curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &resp_mem->status_code);

        curl_easy_cleanup(curl);
        curl_slist_free_all(headers);

        if (res != CURLE_OK) {
            fprintf(stderr, "curl_easy_perform() failed: %s\n", curl_easy_strerror(res));
            free(resp_mem->memory);
            free(resp_mem);
            return NULL;
        }

        return resp_mem;
    }

    perror("curl_easy_init failed");
    return NULL;
}


// Función para convertir una cadena a minúsculas
// Obtenida de https://www.geeksforgeeks.org/conversion-whole-string-uppercase-lowercase-using-stl-c/
std::string to_lowercase(const std::string& input) {
    std::string result = input;
    std::transform(result.begin(), result.end(), result.begin(), ::tolower);
    return result;
}

// Parser de HTTP es la biblioteca https://github.com/nekipelov/httpparser
HttpRequest parse_http_request(const char * request_buffer, size_t size) {
    // Header para acceder a headers más fácilmente
    unordered_map<string, string> headers = {};
    
    // Crear un objeto request y un parser
    Request request;
    HttpRequestParser parser;

    HttpRequestParser::ParseResult result = parser.parse(request, request_buffer, request_buffer + size);
    if (result == HttpRequestParser::ParsingCompleted) {
        std::cout << request.inspect() << std::endl;
        for (const auto &header : request.headers) {
            // Convertir el nombre del header a minúsculas para un acceso más fácil y estándar
            // El protocolo HTTP es case-insensitive.
            headers[to_lowercase(header.name)] = header.value;
        }
    } else {
        std::cerr << "Error parsing HTTP request: " << result << std::endl;
        throw std::runtime_error("Failed to parse HTTP request");
    }
    HttpRequest http_request;
    http_request.request = request;
    http_request.headers = headers;
    return http_request;
}

// Parser de HTTP es la biblioteca https://github.com/nekipelov/httpparser
HttpResponse parse_http_response(const char * response_buffer, size_t size) {
    // Header para acceder a headers más fácilmente
    unordered_map<string, string> headers = {};
    
    // Crear un objeto response y un parser
    Response response;
    HttpResponseParser parser;

    HttpResponseParser::ParseResult result = parser.parse(response, response_buffer, response_buffer + size);
    if (result == HttpResponseParser::ParsingCompleted) {
        for (const auto &header : response.headers) {
            // Convertir el nombre del header a minúsculas para un acceso más fácil y estándar
            // El protocolo HTTP es case-insensitive.
            headers[to_lowercase(header.name)] = header.value;
        }
    } else {
        std::cerr << "Error parsing HTTP request: " << result << std::endl;
        throw std::runtime_error("Failed to parse HTTP request");
    }
    HttpResponse http_response;
    http_response.response = response;
    http_response.headers = headers;
    return http_response;
}

// Enviar una respuesta HTTP de error al cliente
void send_http_error_response (int client_socket, const std::string &error_message, int status_code) {
    std::string response = "HTTP/1.1 " + std::to_string(status_code) + " Error\r\n"
                           "Content-Type: text/plain\r\n"
                           "Content-Length: " + std::to_string(error_message.size()) + "\r\n"
                           "\r\n" +
                           error_message;
    send(client_socket, response.c_str(), response.size(), 0);
}
#endif