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

#define HTTP_PORT 80
#define REQUEST_BUFFER_SIZE 8192

// Referencias para threads:
// https://cplusplus.com/reference/thread/thread/

Document subdomains;
// Referencias para concurrencia con lock de lectura compartida:
// https://en.cppreference.com/w/cpp/thread/shared_mutex
shared_mutex subdomain_mutex;

Document cache;
cache.SetObject();
Document::AllocatorType& allocator = cache.GetAllocator();

// Función que obtiene los subdominios desde el Rest API y los almacena en un objeto Document de RapidJSON.
// Recibe las variables de entorno REST_API, APP_ID, API_KEY y FETCH_INTERVAL.
void fetch_subdomains(const string &rest_api, const string &app_id, const string &api_key, const int &fetch_interval) {
    string url = rest_api + "/subdomain/all";
    unordered_map<string, string> headers_map = {
        {"Content-Type", "application/json"},
        {"x-app-id", app_id},
        {"x-api-key", api_key}
    };

    // Hilo que se ejecuta indefinidamente para obtener los subdominios.
    while (true) {
        // Enviar la solicitud HTTPS al Rest API y obtener la respuesta.
        memory_struct * response = send_https_request(url.c_str(), NULL, 0, headers_map);
        if (response && response->status_code == 200) {
            // Documento temporal para almacenar la respuesta JSON.
            Document temp;
            if (!temp.Parse(response->memory).HasParseError()) {
                // Si la respuesta es válida, intercambiar el objeto Document subdomains con el temporal.
                // Esto asegura que el objeto subdomains se actualice de manera segura en un entorno multihilo.
                unique_lock<shared_mutex> lock(subdomain_mutex);
                subdomains.Swap(temp);
                lock.unlock();

                // Escribir los subdominios. Para debugging.
                StringBuffer buffer;
                Writer<StringBuffer> writer(buffer);
                subdomains.Accept(writer);
                
                cout << "\033[1;34mSubdomains fetched successfully.\033[0m" << endl;
                cout << "\033[1;34mSubdomains: " << buffer.GetString() << "\033[0m" << endl;
                cout << "\033[1;34mResponse code: " << response->status_code << "\033[0m" << endl;
            } else {
                cout << "\033[1;34mFailed to parse JSON response.\033[0m" << endl;
            }
            free(response->memory);
            free(response);
            this_thread::sleep_for(chrono::minutes(fetch_interval));
        } else {
            cout << "\033[1;34mFailed to fetch subdomains. Status code: " << (response ? response->status_code : -1) << "\033[0m" << endl;
            this_thread::sleep_for(chrono::seconds(20));
        }
    }
}

string get_response(HttpRequest request){  
    string method = request.method;
    string uri = request.uri;
    // Check caches for requests
    Value httpRequestKey(kObjectType);
    

    // If not found, fetch the real domain or IP address
}

// Función para procesar una solicitud HTTP entrante.
void handle_http_request(const int client_socket, const string &rest_api, const string &app_id, const string &api_key) {
    cout << "Handling HTTP request on socket: " << client_socket << endl;
    // Buffer para almacenar la solicitud HTTP entrante.
    char * request_buffer = (char *) malloc(REQUEST_BUFFER_SIZE * sizeof(char));
    if (!request_buffer) {
        perror("malloc failed");
        close(client_socket);
        return;
    }
    // Variable para determinar si la conexión debe mantenerse viva.
    // Se establece con el header de Connection: keep-alive
    // Si no se encuentra el header, se cierra la conexión después de enviar la respuesta.
    bool keep_alive = false;
    do {
        // Recibir la solicitud HTTP del cliente.
        ssize_t bytes_received = recv(client_socket, request_buffer, REQUEST_BUFFER_SIZE - 1, 0);
        if (bytes_received > 0){
            request_buffer[bytes_received] = '\0'; // Null-terminate la request
            cout << "Received request: " << request_buffer << endl;

            // Parsear la HTTP request
            HttpRequest request;
            try {
                request = parse_http_request(request_buffer, bytes_received);
            } catch (const exception &e) {
                cerr << "Error parsing HTTP request: " << e.what() << endl;
                send_http_error_response(client_socket, "Bad Request", 400);
                close(client_socket);
                free(request_buffer);
                return;
            }
            if (request.headers["connection"] == "keep-alive") {
                cout << "Connection header: keep-alive\n";
                keep_alive = true;
            } else {
                keep_alive = false;
            }
            
            // Enviar respuesta HTTP 200 OK
            string response = "HTTP/1.1 200 OK\r\n"
                                "Content-Type: application/json\r\n"
                                "Content-Length: " + to_string(37) + "\r\n"
                                "\r\n" +
                                "{\"message\": \"Zonal cache is running\"}";
            send(client_socket, response.c_str(), response.size(), 0);
        } else {
            perror("recv failed\n");
            break;
        }
    } while (keep_alive);
    close(client_socket);
    free(request_buffer);
}
// Referencias para sockets:
// https://dev.to/jeffreythecoder/how-i-built-a-simple-http-server-from-scratch-using-c-739
// Para env variables:
// https://www.gnu.org/software/libc/manual/html_node/Environment-Access.html#:~:text=The%20value%20of%20an%20environment,accidentally%20use%20untrusted%20environment%20variables.

#ifndef UNIT_TEST

int main() {
    setvbuf(stdout, NULL, _IONBF, 0);
    // Leer variables de entorno
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
        }).detach();

    
    // Abrir socket para escuchar solicitudes HTTP
    int socket_fd;
    socket_fd = socket(AF_INET, SOCK_STREAM, 0);
    
    struct sockaddr_in server_addr;
    server_addr.sin_family = AF_INET;
    server_addr.sin_port = htons(HTTP_PORT); // HTTP port
    server_addr.sin_addr.s_addr = INADDR_ANY;

    if (bind(socket_fd, (struct sockaddr *) &server_addr, sizeof(server_addr)) < 0) {
        perror("Bind failed");
        close(socket_fd);
        return 1;
    }

    if (listen(socket_fd, 10) < 0) {
        perror("Listen failed");
        close(socket_fd);
        return 1;
    }

    cout << "Zonal cache is running on port " << HTTP_PORT << "...\n";

    // Inicialización CURL
    curl_global_init(CURL_GLOBAL_DEFAULT);

    while (1) {
        struct sockaddr_in client_addr;
        socklen_t client_len = sizeof(client_addr);
        
        // Aceptar conexiones entrantes
        int client_socket = accept(socket_fd, (struct sockaddr *)&client_addr, &client_len);
        if (client_socket < 0) {
            perror("Accept failed");
            continue;
        }

        // Crear un thread para manejar la solicitud HTTP
        thread([client_socket, &rest_api, &app_id, &api_key]() {
            handle_http_request(client_socket, rest_api, app_id, api_key);
        }).detach();
    }

    close(socket_fd);
    curl_global_cleanup();
    printf("Zonal cache stopped.\n");
    return 0;
}
#endif //UNIT_TEST