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
#define DEFAULT_TIMEOUT 5
#define DEFAULT_MAX_RETRIES 3
#define DEFAULT_HTTP_OK "200"
FILE *log_file = NULL;
const char *LOG_FILENAME = "health_checker.log";

#ifdef TEST_MODE
#define ENABLE_LOGGING 1
#else
#define ENABLE_LOGGING 0
#endif

void log_message(const char *format, ...)
{
    if (ENABLE_LOGGING == 1 || log_file == NULL)
    {
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
}

// Estructura para almacenar el resultado de la verificación
typedef struct
{
    int success;
    double duration_ms;
    char status_code[4];
} check_result_t;

// Funcion para verificar si el código de estado HTTP es aceptable
bool is_acceptable_status(const char *response, const char *acceptable_codes)
{
    char *codes_copy = strdup(acceptable_codes);
    char *token, *save_ptr;
    bool result = false;

    char *status_line = strstr(response, "HTTP/");
    if (!status_line)
    {
        free(codes_copy);
        return false;
    }

    char *status_start = strchr(status_line, ' ');
    if (!status_start)
    {
        free(codes_copy);
        return false;
    }

    status_start++;
    char status_code[4] = {0};
    strncpy(status_code, status_start, 3);

    token = strtok_r(codes_copy, ",", &save_ptr);
    while (token)
    {
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

// Extraer el código de estado HTTP de la respuesta
void extract_status_code(const char *response, char *status_code_buf)
{
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
// Funcion para verificar la disponibilidad de un servidor TCP
// Pasos:
// 1. Obtener la dirección IP del servidor utilizando getaddrinfo
// 2. Crear un socket TCP utilizando socket()
// 3. Configurar el socket para que tenga un tiempo de espera utilizando setsockopt
// 4. Intentar conectarse al servidor utilizando connect()
// 5. Si la conexión es exitosa, medir el tiempo de conexión y devolver el resultado
// 6. Si la conexión falla, cerrar el socket y volver a intentar hasta el número máximo de reintentos
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

        // Empezar a medir el tiempo para la operación de conexión
        clock_gettime(CLOCK_MONOTONIC, &start);

        for (p = res; p != NULL; p = p->ai_next)
        {
            sockfd = socket(p->ai_family, p->ai_socktype, p->ai_protocol);
            if (sockfd == -1)
                continue;

            struct timeval tv;
            tv.tv_sec = timeout_secs;
            tv.tv_usec = 0;
            if (setsockopt(sockfd, SOL_SOCKET, SO_SNDTIMEO, &tv, sizeof(tv)) < 0 ||
                setsockopt(sockfd, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv)) < 0)
            {
                close(sockfd);
                continue;
            }

            if (connect(sockfd, p->ai_addr, p->ai_addrlen) == 0)
            { // Success
                clock_gettime(CLOCK_MONOTONIC, &end);
                result.success = 1;
                result.duration_ms = ((end.tv_sec - start.tv_sec) * 1000.0) +
                                     ((end.tv_nsec - start.tv_nsec) / 1000000.0);
                freeaddrinfo(res);
                close(sockfd);
                return result;
            }
            else // Fail
            {

                close(sockfd);
                continue;
            }
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
// Funcion para verificar la disponibilidad de un servidor HTTP
// Pasos:
// 1. Realizar una solicitud HTTP GET al servidor especificado
// 2. Esperar la respuesta del servidor
// 3. Extraer el código de estado HTTP de la respuesta
// 4. Comparar el código de estado con los códigos aceptables
// 5. Si el código de estado es aceptable, devolver el resultado como exitoso
// 6. Si el código de estado no es aceptable, devolver el resultado como fallido
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

        clock_gettime(CLOCK_MONOTONIC, &start);

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

        struct timeval tv;
        tv.tv_sec = timeout_secs;
        tv.tv_usec = 0;
        if (setsockopt(sockfd, SOL_SOCKET, SO_SNDTIMEO, &tv, sizeof(tv)) < 0 ||
            setsockopt(sockfd, SOL_SOCKET, SO_RCVTIMEO, &tv, sizeof(tv)) < 0)
        {
            log_message("Failed to set socket timeouts");
            close(sockfd);
            freeaddrinfo(res);
            retry_count++;
            continue;
        }

        if (connect(sockfd, res->ai_addr, res->ai_addrlen) != 0)
        {
            log_message("connect failed: %s", strerror(errno));
            close(sockfd);
            freeaddrinfo(res);
            retry_count++;
            continue;
        }

        char request[1024];
        const char *effective_host = host_header && strlen(host_header) > 0 ? host_header : hostname;

        snprintf(request, sizeof(request),
                 "GET %s HTTP/1.1\r\nHost: %s\r\nConnection: close\r\nUser-Agent: HealthChecker/1.0\r\n\r\n",
                 path, effective_host);

        if (send(sockfd, request, strlen(request), 0) < 0)
        {
            log_message("Failed to send HTTP request: %s", strerror(errno));
            close(sockfd);
            freeaddrinfo(res);
            retry_count++;
            continue;
        }

        char buffer[BUFFER_SIZE];
        int bytes = recv(sockfd, buffer, sizeof(buffer) - 1, 0);

        freeaddrinfo(res);
        close(sockfd);

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

        extract_status_code(buffer, result.status_code);
        if (is_acceptable_status(buffer, acceptable_status_codes))
        // Verifica si el código de estado es aceptable
        {
            log_message("HTTP check passed: %s status code (%.2f ms)\n", result.status_code, duration);
            result.success = 1;
            result.duration_ms = duration;
            return result;
        }
        else
        // Si el código de estado no es aceptable, imprime el mensaje de error
        {
            log_message("HTTP check failed. Status code: %s. Response first line:\n", result.status_code);

            char *newline = strchr(buffer, '\n');
            if (newline)
                *newline = '\0';
            log_message("%s\n", buffer);

            retry_count++;
            continue;
        }
    }

    return result; // Maximo de reintentos alcanzado
}

int main(int argc, char *argv[])
{
    log_file = fopen(LOG_FILENAME, "a");
    if (!log_file)
    {
        fprintf(stderr, "Warning: Could not open log file %s\n", LOG_FILENAME);
    }

    if (argc < 4)
    {
        return 1;
    }

    const char *check_type = argv[1];
    int success = 0;
    double duration_ms = 0.0;
    char status_code[4] = "";
    int timeout = DEFAULT_TIMEOUT;
    int max_retries = DEFAULT_MAX_RETRIES;
    const char *acceptable_codes = DEFAULT_HTTP_OK;

    if (strcmp(check_type, "--tcp") == 0)
    {
        if (argc < 4)
        {
            return 1;
        }

        const char *hostname = argv[2];
        const char *port = argv[3];

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

        printf("RESULT: {\"success\": %s, \"duration_ms\": %.2f}\n",
               success ? "true" : "false", duration_ms);
        fflush(stdout);
    }
    else if (strcmp(check_type, "--http") == 0)
    {

        const char *hostname = argv[2];
        const char *port = argv[3];
        const char *path = argv[4];

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

        printf("RESULT: {\"success\": %s, \"duration_ms\": %.2f}\n",
               success ? "true" : "false", duration_ms);
        fflush(stdout);
    }
    else
    {
        return 1;
    }

    if (log_file)
    {
        fclose(log_file);
    }

    return success ? 0 : 1;
}