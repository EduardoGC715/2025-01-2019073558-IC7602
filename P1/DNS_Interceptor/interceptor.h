#ifndef INTERCEPTOR_H
#define INTERCEPTOR_H

#include <stdint.h>
#include <stddef.h>
#include <netinet/in.h>
#include <arpa/inet.h>


// Parsing de header basado en RFC-1035, sección 4.1.1.
// RFC-2535, sección 6.1
// https://gist.github.com/fffaraz/9d9170b57791c28ccda9255b48315168
// https://www.ibm.com/docs/en/zos/2.4.0?topic=lf-ntohs-translate-unsigned-short-integer-into-host-byte-order

// Struct para el header DNS
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

// Struct para la request DNS
typedef struct {
    dns_header * header;
    char * qname; // Query name
    uint16_t qtype; // Query type
    uint16_t qclass; // Query class
} dns_request;

// Struct para un resource record DNS
// Basado en RFC-1035, sección 4.1.3
typedef struct {
    char * name;
    uint16_t type; // Query type
    uint16_t class; // Query class
    uint32_t ttl; // Time to live
    uint16_t rdlength; // Length of the RDATA field
    char * rdata; // Resource data
} dns_resource;

// Struct para la respuesta DNS
typedef struct {
    dns_header * header;
    char * question;
    dns_resource * answer; // Answer resource
} dns_response;

// Estructura para almacenar los datos decodificados de base64
typedef struct {
    char * data;
    int length;
} base64_decoded_data;


// Almacenar la respuesta de la request HTTPS en memoria.
// Basado en:
// https://curl.se/libcurl/c/getinmemory.html

// Struct para almacenar la respuesta de la request HTTPS
typedef struct {
    char *memory;
    size_t size;
    long status_code;
} memory_struct;

// Argumentos para la función que corren los hilos
typedef struct {
    int socket_fd; // Socket file descriptor
    struct sockaddr_in client_addr;
    socklen_t addr_len; // Longitud de struct de direccion
    char *request; // Puntero al request DNS
    int request_size; // Tamaño de DNS request
    const char * dns_api; // DNS API URL
    const char * dns_api_port; // DNS API port
} dns_thread_args;

// Declaración de funciones
dns_header *parse_dns_header(const char *request);
char *parse_qname(const char *request, int *offset);
char *encode_b64(const char *data, int request_size, int *actual_length);
base64_decoded_data *decode_b64(const char *data, int length);
char *build_dns_url(const char *dns_api, const char *dns_api_port, char *endpoint, const char *ip_address, const char *domain);
memory_struct *send_https_request(const char *url, const char *data, int length);
dns_request *parse_dns_request(const char *request, const int size);
void query_dns_resolver(const char *dns_api, const char *dns_api_port, int dns_socket, struct sockaddr_in client_addr, socklen_t addr_len, char *request, int request_size);
void free_dns_request(dns_request *req);
void *process_dns_request(void *arg);

#endif // INTERCEPTOR_H
