from flask import Flask
app = Flask(__name__)


@app.route('/')
def hello_geek():
    return '<h1> Redes 01-2024 8:18 pm</h2>'


if __name__ == "__main__":
    app.run(debug=True)