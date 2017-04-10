from flask import Flask, render_template, send_from_directory, jsonify
import glob
import os

app = Flask(__name__, static_url_path='')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/js/<path:path>')
def send_js(path):
    return send_from_directory('js', path)

@app.route('/js/<path:path>')
def send_css(path):
    return send_from_directory('css', path)

def parse_scp():
    data = {}
    for path in glob.glob('scp_data/*'):
        varname = path.split(os.sep)[-1]
        with open(path, 'r') as f:
            data[varname] = f.readlines()

    return data

scp = {'data': parse_scp()}

@app.route('/scp/')
def send_data():
    return jsonify(scp)

