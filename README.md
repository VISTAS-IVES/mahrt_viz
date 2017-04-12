# mahrt_viz
A WebGL viewer for wind data as a time series. This is a very simple Flask app that serves the CSV data stored in the scp_case_study folder.

[See the demo here.](http://ec2-54-200-163-156.us-west-2.compute.amazonaws.com/)

# Installation
Inside a fresh virtualenv, run `pip install -r requirements.txt`.

# Usage
To start the server:
```
# Activate your virtual environment
path\to\virtualenv\scripts\activate

# Change directory to where you unpacked the repo
cd path\to\mahrt_viz

# Set temporary environment variable for Flask
export FLASK_APP=app.py   # On Windows, use 'set' instead of 'export'

# Run the server
python -m flask run
```

Then navigate to `127.0.0.1:5000` in your browser to view the visualization.
