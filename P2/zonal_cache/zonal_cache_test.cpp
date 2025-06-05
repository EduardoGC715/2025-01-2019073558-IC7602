// Pruebas de zonal_cache.cpp
#define CATCH_CONFIG_MAIN
#include <catch2/catch_amalgamated.hpp>

// Esta constante se usa para no compilar el main de zonal_cache.cpp
#define UNIT_TEST
#include "zonal_cache.cpp"

// Prueba de from_hex()
TEST_CASE("from_hex convierte dígitos hexadecimales a su representación numérica en base 10") {
    REQUIRE(from_hex('0') == 0);
    REQUIRE(from_hex('9') == 9);
    REQUIRE(from_hex('a') == 10);
    REQUIRE(from_hex('A') == 10);
    REQUIRE(from_hex('f') == 15);
    REQUIRE(from_hex('F') == 15);
    REQUIRE(from_hex('z') == -1);   // Valor inválido
}

TEST_CASE("url_encode / url_decode round-trip") {
    const std::string original = "Hello, world! àéîôü ~ ☺";
    const std::string encoded  = url_encode(original);

    // Se codifican los espacios como %20, los signos de exclamación como %21,
    // y los caracteres especiales como %C3%A0, %C3%A9, etc.
    REQUIRE(encoded.find(' ')  == std::string::npos);
    REQUIRE(encoded.find('!')  == std::string::npos);
    REQUIRE(encoded.find("☺")  == std::string::npos);

    REQUIRE(url_decode(encoded) == original); // El proceso de decodificación debe revertir la codificación
}

TEST_CASE("get_token_from_cookies() extrae el token de una manera segura") {
    SECTION("mitad del cookie header") {
        std::string header = "id=42; token=SECRET123; theme=dark";
        REQUIRE(get_token_from_cookies(header) == "SECRET123");
    }
    SECTION("token al final") {
        std::string header = "id=1;token=XYZ";
        REQUIRE(get_token_from_cookies(header) == "XYZ");
    }
    SECTION("no hay token") {
        std::string header = "id=1; theme=dark";
        REQUIRE(get_token_from_cookies(header).empty());
    }
    SECTION("falso positivo (othertoken)") {
        std::string header = "othertoken=BAD;";
        REQUIRE(get_token_from_cookies(header).empty());
    }
}

TEST_CASE("get_query_parameter() recupera los query parameters de una URI") {
    const std::string uri = "/path?q=hello&token=ABC&x=1";
    REQUIRE(get_query_parameter(uri, "token") == "ABC");
    REQUIRE(get_query_parameter(uri, "q")     == "hello");
    REQUIRE(get_query_parameter(uri, "missing").empty());
}

TEST_CASE("hash_string() codifica en SHA256 y debería ser determinista y de 256 bits") {
    const std::string input = "Catch2 is great!";
    const std::string h1 = hash_string(input);
    const std::string h2 = hash_string(input);

    REQUIRE(h1 == h2);          // same input → same hash
    REQUIRE(h1.length() == 64); // 256 bits → 64 hex chars
    REQUIRE(h1.find_first_not_of("0123456789abcdef") == std::string::npos); // Solo debería haber caracteres hexadecimales
}

TEST_CASE("extract_host() extrae el host de una URL") {
    REQUIRE(extract_host("example.com/foo/bar") == "example.com");
    REQUIRE(extract_host("example.com")         == "example.com");
}

TEST_CASE("check_wildcard() retorna la wildcard de más larga que haga match") {
    // Se prepara el objeto JSON de wildcards
    wildcards.SetObject();
    rapidjson::Document::AllocatorType& alloc = wildcards.GetAllocator();

    rapidjson::Value wcObj(rapidjson::kObjectType);
    wcObj.AddMember("authMethod",
                    rapidjson::Value("none", alloc),
                    alloc);

    wildcards.AddMember(rapidjson::Value("example.com", alloc),
                        wcObj, alloc);

    SECTION("subdomain matches wildcard") {
        REQUIRE(check_wildcard("hola.example.com") == "example.com");
    }
    SECTION("no match") {
        REQUIRE(check_wildcard("bar.other.com").empty());
    }
}
