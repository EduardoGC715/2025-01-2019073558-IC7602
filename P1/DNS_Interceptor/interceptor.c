#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/socket.h>
#include <arpa/inet.h>
#include <netinet/in.h>
#include <pthread.h>

typedef struct {
    int socket_fd; // Socket file descriptor
    struct sockaddr_in client_addr;
    socklen_t addr_len; // Length of the address structure
    char *request; // Pointer to the DNS request data
    int request_size; // Size of the DNS request data
} dns_thread_args;

// Referencias para threads:
// https://www.cs.cmu.edu/afs/cs/academic/class/15492-f07/www/pthreads.html
void * process_dns_request(void * arg) {
    dns_thread_args *args = (dns_thread_args *)arg;
    int dns_socket = args->socket_fd; // Socket file descriptor
    struct sockaddr_in client_addr = args->client_addr; // Client address
    socklen_t addr_len = args->addr_len; // Length of the address structure
    char *request = args->request; // Pointer to the DNS request data
    int request_size = args->request_size; // Size of the DNS request data

    // Aquí puedes procesar la solicitud DNS como desees
    // Por ejemplo, puedes imprimirla o modificarla
    printf("Processing DNS request of size %d bytes\n", request_size);
    printf("Request data: %s", request);

    // Process DNS request (e.g., log it, modify it, etc.)
    printf("Received DNS request from %s:%d\n", inet_ntoa(client_addr.sin_addr), ntohs(client_addr.sin_port));
        
    // Send a response (for demonstration purposes, we just echo the request back)
    sendto(dns_socket, request, request_size, 0, (struct sockaddr *) &client_addr, addr_len);

    free(args->request);
    free(args);
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
