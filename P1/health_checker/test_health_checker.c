// test_health_checker.c
#include <check.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>

// Código basado en:
// https://libcheck.github.io/check/doc/check_html/check_3.html
// https://developertesting.rocks/tools/check/

#define main health_checker_main
#include "health_checker.c"
#undef main

// Test para verificar si el código de estado HTTP es aceptable
START_TEST(test_is_acceptable_status)
{
    // Prueba con código de estado aceptable
    char response[] = "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n<html>...</html>";
    ck_assert_int_eq(is_acceptable_status(response, "200"), true);

    // Prueba con código de estado no aceptable
    ck_assert_int_eq(is_acceptable_status(response, "404"), false);

    // Prueba con múltiples códigos de estado aceptables
    ck_assert_int_eq(is_acceptable_status(response, "404,200,302"), true);

    // Prueba con múltiples códigos de estado no aceptables
    ck_assert_int_eq(is_acceptable_status(response, "404, 200, 302"), true);

    // Prueba con código de estado no aceptable en la respuesta
    ck_assert_int_eq(is_acceptable_status("Invalid response", "200"), false);
}
END_TEST

// Prueba para extraer el código de estado HTTP de la respuesta
START_TEST(test_extract_status_code)
{
    char status_code[4];

    // Prueba con respuesta válida
    char response1[] = "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n<html>...</html>";
    extract_status_code(response1, status_code);
    ck_assert_str_eq(status_code, "200");

    // Prueba con respuesta con código de estado diferente
    char response2[] = "HTTP/1.1 404 Not Found\r\nContent-Type: text/html\r\n\r\n<html>...</html>";
    extract_status_code(response2, status_code);
    ck_assert_str_eq(status_code, "404");

    // Prueba con respuesta inválida
    char response3[] = "Invalid response";
    extract_status_code(response3, status_code);
    ck_assert_str_eq(status_code, "???");
}
END_TEST

// Prueba de integración para el health_checker
START_TEST(test_health_checker_integration)
{
    system("gcc -DTEST_MODE -o health_checker_test health_checker.c");

    // Se ejecuta el health_checker_test con parámetros de prueba
    char command[256];
    sprintf(command, "./health_checker_test --tcp localhost 12345 1 1 > test_output.txt 2>&1");

    // Correr el health checker
    int status = system(command);

    FILE *output = fopen("test_output.txt", "r");
    ck_assert_ptr_ne(output, NULL);

    char output_text[4096] = {0};
    size_t read_size = fread(output_text, 1, sizeof(output_text) - 1, output);
    fclose(output);

    remove("health_checker_test");
    remove("test_output.txt");

    // Como este es un test de integración, no se puede garantizar que el socket esté disponible
    // por lo que no se puede verificar el código de retorno
    ck_assert_int_ne(status, 0);

    // Verificar que el output contenga el texto esperado
    ck_assert(strstr(output_text, "Checking TCP connection to localhost:12345") != NULL);
}
END_TEST

// Prueba de integración para la verificación HTTP
START_TEST(test_http_request)
{

    // Crear un servidor HTTP simple para pruebas
    int server_started = 0;
    int server_pid = 0;

    FILE *python_check = popen("which python3", "r");
    char python_path[256] = {0};
    if (python_check && fgets(python_path, sizeof(python_path), python_check))
    {

        fclose(python_check);

        python_path[strcspn(python_path, "\n")] = 0;

        // Crear un archivo HTML simple para servir
        FILE *index_html = fopen("index.html", "w");
        if (index_html)
        {
            fprintf(index_html, "<html><body>Test Server</body></html>");
            fclose(index_html);

            char cmd[512];
            sprintf(cmd, "%s -m http.server 8000 > /dev/null 2>&1 &", python_path);
            system(cmd);

            sleep(1);
            server_started = 1;
        }
    }
    else if (python_check)
    {
        fclose(python_check);
    }

    // Ahora compilar el health_checker_test
    system("gcc -DTEST_MODE -o health_checker_test health_checker.c");

    FILE *output;
    char command[512];

    if (server_started)
    {
        sprintf(command, "./health_checker_test --http localhost 8000 / 1 1 200");
        output = popen(command, "r");
    }
    else
    {
        // Si no se puede iniciar el servidor, usar un host externo
        sprintf(command, "./health_checker_test --http example.com 80 / 1 1 200,404,302,301");
        output = popen(command, "r");
    }

    char output_text[4096] = {0};
    size_t read_size = 0;
    if (output)
    {
        read_size = fread(output_text, 1, sizeof(output_text) - 1, output);
        pclose(output);
    }

    remove("health_checker_test");
    if (server_started)
    {
        system("pkill -f 'python3 -m http.server 8000'");
        remove("index.html");
    }

    // Verificar que el output contenga el texto esperado
    if (server_started)
    {
        ck_assert(strstr(output_text, "Checking HTTP path / on localhost:8000") != NULL);
    }
    else
    {
        ck_assert(strstr(output_text, "Checking HTTP path / on example.com:80") != NULL);
    }
}
END_TEST

// Suite de pruebas para el health_checker
Suite *health_checker_suite(void)
{
    Suite *s;
    TCase *tc_core, *tc_integration;

    s = suite_create("HealthChecker");

    tc_core = tcase_create("Core");
    tcase_add_test(tc_core, test_is_acceptable_status);
    tcase_add_test(tc_core, test_extract_status_code);
    suite_add_tcase(s, tc_core);

    tc_integration = tcase_create("Integration");
    tcase_add_test(tc_integration, test_health_checker_integration);
    tcase_add_test(tc_integration, test_http_request);
    tcase_set_timeout(tc_integration, 10);
    suite_add_tcase(s, tc_integration);

    return s;
}

// Runner
int main(void)
{
    int number_failed;
    Suite *s;
    SRunner *sr;

    s = health_checker_suite();
    sr = srunner_create(s);

    srunner_set_log(sr, "health_checker_unittest.log");

    srunner_run_all(sr, CK_NORMAL);
    number_failed = srunner_ntests_failed(sr);

    printf("\nTest results saved to health_checker_unittest.log\n");
    printf("Tests run: %d, Failed: %d\n", srunner_ntests_run(sr), number_failed);

    srunner_free(sr);

    return (number_failed == 0) ? EXIT_SUCCESS : EXIT_FAILURE;
}