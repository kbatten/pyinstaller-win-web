"""
A web interface to pyinstaller running under wine.
"""


import uuid
import re
import base64
import struct
import zlib
import subprocess

from sh import cd, mkdir, rm, pyinstaller_win
from flask import Flask, render_template, redirect, url_for, request, Response

import fastlz


app = Flask(__name__)

@app.route('/')
def root():
    return redirect(url_for('upload'))

@app.route('/download/<fileid>/<filename>')
def download(fileid, filename):
    # b4243103-f33c-4a58-a960-ec18f2347c76
    pattern = "([a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12})"
    m = re.search(pattern, fileid)
    if m.group(0) != fileid:
        return "error"
    with file('/tmp/piww_'+fileid+'/dist/tmp.exe') as f:
        data = f.read()

    cd('/tmp')
    rm('-rf','/tmp/piww_'+fileid)
    return Response(data,
                    mimetype="application/octet-stream",
                    headers={"Content-Disposition":
                                 "attachment;filename=tmp.exe"})

@app.route('/upload', methods=['GET', 'POST'])
def upload():
    if request.method == 'GET':
        return render_template('upload.html')
    else:
        body = request.files['Filedata'].read()
        
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
            print 'compression: {len_wire}/{len_data} = {compression}%'.format(len_wire=len_wire, len_data=len_data, compression=int(100.0 * float(len_wire)/float(len_data)))
        else:
            print 'compression: {len_wire}/{len_data} = {compression}%'.format(len_wire=len_wire, len_data=len_data, compression='inf')
        
#        subprocess.call(['bash', '-c', 'rm -rf /tmp/pyinstaller-win ; mkdir /tmp/pyinstaller-win'])
#        with file('/tmp/pyinstaller-win/tmp.py', 'w') as f:
#            f.write(uncompressed)
#        subprocess.call(['bash', '-c', 'cd /tmp/pyinstaller-win ; pyinstaller-win tmp.py'])
        fileid = str(uuid.uuid4())
        cd('/tmp')
        mkdir('piww_'+fileid)
        cd('piww_'+fileid)
        with file('/tmp/piww_'+fileid+'/tmp.py', 'w') as f:
            f.write(uncompressed)
        pyinstaller_win('tmp.py')

        return fileid
    

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
