"""
A web interface to pyinstaller running under wine.
"""


import uuid
import re
import base64
import zipfile
import logging
import os

from sh import cd, mkdir, rm, pyinstaller_win
from flask import Flask, render_template, redirect, url_for, request, Response, send_from_directory
from werkzeug import secure_filename

import fastlz


app = Flask(__name__)
logging.basicConfig(level=logging.INFO)


def verify_workspace_id(workspace_id):
    pattern = "^([a-zA-Z0-9-_]+)$"
    m = re.search(pattern, workspace_id)
    if not m or m.group(0) != workspace_id:
        logging.error("workspace_id error")
        return False
    return True


@app.route('/favicon.ico')
def favicon_ico():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'favicon.ico')

@app.route('/robots.txt')
def robots_txt():
    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'robots.txt')

@app.route('/')
def root():
    return redirect(url_for('workspace'))


@app.route('/workspace')
@app.route('/workspace/<workspace_id>')
def workspace(workspace_id=''):
    if not workspace_id:
        workspace_id = base64.urlsafe_b64encode(uuid.uuid4().bytes).rstrip('=')
        logging.info("creating new workspace: " + workspace_id)
        return redirect(url_for('workspace') + '/' + workspace_id)

    if not verify_workspace_id(workspace_id):
        return redirect(url_for('workspace'))
    
    return render_template('workspace.html')


@app.route('/download/<fileid>/<filename>')
def download(fileid, filename):
    pattern = "^([a-zA-Z0-9-_]+)$"
    m = re.search(pattern, fileid)
    if not m or m.group(0) != fileid:
        logging.error("download fileid error")
        return "download fileid error"
    with file('/tmp/piww_'+fileid+'/dist/package.zip') as f:
        data = f.read()

    cd('/tmp')
    rm('-rf','/tmp/piww_'+fileid)
    return Response(data,
                    mimetype="application/octet-stream",
                    headers={"Content-Disposition":
                                 "attachment;filename=package.zip"})

@app.route('/upload', methods=['POST'])
def upload():
    f = request.files['file']

    filename = secure_filename(f.filename)

    print filename

    pattern = '^([^<>:"/\|?*]+)\.py$'
    m = re.search(pattern, filename)
    if not m:
        logging.error("upload filename error")
        return "upload filename error"

    filebase = m.group(1)
    filename_py = filebase+'.py'
    filename_exe = filebase+'.exe'

    logging.info('processing: ' + filebase)

    fileid = base64.urlsafe_b64encode(uuid.uuid4().bytes).rstrip('=')

    cd('/tmp')
    mkdir('piww_'+fileid)
    cd('piww_'+fileid)

    f.save('/tmp/piww_'+fileid+'/'+filename_py)

    # pyinstaller-win is a wrapper to wine running python.exe pyinstaller
    #  it takes a python file as a parameter and outputs an exe file in 'dist'
    pyinstaller_win(filename_py)
    cd('dist')
    zipf = zipfile.ZipFile('package.zip', 'w', zipfile.ZIP_DEFLATED)
    zipf.write(filename_exe)
    zipf.close()

    return fileid
    

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=False)
