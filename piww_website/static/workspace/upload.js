/*global FastLz*/
/*jslint browser: true*/
/*jslint plusplus: true, vars: true */

var e = function (id) {
    "use strict";
    return document.getElementById(id);
};

// only allow one file to be compressed/uploaded at a time
var g_uploading = false;
var g_compressStart = 0;

// not a real event
function compressionUpdate(evt) {
    "use strict";
    e('debug').innerHTML = Math.ceil(50 * (evt.loaded / evt.total)) + "%";
    if (evt.loaded === evt.total) {
        e('debug').innerHTML += "seconds to compress: " + (((new Date()).getTime() - g_compressStart) / 1000) + "<br>";
    }
}

function processing(dots) {
    "use strict";
    var da = ["", ".", "..", "...", "..", "."];
    dots = dots % 6;
    e('debug').innerHTML = da[dots] + "processing" + da[dots];
    setTimeout("processing(" + (dots + 1) + ")", 1000);
}

function uploadUpdate(evt) {
    "use strict";
    if (evt.target.readyState === 4) {
        if (evt.target.status === 200) {
            processing(0);
            window.location.href = '/download/' + evt.target.responseText + '/package.zip';
        }
    }

    if (evt.total === evt.loaded) {
        e('debug').innerHTML = "100%";
        //      g_uploading = false;
    } else {
        e('debug').innerHTML = 50 + Math.ceil(50 * (evt.loaded / evt.total)) + "%";
    }
}

// asynchronously compress and then upload data
// each compressed data chunk will be in its own mime part
// callbacks will trigger on for each chunk that is processed with
//   evt.loaded = bytes processed
//   evt.total = total bytes to be processed
// data is compressed with zlib deflate, then base64 encoded
function uploadCompressedData(data, filename, compressionCallback, uploadCallback) {
    "use strict";
    // modified from https://developer.mozilla.org/en/using_files_from_web_applications

    var c_compressedData = [];
    var c_evt = [];
    var c_data = data; // are we duplicating data?
    var c_chunkSize = 1048576;

    function uploadDataAsync() {
        var dataSize = 0;
        var boundary = "yyyyyyyyyyyyyyyyyyyy";
        var uri = "/upload";
        var xhr = new XMLHttpRequest();

        // build up a fake Mime message, lots of parts to make sure server side can handle it
        // server should only care about the Filedata part
        var body = "--" + boundary + "\r\n";

        var i;

        for (i = 0; i < c_compressedData.length; i++) {
            var chunk = window.btoa(c_compressedData[i]);
            dataSize += chunk.length;

            body += "--" + boundary + "\r\n";
            body += "Content-Disposition: form-data; name=\"Filedata\"; filename=\"" + filename + "\"\r\n";
            body += "Content-Type: application/octet-stream\r\n\r\n";
            body += chunk + "\r\n";
        }

        body += "--" + boundary + "--";

        xhr.open("POST", uri, true);
        xhr.setRequestHeader("Content-Type", "multipart/form-data; boundary=" + boundary);

        xhr.upload.addEventListener("progress", uploadCallback, false);
        xhr.upload.addEventListener("load", uploadCallback, false);
        //      xhr.upload.addEventListener("readystatechange", uploadCallback, false);
        xhr.onreadystatechange = uploadCallback;

        e('debug').innerHTML += "compressed chunks: " + c_compressedData.length + "<br>";
        e('debug').innerHTML += "compressed size: " + body.length + "<br>";

        xhr.send(body);
    }

    function int32ToBytes(int32) {
        var bytes = [];
        /*jslint bitwise: true*/
        bytes[3] = String.fromCharCode(int32 & 255);
        int32 = int32 >> 8;
        bytes[2] = String.fromCharCode(int32 & 255);
        int32 = int32 >> 8;
        bytes[1] = String.fromCharCode(int32 & 255);
        int32 = int32 >> 8;
        bytes[0] = String.fromCharCode(int32 & 255);
        /*jslint bitwise: false*/
        return bytes.join("");
    }

    // adler32 is amazingly simple
    function adler32(data) {
        var a = 1;
        var b = 0;
        var i;
        for (i = 0; i < data.length; i++) {
            var ascii = data.charCodeAt(i);
            a = (a + ascii) % 65521;
            b = (a + b) % 65521;
        }

        return int32ToBytes(b * 65536 + a);
    }

    function compressDataChunkFastlz(chunk) {
        // compress with fastlz
        // need to compare how different chunk sizes work
        var size = int32ToBytes(chunk.length);
        var checksum = adler32(chunk);
        var compressed = FastLz.compressor(chunk);
        return size + checksum + compressed;
    }

    var compressDataChunk = compressDataChunkFastlz;

    function compressDataAsync() {
        // compress a data chunk
        c_compressedData.push(compressDataChunk(c_data.slice(c_evt.loaded, c_evt.loaded + c_chunkSize)));
        c_evt.loaded += c_chunkSize;
        if (c_evt.loaded > c_evt.total) {
            c_evt.loaded = c_evt.total;
        }
        compressionCallback(c_evt);
        if (c_evt.loaded < c_evt.total) {
            setTimeout(compressDataAsync, 0);
        } else {
            // compression is done, lets trigger upload
            c_evt.loaded = 0;
            c_evt.total = c_compressedData.length;
            setTimeout(uploadDataAsync, 0);
        }
    }

    c_evt.loaded = 0;
    c_evt.total = c_data.length;

    g_compressStart = (new Date()).getTime();

    setTimeout(compressDataAsync, 0);
}

function handleFileSelect(evt) {
    "use strict";
    evt.stopPropagation();
    evt.preventDefault();

    if (g_uploading === true) {
        return;
    }
    g_uploading = true;

    var dataTransfer = evt.dataTransfer || (evt.originalEvent && evt.originalEvent.dataTransfer);

    var f = dataTransfer.files[0]; // Grab just the first file as a File object
    var reader = new window.FileReader();

    reader.onload = function (e) {
        uploadCompressedData(e.target.result, f.name, compressionUpdate, uploadUpdate);
    };

    reader.readAsText(f);
}

function handleDragOver(evt) {
    "use strict";
    evt.stopPropagation();
    evt.preventDefault();
}
