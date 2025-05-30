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
#include <iomanip>
#include <fstream>
#include <openssl/sha.h>
#include <iomanip>
#include <sstream>
#include <cerrno>
#include <cstring>
#include <vector>
#include <ctime>

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
shared_mutex cache_mutex;


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
        memory_struct * response = send_https_request(url.c_str(), NULL, 0, headers_map, true, "GET", false);
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

void cleanup_expired_cache(Document& cache, shared_mutex& cache_mutex) {
    while (true) {
        {
            // Acquire a shared lock for reading
            shared_lock<shared_mutex> read_lock(cache_mutex);

            // Get the current time
            auto now = chrono::system_clock::to_time_t(chrono::system_clock::now());
            string currentTimestamp = ctime(&now);
            currentTimestamp.pop_back(); // Remove the newline character

            // Iterate over the hosts in the cache
            for (auto host_itr = cache.MemberBegin(); host_itr != cache.MemberEnd(); ) {
                Value& hostObject = host_itr->value;

                // Iterate over the URIs for the current host
                for (auto uri_itr = hostObject.MemberBegin(); uri_itr != hostObject.MemberEnd(); ) {
                    Value& uriObj = uri_itr->value;

                    cout << "Checking cache entry: " << host_itr->name.GetString() << " -> " << uri_itr->name.GetString() << "\n";
                    
                    // Check if the TTL has expired
                    if (uriObj.HasMember("time_to_live") && uriObj["time_to_live"].IsString()) {
                        string ttlTimestamp = uriObj["time_to_live"].GetString();
                        if (ttlTimestamp <= currentTimestamp) {
                            // Release the shared lock and acquire a unique lock for writing
                            read_lock.unlock();
                            unique_lock<shared_mutex> write_lock(cache_mutex);

                            // Remove the expired URI
                            cout << "Removing expired cache entry: " << host_itr->name.GetString() << " -> " << uri_itr->name.GetString() << endl;
                            uriObj["filename"].SetNull();
                            uriObj["most_recent_use"].SetNull();
                            uriObj["received"].SetNull();
                            uriObj["time_to_live"].SetNull();
                            uri_itr = hostObject.RemoveMember(uri_itr);

                            // Release the write lock and reacquire the shared lock
                            write_lock.unlock();
                            read_lock.lock();
                            continue;
                        }
                    }
                    ++uri_itr;
                }

                // If the host has no more URIs, remove the host
                if (hostObject.MemberCount() == 0) {
                    // Release the shared lock and acquire a unique lock for writing
                    read_lock.unlock();
                    unique_lock<shared_mutex> write_lock(cache_mutex);

                    cout << "Removing empty host: " << host_itr->name.GetString() << endl;
                    host_itr = cache.RemoveMember(host_itr);

                    // Release the write lock and reacquire the shared lock
                    write_lock.unlock();
                    read_lock.lock();
                } else {
                    ++host_itr;
                }
            }
        }

        // Sleep for a short interval before checking again
        this_thread::sleep_for(chrono::seconds(30));
    }
}

// Función para extraer el token de las cookies de la solicitud HTTP.
string get_token_from_cookies(const std::string &cookies) {
    const string key = "token=";
    size_t pos = cookies.find(key);
    if (pos == string::npos) return "";

    // Revisar que sea el nombre de la cookie sea solo "token"
    if (pos > 0) {
        char sep = cookies[pos - 1];
        if (sep != ' ' && sep != ';') {
            // Revisar que no haya letras antes del nombre de la cookie
            return "";
        }
    }

    // Pasarse de token=
    pos += key.size();

    // Encontrar final de la cookie
    size_t end = cookies.find(';', pos);
    if (end == string::npos) {
        return cookies.substr(pos);
    } else {
        return cookies.substr(pos, end - pos);
    }
}

// Función que obtiene el valor de un query parameter de una URI.
string get_query_parameter(const string &uri, const string &param_name) {
    size_t start = uri.find(param_name + "=");
    if (start == string::npos) return "";

    start += param_name.length() + 1; // Mover al inicio del valor
    size_t end = uri.find('&', start);
    if (end == string::npos) {
        return uri.substr(start); // Hasta el final de la cadena
    } else {
        return uri.substr(start, end - start); // Entre el inicio y el siguiente '&'
    }
}

// Función que convierte un carácter hexadecimal a su valor numérico.
char from_hex(char ch) {
    if (ch >= '0' && ch <= '9') return ch - '0';
    if (ch >= 'a' && ch <= 'f') return ch - 'a' + 10;
    if (ch >= 'A' && ch <= 'F') return ch - 'A' + 10;
    return -1;
}

// Función para decodificar el URL
string url_decode(const string& encoded) {
    vector<char> decoded(encoded.length() + 1);
    char *dst = decoded.data();
    const char *src = encoded.c_str();
    char *dst_end = dst + decoded.size() - 1; // Campo para el terminador nulo
    
    while (*src && dst < dst_end) {
        if (*src == '%' && src[1] && src[2]) {
            // Si encuentra un %, intenta convertir los siguientes dos caracteres a un byte hexadecimal.
            char high = from_hex(src[1]);
            char low = from_hex(src[2]);
            if (high >= 0 && low >= 0) {
                *dst++ = (high << 4) | low;
                src += 3;
            } else {
                *dst++ = *src++; // Copiar como viene
            }
        } else if (*src == '+') {
            // Si encuentra un +, lo convierte a un espacio.
            *dst++ = ' ';
            src++;
        } else {
            // Copia el carácter
            *dst++ = *src++;
        }
    }
    *dst = '\0';
    return string(decoded.data());
}

// Función para codificar una cadena a URL encoding obtenida de:
// https://smolkit.com/blog/posts/how-to-url-encode-in-cpp/
std::string urlEncode(const std::string& str) {
    std::ostringstream encodedStream;
    encodedStream << std::hex << std::uppercase << std::setfill('0');

    for (char c : str) {
        if (std::isalnum(c) || c == '-' || c == '_' || c == '.' || c == '~') {
            // Caracteres que no necesitan codificación
            encodedStream << c;
        } else {
            // Caracteres que necesitan codificación
            // Se codifican como %XX, donde XX es el valor hexadecimal del carácter.
            encodedStream << '%' << std::setw(2) << static_cast<unsigned int>(static_cast<unsigned char>(c));
        }
    }

    return encodedStream.str();
}

// Referencia para SHA256 en C++: https://terminalroot.com/how-to-generate-sha256-hash-with-cpp-and-openssl/
string hashString(const string& input) {
    unsigned char hash[SHA256_DIGEST_LENGTH];
    SHA256((unsigned char*)input.c_str(), input.size(), hash);

    // Convert the hash to a hexadecimal string
    stringstream ss;
    for (int i = 0; i < SHA256_DIGEST_LENGTH; ++i) {
        ss << hex << setw(2) << setfill('0') << (int)hash[i];
    }
    return ss.str();
}

// Función que autentica una solicitud HTTP entrante.
bool authenticate_request(const int &client_socket, const HttpRequest &request, const string &rest_api, const string &app_id, const string &api_key, const string &vercel_ui, bool https = false) {
    auto host_it = request.headers.find("host");
    if (host_it != request.headers.end()) {
        cout << "\033[1;34mPRINT 1: Host header found: " << host_it->second << "\033[0m" << endl;
        // Obtener el host
        const string &host = host_it->second;
        shared_lock<shared_mutex> lock(subdomain_mutex);
        string authMethod;
        // Verificar si el host es un subdominio registrado en el objeto subdomains.
        if (subdomains.HasMember(host.c_str()) && subdomains[host.c_str()].IsObject()) {
            const Value& subdomain_obj = subdomains[host.c_str()];
            if (subdomain_obj.HasMember("authMethod") && subdomain_obj["authMethod"].IsString()) {
                // Obtener el método de autenticación del subdominio.
                authMethod = subdomain_obj["authMethod"].GetString();
            } else {
                cerr << "\033[1;31mAuth method not found in subdomain object.\033[0m" << endl;
                // Enviar respuesta HTTP 401 Unauthorized
                send_http_error_response(client_socket, "Not Found", 404);
                return false;
            }
        } else {
            cerr << "\033[1;31mSubdomain not found.\033[0m" << endl;
            // Enviar respuesta HTTP 401 Unauthorized
            send_http_error_response(client_socket, "Not Found", 404);
            return false;
        }
        lock.unlock();
        if (authMethod == "none") {
            // Si no hay autenticación, se permite la solicitud.
            return true;
        } else if (authMethod == "user-password") {
            // Si el método de autenticación es user-password, se verifica si hay un cookie con el token de autenticación.
            auto it = request.headers.find("cookie");
            if (it != request.headers.end()) {
                cout << "\033[1;34mPRINT 3: Cookie header found.\033[0m" << endl;
                const string &cookies = it->second;
                string token = get_token_from_cookies(cookies);
                if (!token.empty()) {
                    // Si se encuentra el token, se envía una solicitud al Rest API para validarlo.
                    string url = rest_api + "/auth/validate";
                    unordered_map<string, string> headers_map = {
                        {"Content-Type", "application/json"},
                        {"x-app-id", app_id},
                        {"x-api-key", api_key},
                        {"Cookie", "token=" + token}
                    };

                    // Enviar la solicitud HTTPS al Rest API y obtener la respuesta.
                    memory_struct * response = send_https_request(url.c_str(), NULL, 0, headers_map, true, "GET", false);
                    if (response && response->status_code == 200) {
                        // Si la respuesta es válida, se autentica la solicitud.
                        cout << "\033[1;32mRequest authenticated successfully.\033[0m" << endl;
                        free(response->memory);
                        free(response);
                        return true;
                    }
                    free(response->memory);
                    free(response);
                }
            } else if (request.request.uri.find("/_auth/callback") != string::npos) {
                cout << "\033[1;34mPRINT 2: Auth callback found in URI.\033[0m" << endl;
                string token = get_query_parameter(request.request.uri, "token");
                string next = url_decode(get_query_parameter(request.request.uri, "next"));
                string exp = get_query_parameter(request.request.uri, "exp");
                cout << "Token: " << token << endl;
                cout << "Next: " << next << endl;
                cout << "Exp: " << exp << endl;
                // Enviar la respuesta con el Cookie al cliente por el socket.
                string response = "HTTP/1.1 302 Found\r\n"
                                "Location: " + next + "\r\n"
                                "Set-Cookie: token=" + token + "; HttpOnly; SameSite=Lax; Path=/; Max-Age=" + exp + "\r\n"
                                "Connection: close\r\n"
                                "Content-Length: 0\r\n"
                                "\r\n";
                cout << "\033[1;34mPRINT 2.5: \033[0m" << response << endl;
                send(client_socket, response.c_str(), response.size(), 0);
                return false;
            }
            // Hay que autenticar. Se redirige al usuario a la página de login.
            string scheme = https ? "https://" : "http://";
            string url = scheme + host + request.request.uri;
            string url_encoded = urlEncode(url);
            string redirect_url = vercel_ui + "/login?subdomain=" + url_encoded + "&authMethod=" + authMethod;
            string response = "HTTP/1.1 302 Found\r\n"
                                "Location: " + redirect_url + "\r\n"
                                "Connection: close\r\n"
                                "Content-Length: 0\r\n"
                                "\r\n";
            send(client_socket, response.c_str(), response.size(), 0);
            return false;
        } else if (authMethod == "api-keys") {
            auto it = request.headers.find("x-api-key");
            if (it != request.headers.end()) {
                const string &api_key = it->second;
                string url = rest_api + "/auth/validate";
                unordered_map<string, string> headers_map = {
                    {"Content-Type", "application/json"},
                    {"x-app-id", app_id},
                    {"x-api-key", api_key}
                };

                // Enviar la solicitud HTTPS al Rest API y obtener la respuesta.
                memory_struct * response = send_https_request(url.c_str(), api_key.c_str(), api_key.length(), headers_map, true, request.request.method.c_str(), false);
                if (response && response->status_code == 200) {
                    // Si la respuesta es válida, se autentica la solicitud.
                    cout << "\033[1;32mRequest authenticated successfully.\033[0m" << endl;
                    free(response->memory);
                    free(response);
                    return true;
                } else {
                    cerr << "\033[1;31mAuthentication failed with API key.\033[0m" << endl;
                    // Enviar respuesta HTTP 401 Unauthorized
                    send_http_error_response(client_socket, "Unauthorized", 401);
                    free(response->memory);
                    free(response);
                    return false;
                }
            } else {
                cerr << "\033[1;31mAPI key not found in request headers.\033[0m" << endl;
                // Enviar respuesta HTTP 401 Unauthorized
                send_http_error_response(client_socket, "Unauthorized", 401);
                return false;
            }
        } else {
            cerr << "\033[1;31mUnknown authentication method: " << authMethod << "\033[0m" << endl;
            // Enviar respuesta HTTP 500 Internal Server Error
            send_http_error_response(client_socket, "Internal Server Error", 500);
            return false;
        }
    } 
    cerr << "\033[1;31mHost not found.\033[0m" << endl;
    // Enviar respuesta HTTP 401 Unauthorized
    send_http_error_response(client_socket, "Bad Request", 400);
    return false;
}

string replacementPolicies(Value& hostObject, shared_mutex& cache_mutex, const string& replacementPolicy) {
    string keyToDelete;

    if (replacementPolicy == "LRU") {
        // Implement LRU logic here
        cout << "Implementing LRU replacement policy." << endl;
        string leastRecentlyUsedTime;
        time_t oldestTime = std::numeric_limits<time_t>::max();

        // Iterate through each URI object in the host
        for (auto itr = hostObject.MemberBegin(); itr != hostObject.MemberEnd(); ++itr) {
            Value& uriObj = itr->value;

            string mostRecentUse = uriObj["most_recent_use"].GetString();

            // Convert the "most_recent_use" string to a time_t
            struct tm tm;
            if (strptime(mostRecentUse.c_str(), "%a %b %d %H:%M:%S %Y", &tm)) {
                time_t mostRecentUseTime = mktime(&tm);

                // Update the least recently used entry
                if (mostRecentUseTime < oldestTime) {
                    oldestTime = mostRecentUseTime;
                    keyToDelete = itr->name.GetString();
                    leastRecentlyUsedTime = mostRecentUse;
                }
            }
        }
    } else if (replacementPolicy == "LFU") {
        // Implement LFU logic here
        cout << "Implementing LFU replacement policy." << endl;
        string leastFrequentlyUsedKey;
        int leastUsedCount = std::numeric_limits<int>::max();

        // Iterate through each URI object in the host
        for (auto itr = hostObject.MemberBegin(); itr != hostObject.MemberEnd(); ++itr) {
            Value& uriObj = itr->value;

            int timesUsed = uriObj["times_used"].GetInt();

            // Update the least frequently used entry
            if (timesUsed < leastUsedCount) {
                leastUsedCount = timesUsed;
                leastFrequentlyUsedKey = itr->name.GetString();
            }
        }
    } else if (replacementPolicy == "FIFO") {
        // Implement FIFO logic here
        cout << "Implementing FIFO replacement policy." << endl;
        string firstInTime;
        time_t oldestTime = std::numeric_limits<time_t>::max();

        // Iterate through each URI object in the host
        for (auto itr = hostObject.MemberBegin(); itr != hostObject.MemberEnd(); ++itr) {
            Value& uriObj = itr->value;

            string received = uriObj["received"].GetString();

            // Convert the "most_recent_use" string to a time_t
            struct tm tm;
            if (strptime(received.c_str(), "%a %b %d %H:%M:%S %Y", &tm)) {
                time_t receivedTime = mktime(&tm);

                // 
                if (receivedTime < oldestTime) {
                    oldestTime = receivedTime;
                    keyToDelete = itr->name.GetString();
                    firstInTime = received;
                }
            }
        }
    } else if (replacementPolicy == "MRU") {
        // Implement MRU logic here
        cout << "Implementing MRU replacement policy." << endl;
        string mostRecentlyUsedTime;
        time_t earliestTime = std::numeric_limits<time_t>::min();

        // Iterate through each URI object in the host
        for (auto itr = hostObject.MemberBegin(); itr != hostObject.MemberEnd(); ++itr) {
            Value& uriObj = itr->value;

            string mostRecentUse = uriObj["most_recent_use"].GetString();

            // Convert the "most_recent_use" string to a time_t
            struct tm tm;
            if (strptime(mostRecentUse.c_str(), "%a %b %d %H:%M:%S %Y", &tm)) {
                time_t mostRecentUseTime = mktime(&tm);

                // Update the least recently used entry
                if (mostRecentUseTime > earliestTime) {
                    earliestTime = mostRecentUseTime;
                    keyToDelete = itr->name.GetString();
                    mostRecentlyUsedTime = mostRecentUse;
                }
            }
        }
    } else if (replacementPolicy == "Random") {
        // Implement Random replacement logic here
        cout << "Implementing Random replacement policy." << endl;
        if (hostObject.MemberCount() == 0) {
            cout << "No URIs to remove in the host object." << endl;
            return "";
        }

        // Generate a random index
        size_t randomIndex = rand() % hostObject.MemberCount();

        // Iterate to the random index
        auto itr = hostObject.MemberBegin();
        std::advance(itr, randomIndex);

        // Get the key of the random URI
        string keyToDelete = itr->name.GetString();
    } 
    return keyToDelete;
}

// 
void add_to_cache_by_host(const string& host, const string& key, const string& filename, size_t size) {
    // Acquire a unique lock for writing to the cache
     shared_lock<shared_mutex> read_lock(subdomain_mutex);

    // Check if the host exists in the subdomains

    const Value& sub_domain_object = subdomains[host.c_str()];

    // Read the ttl field
    int ttl = sub_domain_object["ttl"].GetInt();
    cout << "TTL for host " << host << ": " << ttl << endl;

    // Read the cacheSize field
    int cacheSize = sub_domain_object["cacheSize"].GetUint64();
    cout << "Cache size for host " << host << ": " << cacheSize << endl;

    // Read replacement policy
    string replacementPolicy = sub_domain_object["replacementPolicy"].GetString();

    read_lock.unlock();
    

    unique_lock<shared_mutex> write_lock(cache_mutex);

    Document::AllocatorType& allocator = cache.GetAllocator();

    // Check if the host exists in the cache
    if (!cache.HasMember(host.c_str())) {
        // Create a new host object if it doesn't exist
        Value hostObj(kObjectType);
        // Add size field to the host object
        hostObj.AddMember("size", Value().SetUint64(0), allocator); // Initialize size to 0
        cache.AddMember(Value().SetString(host.c_str(), allocator), hostObj, allocator);
    }

    // Get the host object
    Value& hostObject = cache[host.c_str()];
    
    auto hostSize = hostObject["size"].GetUint64();
    string received = "";
    int times_used = 0;
    // Check if the URI Key exists for this host
    if (!hostObject.HasMember(key.c_str())) {
        // Si el URI ya existe, se borra para actualizarlo
        Value& oldUriObj = hostObject[key.c_str()];
        received = oldUriObj["received"].GetString();
        times_used = oldUriObj["times_used"].GetInt();
        hostSize -= oldUriObj["size"].GetUint64();
        oldUriObj["filename"].SetNull();
        oldUriObj["most_recent_use"].SetNull();
        oldUriObj["received"].SetNull();
        oldUriObj["time_to_live"].SetNull();
        hostObject.RemoveMember(key.c_str());
    }

    while (hostSize + size > sub_domain_object["cacheSize"].GetUint64()) {
        // Se intenta eliminar el contenido con base en la replacement policy.
        // "LFU", "FIFO", "MRU", "Random"

        string keyToDelete = replacementPolicies(hostObject, cache_mutex, replacementPolicy);

        if (!keyToDelete.empty()) {
            cout << "Least recently used URI: " << keyToDelete << endl;
            hostSize -= hostObject[keyToDelete.c_str()]["size"].GetUint64();
            Value& uriObj = hostObject[keyToDelete.c_str()];
            uriObj["filename"].SetNull();
            uriObj["most_recent_use"].SetNull();
            uriObj["received"].SetNull();
            uriObj["time_to_live"].SetNull();
            hostObject.RemoveMember(keyToDelete.c_str());
        } else {
            cout << "Could not remove key to add space. " << host << endl;
            return;
        }    
    }

    // Create a new URI object if it doesn't exist
    Value uriObj(kObjectType);

    // Add fields to the URI object
    auto nowTime = chrono::system_clock::now();
    auto now = chrono::system_clock::to_time_t(nowTime);
    string currentTimestamp = ctime(&now);
    currentTimestamp.pop_back(); // Remove the newline character

    // Calculate the time-to-live (TTL) as 1 hour from now
    auto ttl_time_point = nowTime + chrono::milliseconds(ttl); // Add milliseconds to the time_point
    auto ttl_time_t = chrono::system_clock::to_time_t(ttl_time_point); // Convert to time_t
    string ttlTimestamp = ctime(&ttl_time_t);
    ttlTimestamp.pop_back();

    if (received.empty()) {
        received = currentTimestamp; // If no previous received time, use current time
    }
    uriObj.AddMember("received", Value().SetString(received.c_str(), allocator), allocator);
    uriObj.AddMember("most_recent_use", Value().SetString(currentTimestamp.c_str(), allocator), allocator);
    uriObj.AddMember("times_used", Value().SetInt(times_used), allocator);
    uriObj.AddMember("time_to_live", Value().SetString(ttlTimestamp.c_str(), allocator), allocator);
    uriObj.AddMember("filename", Value().SetString(filename.c_str(), allocator), allocator);
    uriObj.AddMember("size", Value().SetUint64(size), allocator);

    // Add the URI object to the host object
    hostObject.AddMember(Value().SetString(key.c_str(), allocator), uriObj, allocator);
    hostObject["size"].SetUint64(hostSize + size); // Update the size field of the host object
}

bool get_response(const int &client_socket, HttpRequest request ){
    if (cache.HasMember(request.headers.at("host").c_str())) {

        Value& host_object = cache[request.headers["host"].c_str()];
        cout << "Host object found in cache." << endl;
        cout << "Request URI: " << request.request.method << request.request.uri << endl;
        
        if (host_object.HasMember((request.request.method + "-" + request.request.uri).c_str())) {
            cout << "URI object found in cache." << endl;
            Value& entry = host_object[(request.request.method + "-" + request.request.uri).c_str()];
            
            // Revisar la cache para ver si el request está en el cache.
                
            string filepath = "sub_domain_caches/" + request.headers["host"] + "/" + entry["filename"].GetString();
            ifstream file(filepath, ios::binary | ios::ate);
            
            if (!file.is_open()) {
                cerr << "Failed to open file: " << filepath << endl;
                if (file.fail()) {
                    cerr << "File stream failed. Possible reasons: file does not exist, insufficient permissions, or invalid path." << endl;
                }
                cerr << "Error: " << strerror(errno) << endl; // Prints the specific error message
                return false;
            }

            streamsize size = file.tellg();
            file.seekg(0, ios::beg);

            vector<char> content(size);
            
            if (file.read(content.data(), size)) {
                cout << "Se pudieron leer " << size << " bytes de " << filepath << endl;
                // Check if the entry is still valid based on time_to_live
                auto now = chrono::system_clock::to_time_t(chrono::system_clock::now());
                string currentTimestamp = ctime(&now);
                currentTimestamp.pop_back(); // Remove the newline character
                
                Document::AllocatorType& allocator = cache.GetAllocator();
                // Update the most_recent_use field
                entry["most_recent_use"].SetString(currentTimestamp.c_str(), allocator);

                // Increment the times_used field
                if (entry.HasMember("times_used") && entry["times_used"].IsInt()) {
                    entry["times_used"].SetInt(entry["times_used"].GetInt() + 1);
                } else {
                    // If times_used doesn't exist or is not an integer, initialize it
                    entry.AddMember("times_used", 1, allocator);
                }
                send(client_socket, content.data(), size, 0);
                return true;
            } else {
                cerr << "Failed to read cache file: " << filepath << endl;
                return false;
            }
            
        } 
    }
    string destination;
    bool https;
    vector<string> file_types;
    {
        shared_lock<shared_mutex> lock(subdomain_mutex);
        const Value& subdomain_obj = subdomains[request.headers.at("host").c_str()];
        if (subdomain_obj.HasMember("destination") && subdomain_obj["destination"].IsString()) {
            destination = subdomain_obj["destination"].GetString();
            https = subdomain_obj["https"].GetBool();
            file_types.clear();
            for (const auto& file_type : subdomain_obj["fileTypes"].GetArray()) {
                if (file_type.IsString()) {
                    file_types.push_back(file_type.GetString());
                }
            }
        }
    }
    

    // Si no está en el cache, se hace una solicitud al destino.
    string url = destination + request.request.uri;
    cout << "Fetching from URL: " << url << endl;
    
    memory_struct * response = send_https_request(url, request.request.content.data(), request.request.content.size(), request.headers, https, request.request.method, true);
    if (response) {
        HttpResponse http_response = parse_http_response(response->memory, response->size);
        auto it = http_response.headers.find("Content-Type");
        if (it != http_response.headers.end()) {
            string content_type_header = it->second;
            cout << "Content-Type: " << content_type_header << endl;
            size_t pos = content_type_header.find(';');
            string content_type = content_type_header.substr(0, pos); // Extraer el content_type antes del punto y coma
            content_type.erase(remove_if(content_type.begin(), content_type.end(), ::isspace), content_type.end()); // Quitar espacios

            // Verificar si el Content-Type es uno de los tipos de archivo permitidos.
            bool is_allowed = false;
            for (const auto& file_type : file_types) {
                if (content_type == file_type) {
                    is_allowed = true;
                    break;
                }
            }
            is_allowed = false;
            // Si el Content-Type es permitido, se guarda la respuesta en el cache.
            if (is_allowed) {
                cout << "Content-Type is allowed." << endl;
                // Guardar la respuesta en el cache.
                string filename = hashString(url + to_string(time(nullptr))) + ".ksh";
                ofstream out_file("sub_domains_caches/" + filename, ios::binary);
                if (out_file) {
                    out_file.write(response->memory, response->size);
                    out_file.close();
                    cout << "Response saved to cache as: " << filename << endl;

                    // Agregar a la cache
                    add_to_cache_by_host(request.headers.at("host"), request.request.method + "-" + request.request.uri, filename, response->size);
                } else {
                    cerr << "Failed to open cache file for writing." << endl;
                }
            } else {
                cerr << "Content-Type not allowed: " << content_type << endl;
            }
        } else {
            cerr << "Content-Type header not found in response." << endl;
        }
        send(client_socket, response->memory, response->size, 0);
        free(response->memory);
        free(response);
        return true;
    }
    return false;
}

// Función para procesar una solicitud HTTP entrante.
void handle_http_request(const int client_socket, const string &rest_api, const string &app_id, const string &api_key, const string &vercel_ui) {
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
                break;
            }
            bool authenticated = authenticate_request(client_socket, request, rest_api, app_id, api_key, vercel_ui, false);
            if (!authenticated) {
                // Si no está autenticado, salir, porque la respuesta ya se envió.
                break;
            }

            const bool set_response = get_response(client_socket, request);
            if (!set_response) {
                // Si no se pudo obtener la respuesta, enviar un error.
                send_http_error_response(client_socket, "Internal Server Error", 500);
                break;
            }
            if (request.request.keepAlive) {
                cout << "Connection header: keep-alive\n";
                keep_alive = true;
            } else {
                keep_alive = false;
            }
            
            // // Enviar respuesta HTTP 200 OK
            // string response = "HTTP/1.1 200 OK\r\n"
            //                     "Content-Type: application/json\r\n"
            //                     "Content-Length: " + to_string(37) + "\r\n"
            //                     "\r\n" +
            //                     "{\"message\": \"Zonal cache is running\"}";
            // send(client_socket, response.c_str(), response.size(), 0);
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
    const char * vercel_ui_env = getenv("VERCEL_UI");
    if (!rest_api_env || !app_id_env || !api_key_env || !vercel_ui_env) {
        std::cerr << "Environment variables REST_API, APP_ID, API_KEY, and VERCEL_UI must be set\n";
        return 1;
    }

    cache.SetObject();
    
    const string rest_api(rest_api_env);
    const string app_id(app_id_env);
    const string api_key(api_key_env);
    const string vercel_ui(vercel_ui_env);

    // Crear un thread para obtener los subdominios
    thread([&rest_api, &app_id, &api_key, fetch_interval]() {
            fetch_subdomains(rest_api, app_id, api_key, fetch_interval);
        }).detach();

    // Crea un thread que revisa la cache y elimina los objetos expirados.
    thread(cleanup_expired_cache, ref(cache), ref(subdomain_mutex)).detach();
    
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
        thread([client_socket, &rest_api, &app_id, &api_key, &vercel_ui]() {
            handle_http_request(client_socket, rest_api, app_id, api_key, vercel_ui);
        }).detach();
    }

    close(socket_fd);
    curl_global_cleanup();
    printf("Zonal cache stopped.\n");
    return 0;
}
#endif //UNIT_TEST