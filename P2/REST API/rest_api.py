import json
from flask import Flask, request, render_template_string
from os import environ
import logging

logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
app = Flask(__name__)

try:
    with open('pokedex.json', 'r', encoding='utf-8') as f:
        pokedex = json.load(f)
    logger.debug("Loaded pokedex.json successfully.")
except Exception as e:
    logger.error(f"Failed to load pokedex.json: {e}")
    pokedex = []

@app.route("/")
def home():
    return render_template_string('''<!doctype html>
<html>
    <head>
        <link rel="stylesheet" href="css url"/>
    </head>
    <body>
        <p>Aplicación de REST API de Pokemon!</p>
    </body>
</html>
''')

@app.route("/getPokemon/<id>", methods=["GET"])
def getOnePokemon(id):
    if request.method == "GET":
        try:
            pokemonFound = next((p for p in pokedex if str(p["Id"]) == str(id)), None)
            logger.debug(f"Get One: {pokemonFound}")
            return pokemonFound if pokemonFound else "Pokemon not found"
        except Exception as e:
            logger.debug("No se pudo encontrar el pokemon: ", e)
            return "Error"

@app.route("/getAllPokemon", methods=["GET"])
def getAllPokemon():
    if request.method == "GET":
        try:
            pokemonGet = []
            for species in pokedex:
                item = {
                    "Id": str(species["Id"]),
                    "Name": str(species["Name"]),
                    "Type1": str(species["Type1"]),
                    "Type2": str(species["Type2"]),
                    "Category": str(species["Category"]),
                    "Heightf": str(species["Heightf"]),
                    "Heightm": str(species["Heightm"]),
                    "Weightlbs": str(species["Weightlbs"]),
                    "Weightkg": str(species["Weightkg"]),
                    "CaptureRate": str(species["CaptureRate"]),
                    "EggSteps": str(species["EggSteps"]),
                    "ExpGroup": str(species["ExpGroup"]),
                    "Total": str(species["Total"]),
                    "HP": str(species["HP"]),
                    "Attack": str(species["Attack"]),
                    "Defense": str(species["Defense"]),
                    "SpAttack": str(species["SpAttack"]),
                    "SpDefense": str(species["SpDefense"]),
                    "Speed": str(species["Speed"])
                }
                pokemonGet.append(item)
            logger.debug(f"Pokemones Get All {pokemonGet}")
            return pokemonGet
        except Exception as e:
            logger.debug("No se pudo obtener los pokemones: ", e)
            return "Error"

@app.route("/postPokemon", methods=["POST"]) 
def insertPokemon():
    if request.method == "POST":
        formPokemon = {
            "Id": request.form["Id"],
            "Name": request.form["Name"],
            "Type1": request.form["Type1"],
            "Type2": request.form["Type2"],
            "Category": request.form["Category"],
            "Heightf": request.form["Heightf"],
            "Heightm": request.form["Heightm"],
            "Weightlbs": request.form["Weightlbs"],
            "Weightkg": request.form["Weightkg"],
            "CaptureRate": request.form["CaptureRate"],
            "EggSteps": request.form["EggSteps"],
            "ExpGroup": request.form["ExpGroup"],
            "Total": request.form["Total"],
            "HP": request.form["HP"],
            "Attack": request.form["Attack"],
            "Defense": request.form["Defense"],
            "SpAttack": request.form["SpAttack"],
            "SpDefense": request.form["SpDefense"],
            "Speed": request.form["Speed"]
        }
        try:
            pokedex.append(formPokemon)
            with open('pokedex.json', 'w', encoding='utf-8') as f:
                json.dump(pokedex, f, ensure_ascii=False, indent=4)
            logger.debug(f"Pokemon Post {formPokemon}")
        except Exception as e:
            logger.debug("No se pudo insertar. ", e)
            return "Insert failed"
        return formPokemon

@app.route("/putPokemon/<id>", methods=["PUT"]) 
def updatePokemon(id):
    if request.method == "PUT":
        formPokemon = {
            "Id": request.form["Id"],
            "Name": request.form["Name"],
            "Type1": request.form["Type1"],
            "Type2": request.form["Type2"],
            "Category": request.form["Category"],
            "Heightf": request.form["Heightf"],
            "Heightm": request.form["Heightm"],
            "Weightlbs": request.form["Weightlbs"],
            "Weightkg": request.form["Weightkg"],
            "CaptureRate": request.form["CaptureRate"],
            "EggSteps": request.form["EggSteps"],
            "ExpGroup": request.form["ExpGroup"],
            "Total": request.form["Total"],
            "HP": request.form["HP"],
            "Attack": request.form["Attack"],
            "Defense": request.form["Defense"],
            "SpAttack": request.form["SpAttack"],
            "SpDefense": request.form["SpDefense"],
            "Speed": request.form["Speed"]
        }
        try:
            updated = False
            for idx, poke in enumerate(pokedex):
                if str(poke["Id"]) == str(id):
                    pokedex[idx] = formPokemon
                    updated = True
                    break
            if updated:
                with open('pokedex.json', 'w', encoding='utf-8') as f:
                    json.dump(pokedex, f, ensure_ascii=False, indent=4)
                logger.debug(f"Pokemon Update {formPokemon}")
                return f"Pokemon Updated {formPokemon}"
            else:
                return "Pokemon not found"
        except Exception as e:
            logger.debug("No se pudo actualizar. ", e)
            return "Update failed"

@app.route("/deletePokemon/<id>", methods=["DELETE"]) 
def delete(id):
    if request.method == "DELETE":
        try:
            deleted = False
            for idx, poke in enumerate(pokedex):
                if str(poke["Id"]) == str(id):
                    del pokedex[idx]
                    deleted = True
                    break
            if deleted:
                with open('pokedex.json', 'w', encoding='utf-8') as f:
                    json.dump(pokedex, f, ensure_ascii=False, indent=4)
                logger.debug(f"Delete One: {id}")
                return f"Deleted {id}"
            else:
                return "Pokemon not found"
        except Exception as e:
            logger.debug("No se pudo eliminar pokemon: ", e)
            return "Delete failed"

if __name__ == "__main__":
    app.run()