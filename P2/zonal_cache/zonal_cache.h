#include <iostream>
#include <string>
#include <stdlib.h>
#include <unistd.h>
#include <sys/socket.h>
#include <arpa/inet.h>
#include <netinet/in.h>
#include <curl/curl.h>
#include <thread>
#include <mutex>
#include <shared_mutex>
#include <chrono>
#include "rapidjson/document.h"
#include "rapidjson/writer.h"
#include "rapidjson/stringbuffer.h"
#include "http_client.h"
#include <openssl/ssl.h>
#include <openssl/err.h>
typedef struct {
    char * data;
    int length;
} base64_decoded_data;

struct subdomain_info {
    string auth_method;
    string destination;
    bool https;
    vector<string> file_types;
    uint64_t cache_size;
    int ttl;
    string replacement_policy;
    string wildcard;

    subdomain_info()
        : auth_method("none"),
          destination(""),
          https(false),
          file_types({}),
          cache_size(0),
          ttl(0),
          replacement_policy("LRU"),
          wildcard("") {}

    // Param constructor (for completeness)
    subdomain_info(const std::string& auth_method,
        const std::string& destination,
        bool https,
        const std::vector<std::string>& file_types,
        uint64_t cache_size,
        int ttl,
        const std::string& replacement_policy,
        const std::string& wildcard)
        : auth_method(auth_method),
          destination(destination),
          https(https),
          file_types(file_types),
          cache_size(cache_size),
          ttl(ttl),
          replacement_policy(replacement_policy),
          wildcard(wildcard) {}
};

void fetch_subdomains(const std::string &rest_api, const std::string &app_id, const std::string &api_key, const int &fetch_interval);
void handle_http_request(const int client_socket, const std::string &rest_api, const std::string &app_id, const std::string &api_key, const std::string &vercel_ui);