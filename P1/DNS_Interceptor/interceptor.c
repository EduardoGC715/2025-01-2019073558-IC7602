#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <arpa/inet.h>
#include <netinet/in.h>
#include <pthread.h>
#include <curl/curl.h>
#include <stdbool.h>
#include "b64/cencode.h"
#include "b64/cdecode.h"

#define DOMAIN_EXISTS 200
#define DOMAIN_NOT_EXISTS 404

// Referencias para threads:
// https://www.cs.cmu.edu/afs/cs/academic/class/15492-f07/www/pthreads.html

typedef struct {
    int socket_fd; // Socket file descriptor
    struct sockaddr_in client_addr;
    socklen_t addr_len; // Length of the address structure
    char *request; // Pointer to the DNS request data
    int request_size; // Size of the DNS request data
    const char * dns_api; // DNS API URL
    const char * dns_api_port; // DNS API port
} dns_thread_args;

// Parsing de header basado en RFC-1035, sección 4.1.1.
// RFC-2535, sección 6.1
// https://gist.github.com/fffaraz/9d9170b57791c28ccda9255b48315168
// https://www.ibm.com/docs/en/zos/2.4.0?topic=lf-ntohs-translate-unsigned-short-integer-into-host-byte-order
typedef struct {
    uint16_t id; // Transaction ID
    unsigned char qr :1; // Query/Response flag
    unsigned char opcode :4; // Operation code
    unsigned char aa :1; // Authoritative answer
    unsigned char tc :1; // Truncated
    unsigned char rd :1; // Recursion desired
    unsigned char ra :1; // Recursion available
    unsigned char z :1; // Reserved for future use
    unsigned char ad :1; // Authentic data
    unsigned char cd :1; // Checking disabled
    unsigned char rcode :4; // Response code
    uint16_t qdcount; // Number of questions
    uint16_t ancount; // Number of answers
    uint16_t nscount; // Number of authority records
    uint16_t arcount; // Number of additional records
} dns_header;

typedef struct {
    dns_header * header;
    char * qname; // Query name
    uint16_t qtype; // Query type
    uint16_t qclass; // Query class
} dns_request;

typedef struct {
    char * name;
    uint16_t type; // Query type
    uint16_t class; // Query class
    uint32_t ttl; // Time to live
    uint16_t rdlength; // Length of the RDATA field
    char * rdata; // Resource data
} dns_resource;

typedef struct {
    dns_header * header;
    char * question;
    dns_resource * answer; // Answer resource
} dns_response;

dns_header * parse_dns_header(const char * request){
    uint16_t id = ntohs(*(uint16_t *)(request)); // Transaction ID
    uint16_t flags = ntohs(*(uint16_t *)(request + 2)); // Flags
    uint16_t qdcount = ntohs(*(uint16_t *)(request + 4)); // Number of questions
    uint16_t ancount = ntohs(*(uint16_t *)(request + 6)); // Number of answers
    uint16_t nscount = ntohs(*(uint16_t *)(request + 8)); // Number of authority records
    uint16_t arcount = ntohs(*(uint16_t *)(request + 10)); // Number of additional records
    dns_header *header = malloc(sizeof(dns_header));
    header->id = id;
    header->qr = (flags >> 15) & 0x01; // Query/Response flag
    header->opcode = (flags >> 11) & 0x0F; // Operation code
    header->aa = (flags >> 10) & 0x01; // Authoritative answer
    header->tc = (flags >> 9) & 0x01; // Truncated
    header->rd = (flags >> 8) & 0x01; // Recursion desired
    header->ra = (flags >> 7) & 0x01; // Recursion available
    header->z = (flags >> 6) & 0x0F; // Reserved for future use
    header->ad = (flags >> 5) & 0x01; // Authentic data
    header->cd = (flags >> 4) & 0x01; // Checking disabled
    header->rcode = flags & 0x0F; // Response code
    header->qdcount = qdcount;
    header->ancount = ancount;
    header->nscount = nscount;
    header->arcount = arcount;
    return header;
}

char * parse_qname(const char *request, int *offset) {
    int start = *offset;
    int label_len = request[*offset];
    int total_len = 0;

    // Calcular la longitud total de QNAME
    while (label_len > 0) {
        total_len += label_len + 1; // label + dot
        *offset += label_len + 1;
        label_len = request[*offset];
    }
    (*offset)++;
    total_len++;

    // Asignar memoria
    char *qname = malloc(total_len);
    if (!qname) {
        perror("malloc failed");
        return NULL;
    }

    // Reconstruir QNAME
    int src = start;
    int dst = 0;
    label_len = request[src];
    while (label_len > 0) {
        src++;
        for (int i = 0; i < label_len; i++) {
            qname[dst++] = request[src + i];
        }
        qname[dst++] = '.';
        src += label_len;
        label_len = request[src];
    }

    if (dst > 0)
        qname[dst - 1] = '\0'; // Reemplazar el último punto con null terminator
    else
        qname[0] = '\0'; // QNAME está vacío

    return qname;
}

// Para base64 encoding y decoding, se usa la biblioteca libb64
// Basado en:
// https://github.com/libb64/libb64/blob/master/examples/c-example1.c
char * encode_b64(const char * data, int request_size, int *actual_length) {
    int encoded_length = 4 * ((request_size + 2) / 3) + 1;
    char * encoded_data = (char*) malloc(encoded_length);
    char * encoded_ptr = encoded_data;

    if (!encoded_data) {
        perror("malloc failed");
        return NULL;
    }

    base64_encodestate state;
    base64_init_encodestate(&state);
    int count = base64_encode_block(data, request_size, encoded_ptr, &state);
    encoded_ptr += count;
    count = base64_encode_blockend(encoded_ptr, &state);
    encoded_ptr += count;
    *encoded_ptr = '\0'; // Null terminate the string
    *actual_length = encoded_ptr - encoded_data;
    printf("Encoded length: %d\n", encoded_length);
    printf("Actual length: %d\n", *actual_length);
    printf("Encoded data: %s\n", encoded_data);
    return encoded_data;
}

typedef struct {
    char * data;
    int length;
} base64_decoded_data;

base64_decoded_data * decode_b64(const char * data, int length) {
    int decoded_length = (length / 4) * 3;
    char * decoded_data = (char*) malloc(decoded_length + 1);
    char * decoded_ptr = decoded_data;

    if (!decoded_data) {
        perror("malloc failed");
        return NULL;
    }
    base64_decodestate state;
    base64_init_decodestate(&state);
    int count = base64_decode_block(data, length, decoded_ptr, &state);
    base64_decoded_data * result = malloc(sizeof(base64_decoded_data));
    result->data = decoded_data;
    result->length = count;
    return result;
}


char *build_dns_url(const char *dns_api, const char *dns_api_port, char * endpoint, const char *ip_address, const char *domain) {
    const char *prefix = "http://";

    size_t total_length = strlen(prefix) + strlen(dns_api) + 1 + strlen(dns_api_port) +
                          strlen(endpoint) + 1;
    if (ip_address && domain) {
        total_length += strlen(ip_address) + strlen(domain) + 12;
    }

    char *url = malloc(total_length);
    if (!url) {
        perror("malloc failed");
        return NULL;
    }

    if (!ip_address && !domain) {
        snprintf(url, total_length, "%s%s:%s%s", prefix, dns_api, dns_api_port, endpoint);
    } else {

    }
    // Step 3: Format the string
    snprintf(url, total_length, "%s%s:%s%s?domain=%s&ip=%s",
             prefix, dns_api, dns_api_port, endpoint, domain, ip_address);
    return url;
}

// Almacenar la respuesta de la request HTTPS en memoria.
// Basado en:
// https://curl.se/libcurl/c/getinmemory.html
typedef struct {
    char *memory;
    size_t size;
    long status_code;
} memory_struct;

static size_t write_callback(void * contents, size_t size, size_t nmemb, void * userp) {
    size_t realsize = size * nmemb;
    memory_struct *mem = (memory_struct *)userp;

    char *ptr = realloc(mem->memory, mem->size + realsize + 1);
    if(ptr == NULL) {
        printf("Not enough memory (realloc returned NULL)\n");
        return 0; // Out of memory
    }

    mem->memory = ptr;
    memcpy(&(mem->memory[mem->size]), contents, realsize);
    mem->size += realsize;
    mem->memory[mem->size] = '\0'; // Null terminate the string

    return realsize;
}

// Enviar la solicitud HTTPS al DNS API
// Basado en:
// https://curl.se/libcurl/c/http-post.html
// https://curl.se/libcurl/c/https.html
memory_struct * send_https_request(const char *url, const char * data, int length) {
    CURL *curl;
    CURLcode res;

    curl = curl_easy_init();
    if(curl) {
        memory_struct * resp_mem = malloc(sizeof(memory_struct));
        if (!resp_mem) {
            perror("malloc failed");
            return NULL;
        }

        resp_mem->memory = malloc(1); // Initial memory allocation
        resp_mem->size = 0; // No data at this point

        struct curl_slist *headers = NULL;
        headers = curl_slist_append(headers, "Content-Type: text/plain");
        
        curl_easy_setopt(curl, CURLOPT_URL, url);
        if (data != NULL && length > 0) {
            curl_easy_setopt(curl, CURLOPT_POSTFIELDS, data);
            curl_easy_setopt(curl, CURLOPT_POSTFIELDSIZE, length);
            curl_easy_setopt(curl, CURLOPT_POST, 1L);
        } else {
            curl_easy_setopt(curl, CURLOPT_HTTPGET, 1L);
        }
        
        curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, write_callback);
        curl_easy_setopt(curl, CURLOPT_WRITEDATA, (void *)resp_mem);
        curl_easy_setopt(curl, CURLOPT_USERAGENT, "libcurl-agent/1.0");
        curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
        
        res = curl_easy_perform(curl);
        curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &resp_mem->status_code);

        curl_easy_cleanup(curl);
        curl_slist_free_all(headers);
        if(res != CURLE_OK) {
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

dns_request * parse_dns_request(const char *request, const int size) {
    dns_header* header = parse_dns_header(request);
    printf("Transaction ID: %u\n", header->id);
    printf("QR: %u\n", header->qr);
    printf("Opcode: %u\n", header->opcode);
    printf("AA: %u\n", header->aa);
    printf("TC: %u\n", header->tc);
    printf("RD: %u\n", header->rd);
    printf("RA: %u\n", header->ra);
    printf("Z: %u\n", header->z);
    printf("AD: %u\n", header->ad);
    printf("CD: %u\n", header->cd);
    printf("Rcode: %u\n", header->rcode);
    printf("QDCount: %u\n", header->qdcount);
    printf("ANCount: %u\n", header->ancount);
    printf("NSCount: %u\n", header->nscount);
    printf("ARCount: %u\n", header->arcount);
    printf("BYTES: %zu\n", sizeof(dns_header));
    int offset = sizeof(dns_header);

    if (!(header->qr == 0 && header->opcode == 0)) {
        printf("Invalid DNS request\n");
        free(header);
        return NULL;
    }

    char * qname = parse_qname(request, &offset);
    if (!qname) {
        printf("Failed to parse QNAME\n");
        free(header);
        return NULL;
    }

    uint16_t qtype = ntohs(*(uint16_t *)(request + offset)); // Query type
    uint16_t qclass = ntohs(*(uint16_t *)(request + offset + 2)); // Query class
    printf("QNAME: %s\n", qname);
    printf("QTYPE: %u\n", qtype);
    printf("QCLASS: %u\n", qclass);

    dns_request *req = malloc(sizeof(dns_request));
    if (!req) {
        perror("malloc failed");
        free(qname);
        free(header);
        return NULL;
    }
    req->header = header;
    req->qname = qname;
    req->qtype = qtype;
    req->qclass = qclass;

    printf("Parsed DNS request successfully\n");
    return req;
}

void query_dns_resolver(
    const char * dns_api,
    const char * dns_api_port,
    int dns_socket,
    struct sockaddr_in client_addr,
    socklen_t addr_len,
    char * request,
    int request_size
) {
    int encoded_length = 0;
    char *encoded_data = encode_b64(request, request_size, &encoded_length);
    if (!encoded_data) {
        printf("Failed to encode DNS request\n");
        return;
    }
    char * url = build_dns_url(dns_api, dns_api_port, "/api/dns_resolver", NULL, NULL);
    memory_struct * response = send_https_request(url, encoded_data, encoded_length);
    if (response->status_code == 200) {
        // Decode the base64 response
        base64_decoded_data * decoded_data = decode_b64(response->memory, response->size);

        if (!decoded_data) {
            printf("Failed to decode base64 response\n");
            free(response->memory);
            free(response);
            return;
        }
        // Send the decoded data back to the client
        sendto(dns_socket, decoded_data->data, decoded_data->length, 0, (struct sockaddr *) &client_addr, addr_len);
        free(decoded_data->data);
        free(decoded_data);
    } else {
        printf("Failed to get valid response from DNS API, status code: %ld\n", response->status_code);
    }
    free(encoded_data);
    free(response->memory);
    free(response);
    free(url);
}

void free_dns_request(dns_request *req) {
    if (req) {
        free(req->header);
        free(req->qname);
        free(req);
    }
}

void * process_dns_request(void * arg) {
    dns_thread_args *args = (dns_thread_args *)arg;
    int dns_socket = args->socket_fd; // Socket file descriptor
    struct sockaddr_in client_addr = args->client_addr; // Client address
    socklen_t addr_len = args->addr_len; // Length of the address structure
    char *request = args->request; // Pointer to the DNS request data
    int request_size = args->request_size; // Size of the DNS request data
    const char * dns_api = args->dns_api; // DNS API URL
    const char * dns_api_port = args->dns_api_port; // DNS API port

    printf("Processing DNS request of size %d bytes\n", request_size);
    printf("Received DNS request from %s:%d\n", inet_ntoa(client_addr.sin_addr), ntohs(client_addr.sin_port));
        
    dns_request * req = parse_dns_request(request, request_size);
    if (!req) {
        // Query no estándar, codificar en base 64 y enviar al dns_api/dns_resolver
        printf("Failed to parse DNS request\n");
        query_dns_resolver(dns_api, dns_api_port, dns_socket, client_addr, addr_len, request, request_size);
        free(request);
        free(args);
        return NULL;
    }
    char * client_ip = inet_ntoa(client_addr.sin_addr); // Client IP address
    char * url = build_dns_url(dns_api, dns_api_port, "/api/exists", client_ip, req->qname);
    printf("Sending HTTP Request to %s\n", url);
    memory_struct * response = send_https_request(url, NULL, 0);
    if (response->status_code == DOMAIN_EXISTS) {
        char *endptr;
        unsigned int ip = strtoul(response->memory, &endptr, 10);
    
        // Build DNS header (response)
        unsigned char response_buffer[512];
        memset(response_buffer, 0, sizeof(response_buffer));
        int offset = 0;
        
        // DNS Header
        *(uint16_t *)&response_buffer[offset] = htons(req->header->id); offset += 2;
        *(uint16_t *)&response_buffer[offset] = htons(0x8180);          offset += 2; // QR=1, RD=1, RA=1, RCODE=0
        *(uint16_t *)&response_buffer[offset] = htons(1);               offset += 2; // QDCOUNT
        *(uint16_t *)&response_buffer[offset] = htons(1);               offset += 2; // ANCOUNT
        *(uint16_t *)&response_buffer[offset] = htons(0);               offset += 2; // NSCOUNT
        *(uint16_t *)&response_buffer[offset] = htons(0);               offset += 2; // ARCOUNT
        
        int qname_len = 0;
        while (request[offset + qname_len] != 0) {
            qname_len += request[offset + qname_len] + 1;
        }
        qname_len++; // include null byte
        int question_len = qname_len + 4; // QTYPE + QCLASS
        memcpy(&response_buffer[offset], &request[12], question_len);
        offset += question_len;
        
        // Answer section
        response_buffer[offset++] = 0xC0; response_buffer[offset++] = 0x0C; // Pointer to QNAME
        
        *(uint16_t *)&response_buffer[offset] = htons(1); offset += 2;  // TYPE A
        *(uint16_t *)&response_buffer[offset] = htons(1); offset += 2;  // CLASS IN
        *(uint32_t *)&response_buffer[offset] = htonl(6000); offset += 4;  // TTL
        *(uint16_t *)&response_buffer[offset] = htons(4); offset += 2; // RDLENGTH
        
        // IP address bytes
        response_buffer[offset++] = (ip >> 24) & 0xFF;
        response_buffer[offset++] = (ip >> 16) & 0xFF;
        response_buffer[offset++] = (ip >> 8) & 0xFF;
        response_buffer[offset++] = ip & 0xFF;
        
        // Send the response
        sendto(dns_socket, response_buffer, offset, 0, (struct sockaddr *) &client_addr, addr_len);
    } else if (response->status_code == DOMAIN_NOT_EXISTS) {
        printf("Domain does not exist, querying dns_resolver\n");
        query_dns_resolver(dns_api, dns_api_port, dns_socket, client_addr, addr_len, request, request_size);
        free(request);
        free(args);
        return NULL;
    } else {
        printf("Invalid response from DNS API\n");
    }


    free(response->memory);
    free(response);
    free(url);
    free(request);
    free(args);
    free_dns_request(req);
    return NULL;
}

// Referencias para sockets:
// https://www.geeksforgeeks.org/udp-client-server-using-connect-c-implementation/
// https://www.youtube.com/watch?v=5PPfy-nUWIM
// Para env variables:
// https://www.gnu.org/software/libc/manual/html_node/Environment-Access.html#:~:text=The%20value%20of%20an%20environment,accidentally%20use%20untrusted%20environment%20variables.
int main() {
    const char *dns_api = getenv("DNS_API");
    const char *dns_api_port = getenv("DNS_API_PORT");
    if (!dns_api || !dns_api_port) {
        fprintf(stderr, "Environment variables DNS_API and DNS_API_PORT must be set\n");
        return 1;
    }

    int dns_socket;
    dns_socket = socket(AF_INET, SOCK_DGRAM, 0);
    
    struct sockaddr_in server_addr;
    server_addr.sin_family = AF_INET;
    server_addr.sin_port = htons(53); // DNS port
    server_addr.sin_addr.s_addr = INADDR_ANY;

    if (bind(dns_socket, (struct sockaddr *) &server_addr, sizeof(server_addr)) < 0) {
        perror("Bind failed");
        close(dns_socket);
        return 1;
    }
    listen(dns_socket, 5);
    printf("DNS Interceptor is running...\n");

    // Inicialización CURL
    curl_global_init(CURL_GLOBAL_DEFAULT);

    while (1) {
        struct sockaddr_in client_addr;
        socklen_t addr_len = sizeof(client_addr);
        char buffer[512];
        pthread_t thread_id;

        // Receive DNS request
        int bytes_received = recvfrom(dns_socket, buffer, sizeof(buffer), 0, (struct sockaddr *)&client_addr, &addr_len);
        
        if (bytes_received < 0) {
            perror("Receive failed");
            continue;
        }

        dns_thread_args *args = malloc(sizeof(dns_thread_args));
        args->request = malloc(bytes_received);
        memcpy(args->request, buffer, bytes_received);
        args->request_size = bytes_received;
        args->socket_fd = dns_socket; // Pass the socket file descriptor to the thread
        args->client_addr = client_addr; // Pass the client address to the thread
        args->addr_len = addr_len; // Pass the address length to the thread
        args->dns_api = dns_api; // Pass the DNS API URL to the thread
        args->dns_api_port = dns_api_port; // Pass the DNS API port to the thread
        pthread_create(&thread_id, NULL, process_dns_request, args);
        pthread_detach(thread_id);
    }

    close(dns_socket);
    printf("DNS Interceptor stopped.\n");
    return 0;
}
