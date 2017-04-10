# mahrt_viz
A WebGL viewer for wind data as a time series. This is a very simple Flask app that serves the CSV data stored in the scp_data folder.

#Installation
Inside a fresh virtualenv, run `pip install -r requirements.txt`.

#Usage
To start the server:
```
cd path\to\mahrt_viz
export FLASK_APP=app.py
python -m flask run
```

Then navigate to 127.0.0.1:5000 in your browser to view the visualization.
