import requests
import time


def send_request(url):
    try:
        response = requests.get("http://" + url)
        if response.status_code == 200:
            print("Request successful!")
            print("Response:", response.text)
        else:
            print(f"Request failed with status code: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"An error occurred: {e}")


if __name__ == "__main__":
    # LRU
    send_request("lru.mooo.com/getPokemon/001")
    time.sleep(2)
    send_request("lru.mooo.com/getPokemon/002")
    time.sleep(2)
    send_request("lru.mooo.com/getPokemon/001")
    time.sleep(2)
    input("Presione Enter para continuar...")

    # Debería sacar el 002 porque es el menos recientemente usado
    send_request("lru.mooo.com/getPokemon/003")
    time.sleep(2)
    input("Presione Enter para continuar...")

    send_request(
        "lru.mooo.com/getAllPokemon"
    )  # Como la cache no puede almacenar esto, se termina borrando todos los registros y reiniciando

    # LFU
    send_request("lfu.mooo.com/getPokemon/001")
    time.sleep(2)
    send_request("lfu.mooo.com/getPokemon/002")
    time.sleep(2)
    send_request("lfu.mooo.com/getPokemon/001")
    time.sleep(2)
    input("Presione Enter para continuar...")

    # Debería sacar el 002 porque es el menos frecuentemente usado
    send_request("lfu.mooo.com/getPokemon/003")
    time.sleep(2)
    input("Presione Enter para continuar...")

    send_request("lfu.mooo.com/getAllPokemon")  # Se reinicia la cache

    # FIFO
    send_request("fifo.mooo.com/getPokemon/001")
    time.sleep(2)
    send_request("fifo.mooo.com/getPokemon/002")
    time.sleep(2)
    send_request("fifo.mooo.com/getPokemon/001")
    time.sleep(2)
    input("Presione Enter para continuar...")

    # Debería sacar el 001 porque es el primero en entrar
    send_request("fifo.mooo.com/getPokemon/003")

    input("Presione Enter para continuar...")

    send_request("fifo.mooo.com/getAllPokemon")  # Se reinicia la cache

    # MRU
    send_request("mru.mooo.com/getPokemon/001")
    time.sleep(2)
    send_request("mru.mooo.com/getPokemon/002")
    time.sleep(2)
    send_request("mru.mooo.com/getPokemon/001")
    time.sleep(2)
    input("Presione Enter para continuar...")

    # Debería sacar el 001 porque es el más recientemente usado
    send_request("mru.mooo.com/getPokemon/003")
    time.sleep(2)
    input("Presione Enter para continuar...")

    send_request("mru.mooo.com/getAllPokemon")  # Se reinicia la cache
