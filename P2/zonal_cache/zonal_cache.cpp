#include <iostream>
#include <string>
#include <stdlib.h>
#include <unistd.h>
#include <sys/socket.h>
#include <sys/types.h>
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
#include <filesystem>
#include <openssl/ssl.h>
#include <openssl/err.h>

using namespace std;
using namespace rapidjson;

#define HTTP_PORT 80
#define HTTPS_PORT 443
#define REQUEST_BUFFER_SIZE 8192
#define CACHE_FOLDER "subdomain_caches/"
// Referencias para threads:
// https://cplusplus.com/reference/thread/thread/

Document subdomains;
// Referencias para concurrencia con lock de lectura compartida:
// https://en.cppreference.com/w/cpp/thread/shared_mutex
shared_mutex subdomain_mutex;

Document wildcards;
shared_mutex wildcard_mutex;

Document cache;
shared_mutex cache_mutex;


// Función que obtiene los subdominios desde el Rest API y los almacena en un objeto Document de RapidJSON.
// Recibe las variables de entorno REST_API, APP_ID, API_KEY y FETCH_INTERVAL.
// Referencia para texto colorido: https://www.geeksforgeeks.org/how-to-print-colored-text-to-the-linux-terminal/
void fetch_subdomains(const string &rest_api, const string &app_id, const string &api_key, const int &fetch_interval) {
    string url = rest_api + "/subdomain/all";
    string url_wildcards = rest_api + "/subdomain/wildcards";
    unordered_map<string, string> headers_map = {
        {"Content-Type", "application/json"},
        {"x-app-id", app_id},
        {"x-api-key", api_key}
    };

    // Hilo que se ejecuta indefinidamente para obtener los subdominios.
    while (true) {
        // Enviar la solicitud HTTPS al Rest API y obtener la respuesta.
        memory_struct * response = send_https_request(url.c_str(), NULL, 0, headers_map, true, "GET", false);
        if (response) {
            if (response->status_code == 200) {
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
                } else {
                    cout << "\033[1;34mFailed to parse JSON response.\033[0m" << endl;
                }
            }
            delete response; // Liberar la memoria de la respuesta.
            
        } else {
            cout << "\033[1;34mFailed to fetch subdomains. Status code: " << (response ? response->status_code : -1) << "\033[0m" << endl;
            this_thread::sleep_for(chrono::seconds(20));
            continue;
        }
        memory_struct * response_wildcards = send_https_request(url_wildcards.c_str(), NULL, 0, headers_map, true, "GET", false);
        if (response_wildcards) {
            if (response_wildcards->status_code == 200) {
                // Documento temporal para almacenar la respuesta JSON de wildcards.
                Document temp_wildcards;
                if (!temp_wildcards.Parse(response_wildcards->memory).HasParseError()) {
                    // Si la respuesta es válida, intercambiar el objeto Document wildcards con el temporal.
                    unique_lock<shared_mutex> lock(wildcard_mutex);
                    wildcards.Swap(temp_wildcards);
                    lock.unlock();

                    // Escribir los wildcards. Para debugging.
                    StringBuffer buffer;
                    Writer<StringBuffer> writer(buffer);
                    wildcards.Accept(writer);
                    
                    cout << "\033[1;35mWildcards fetched successfully.\033[0m" << endl;
                    cout << "\033[1;35mWildcards: " << buffer.GetString() << "\033[0m" << endl;
                } else {
                    cout << "\033[1;35mFailed to parse JSON response for wildcards.\033[0m" << endl;
                }
            }
            delete response_wildcards; // Liberar la memoria de la respuesta.
        } else {
            cout << "\033[1;34mFailed to fetch wildcards. Status code: " << (response_wildcards ? response_wildcards->status_code : -1) << "\033[0m" << endl;
            this_thread::sleep_for(chrono::seconds(20));
            continue;
        }
        this_thread::sleep_for(chrono::minutes(fetch_interval));
    }
}

string check_wildcard(const string &subdomain) {
    size_t length = 0;
    string response;
    // Iterar sobre los wildcards
    for (auto wildcard_itr = wildcards.MemberBegin(); wildcard_itr != wildcards.MemberEnd(); ++wildcard_itr) {
        const string wildcard_str = wildcard_itr->name.GetString();
        // Verificar si el subdominio termina con el wildcard
        if (subdomain.ends_with("." + wildcard_str)) {
            // Si el wildcard es más largo que el actual, actualizar la longitud
            if (wildcard_str.length() > length) {
                length = wildcard_str.length();
                response = wildcard_str;
            }
            // Retornar el wildcard encontrado
            return wildcard_str;
        }
    }
    return "";
}
// Función de garbage collection que limpia la caché de subdominios de TTLs expirados.
// Esta función se ejecuta en un hilo separado y limpia la cache cada 30 segundos.
void cleanup_expired_cache(Document& cache, shared_mutex& cache_mutex) {
    while (true) {
        {
            // Adquirir un bloqueo compartido para leer la caché
            shared_lock<shared_mutex> read_lock(cache_mutex);

            // Tiempo actual
            auto now = chrono::system_clock::to_time_t(chrono::system_clock::now());
            string currentTimestamp = ctime(&now);
            currentTimestamp.pop_back(); // Eliminar cambio de línea al final de la cadena

            // Iterar por los hosts en la caché
            for (auto host_itr = cache.MemberBegin(); host_itr != cache.MemberEnd(); ) {
                Value& host_object = host_itr->value;
                const string host = host_itr->name.GetString();
                Value& requests_object = host_object["requests"];
                // Iterar por las URIs cacheadas para el host
                for (auto uri_itr = requests_object.MemberBegin(); uri_itr != requests_object.MemberEnd(); ) {
                    Value& uri_obj = uri_itr->value;
                
                    cout << "\033[1;31mChecking cache entry: " << host_itr->name.GetString() << " -> " << uri_itr->name.GetString() << "\033[0m\n";
                    
                    // Revisar si el TTL ya expiró
                    if (uri_obj.HasMember("time_to_live") && uri_obj["time_to_live"].IsString()) {
                        string ttl_timestamp = uri_obj["time_to_live"].GetString();
                        if (ttl_timestamp <= currentTimestamp) {
                            // Liberar el bloqueo de lectura antes de escribir
                            read_lock.unlock();
                            unique_lock<shared_mutex> write_lock(cache_mutex);
                            // Eliminar la entrada de caché expirada
                            filesystem::remove(CACHE_FOLDER + host + "/" + uri_obj["filename"].GetString());
                            uri_obj["filename"].SetNull();
                            uri_obj["most_recent_use"].SetNull();
                            uri_obj["received"].SetNull();
                            uri_obj["time_to_live"].SetNull();
                            uri_itr = requests_object.RemoveMember(uri_itr);
                            cout << "\033[1;31mRemoved expired cache entry: " << host_itr->name.GetString() << " -> " << uri_itr->name.GetString() << "\033[0m" << endl;
                            // Liberar los bloqueos.
                            write_lock.unlock();
                            read_lock.lock();
                            continue;
                        }
                    }
                    ++uri_itr;
                }

                // Si el host no tiene URIs cacheadas, eliminar el host de la caché.
                if (host_object.MemberCount() == 0) {
                    // Liberar el bloqueo de lectura antes de escribir
                    read_lock.unlock();
                    unique_lock<shared_mutex> write_lock(cache_mutex);

                    cout << "\033[1;31mRemoving empty host: " << host_itr->name.GetString() << "\033[0m" << endl;
                    host_itr = cache.RemoveMember(host_itr);

                    write_lock.unlock();
                    read_lock.lock();
                } else {
                    ++host_itr;
                }
            }
        }
        cout << flush;
        // Dormir durante 30 segundos antes de la próxima limpieza.
        this_thread::sleep_for(chrono::seconds(10));
    }
}

// Función para extraer la información de un subdominio o wildcard para el manejo de una solicitud HTTP.
bool get_subdomain_info(subdomain_info &info, const string &host) {
    shared_lock<shared_mutex> lock(subdomain_mutex);
    string destination;
    bool https;
    vector<string> file_types;
    if (subdomains.HasMember(host.c_str())) {
        const Value& subdomain_obj = subdomains[host.c_str()];
        if (subdomain_obj.HasMember("destination") && subdomain_obj["destination"].IsString()) {
            destination = subdomain_obj["destination"].GetString();
            https = subdomain_obj["https"].GetBool();
            file_types.clear();
            for (const auto& file_type : subdomain_obj["fileTypes"].GetArray()) {
                if (file_type.IsString()) {
                    file_types.push_back(file_type.GetString());
                }
            }
            info.auth_method = subdomain_obj.HasMember("authMethod") && subdomain_obj["authMethod"].IsString() ? subdomain_obj["authMethod"].GetString() : "none";
            info.destination = destination;
            info.https = https;
            info.file_types = file_types;
            info.cache_size = subdomain_obj.HasMember("cacheSize") && subdomain_obj["cacheSize"].IsUint64() ? subdomain_obj["cacheSize"].GetUint64() : 0;
            info.ttl = subdomain_obj.HasMember("ttl") && subdomain_obj["ttl"].IsInt() ? subdomain_obj["ttl"].GetInt() : 0;
            info.replacement_policy = subdomain_obj.HasMember("replacementPolicy") && subdomain_obj["replacementPolicy"].IsString() ? subdomain_obj["replacementPolicy"].GetString() : "LRU";
            return true;
        }
        return false;
    } else {
        lock.unlock();
        shared_lock<shared_mutex> lock(wildcard_mutex);
        const string wildcard = check_wildcard(host);
        if (!wildcard.empty()){
            cout << "\033[0;35mWildcard found: " << wildcard << "\033[0m" << endl;
            const Value& wildcard_obj = wildcards[wildcard.c_str()];
            if (wildcard_obj.HasMember("destination") && wildcard_obj["destination"].IsString()) {
                destination = wildcard_obj["destination"].GetString();
                https = wildcard_obj["https"].GetBool();
                file_types.clear();
                for (const auto& file_type : wildcard_obj["fileTypes"].GetArray()) {
                    if (file_type.IsString()) {
                        file_types.push_back(file_type.GetString());
                    }
                }
                info.auth_method = wildcard_obj.HasMember("authMethod") && wildcard_obj["authMethod"].IsString() ? wildcard_obj["authMethod"].GetString() : "none";
                info.destination = destination;
                info.https = https;
                info.file_types = file_types;
                info.cache_size = wildcard_obj.HasMember("cacheSize") && wildcard_obj["cacheSize"].IsUint64() ? wildcard_obj["cacheSize"].GetUint64() : 0;
                info.ttl = wildcard_obj.HasMember("ttl") && wildcard_obj["ttl"].IsInt() ? wildcard_obj["ttl"].GetInt() : 0;
                info.replacement_policy = wildcard_obj.HasMember("replacementPolicy") && wildcard_obj["replacementPolicy"].IsString() ? wildcard_obj["replacementPolicy"].GetString() : "LRU";
                info.wildcard = wildcard;
                return true;
            }
        }
    }
    return false;
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
std::string url_encode(const std::string& str) {
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
string hash_string(const string& input) {
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
bool authenticate_request(const int &client_socket, const HttpRequest &request, subdomain_info &info, const string &rest_api, const string &app_id, const string &api_key, const string &vercel_ui, bool https, const bool is_ssl, SSL* ssl) {
    auto host_it = request.headers.find("host");
    if (host_it != request.headers.end()) {
        cout << "\033[1;36mSTEP 1: Host header found: " << host_it->second << "\033[0m" << endl;
        // Obtener el host
        const string &host = host_it->second;
        // Verificar si el host es un subdominio registrado en el objeto subdomains.
        // Se guarda el resultado en el objeto info.
        bool exists = get_subdomain_info(info, host);
        if (!exists) {
            cerr << "\033[1;31mSubdomain not found.\033[0m" << endl;
            // Enviar respuesta HTTP 401 Unauthorized
            send_http_error_response(client_socket, "Not Found", 404, is_ssl, ssl);
            return false;
        }
        string auth_method = info.auth_method;
        string wildcard = info.wildcard;
        cout << "\033[1;36mSTEP 1: Auth method found: " << auth_method << "\033[0m" << endl;
        if (auth_method == "none") {
            // Si no hay autenticación, se permite la solicitud.
            return true;
        } else if (auth_method == "user-password") {
            // Si el método de autenticación es user-password, se verifica si hay un cookie con el token de autenticación.
            auto it = request.headers.find("cookie");
            if (it != request.headers.end()) {
                const string &cookies = it->second;
                string token = get_token_from_cookies(cookies);
                if (!token.empty()) {
                    cout << "\033[1;36mSTEP 3: Token Cookie found.\033[0m" << endl;
                    // Paso 3: Si se encuentra el token, se envía una solicitud al Rest API para validarlo.
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
                        cout << "\033[1;32mSTEP 4: Request authenticated successfully.\033[0m" << endl << flush;
                        delete response;
                        return true;
                    }
                    delete response;
                }
            }
            // Paso 2: Si no se encuentra el token, se verifica si hay un query parameter "token" en la URI.
            // Este viene en el callback de autenticación _auth/callback.
            if (request.request.uri.find("/_auth/callback") != string::npos) {
                cout << "\033[1;36mSTEP 2: Auth callback found in URI.\033[0m" << endl;
                string token = get_query_parameter(request.request.uri, "token");
                string next = url_decode(get_query_parameter(request.request.uri, "next"));
                string exp = get_query_parameter(request.request.uri, "exp");
                cout << "\033[1;36mToken: " << token << "\033[0m" << endl;
                cout << "\033[1;36mNext: " << next << "\033[0m" << endl;
                cout << "\033[1;36mExp: " << exp << "\033[0m" <<endl;
                // Enviar la respuesta con el Cookie al cliente por el socket.
                string response = "HTTP/1.1 302 Found\r\n"
                                "Location: " + next + "\r\n"
                                "Set-Cookie: token=" + token + "; HttpOnly; SameSite=Lax; Path=/; Max-Age=" + exp + "\r\n"
                                "Connection: close\r\n"
                                "Content-Length: 0\r\n"
                                "\r\n";
                cout << "\033[1;36mSTEP 2: \033[0m" << response << endl;
                send_http_response(client_socket, response.c_str(), response.size(), is_ssl, ssl);
                return false;
            }
            // Paso 1: Hay que autenticar. Se redirige al usuario a la página de login.
            string scheme = https ? "https://" : "http://";
            string url = scheme + host + request.request.uri;
            string url_encoded = url_encode(url);
            string redirect_url = vercel_ui + "/login?subdomain=" + url_encoded + "&authMethod=" + auth_method + (!wildcard.empty() ? ("&wildcard=" + url_encode(wildcard)) : "");
            string response = "HTTP/1.1 302 Found\r\n"
                                "Location: " + redirect_url + "\r\n"
                                "Connection: close\r\n"
                                "Content-Length: 0\r\n"
                                "\r\n";
            cout << "\033[1;36mSTEP 1: Redirecting to login page: " << redirect_url << "\033[0m" << endl;
            send_http_response(client_socket, response.c_str(), response.size(), is_ssl, ssl);
            return false;
        } else if (auth_method == "api-keys") {
            // Si el método de autenticación es api-keys, se verifica si hay un header "x-api-key" en la solicitud.
            auto it = request.headers.find("x-api-key");
            if (it != request.headers.end()) {
                const string auth_api_key = "{\"apiKey\": \"" + it->second + "\", \"subdomain\": \"" + host + (!wildcard.empty() ? ("\", \"wildcard\": \"" + wildcard) : "") +"\"}";
                string url = rest_api + "/auth/validate/apikey";
                unordered_map<string, string> headers_map = {
                    {"Content-Type", "application/json"},
                    {"x-app-id", app_id},
                    {"x-api-key", api_key}
                };

                // Enviar la solicitud HTTPS al Rest API y obtener la respuesta.
                memory_struct * response = send_https_request(url.c_str(), auth_api_key.c_str(), auth_api_key.length(), headers_map, true, "POST", false);
                if (response && response->status_code == 200) {
                    // Si la respuesta es válida, se autentica la solicitud.
                    cout << "\033[1;32mRequest authenticated successfully.\033[0m" << endl;
                    delete response;
                    return true;
                } else {
                    cerr << "\033[1;31mAuthentication failed with API key.\033[0m" << endl;
                    // Enviar respuesta HTTP 401 Unauthorized
                    send_http_error_response(client_socket, "Unauthorized", 401, is_ssl, ssl);
                    delete response;
                    return false;
                }
            } else {
                cerr << "\033[1;31mAPI key not found in request headers.\033[0m" << endl;
                // Enviar respuesta HTTP 401 Unauthorized
                send_http_error_response(client_socket, "Unauthorized", 401, is_ssl, ssl);
                return false;
            }
        } else {
            cerr << "\033[1;31mUnknown authentication method: " << auth_method << "\033[0m" << endl;
            // Enviar respuesta HTTP 500 Internal Server Error
            send_http_error_response(client_socket, "Internal Server Error", 500, is_ssl, ssl);
            return false;
        }
    } 
    cerr << "\033[1;31mHost not found.\033[0m" << endl;
    // Enviar respuesta HTTP 401 Unauthorized
    send_http_error_response(client_socket, "Bad Request", 400, is_ssl, ssl);
    return false;
}

// Función que maneja las políticas de reemplazo de caché.
string replacementPolicies(Value& requests_object, shared_mutex& cache_mutex, const string& replacement_policy) {
    string key_to_delete = "";

    if (replacement_policy == "LRU") {
        // Least Recently Used
        cout << "Implementing LRU replacement policy." << endl;
        string least_recently_used_time;
        time_t oldest_time = std::numeric_limits<time_t>::max();

        for (auto itr = requests_object.MemberBegin(); itr != requests_object.MemberEnd(); ++itr) {
            Value& uri_obj = itr->value;

            string most_recent_use = uri_obj["most_recent_use"].GetString();
            cout << "The request: " << itr->name.GetString() << " has most_recent_use: " << most_recent_use << endl;

            // Convertir el "most_recent_use" string a time_t
            struct tm tm;
            if (strptime(most_recent_use.c_str(), "%a %b %d %H:%M:%S %Y", &tm)) {
                time_t most_recent_use_time = mktime(&tm);

                // Actualizar la entrada menos recientemente usada
                if (most_recent_use_time < oldest_time) {
                    cout << "Old Key To Delete: " << key_to_delete << endl;
                    cout << "Updating oldest time for key: " << itr->name.GetString() << endl;
                    oldest_time = most_recent_use_time;
                    key_to_delete = itr->name.GetString();
                    least_recently_used_time = most_recent_use;
                }
            }
        }
    } else if (replacement_policy == "LFU") {
        // Least Frequently Used
        cout << "Implementing LFU replacement policy." << endl;
        int least_used_count = std::numeric_limits<int>::max();

        for (auto itr = requests_object.MemberBegin(); itr != requests_object.MemberEnd(); ++itr) {
            Value& uri_obj = itr->value;

            int times_used = uri_obj["times_used"].GetInt();
            cout << "The request: " << itr->name.GetString() << " has times_used: " << times_used << endl;
            // Actualizar la entrada menos usada
            if (times_used < least_used_count) {
                cout << "Old Key To Delete: " << key_to_delete << endl;
                cout << "Updating least used count for key: " << itr->name.GetString() << endl;
                cout << "Least used count: " << least_used_count << " with times_used: " << times_used << endl;
                least_used_count = times_used;
                key_to_delete = itr->name.GetString();
            }
        }
    } else if (replacement_policy == "FIFO") {
        // First In First Out
        cout << "Implementing FIFO replacement policy." << endl;
        string first_in_time;
        time_t oldest_time = std::numeric_limits<time_t>::max();

        for (auto itr = requests_object.MemberBegin(); itr != requests_object.MemberEnd(); ++itr) {
            Value& uri_obj = itr->value;

            string received = uri_obj["received"].GetString();
            cout << "The request: " << itr->name.GetString() << " has received: " << received << endl;

            struct tm tm;
            if (strptime(received.c_str(), "%a %b %d %H:%M:%S %Y", &tm)) {
                time_t received_time = mktime(&tm);

                // Actualizar la entrada más antigua
                if (received_time < oldest_time) {
                    cout << "Old Key To Delete: " << key_to_delete << endl;
                    cout << "Updating oldest time for key: " << itr->name.GetString() << endl;
                    oldest_time = received_time;
                    key_to_delete = itr->name.GetString();
                    first_in_time = received;
                }
            }
        }
    } else if (replacement_policy == "MRU") {
        // Most Recently Used
        cout << "Implementing MRU replacement policy." << endl;
        string most_recently_used_time;
        time_t earliest_time = std::numeric_limits<time_t>::min();

        for (auto itr = requests_object.MemberBegin(); itr != requests_object.MemberEnd(); ++itr) {
            Value& uri_obj = itr->value;

            string most_recent_use = uri_obj["most_recent_use"].GetString();
            cout << "The request: " << itr->name.GetString() << " has most_recent_use: " << most_recent_use << endl;

            struct tm tm;
            if (strptime(most_recent_use.c_str(), "%a %b %d %H:%M:%S %Y", &tm)) {
                time_t most_recent_use_time = mktime(&tm);

                // Actualizar la entrada más recientemente usada
                if (most_recent_use_time > earliest_time) {
                    cout << "Old Key To Delete: " << key_to_delete << endl;
                    cout << "Updating earliest time for key: " << itr->name.GetString() << endl;
                    earliest_time = most_recent_use_time;
                    key_to_delete = itr->name.GetString();
                    most_recently_used_time = most_recent_use;
                }
            }
        }
    } else if (replacement_policy == "Random") {
        cout << "Implementing Random replacement policy." << endl;
        if (requests_object.MemberCount() == 0) {
            cout << "No URIs to remove in the host object." << endl;
            return "";
        }

        // Generar índice random
        srand(time(nullptr));
        size_t random_index = rand() % requests_object.MemberCount();

        // Iterar hasta el índice random
        auto itr = requests_object.MemberBegin();
        std::advance(itr, random_index);

        key_to_delete = itr->name.GetString();
    } 
    cout << "Key to delete: " << key_to_delete << endl;
    return key_to_delete;
}

// Función para agregar un URI al caché de un host específico.
void add_to_cache_by_host(const string& host, const subdomain_info &info, const string& key, const string& filename, size_t size) {
    // Adquirir un bloqueo de lectura compartida para acceder a los subdominios
    int ttl = info.ttl;
    uint64_t cache_size = info.cache_size;
    string replacement_policy = info.replacement_policy;
    cout << "\033[1;33mTTL for host " << host << ": " << ttl << "\033[0m" << endl;
    cout << "\033[1;33mCache size for host " << host << ": " << cache_size << "\033[0m" << endl;
    cout << "\033[1;33mReplacement policy for host " << host << ": " << replacement_policy << "\033[0m" << endl;

    // Adquirir un bloqueo exclusivo para escribir en la caché
    unique_lock<shared_mutex> write_lock(cache_mutex);

    Document::AllocatorType& allocator = cache.GetAllocator();

    if (!cache.HasMember(host.c_str())) {
        // Crear un nuevo objeto para el host si no existe en la caché
        Value host_obj(kObjectType);
        // Agregar campos de tamaño y requests al objeto del host
        host_obj.AddMember("size", Value().SetUint64(0), allocator);
        host_obj.AddMember("requests", Value(kObjectType), allocator);
        cache.AddMember(Value().SetString(host.c_str(), allocator), host_obj, allocator);
    }
    // Obtener el objeto del host desde la caché
    Value& host_object = cache[host.c_str()];
    Value& requests_object = host_object["requests"];
    auto host_size = host_object["size"].GetUint64();
    string received = "";
    int times_used = 0;
    // Revisar si el URI ya existe en la caché del host.
    if (requests_object.HasMember(key.c_str())) {
        cout << "\033[1;33mURI already exists in cache for host: " << host << "\033[0m" << endl;
        // Si el URI ya existe, se borra para actualizarlo
        Value& old_uri_obj = requests_object[key.c_str()];
        received = old_uri_obj["received"].GetString();
        times_used = old_uri_obj["times_used"].GetInt() + 1;
        host_size -= old_uri_obj["size"].GetUint64();
        old_uri_obj["filename"].SetNull();
        old_uri_obj["most_recent_use"].SetNull();
        old_uri_obj["received"].SetNull();
        old_uri_obj["time_to_live"].SetNull();
        requests_object.RemoveMember(key.c_str());
    }
    while (host_size + size > cache_size) {
        // Se intenta eliminar el contenido con base en la replacement policy hasta que quepa en la caché.
        // "LFU", "FIFO", "MRU", "Random"

        string key_to_delete = replacementPolicies(requests_object, cache_mutex, replacement_policy);

        if (!key_to_delete.empty()) {
            cout << "\033[1;33mLeast recently used URI: " << key_to_delete << "\033[0m" << endl;
            host_size -= requests_object[key_to_delete.c_str()]["size"].GetUint64();
            Value& uri_obj = requests_object[key_to_delete.c_str()];
            uri_obj["filename"].SetNull();
            uri_obj["most_recent_use"].SetNull();
            uri_obj["received"].SetNull();
            uri_obj["time_to_live"].SetNull();
            requests_object.RemoveMember(key_to_delete.c_str());
        } else {
            cout << "\033[1;33mCould not remove key to add space. " << host << "\033[0m" << endl;
            return;
        }    
    }
    // Crear objeto URI para almacenar la información
    Value uri_obj(kObjectType);

    // Agregar campos al objeto URI
    auto now_time = chrono::system_clock::now();
    auto now = chrono::system_clock::to_time_t(now_time);
    string current_timestamp = ctime(&now);
    current_timestamp.pop_back(); // Eliminar cambio de línea

    // Calcular TTL
    auto ttl_time_point = now_time + chrono::milliseconds(ttl); // Sumar el TTL en milisegundos
    auto ttl_time_t = chrono::system_clock::to_time_t(ttl_time_point); // Convertir a time_t
    string ttl_timestamp = ctime(&ttl_time_t);
    ttl_timestamp.pop_back();

    if (received.empty()) {
        received = current_timestamp; // Si no hay un tiempo previo, usar el tiempo actual
    }
    uri_obj.AddMember("received", Value().SetString(received.c_str(), allocator), allocator);
    uri_obj.AddMember("most_recent_use", Value().SetString(current_timestamp.c_str(), allocator), allocator);
    uri_obj.AddMember("times_used", Value().SetInt(times_used), allocator);
    uri_obj.AddMember("time_to_live", Value().SetString(ttl_timestamp.c_str(), allocator), allocator);
    uri_obj.AddMember("filename", Value().SetString(filename.c_str(), allocator), allocator);
    uri_obj.AddMember("size", Value().SetUint64(size), allocator);

    // Agregar el objeto URI al objeto de solicitudes del host
    requests_object.AddMember(Value().SetString(key.c_str(), allocator), uri_obj, allocator);
    host_object["size"].SetUint64(host_size + size); // Actualizar el tamaño ocupado de la caché para el subdominio.
    cout << "\033[1;33mAdded URI to cache for host: " << host << "\033[0m" << endl;

    StringBuffer buffer;
    Writer<StringBuffer> writer(buffer);
    cache.Accept(writer);
    

    cout << "\033[1;33mCache Object: " << buffer.GetString() << "\033[0m" << endl;
}

string extract_host(const string &url) {
    size_t start = url.find("/");
    if (start == string::npos) return url;
    return url.substr(0, start);
}

bool get_response(const int &client_socket, HttpRequest request, const subdomain_info &info, bool is_ssl, SSL* ssl) {
    const string host = request.headers.at("host");
    const string destination = info.destination;
    const bool https = info.https;
    const vector<string> &file_types = info.file_types;
    if (cache.HasMember(host.c_str())) {
        Value& host_object = cache[host.c_str()];
        cout << "Host object found in cache." << endl;
        cout << "Request URI: " << request.request.method << destination << request.request.uri << endl;
        
        const string cache_key = (request.request.method + "-" + destination + request.request.uri);
        Value& requests_object = host_object["requests"];
        if (requests_object.HasMember(cache_key.c_str())) {
            cout << "\033[1;33mURI object found in cache.\033[0m" << endl;
            Value& entry = requests_object[cache_key.c_str()];
            
            // Revisar la cache para ver si el request está en el cache.
                
            string filepath = CACHE_FOLDER + host + "/" + entry["filename"].GetString();
            ifstream file(filepath, ios::binary | ios::ate);
            
            if (!file.is_open()) {
                cerr << "\033[1;33mFailed to open file: " << filepath << "\033[0m" << endl;
                if (file.fail()) {
                    cerr << "\033[1;33mFile stream failed. Possible reasons: file does not exist, insufficient permissions, or invalid path.\033[0m" << endl;
                }
                cerr << "\033[1;33mError: " << strerror(errno) << "\033[0m" << endl; // Prints the specific error message
                return false;
            }

            streamsize size = file.tellg();
            file.seekg(0, ios::beg);

            vector<char> content(size);
            
            if (file.read(content.data(), size)) {
                cout << "\033[1;33mRead " << size << " bytes from " << filepath << "\033[0m" << endl;
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
                send_http_response(client_socket, content.data(), size, is_ssl, ssl);
                return true;
            } else {
                cerr << "Failed to read cache file: " << filepath << "\033[0m" << endl;
                return false;
            }
        } 
    }
    // Si no está en el cache, se hace una solicitud al destino.
    string url = destination + request.request.uri;
    cout << "Fetching from URL: " << url << endl;
    request.headers["host"] = destination;
    memory_struct * response = send_https_request(url, request.request.content.data(), request.request.content.size(), request.headers, https, request.request.method, true);
    request.headers["host"] = host; // Restaurar el host original en los headers de la solicitud.
    if (response) {
        cout << "Response received. Status code: " << response->status_code << endl;
        string response_str = build_http_response(response);
        auto it = response->headers.find("content-type");
        if (it != response->headers.end()) {
            string content_type_header = it->second;
            cout << "Content-Type: " << content_type_header << endl;
            size_t pos = content_type_header.find(';');
            string content_type = content_type_header.substr(0, pos); // Extraer el content_type antes del punto y coma
            content_type.erase(remove_if(content_type.begin(), content_type.end(), ::isspace), content_type.end()); // Quitar espacios

            // Verificar si el Content-Type es uno de los tipos de archivo permitidos.
            bool is_allowed = false;
            for (const auto& file_type : file_types) {
                cout << "Checking against allowed file type: " << file_type << endl;
                if (content_type == file_type) {
                    is_allowed = true;
                    break;
                }
            }
            // Si el Content-Type es permitido, se guarda la respuesta en el cache.
            if (is_allowed) {
                cout << "\033[1;33mContent-Type is allowed.\033[0m" << endl;
                // Guardar la respuesta en el cache.
                string filename = hash_string(url + to_string(time(nullptr))) + ".ksh";
                string directory = CACHE_FOLDER + host + "/";
                // Crear el directorio
                filesystem::create_directories(directory);
                
                ofstream out_file(directory + filename, ios::binary);
                if (out_file) {
                    out_file.write(response_str.c_str(), response_str.length());
                    out_file.close();
                    cout << "\033[1;33mResponse of size " << response_str.length() << " saved to cache as: " << filename << "\033[0m" << endl;

                    // Agregar a la cache
                    add_to_cache_by_host(host, info, request.request.method + "-" + url, filename, response_str.length());
                } else {
                    perror("Failed to open cache file for writing");
                }
            } else {
                cerr << "Content-Type not allowed: " << content_type << "\033[0m" << endl;
            }
        } else {
            cerr << "Content-Type header not found in response.\033[0m" << endl;
        }
        send_http_response(client_socket, response_str.c_str(), response_str.length(), is_ssl, ssl);
        delete response;
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

    bool is_ssl = false;
    SSL* ssl = nullptr;
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
                send_http_error_response(client_socket, "Bad Request", 400, is_ssl, ssl);
                break;
            }
            subdomain_info info;
            bool authenticated = authenticate_request(client_socket, request, info, rest_api, app_id, api_key, vercel_ui, false, is_ssl, ssl);
            if (!authenticated) {
                // Si no está autenticado, salir, porque la respuesta ya se envió.
                break;
            }

            const bool set_response = get_response(client_socket, request, info, is_ssl, ssl);
            if (!set_response) {
                // Si no se pudo obtener la respuesta, enviar un error.
                send_http_error_response(client_socket, "Internal Server Error", 500, is_ssl, ssl);
                break;
            }
            if (request.request.keepAlive) {
                keep_alive = true;
            } else {
                keep_alive = false;
            }
        } else if (bytes_received == 0) {
            cout << "Client disconnected normally." << endl;
            break;
        } else {
            perror("recv failed\n");
            break;
        }
    } while (keep_alive);
    close(client_socket);
    free(request_buffer);
}

// Función para procesar una solicitud HTTPS entrante.
// Lectura por SSL basado en: https://github.com/openssl/openssl/blob/master/demos/sslecho/main.c
void handle_https_request(const int client_socket, const string &rest_api, const string &app_id, const string &api_key, const string &vercel_ui, SSL *ssl) {
    cout << "Handling HTTPS request on socket: " << client_socket << endl;

    // Buffer para almacenar la solicitud HTTP entrante.
    char * request_buffer = (char *) malloc(REQUEST_BUFFER_SIZE * sizeof(char));
    if (!request_buffer) {
        perror("malloc failed");
        close(client_socket);
        return;
    }

    bool is_ssl = true; // Indica que es una solicitud HTTPS.

    // Variable para determinar si la conexión debe mantenerse viva.
    // Se establece con el header de Connection: keep-alive
    // Si no se encuentra el header, se cierra la conexión después de enviar la respuesta.
    bool keep_alive = false;
    do {
        // Recibir la solicitud HTTPS del cliente.
        int bytes_received = SSL_read(ssl, request_buffer, REQUEST_BUFFER_SIZE - 1);
        int err = SSL_get_error(ssl, bytes_received);
        if (err == SSL_ERROR_NONE && bytes_received > 0){
            request_buffer[bytes_received] = '\0'; // Null-terminate la request
            cout << "Received request: " << request_buffer << endl;

            // Parsear la HTTP request
            HttpRequest request;
            try {
                request = parse_http_request(request_buffer, bytes_received);
            } catch (const exception &e) {
                cerr << "Error parsing HTTP request: " << e.what() << endl;
                send_http_error_response(client_socket, "Bad Request", 400, is_ssl, ssl);
                break;
            }
            subdomain_info info;
            bool authenticated = authenticate_request(client_socket, request, info, rest_api, app_id, api_key, vercel_ui, true, is_ssl, ssl);
            if (!authenticated) {
                // Si no está autenticado, salir, porque la respuesta ya se envió.
                break;
            }

            const bool set_response = get_response(client_socket, request, info, is_ssl, ssl);
            if (!set_response) {
                // Si no se pudo obtener la respuesta, enviar un error.
                send_http_error_response(client_socket, "Internal Server Error", 500, is_ssl, ssl);
                break;
            }
            if (request.request.keepAlive) {
                keep_alive = true;
            } else {
                keep_alive = false;
            }
            
            cout << endl;
        } else if (err == SSL_ERROR_ZERO_RETURN) {
            cout << "Client disconnected normally." << endl;
            break;
        } else if (err == SSL_ERROR_WANT_READ || err == SSL_ERROR_WANT_WRITE) {
            cout << "SSL read operation would block, waiting for more data..." << endl;
            continue;
        } else if (err == SSL_ERROR_SYSCALL) {
            perror("SSL read syscall error");
            break;
        } else if (err == SSL_ERROR_SSL) {
            cerr << "SSL error occurred: " << ERR_error_string(ERR_get_error(), nullptr) << endl;
            break;
        }
    } while (keep_alive);
    SSL_shutdown(ssl);
    SSL_free(ssl);
    close(client_socket);
    free(request_buffer);
}

// Referencias para sockets:
// https://dev.to/jeffreythecoder/how-i-built-a-simple-http-server-from-scratch-using-c-739
// Para env variables:
// https://www.gnu.org/software/libc/manual/html_node/Environment-Access.html#:~:text=The%20value%20of%20an%20environment,accidentally%20use%20untrusted%20environment%20variables.

#ifndef UNIT_TEST

int main() {
    filesystem::create_directories(CACHE_FOLDER);

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

    // Inicialización CURL
    curl_global_init(CURL_GLOBAL_DEFAULT);

    // Crear un thread para obtener los subdominios
    thread([&rest_api, &app_id, &api_key, fetch_interval]() {
            fetch_subdomains(rest_api, app_id, api_key, fetch_interval);
        }).detach();

    // Crea un thread que revisa la cache y elimina los objetos expirados.
    thread(cleanup_expired_cache, ref(cache), ref(subdomain_mutex)).detach();
    
    // Abrir socket para escuchar solicitudes HTTP
    int socket_fd;
    socket_fd = socket(AF_INET, SOCK_STREAM, 0);
    int opt = 1;
    setsockopt(socket_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

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

    cout << "Zonal cache (HTTP) is running on port " << HTTP_PORT << "..." << endl;

    thread([&rest_api, &app_id, &api_key, &vercel_ui]() {
        int https_socket_fd = socket(AF_INET, SOCK_STREAM, 0);
        if (https_socket_fd < 0) {
            perror("Failed to create HTTPS socket");
            return;
        }

        int opt = 1;
        setsockopt(https_socket_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt));

        struct sockaddr_in https_addr;
        https_addr.sin_family = AF_INET;
        https_addr.sin_port = htons(HTTPS_PORT);
        https_addr.sin_addr.s_addr = INADDR_ANY;

        if (bind(https_socket_fd, (struct sockaddr*)&https_addr, sizeof(https_addr)) < 0) {
            perror("Bind failed (HTTPS)");
            close(https_socket_fd);
            return;
        }

        if (listen(https_socket_fd, 10) < 0) {
            perror("Listen failed (HTTPS)");
            close(https_socket_fd);
            return;
        }

        cout << "Zonal cache (HTTPS) is running on port " << HTTPS_PORT << "..." << endl;

        // Configurar OpenSSL para manejar conexiones HTTPS
        SSL_CTX *ctx;
        ctx = create_ssl_context();
        configure_ssl_context(ctx);

        while (true) {
            struct sockaddr_in client_addr;
            socklen_t client_len = sizeof(client_addr);

            SSL *ssl;

            int client_socket = accept(https_socket_fd, (struct sockaddr*)&client_addr, &client_len);
            if (client_socket < 0) {
                perror("Accept failed (HTTPS)");
                continue;
            }

            ssl = SSL_new(ctx);
            SSL_set_fd(ssl, client_socket);
        
            if (SSL_accept(ssl) > 0) {
                thread([client_socket, &rest_api, &app_id, &api_key, &vercel_ui, ssl]() {
                    handle_https_request(client_socket, rest_api, app_id, api_key, vercel_ui, ssl);
                }).detach();
            } else {
                cerr << "SSL accept failed: " << SSL_get_error(ssl, SSL_accept(ssl)) << endl;
                SSL_shutdown(ssl);
                SSL_free(ssl);
                close(client_socket);
            }
        }

        close(https_socket_fd);
    }).detach();


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
    cout << "Zonal cache stopped.\n";
    return 0;
}
#endif //UNIT_TEST