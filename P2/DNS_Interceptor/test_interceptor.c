#include <check.h>
#include <stdlib.h>
#include <string.h>
#include "interceptor.h"

// Código basado en:
// https://libcheck.github.io/check/doc/check_html/check_3.html
// https://developertesting.rocks/tools/check/

START_TEST(test_parse_dns_header) {
    char request[12] = {0x12, 0x34, 0x01, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00};
    dns_header *header = parse_dns_header(request);

    ck_assert_ptr_nonnull(header);
    ck_assert_uint_eq(header->id, 0x1234);
    ck_assert_uint_eq(header->qr, 0);
    ck_assert_uint_eq(header->opcode, 0);
    ck_assert_uint_eq(header->rd, 1);
    ck_assert_uint_eq(header->qdcount, 1);

    free(header);
}
END_TEST

START_TEST(test_parse_qname) {
    char request[] = {0x03, 'w', 'w', 'w', 0x06, 'g', 'o', 'o', 'g', 'l', 'e', 0x03, 'c', 'o', 'm', 0x00};
    int offset = 0;
    char *qname = parse_qname(request, &offset);

    ck_assert_ptr_nonnull(qname);
    ck_assert_str_eq(qname, "www.google.com");
    ck_assert_int_eq(offset, 16);

    free(qname);
}
END_TEST

START_TEST(test_encode_b64) {
    const char data[] = "hello";
    int actual_length = 0;
    char *encoded = encode_b64(data, strlen(data), &actual_length);

    ck_assert_ptr_nonnull(encoded);
    ck_assert_str_eq(encoded, "aGVsbG8=");
    ck_assert_int_eq(actual_length, 8);

    free(encoded);
}
END_TEST

START_TEST(test_decode_b64) {
    const char encoded[] = "aGVsbG8=";
    base64_decoded_data *decoded = decode_b64(encoded, strlen(encoded));

    ck_assert_ptr_nonnull(decoded);
    ck_assert_str_eq(decoded->data, "hello");
    ck_assert_int_eq(decoded->length, 5);

    free(decoded->data);
    free(decoded);
}
END_TEST

START_TEST(test_build_dns_url_with_params) {
    char *url = build_dns_url(
        "dns_api", "5000",
        "/api/exists",
        "192.168.1.10", "www.google.com"
    );
    ck_assert_ptr_nonnull(url);
    ck_assert_str_eq(
        url,
        "https://dns_api:5000/api/exists?domain=www.google.com&ip=192.168.1.10"
    );
    free(url);
}
END_TEST

START_TEST(test_parse_dns_request) {
    // Se construye un paquete DNS de ejemplo
    // ID = 0xBEEF, flags = 0x0100 (standard query, RD=1), QDCOUNT=1
    unsigned char request[32];
    memset(request, 0, sizeof(request));
    request[0] = 0xBE; request[1] = 0xEF;         // ID
    request[2] = 0x01; request[3] = 0x00;         // Flags
    request[4] = 0x00; request[5] = 0x01;         // QDCOUNT = 1

    // QNAME: 3www7example3com0
    unsigned char qname_part[] = {
        0x03,'w','w','w',
        0x07,'e','x','a','m','p','l','e',
        0x03,'c','o','m',
        0x00
    };
    memcpy(request + 12, qname_part, sizeof(qname_part));

    // QTYPE = A (1), QCLASS = IN (1)
    request[12 + sizeof(qname_part) + 0] = 0x00;
    request[12 + sizeof(qname_part) + 1] = 0x01;
    request[12 + sizeof(qname_part) + 2] = 0x00;
    request[12 + sizeof(qname_part) + 3] = 0x01;

    int req_size = 12 + sizeof(qname_part) + 4; // header + qname + qtype + qclass
    dns_request *req = parse_dns_request((const char*)request, req_size);
    ck_assert_ptr_nonnull(req);

    // Validar header
    ck_assert_uint_eq(req->header->id, 0xBEEF);
    ck_assert_uint_eq(req->header->qdcount, 1);

    // QNAME, QTYPE, QCLASS
    ck_assert_str_eq(req->qname, "www.example.com");
    ck_assert_uint_eq(req->qtype, 1);
    ck_assert_uint_eq(req->qclass, 1);

    free_dns_request(req);
}
END_TEST

Suite *interceptor_suite(void) {
    Suite *s = suite_create("Interceptor");
    TCase *tc_core = tcase_create("Core");

    tcase_add_test(tc_core, test_parse_dns_header);
    tcase_add_test(tc_core, test_parse_qname);
    tcase_add_test(tc_core, test_encode_b64);
    tcase_add_test(tc_core, test_decode_b64);
    tcase_add_test(tc_core, test_build_dns_url_with_params);
    tcase_add_test(tc_core, test_parse_dns_request);
    suite_add_tcase(s, tc_core);

    return s;
}

int main(void) {
    int number_failed;
    Suite *s = interceptor_suite();
    SRunner *sr = srunner_create(s);

    srunner_run_all(sr, CK_NORMAL);
    number_failed = srunner_ntests_failed(sr);
    srunner_free(sr);

    return (number_failed == 0) ? EXIT_SUCCESS : EXIT_FAILURE;
}
