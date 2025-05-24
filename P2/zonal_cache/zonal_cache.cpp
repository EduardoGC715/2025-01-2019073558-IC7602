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
#include <unordered_map>
#include "rapidjson/document.h"
#include "rapidjson/writer.h"
#include "rapidjson/stringbuffer.h"
#include "http_client.h"
#include "zonal_cache.h"

using namespace std;
using namespace rapidjson;

#define HTTPS_PORT 433

// Referencias para threads:
// https://cplusplus.com/reference/thread/thread/

Document subdomains;
// Referencias para concurrencia con lock de lectura compartida:
// https://en.cppreference.com/w/cpp/thread/shared_mutex
shared_mutex subdomain_mutex;


void fetch_subdomains(const string &rest_api, const string &app_id, const string &api_key, const int &fetch_interval) {
    string url = rest_api + "/subdomain/all";
    unordered_map<string, string> headers_map = {
        {"Content-Type", "application/json"},
        {"x-app-id", app_id},
        {"x-api-key", api_key}
    };

    while (true) {
        memory_struct * response = send_https_request(url.c_str(), NULL, 0, headers_map);
        if (response && response->status_code == 200) {
            Document temp;
            if (!temp.Parse(response->memory).HasParseError()) {
                unique_lock<shared_mutex> lock(subdomain_mutex);
                subdomains.Swap(temp);
                lock.unlock();

                StringBuffer buffer;
                Writer<StringBuffer> writer(buffer);
                subdomains.Accept(writer);
                
                cout << "Subdomains fetched successfully." << endl;
                cout << "Subdomains: " << buffer.GetString() << endl;
                cout << "Response code: " << response->status_code << endl;
            } else {
                cout << "Failed to parse JSON response." << endl;
            }
            free(response->memory);
            free(response);
        } else {
            cout << "Failed to fetch subdomains. Status code: " << (response ? response->status_code : -1) << endl;
        }
        this_thread::sleep_for(chrono::minutes(fetch_interval));
    }
}

void handle_http_request(const int client_socket, const string &rest_api, const string &app_id, const string &api_key) {
    shared_lock lock(subdomain_mutex);
    lock.unlock();
    close(client_socket);
}
// Referencias para sockets:
// https://dev.to/jeffreythecoder/how-i-built-a-simple-http-server-from-scratch-using-c-739
// https://www.linuxhowtos.org/C_C++/socket.htm
// Para env variables:
// https://www.gnu.org/software/libc/manual/html_node/Environment-Access.html#:~:text=The%20value%20of%20an%20environment,accidentally%20use%20untrusted%20environment%20variables.

#ifndef UNIT_TEST

int main() {
    setvbuf(stdout, NULL, _IONBF, 0);
    const char* rest_api_env = getenv("REST_API");
    const char* app_id_env = getenv("APP_ID");
    const char* api_key_env = getenv("API_KEY");
    const int fetch_interval = getenv("FETCH_INTERVAL") ? atoi(getenv("FETCH_INTERVAL")) : 3;
    if (!rest_api_env || !app_id_env || !api_key_env) {
        std::cerr << "Environment variables REST_API, APP_ID, and API_KEY must be set\n";
        return 1;
    }

    const string rest_api(rest_api_env);
    const string app_id(app_id_env);
    const string api_key(api_key_env);

    // Crear un thread para obtener los subdominios
    thread([&rest_api, &app_id, &api_key, fetch_interval]() {
            fetch_subdomains(rest_api, app_id, api_key, fetch_interval);
        }).join();

    // int socket_fd;
    // socket_fd = socket(AF_INET, SOCK_STREAM, 0);
    
    // struct sockaddr_in server_addr;
    // server_addr.sin_family = AF_INET;
    // server_addr.sin_port = htons(HTTPS_PORT); // DNS port
    // server_addr.sin_addr.s_addr = INADDR_ANY;

    // if (bind(socket_fd, (struct sockaddr *) &server_addr, sizeof(server_addr)) < 0) {
    //     perror("Bind failed");
    //     close(socket_fd);
    //     return 1;
    // }

    // if (listen(socket_fd, 10) < 0) {
    //     perror("Listen failed");
    //     close(socket_fd);
    //     return 1;
    // }

    // cout << "Zonal cache is running...\n";

    // // Inicialización CURL
    // curl_global_init(CURL_GLOBAL_DEFAULT);

    // while (1) {
    //     struct sockaddr_in client_addr;
    //     socklen_t client_len = sizeof(client_addr);

    //     int client_socket = accept(server_socket, (struct sockaddr *)&client_addr, &client_len);
    //     if (client_socket < 0) {
    //         perror("Accept failed");
    //         continue;
    //     }

    //     thread([client_socket, &rest_api, &app_id, &api_key]() {
    //         handle_http_request(client_socket, rest_api, app_id, api_key);
    //     }).detach();
    // }

    // close(socket_fd);
    // curl_global_cleanup();
    // printf("Zonal cache stopped.\n");
    // return 0;
}
#endif //UNIT_TEST