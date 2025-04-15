#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <netdb.h>
#include <arpa/inet.h>

#define BUFFER_SIZE 4096

int tcp_connect(const char *hostname, const char *port)
{
    struct addrinfo hints, *res, *p;
    int sockfd;

    memset(&hints, 0, sizeof hints);
    hints.ai_family = AF_UNSPEC;     // IPv4 or IPv6
    hints.ai_socktype = SOCK_STREAM; // TCP

    if (getaddrinfo(hostname, port, &hints, &res) != 0)
    {
        perror("getaddrinfo");
        return -1;
    }

    for (p = res; p != NULL; p = p->ai_next)
    {
        sockfd = socket(p->ai_family, p->ai_socktype, p->ai_protocol);
        if (sockfd == -1)
            continue;

        if (connect(sockfd, p->ai_addr, p->ai_addrlen) == 0)
        {
            freeaddrinfo(res);
            return sockfd; // success
        }

        close(sockfd);
    }

    freeaddrinfo(res);
    return -1;
}

int http_check(const char *hostname, const char *port, const char *path)
{
    int sockfd = tcp_connect(hostname, port);
    if (sockfd < 0)
    {
        fprintf(stderr, "TCP connection to %s:%s failed.\n", hostname, port);
        return 0;
    }

    char request[1024];
    snprintf(request, sizeof(request),
             "GET %s HTTP/1.1\r\nHost: %s\r\nConnection: close\r\n\r\n",
             path, hostname);

    send(sockfd, request, strlen(request), 0);

    char buffer[BUFFER_SIZE];
    int bytes = recv(sockfd, buffer, sizeof(buffer) - 1, 0);
    close(sockfd);

    if (bytes <= 0)
    {
        fprintf(stderr, "Failed to receive HTTP response.\n");
        return 0;
    }

    buffer[bytes] = '\0';
    if (strstr(buffer, "200 OK"))
    {
        printf("HTTP check passed: 200 OK\n");
        return 1;
    }
    else
    {
        printf("HTTP check failed. Response:\n%s\n", buffer);
        return 0;
    }
}

void print_usage(const char *program_name)
{
    fprintf(stderr, "Usage:\n");
    fprintf(stderr, "  For TCP check: %s --tcp <hostname> <port>\n", program_name);
    fprintf(stderr, "  For HTTP check: %s --http <hostname> <port> <path>\n", program_name);
}

int main(int argc, char *argv[])
{
    if (argc < 4)
    {
        print_usage(argv[0]);
        return 1;
    }

    const char *check_type = argv[1];
    int success = 0;

    // Format result for easy parsing by Python script
    if (strcmp(check_type, "--tcp") == 0)
    {
        if (argc < 4)
        {
            print_usage(argv[0]);
            return 1;
        }

        const char *hostname = argv[2];
        const char *port = argv[3];

        printf("Checking TCP connection to %s:%s...\n", hostname, port);
        int sockfd = tcp_connect(hostname, port);
        if (sockfd < 0)
        {
            fprintf(stderr, "TCP check failed.\n");
            success = 0;
        }
        else
        {
            printf("TCP connection successful.\n");
            success = 1;
            close(sockfd);
        }

        // Output machine-readable result
        printf("RESULT: {\"host\": \"%s\", \"port\": \"%s\", \"check_type\": \"tcp\", \"success\": %d}\n",
               hostname, port, success);
    }
    else if (strcmp(check_type, "--http") == 0)
    {
        if (argc < 5)
        {
            print_usage(argv[0]);
            return 1;
        }

        const char *hostname = argv[2];
        const char *port = argv[3];
        const char *path = argv[4];

        printf("Checking HTTP path %s on %s:%s...\n", path, hostname, port);
        success = http_check(hostname, port, path);

        // Output machine-readable result
        printf("RESULT: {\"host\": \"%s\", \"port\": \"%s\", \"path\": \"%s\", \"check_type\": \"http\", \"success\": %d}\n",
               hostname, port, path, success);
    }
    else
    {
        print_usage(argv[0]);
        return 1;
    }

    return success ? 0 : 1;
}