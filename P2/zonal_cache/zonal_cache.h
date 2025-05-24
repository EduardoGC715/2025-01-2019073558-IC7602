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

void fetch_subdomains(const std::string &rest_api, const std::string &app_id, const std::string &api_key, const int &fetch_interval);
void handle_http_request(const int client_socket, const std::string &rest_api, const std::string &app_id, const std::string &api_key);