#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <arpa/inet.h>
#include <netinet/in.h>
#include <pthread.h>

// Referencias para threads:
// https://www.cs.cmu.edu/afs/cs/academic/class/15492-f07/www/pthreads.html

typedef struct {
    int socket_fd; // Socket file descriptor
    struct sockaddr_in client_addr;
    socklen_t addr_len; // Length of the address structure
    char *request; // Pointer to the DNS request data
    int request_size; // Size of the DNS request data
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


void * process_dns_request(void * arg) {
    dns_thread_args *args = (dns_thread_args *)arg;
    int dns_socket = args->socket_fd; // Socket file descriptor
    struct sockaddr_in client_addr = args->client_addr; // Client address
    socklen_t addr_len = args->addr_len; // Length of the address structure
    char *request = args->request; // Pointer to the DNS request data
    int request_size = args->request_size; // Size of the DNS request data

    printf("Processing DNS request of size %d bytes\n", request_size);
    printf("Received DNS request from %s:%d\n", inet_ntoa(client_addr.sin_addr), ntohs(client_addr.sin_port));
        
    dns_request * req = parse_dns_request(request, request_size);

    if (!req) {
        // Query no estándar, codificar en base 64 y enviar al dns_api/dns_resolver
        printf("Failed to parse DNS request\n");
        free(request);
        free(args);
        return NULL;
    }
    // Query estándar, enviar al dns_api/exists
    sendto(dns_socket, request, request_size, 0, (struct sockaddr *) &client_addr, addr_len);

    free(args->request);
    free(args);
    free(req->header);
    free(req->qname);
    free(req);
}

// Referencias para sockets:
// https://www.geeksforgeeks.org/udp-client-server-using-connect-c-implementation/
// https://www.youtube.com/watch?v=5PPfy-nUWIM
int main() {
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
        pthread_create(&thread_id, NULL, process_dns_request, args);
        pthread_detach(thread_id);
    }

    close(dns_socket);
    printf("DNS Interceptor stopped.\n");
    return 0;
}
