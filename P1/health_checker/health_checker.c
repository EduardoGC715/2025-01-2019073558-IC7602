#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <netdb.h>
#include <arpa/inet.h>
#include <fcntl.h>
#include <errno.h>
#include <time.h>
#include <sys/time.h>
#include <sys/types.h>
#include <stdbool.h>
#include <ctype.h>
#include <stdarg.h>

// Código basado en:
// https: // www.geeksforgeeks.org/tcp-server-client-implementation-in-c/
// https: // medium.com/@trish07/simple-steps-to-build-an-http-client-in-c-8e225b5c718c

#define BUFFER_SIZE 4096
#define DEFAULT_TIMEOUT 5     // 5 seconds default timeout
#define DEFAULT_MAX_RETRIES 3 // 3 retries by default
#define DEFAULT_HTTP_OK "200" // Default acceptable HTTP status code
FILE *log_file = NULL;
const char *LOG_FILENAME = "health_checker.log";

#ifdef TEST_MODE
#define ENABLE_LOGGING 1
#else
#define ENABLE_LOGGING 0
#endif

void log_message(const char *format, ...)
{
    if (ENABLE_LOGGING == 0 || log_file == NULL)
    {
        return; // Skip logging if disabled or no log file
    }

    // Rest of your logging implementation
    time_t now = time(NULL);
    char timestamp[26];
    strftime(timestamp, sizeof(timestamp), "%Y-%m-%d %H:%M:%S", localtime(&now));

    va_list args;
    va_start(args, format);
    char message[2048];
    vsnprintf(message, sizeof(message), format, args);
    va_end(args);

    printf("%s %s\n", timestamp, message);

    if (log_file)
    {
        fprintf(log_file, "%s %s\n", timestamp, message);
        fflush(log_file);
    }
}

// Structure to hold check results
typedef struct
{
    int success;
    double duration_ms;
    char status_code[4]; // For HTTP responses
} check_result_t;

// Function to check if a status code is in the list of acceptable codes
bool is_acceptable_status(const char *response, const char *acceptable_codes)
{
    char *codes_copy = strdup(acceptable_codes);
    char *token, *save_ptr;
    bool result = false;

    // Extract HTTP status code from response
    char *status_line = strstr(response, "HTTP/");
    if (!status_line)
    {
        free(codes_copy);
        return false;
    }

    // Find the status code (after "HTTP/X.X ")
    char *status_start = strchr(status_line, ' ');
    if (!status_start)
    {
        free(codes_copy);
        return false;
    }

    status_start++; // Skip the space
    char status_code[4] = {0};
    strncpy(status_code, status_start, 3);

    // Check if the status code matches any in our acceptable list
    token = strtok_r(codes_copy, ",", &save_ptr);
    while (token)
    {
        // Trim whitespace
        while (isspace(*token))
            token++;
        char *end = token + strlen(token) - 1;
        while (end > token && isspace(*end))
            *end-- = '\0';

        if (strcmp(status_code, token) == 0)
        {
            result = true;
            break;
        }
        token = strtok_r(NULL, ",", &save_ptr);
    }

    free(codes_copy);
    return result;
}

// Extract status code from HTTP response
void extract_status_code(const char *response, char *status_code_buf)
{
    // Extract the actual status code for reporting
    char *status_line = strstr(response, "HTTP/");
    if (status_line)
    {
        char *status_start = strchr(status_line, ' ');
        if (status_start)
        {
            strncpy(status_code_buf, status_start + 1, 3);
            status_code_buf[3] = '\0';
        }
        else
        {
            strcpy(status_code_buf, "???");
        }
    }
    else
    {
        strcpy(status_code_buf, "???");
    }
}

// Sets socket to non-blocking mode for timeout functionality
int set_nonblock(int sockfd)
{
    int flags = fcntl(sockfd, F_GETFL, 0);
    if (flags == -1)
        return -1;
    return fcntl(sockfd, F_SETFL, flags | O_NONBLOCK);
}

// Waits for socket to be ready with timeout
int wait_for_socket(int sockfd, int for_write, int timeout_secs)
{
    fd_set fds;
    struct timeval tv;
    FD_ZERO(&fds);
    FD_SET(sockfd, &fds);

    tv.tv_sec = timeout_secs;
    tv.tv_usec = 0;

    if (for_write)
        return select(sockfd + 1, NULL, &fds, NULL, &tv);
    else
        return select(sockfd + 1, &fds, NULL, NULL, &tv);
}

check_result_t tcp_check(const char *hostname, const char *port, int timeout_secs, int max_retries)
// Establishes a TCP connection to a specified host and port with timeout and retries
{
    struct addrinfo hints, *res, *p;
    int sockfd, retry_count = 0;
    struct timespec start, end;
    check_result_t result = {0, 0.0, ""};

    memset(&hints, 0, sizeof hints);
    hints.ai_family = AF_UNSPEC;     // IPv4 or IPv6
    hints.ai_socktype = SOCK_STREAM; // TCP

    if (getaddrinfo(hostname, port, &hints, &res) != 0)
    {
        perror("getaddrinfo");
        return result;
    }

    while (retry_count <= max_retries)
    {
        if (retry_count > 0)
        {
            log_message("TCP Connect: Retry attempt %d of %d\n", retry_count, max_retries);
            sleep(1);
        }

        // Start timing
        clock_gettime(CLOCK_MONOTONIC, &start);

        for (p = res; p != NULL; p = p->ai_next)
        {
            sockfd = socket(p->ai_family, p->ai_socktype, p->ai_protocol);
            if (sockfd == -1)
                continue;

            // Set non-blocking for timeout support
            if (set_nonblock(sockfd) < 0)
            {
                close(sockfd);
                continue;
            }

            // Attempt to connect
            int connect_result = connect(sockfd, p->ai_addr, p->ai_addrlen);
            if (connect_result == 0)
            {
                // Connection completed immediately
                clock_gettime(CLOCK_MONOTONIC, &end);
                result.success = 1;
                result.duration_ms = ((end.tv_sec - start.tv_sec) * 1000.0) +
                                     ((end.tv_nsec - start.tv_nsec) / 1000000.0);
                freeaddrinfo(res);
                close(sockfd);
                return result;
            }

            if (connect_result < 0 && errno != EINPROGRESS)
            {
                close(sockfd);
                continue;
            }

            // Connection in progress, wait for it with timeout
            int select_result = wait_for_socket(sockfd, 1, timeout_secs);

            if (select_result == 0)
            {
                // Timeout occurred
                close(sockfd);
                break; // Try next address or retry
            }
            else if (select_result < 0)
            {
                // Error occurred
                close(sockfd);
                continue;
            }

            // Check if connection was successful
            int so_error;
            socklen_t len = sizeof(so_error);
            getsockopt(sockfd, SOL_SOCKET, SO_ERROR, &so_error, &len);

            if (so_error == 0)
            {
                // Connection successful
                // Set back to blocking mode
                int flags = fcntl(sockfd, F_GETFL, 0);
                fcntl(sockfd, F_SETFL, flags & ~O_NONBLOCK);

                // End timing
                clock_gettime(CLOCK_MONOTONIC, &end);
                result.success = 1;
                result.duration_ms = ((end.tv_sec - start.tv_sec) * 1000.0) +
                                     ((end.tv_nsec - start.tv_nsec) / 1000000.0);

                freeaddrinfo(res);
                close(sockfd);
                return result;
            }

            close(sockfd);
        }

        retry_count++;
    }

    freeaddrinfo(res);
    log_message("Connection failed after %d attempts", max_retries + 1);
    return result;
}

check_result_t http_check(const char *hostname, const char *port, const char *path,
                          int timeout_secs, int max_retries, const char *acceptable_status_codes,
                          const char *host_header)
{
    int retry_count = 0;
    check_result_t result = {0, 0.0, ""};
    struct timespec start, end;

    while (retry_count <= max_retries)
    {
        if (retry_count > 0)
        {
            log_message("HTTP Check: Retry attempt %d of %d\n", retry_count, max_retries);
            sleep(1);
        }

        // Start timing for overall HTTP operation
        clock_gettime(CLOCK_MONOTONIC, &start);

        // First establish a TCP connection
        struct addrinfo hints, *res;
        int sockfd;

        memset(&hints, 0, sizeof hints);
        hints.ai_family = AF_UNSPEC;
        hints.ai_socktype = SOCK_STREAM;

        if (getaddrinfo(hostname, port, &hints, &res) != 0)
        {
            log_message("getaddrinfo failed");
            retry_count++;
            continue;
        }

        sockfd = socket(res->ai_family, res->ai_socktype, res->ai_protocol);
        if (sockfd == -1)
        {
            log_message("socket creation failed");
            freeaddrinfo(res);
            retry_count++;
            continue;
        }

        // Set non-blocking and connect with timeout
        if (set_nonblock(sockfd) < 0)
        {
            log_message("Failed to set non-blocking mode");
            close(sockfd);
            freeaddrinfo(res);
            retry_count++;
            continue;
        }

        int connect_result = connect(sockfd, res->ai_addr, res->ai_addrlen);
        if (connect_result < 0 && errno != EINPROGRESS)
        {
            log_message("connect failed: %s", strerror(errno));
            close(sockfd);
            freeaddrinfo(res);
            retry_count++;
            continue;
        }

        // Wait for connection to be established
        if (connect_result < 0)
        { // Would block, wait with select
            int select_result = wait_for_socket(sockfd, 1, timeout_secs);
            if (select_result <= 0)
            {
                log_message("Connection timed out or failed");
                close(sockfd);
                freeaddrinfo(res);
                retry_count++;
                continue;
            }

            // Check if connection was successful
            int so_error;
            socklen_t len = sizeof(so_error);
            getsockopt(sockfd, SOL_SOCKET, SO_ERROR, &so_error, &len);

            if (so_error != 0)
            {
                log_message("Connection failed after select: %s", strerror(so_error));
                close(sockfd);
                freeaddrinfo(res);
                retry_count++;
                continue;
            }
        }

        // Set back to blocking mode for simpler I/O
        int flags = fcntl(sockfd, F_GETFL, 0);
        fcntl(sockfd, F_SETFL, flags & ~O_NONBLOCK);

        // Set socket read timeout
        struct timeval tv;
        tv.tv_sec = timeout_secs;
        tv.tv_usec = 0;
        setsockopt(sockfd, SOL_SOCKET, SO_RCVTIMEO, (const char *)&tv, sizeof tv);

        char request[1024];
        const char *effective_host = host_header && strlen(host_header) > 0 ? host_header : hostname;

        snprintf(request, sizeof(request),
                 "GET %s HTTP/1.1\r\nHost: %s\r\nConnection: close\r\nUser-Agent: HealthChecker/1.0\r\n\r\n",
                 path, effective_host);

        send(sockfd, request, strlen(request), 0);

        char buffer[BUFFER_SIZE];
        int bytes = recv(sockfd, buffer, sizeof(buffer) - 1, 0);

        freeaddrinfo(res);
        close(sockfd);

        // End timing
        clock_gettime(CLOCK_MONOTONIC, &end);
        double duration = ((end.tv_sec - start.tv_sec) * 1000.0) +
                          ((end.tv_nsec - start.tv_nsec) / 1000000.0);

        if (bytes <= 0)
        {
            log_message("Failed to receive HTTP response.");
            retry_count++;
            continue;
        }

        buffer[bytes] = '\0';

        // Extract status code
        extract_status_code(buffer, result.status_code);

        // Check if the HTTP status code is in our list of acceptable codes
        if (is_acceptable_status(buffer, acceptable_status_codes))
        {
            log_message("HTTP check passed: %s status code (%.2f ms)\n", result.status_code, duration);
            result.success = 1;
            result.duration_ms = duration;
            return result;
        }
        else
        {
            log_message("HTTP check failed. Status code: %s. Response first line:\n", result.status_code);

            // Print just the first line of the response
            char *newline = strchr(buffer, '\n');
            if (newline)
                *newline = '\0';
            log_message("%s\n", buffer);

            retry_count++;
            continue;
        }
    }

    return result; // All attempts failed
}

void print_usage(const char *program_name)
{
    fprintf(stderr, "Usage:\n");
    fprintf(stderr, "  For TCP check: %s --tcp <hostname> <port> [timeout] [max_retries]\n", program_name);
    fprintf(stderr, "  For HTTP check: %s --http <hostname> <port> <path> [timeout] [max_retries] [acceptable_status_codes]\n", program_name);
    fprintf(stderr, "  Default timeout: %d seconds\n", DEFAULT_TIMEOUT);
    fprintf(stderr, "  Default max retries: %d attempts\n", DEFAULT_MAX_RETRIES);
    fprintf(stderr, "  Default acceptable HTTP status code: %s\n", DEFAULT_HTTP_OK);
    fprintf(stderr, "  For multiple status codes, use comma-separated list, e.g., \"200,201,302\"\n");
}

int main(int argc, char *argv[])
{
    // Initialize log file
    log_file = fopen(LOG_FILENAME, "a");
    if (!log_file)
    {
        fprintf(stderr, "Warning: Could not open log file %s\n", LOG_FILENAME);
    }

    if (argc < 4)
    {
        print_usage(argv[0]);
        return 1;
    }

    const char *check_type = argv[1];
    int success = 0;
    double duration_ms = 0.0;
    char status_code[4] = "";
    int timeout = DEFAULT_TIMEOUT;
    int max_retries = DEFAULT_MAX_RETRIES;
    const char *acceptable_codes = DEFAULT_HTTP_OK;

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

        // Parse optional timeout and retries
        if (argc > 4)
            timeout = atoi(argv[4]);
        if (argc > 5)
            max_retries = atoi(argv[5]);

        if (timeout <= 0)
            timeout = DEFAULT_TIMEOUT;
        if (max_retries < 0)
            max_retries = DEFAULT_MAX_RETRIES;

        log_message("Checking TCP connection to %s:%s (timeout: %ds, max retries: %d)...\n",
                    hostname, port, timeout, max_retries);

        check_result_t result = tcp_check(hostname, port, timeout, max_retries);
        success = result.success;
        duration_ms = result.duration_ms;

        if (!success)
        {
            log_message("TCP check failed.");
        }
        else
        {
            log_message("TCP connection successful (%.2f ms).\n", duration_ms);
        }

        // Output machine-readable result
        log_message("RESULT: {\"success\": %s, \"duration_ms\": %.2f}\n",
                    success ? "true" : "false", duration_ms);
        fflush(stdout);
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

        // Parse optional timeout and retries
        if (argc > 5)
            timeout = atoi(argv[5]);
        if (argc > 6)
            max_retries = atoi(argv[6]);
        if (argc > 7)
            acceptable_codes = argv[7];
        const char *host_header = "";
        if (argc > 8)
        {
            host_header = argv[8];
        }

        if (timeout <= 0)
            timeout = DEFAULT_TIMEOUT;
        if (max_retries < 0)
            max_retries = DEFAULT_MAX_RETRIES;

        log_message("Checking HTTP path %s on %s:%s (timeout: %ds, max retries: %d, acceptable codes: %s)...\n",
                    path, hostname, port, timeout, max_retries, acceptable_codes);

        check_result_t result = http_check(hostname, port, path, timeout, max_retries, acceptable_codes, host_header);
        success = result.success;
        duration_ms = result.duration_ms;
        strncpy(status_code, result.status_code, sizeof(status_code));

        // Output machine-readable result
        log_message("RESULT: {\"success\": %s, \"duration_ms\": %.2f}\n",
                    success ? "true" : "false", duration_ms);
        fflush(stdout);
    }
    else
    {
        print_usage(argv[0]);
        return 1;
    }

    // Add this before returning
    if (log_file)
    {
        fclose(log_file);
    }

    return success ? 0 : 1;
}