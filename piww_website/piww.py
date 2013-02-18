"""
A web interface to pyinstaller running under wine.
"""


import uuid
import re
import base64
import struct
import zlib
import zipfile
import logging
import os

from sh import cd, mkdir, rm, pyinstaller_win
from flask import Flask, render_template, redirect, url_for, request, Response, send_from_directory

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

@app.route('/upload', methods=['GET', 'POST'])
def upload():
    if request.method == 'GET':
        return render_template('upload.html')
    else:
        filename = request.files['Filedata'].filename
        body = request.files['Filedata'].read()
        
        pattern = '^([^<>:"/\|?*]+)\.py$'
        m = re.search(pattern, filename)
        if not m:
            logging.error("upload filename error")
            return "upload filename error"
        filebase = m.group(1)
        filename_py = filebase+'.py'
        filename_exe = filebase+'.exe'

        logging.info('processing: ' + filebase)

        len_wire = len(body)
        len_data = 0

        decoded = base64.b64decode(body)
        size = struct.unpack(">I", decoded[:4])[0]
        checksum = struct.unpack(">I", decoded[4:8])[0]
        # zlib.adler32 returns a signed checksum
        if checksum > 2147483647:
            checksum -= 4294967296
        compressed = decoded[8:]
        uncompressed = fastlz.decompress(compressed, size)
        if zlib.adler32(uncompressed) != checksum:
            raise IndexError ("checksum error")
        len_data += len(uncompressed)

        if len_data:
            logging.info('compression: {len_wire}/{len_data} = {compression}%'.format(len_wire=len_wire, len_data=len_data, compression=int(100.0 * float(len_wire)/float(len_data))))
        else:
            logging.info('compression: {len_wire}/{len_data} = {compression}%'.format(len_wire=len_wire, len_data=len_data, compression='inf'))
        
        fileid = base64.urlsafe_b64encode(uuid.uuid4().bytes).rstrip('=')
        cd('/tmp')
        mkdir('piww_'+fileid)
        cd('piww_'+fileid)
        with file('/tmp/piww_'+fileid+'/'+filename_py, 'w') as f:
            f.write(uncompressed)
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
