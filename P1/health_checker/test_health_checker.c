// test_health_checker.c
#include <check.h>
#include <stdlib.h>
#include <stdio.h>
#include <string.h>

// We need to mock the main function to avoid conflicts
#define main health_checker_main
// Include health_checker.c directly to test its functions
#include "health_checker.c"
#undef main

// Test is_acceptable_status function
START_TEST(test_is_acceptable_status)
{
    // Test with matching status code
    char response[] = "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n<html>...</html>";
    ck_assert_int_eq(is_acceptable_status(response, "200"), true);

    // Test with non-matching status code
    ck_assert_int_eq(is_acceptable_status(response, "404"), false);

    // Test with multiple acceptable status codes
    ck_assert_int_eq(is_acceptable_status(response, "404,200,302"), true);

    // Test with whitespace in status codes
    ck_assert_int_eq(is_acceptable_status(response, "404, 200, 302"), true);

    // Test with invalid response
    ck_assert_int_eq(is_acceptable_status("Invalid response", "200"), false);
}
END_TEST

// Test extract_status_code function
START_TEST(test_extract_status_code)
{
    char status_code[4];

    // Test normal HTTP response
    char response1[] = "HTTP/1.1 200 OK\r\nContent-Type: text/html\r\n\r\n<html>...</html>";
    extract_status_code(response1, status_code);
    ck_assert_str_eq(status_code, "200");

    // Test different status code
    char response2[] = "HTTP/1.1 404 Not Found\r\nContent-Type: text/html\r\n\r\n<html>...</html>";
    extract_status_code(response2, status_code);
    ck_assert_str_eq(status_code, "404");

    // Test invalid response
    char response3[] = "Invalid response";
    extract_status_code(response3, status_code);
    ck_assert_str_eq(status_code, "???");
}
END_TEST

// Test log_message function
START_TEST(test_log_message)
{
    // Redirect stdout to capture output
    char buffer[1024];
    FILE *temp = tmpfile();
    FILE *old_stdout = stdout;
    stdout = temp;

    // Call the function
    log_message("Test message %d", 123);

    // Restore stdout
    fflush(stdout);
    rewind(temp);
    fgets(buffer, sizeof(buffer), temp);
    stdout = old_stdout;
    fclose(temp);

    // Check that output contains our message
    ck_assert(strstr(buffer, "Test message 123") != NULL);
}
END_TEST

// Integration test that actually runs the health checker
START_TEST(test_health_checker_integration)
{
    // This test will create a simple child process to run the health checker
    // and verify it behaves correctly with real parameters

    // Fork is not available on Windows, so we'll use system() for this test

    // Compile the health_checker first
    system("gcc -o health_checker_test health_checker.c");

    // We'll test with localhost (should fail but in a predictable way)
    // Using --tcp since it's faster than HTTP for testing
    char command[256];
    sprintf(command, "./health_checker_test --tcp localhost 12345 1 1 > test_output.txt 2>&1");

    // Run the health checker
    int status = system(command);

    // Read the output
    FILE *output = fopen("test_output.txt", "r");
    ck_assert_ptr_ne(output, NULL);

    char output_text[4096] = {0};
    size_t read_size = fread(output_text, 1, sizeof(output_text) - 1, output);
    fclose(output);

    // Clean up
    remove("health_checker_test");
    remove("test_output.txt");

    // Since we're connecting to a likely closed port, we expect a failure (non-zero status)
    ck_assert_int_ne(status, 0);

    // Verify output contains expected messages
    ck_assert(strstr(output_text, "Checking TCP connection to localhost:12345") != NULL);
}
END_TEST

// Test for sending HTTP request to a real server
START_TEST(test_http_request)
{
    // This is a more comprehensive test that actually attempts an HTTP request
    // Note: This test depends on external resources and may fail if network is unavailable

    // Create a simple HTTP server using Python if available
    int server_started = 0;
    int server_pid = 0;

    // We'll attempt to create a simple HTTP server on port 8000
    FILE *python_check = popen("which python3", "r");
    char python_path[256] = {0};
    if (python_check && fgets(python_path, sizeof(python_path), python_check))
    {
        // Python is available, start simple HTTP server
        fclose(python_check);

        // Remove newline from python_path
        python_path[strcspn(python_path, "\n")] = 0;

        // Create a simple index.html
        FILE *index_html = fopen("index.html", "w");
        if (index_html)
        {
            fprintf(index_html, "<html><body>Test Server</body></html>");
            fclose(index_html);

            // Start Python HTTP server in background
            char cmd[512];
            sprintf(cmd, "%s -m http.server 8000 > /dev/null 2>&1 &", python_path);
            system(cmd);

            // Give server time to start
            sleep(1);
            server_started = 1;
        }
    }
    else if (python_check)
    {
        fclose(python_check);
    }

    // Now compile and run health checker with HTTP check
    system("gcc -o health_checker_test health_checker.c");

    FILE *output;
    char command[512];

    if (server_started)
    {
        // If we started a server, test against it
        sprintf(command, "./health_checker_test --http localhost 8000 / 1 1 200");
        output = popen(command, "r");
    }
    else
    {
        // Otherwise, test against a well-known server that should exist
        // Use a short timeout to keep test fast
        sprintf(command, "./health_checker_test --http example.com 80 / 1 1 200,404,302,301");
        output = popen(command, "r");
    }

    // Read the output
    char output_text[4096] = {0};
    size_t read_size = 0;
    if (output)
    {
        read_size = fread(output_text, 1, sizeof(output_text) - 1, output);
        pclose(output);
    }

    // Clean up
    remove("health_checker_test");
    if (server_started)
    {
        system("pkill -f 'python3 -m http.server 8000'");
        remove("index.html");
    }

    // We don't assert the return code, as this is an external connection
    // that might fail for network reasons outside our control

    // Instead, verify output contains expected HTTP check text
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

// Main test suite
Suite *health_checker_suite(void)
{
    Suite *s;
    TCase *tc_core, *tc_integration;

    s = suite_create("HealthChecker");

    // Core unit tests
    tc_core = tcase_create("Core");
    tcase_add_test(tc_core, test_is_acceptable_status);
    tcase_add_test(tc_core, test_extract_status_code);
    tcase_add_test(tc_core, test_log_message);
    suite_add_tcase(s, tc_core);

    // Integration tests that actually run the health checker
    tc_integration = tcase_create("Integration");
    tcase_add_test(tc_integration, test_health_checker_integration);
    tcase_add_test(tc_integration, test_http_request);
    // Integration tests may take longer
    tcase_set_timeout(tc_integration, 10);
    suite_add_tcase(s, tc_integration);

    return s;
}

// Test runner
int main(void)
{
    int number_failed;
    Suite *s;
    SRunner *sr;

    s = health_checker_suite();
    sr = srunner_create(s);

    // Set up log file output
    srunner_set_log(sr, "health_checker_unittest.log");

    // Run tests and save results to log file
    srunner_run_all(sr, CK_NORMAL);
    number_failed = srunner_ntests_failed(sr);

    // Print summary to console
    printf("\nTest results saved to health_checker_unittest.log\n");
    printf("Tests run: %d, Failed: %d\n", srunner_ntests_run(sr), number_failed);

    srunner_free(sr);

    return (number_failed == 0) ? EXIT_SUCCESS : EXIT_FAILURE;
}