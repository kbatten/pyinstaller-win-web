"""
A web interface to pyinstaller running under wine.
"""


import uuid
import re
import base64
import struct
import zlib
import zipfile

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
    if not m or m.group(0) != fileid:
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
            return "upload filename error"
        filebase = m.group(1)
        filename_py = filebase+'.py'
        filename_exe = filebase+'.exe'

        print filename_py
        print filename_exe

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
        
        fileid = str(uuid.uuid4())
        cd('/tmp')
        mkdir('piww_'+fileid)
        cd('piww_'+fileid)
        with file('/tmp/piww_'+fileid+'/'+filename_py, 'w') as f:
            f.write(uncompressed)
        pyinstaller_win(filename_py)
        cd('dist')
        zipf = zipfile.ZipFile('package.zip', 'w', zipfile.ZIP_DEFLATED)
        zipf.write(filename_exe)
        zipf.close()

        return fileid
    

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)
