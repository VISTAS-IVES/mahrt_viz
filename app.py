from flask import Flask, render_template, send_from_directory, jsonify
import glob
import os
import datetime
import mercantile # TODO - determine which tile a station lives on and assign tile values
import math


"""
    Simple Flask app for serving data and frontend assets
"""
app = Flask(__name__, static_url_path='')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/js/<path:path>')
def send_js(path):
    return send_from_directory('js', path)

@app.route('/css/<path:path>')
def send_css(path):
    return send_from_directory('css', path)

"""
    Parse and structure scp data as needed
"""
NO_DATA = -9999.0

def parse_timestamp(t):
    t = [int(_) for _ in t]
    if t[2]:                                                        # TODO - get answer from Larry about date formatting
        return datetime.datetime(t[0],t[1],t[2],t[3],t[4],t[5])
    else:
        return datetime.datetime(t[0],t[1],t[2]+1,t[3],t[4],t[5])   # TODO - remove line when ^ is answered

def parse_scp():
    print('Parsing scp files...')
    data = {}
    for path in glob.glob('scp_data/*'):
        varname = path.split(os.sep)[-1]
        print('{}...'.format(varname))
        with open(path, 'r') as f:
            lines = f.readlines()
        if varname == 'time stamp':
            data[varname] = [parse_timestamp(l.strip().split(',')) for l in lines]
        else:
            data[varname] = [[float(x) for x in line.strip().split(',')] for line in lines]
    print('Done parsing!')
    return data, list(data.keys())

scp, varnames = parse_scp()

timestamps = scp.pop('time stamp')

scp['num_steps'] = len(timestamps)
scp['variables'] = varnames
scp['no_data_value'] = NO_DATA

_ = scp.pop('relative_Z_Sfc_SCP')   # TODO - what is this variable?

def clean_time_data(data):
    for key in data.keys():
        data[key] = [[NO_DATA if math.isnan(x) else x for x in row] for row in data[key]]
    return data

scp_time_data = clean_time_data({
    'T_network_SCP': scp.pop('T_network_SCP'),
    'u_network_SCP': scp.pop('u_network_SCP'),
    'v_network_SCP': scp.pop('v_network_SCP'),
    'wind direction': scp.pop('wind direction')
})

"""
    scp data API
"""
@app.route('/scp/locations')
def send_data():
    return jsonify(scp)

@app.route('/scp/<int:time_idx>')
def send_timestamp(time_idx):
    return jsonify({
            'time stamp': timestamps[time_idx],
            'T_network_SCP':  scp_time_data['T_network_SCP'][time_idx],
            'u_network_SCP':  scp_time_data['u_network_SCP'][time_idx],
            'v_network_SCP':  scp_time_data['v_network_SCP'][time_idx],
            'wind direction': scp_time_data['wind direction'][time_idx]
        })
